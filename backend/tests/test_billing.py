from decimal import Decimal
from backend.app.models import Product, InventoryBalance, Invoice
from backend.app.schemas import InvoiceCreate, InvoiceItemCreate, PaymentCreate
from backend.app.services.billing_service import BillingService
from backend.app.services.product_service import ProductService
from backend.app.schemas import ProductCreate

def test_atomic_pos_invoice_creation(db_session, test_setup):
    biz = test_setup["business"]
    user = test_setup["user"]

    # 1. Create product with initial stock 50
    prod = ProductService.create_product(
        db=db_session,
        business_id=biz.id,
        data=ProductCreate(
            name="Test Basmati Rice 1kg",
            sku="RICE-01",
            selling_price=Decimal("120.00"),
            purchase_cost=Decimal("90.00"),
            tax_rate=Decimal("5.00"),
            initial_stock=50.0
        ),
        user_id=user.id
    )

    # Verify initial stock
    bal = db_session.query(InventoryBalance).filter(InventoryBalance.product_id == prod.id).first()
    assert bal.current_stock == 50.0

    # 2. Finalize POS invoice for 5 units
    invoice_in = InvoiceCreate(
        walk_in_customer_name="Walk-in Shopper",
        items=[
            InvoiceItemCreate(
                product_id=prod.id,
                product_name=prod.name,
                unit_price=Decimal("120.00"),
                quantity=5.0,
                tax_rate=Decimal("5.00")
            )
        ],
        amount_received=Decimal("630.00"), # 120 * 5 = 600 + 5% tax (30) = 630
        payment_method="cash"
    )

    invoice = BillingService.create_invoice(
        db=db_session,
        business_id=biz.id,
        data=invoice_in,
        user_id=user.id
    )

    assert invoice.invoice_number == "TST-1001"
    assert invoice.status == "finalized"
    assert invoice.subtotal == Decimal("600.00")
    assert invoice.tax_amount == Decimal("30.00")
    assert invoice.total_amount == Decimal("630.00")
    assert invoice.paid_amount == Decimal("630.00")
    assert invoice.balance_amount == Decimal("0.00")
    assert invoice.payment_status == "paid"

    # Verify inventory was deducted atomically to exactly 45.0
    db_session.refresh(bal)
    assert bal.current_stock == 45.0

    # 3. Test cancellation restores inventory
    cancelled_invoice = BillingService.cancel_invoice(
        db=db_session,
        business_id=biz.id,
        invoice_id=invoice.id,
        user_id=user.id
    )
    assert cancelled_invoice.status == "cancelled"

    # Inventory balance must be restored to 50.0
    db_session.refresh(bal)
    assert bal.current_stock == 50.0
