from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import Purchase, PurchaseItem, Supplier, Product
from backend.app.schemas import PurchaseCreate
from backend.app.services.inventory_service import InventoryService
from backend.app.services.billing_service import quantize_dec

class PurchaseService:
    @staticmethod
    def get_purchases(db: Session, business_id: str, limit: int = 100) -> List[Purchase]:
        return db.query(Purchase).filter(
            Purchase.business_id == business_id
        ).order_by(Purchase.created_at.desc()).limit(limit).all()

    @staticmethod
    def create_purchase(
        db: Session,
        business_id: str,
        data: PurchaseCreate,
        user_id: Optional[str] = None
    ) -> Purchase:
        if not data.items:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Purchase must contain at least one item.")

        purchase_number = data.purchase_number or f"PO-{int(datetime.now().timestamp())}"
        
        total_amount = Decimal("0.00")
        purchase_items: List[PurchaseItem] = []

        for item_in in data.items:
            unit_cost = quantize_dec(Decimal(str(item_in.unit_cost)))
            qty = float(item_in.quantity)
            line_total = quantize_dec(unit_cost * Decimal(str(qty)))
            total_amount += line_total

            p_item = PurchaseItem(
                product_id=item_in.product_id,
                product_name=item_in.product_name,
                quantity=qty,
                unit_cost=unit_cost,
                line_total=line_total
            )
            purchase_items.append(p_item)

        paid = quantize_dec(Decimal(str(data.paid_amount)))
        purchase = Purchase(
            business_id=business_id,
            purchase_number=purchase_number,
            supplier_id=data.supplier_id,
            status="received",
            total_amount=total_amount,
            paid_amount=paid,
            notes=data.notes,
            created_by_user_id=user_id,
            received_at=datetime.now(timezone.utc)
        )
        db.add(purchase)
        db.flush()

        for itm in purchase_items:
            itm.purchase_id = purchase.id
            db.add(itm)
            # Add to stock
            if itm.product_id:
                InventoryService.record_stock_movement(
                    db=db,
                    business_id=business_id,
                    product_id=itm.product_id,
                    movement_type="purchase",
                    quantity_delta=itm.quantity,
                    unit_cost=itm.unit_cost,
                    reference_type="purchase",
                    reference_id=purchase.purchase_number,
                    notes=f"Stock received from Purchase {purchase.purchase_number}",
                    user_id=user_id
                )

        # Update supplier outstanding balance if unpaid amount remains
        balance_owed = max(Decimal("0.00"), total_amount - paid)
        if data.supplier_id and balance_owed > 0:
            supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
            if supplier:
                supplier.outstanding_balance += balance_owed

        db.commit()
        db.refresh(purchase)
        return purchase
