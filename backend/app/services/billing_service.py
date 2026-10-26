from typing import Optional, List
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import (
    Invoice, InvoiceItem, Payment, Product, Customer, Business, AuditLog
)
from backend.app.schemas import InvoiceCreate, PaymentCreate
from backend.app.services.inventory_service import InventoryService

def quantize_dec(val: Decimal) -> Decimal:
    return val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

class BillingService:
    @staticmethod
    def get_next_invoice_number(db: Session, business: Business) -> str:
        """Atomically increment and return the next sequential invoice number."""
        num = business.invoice_next_number
        business.invoice_next_number += 1
        db.flush()
        prefix = business.invoice_prefix or "INV-"
        return f"{prefix}{num}"

    @staticmethod
    def create_invoice(
        db: Session,
        business_id: str,
        data: InvoiceCreate,
        user_id: Optional[str] = None
    ) -> Invoice:
        business = db.query(Business).filter(Business.id == business_id).first()
        if not business:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found.")

        if not data.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice must contain at least one item.")

        invoice_number = BillingService.get_next_invoice_number(db, business)
        is_finalized = not data.is_draft

        subtotal = Decimal("0.00")
        total_tax = Decimal("0.00")
        total_item_discount = Decimal("0.00")
        invoice_items: List[InvoiceItem] = []

        # Validate and prepare items
        for item_in in data.items:
            unit_price = quantize_dec(Decimal(str(item_in.unit_price)))
            qty = float(item_in.quantity)
            disc = quantize_dec(Decimal(str(item_in.discount_amount)))
            tax_rate = Decimal(str(item_in.tax_rate))

            product = None
            cost_snapshot = Decimal("0.00")
            sku = item_in.sku or ""

            if item_in.product_id:
                product = db.query(Product).filter(
                    Product.id == item_in.product_id,
                    Product.business_id == business_id
                ).first()
                if product:
                    cost_snapshot = quantize_dec(Decimal(str(product.purchase_cost)))
                    sku = product.sku

            gross = quantize_dec(unit_price * Decimal(str(qty)))
            net_before_tax = max(Decimal("0.00"), gross - disc)
            tax = quantize_dec(net_before_tax * (tax_rate / Decimal("100.0")))
            line_total = quantize_dec(net_before_tax + tax)

            subtotal += gross
            total_item_discount += disc
            total_tax += tax

            inv_item = InvoiceItem(
                product_id=product.id if product else None,
                product_name=product.name if product else item_in.product_name,
                sku=sku,
                unit_price=unit_price,
                purchase_cost_snapshot=cost_snapshot,
                quantity=qty,
                discount_amount=disc,
                tax_rate=tax_rate,
                tax_amount=tax,
                line_total=line_total
            )
            invoice_items.append(inv_item)

        invoice_discount = quantize_dec(Decimal(str(data.discount_amount)))
        grand_total = max(Decimal("0.00"), subtotal - total_item_discount - invoice_discount + total_tax)
        paid = quantize_dec(Decimal(str(data.amount_received))) if is_finalized else Decimal("0.00")
        balance = max(Decimal("0.00"), grand_total - paid)

        if paid >= grand_total:
            payment_status = "paid"
        elif paid > 0:
            payment_status = "partially_paid"
        else:
            payment_status = "unpaid"

        invoice = Invoice(
            business_id=business_id,
            invoice_number=invoice_number,
            customer_id=data.customer_id,
            walk_in_customer_name=data.walk_in_customer_name,
            status="finalized" if is_finalized else "draft",
            subtotal=subtotal,
            discount_amount=invoice_discount + total_item_discount,
            tax_amount=total_tax,
            total_amount=grand_total,
            paid_amount=paid,
            balance_amount=balance,
            payment_status=payment_status,
            payment_method=data.payment_method,
            notes=data.notes,
            created_by_user_id=user_id,
            finalized_at=datetime.now(timezone.utc) if is_finalized else None
        )
        db.add(invoice)
        db.flush()

        for itm in invoice_items:
            itm.invoice_id = invoice.id
            db.add(itm)
        db.flush()

        # If finalized: Deduct stock atomically and record payment
        if is_finalized:
            for itm in invoice_items:
                if itm.product_id:
                    InventoryService.record_stock_movement(
                        db=db,
                        business_id=business_id,
                        product_id=itm.product_id,
                        movement_type="sale",
                        quantity_delta=-itm.quantity,
                        unit_cost=itm.purchase_cost_snapshot,
                        reference_type="invoice",
                        reference_id=invoice.invoice_number,
                        notes=f"POS Sale: {invoice.invoice_number}",
                        user_id=user_id,
                        allow_negative=False
                    )

            if paid > 0:
                payment = Payment(
                    business_id=business_id,
                    invoice_id=invoice.id,
                    customer_id=data.customer_id,
                    amount=paid,
                    payment_method=data.payment_method,
                    reference_number=f"PAY-{invoice.invoice_number}",
                    notes="Payment received at POS checkout",
                    created_by_user_id=user_id
                )
                db.add(payment)

            # Update customer balance if credit/partial
            if data.customer_id and balance > 0:
                cust = db.query(Customer).filter(Customer.id == data.customer_id).first()
                if cust:
                    cust.outstanding_balance += balance

        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def get_invoices(
        db: Session,
        business_id: str,
        status_filter: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Invoice]:
        query = db.query(Invoice).filter(Invoice.business_id == business_id)
        if status_filter:
            query = query.filter(Invoice.status == status_filter)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (Invoice.invoice_number.ilike(s)) | (Invoice.walk_in_customer_name.ilike(s))
            )
        return query.order_by(Invoice.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_invoice(db: Session, business_id: str, invoice_id: str) -> Optional[Invoice]:
        return db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.business_id == business_id
        ).first()

    @staticmethod
    def cancel_invoice(
        db: Session,
        business_id: str,
        invoice_id: str,
        user_id: Optional[str] = None
    ) -> Invoice:
        invoice = BillingService.get_invoice(db, business_id, invoice_id)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

        if invoice.status == "cancelled":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already cancelled.")

        # Revert stock movements if it was finalized
        if invoice.status == "finalized":
            for itm in invoice.items:
                if itm.product_id:
                    InventoryService.record_stock_movement(
                        db=db,
                        business_id=business_id,
                        product_id=itm.product_id,
                        movement_type="return",
                        quantity_delta=itm.quantity, # positive adjustment to restore stock
                        unit_cost=itm.purchase_cost_snapshot,
                        reference_type="invoice_cancel",
                        reference_id=invoice.invoice_number,
                        notes=f"Stock restored on cancellation of {invoice.invoice_number}",
                        user_id=user_id,
                        allow_negative=True
                    )

            # Revert customer outstanding balance if unpaid portion was recorded
            if invoice.customer_id and invoice.balance_amount > 0:
                cust = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
                if cust:
                    cust.outstanding_balance = max(Decimal("0.00"), cust.outstanding_balance - invoice.balance_amount)

        invoice.status = "cancelled"
        db.commit()
        db.refresh(invoice)
        return invoice

    @staticmethod
    def add_payment(
        db: Session,
        business_id: str,
        invoice_id: str,
        data: PaymentCreate,
        user_id: Optional[str] = None
    ) -> Invoice:
        invoice = BillingService.get_invoice(db, business_id, invoice_id)
        if not invoice:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found.")

        if invoice.status != "finalized":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only record payments on finalized invoices.")

        pay_amount = quantize_dec(Decimal(str(data.amount)))
        if pay_amount <= 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero.")

        payment = Payment(
            business_id=business_id,
            invoice_id=invoice.id,
            customer_id=invoice.customer_id,
            amount=pay_amount,
            payment_method=data.payment_method,
            reference_number=data.reference_number,
            notes=data.notes,
            created_by_user_id=user_id
        )
        db.add(payment)

        invoice.paid_amount += pay_amount
        invoice.balance_amount = max(Decimal("0.00"), invoice.total_amount - invoice.paid_amount)
        if invoice.balance_amount == 0:
            invoice.payment_status = "paid"
        else:
            invoice.payment_status = "partially_paid"

        if invoice.customer_id:
            cust = db.query(Customer).filter(Customer.id == invoice.customer_id).first()
            if cust:
                cust.outstanding_balance = max(Decimal("0.00"), cust.outstanding_balance - pay_amount)

        db.commit()
        db.refresh(invoice)
        return invoice
