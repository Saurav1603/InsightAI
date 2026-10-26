from decimal import Decimal
from datetime import datetime, timedelta, timezone
from backend.app.schemas import ProductCreate, InvoiceCreate, InvoiceItemCreate, ExpenseCreate
from backend.app.services.product_service import ProductService
from backend.app.services.billing_service import BillingService
from backend.app.services.expense_service import ExpenseService
from backend.app.services.analytics_service import AnalyticsService

def test_financial_analytics_calculations(db_session, test_setup):
    biz = test_setup["business"]
    user = test_setup["user"]

    # 1. Product: Cost 100, Selling 150
    prod = ProductService.create_product(
        db=db_session,
        business_id=biz.id,
        data=ProductCreate(
            name="Premium Olive Oil",
            sku="OIL-99",
            selling_price=Decimal("150.00"),
            purchase_cost=Decimal("100.00"),
            tax_rate=Decimal("0.00"),
            initial_stock=100.0
        ),
        user_id=user.id
    )

    # 2. Sell 10 units = Revenue 1500, COGS 1000, Gross Profit 500
    inv = BillingService.create_invoice(
        db=db_session,
        business_id=biz.id,
        data=InvoiceCreate(
            items=[
                InvoiceItemCreate(
                    product_id=prod.id,
                    product_name=prod.name,
                    unit_price=Decimal("150.00"),
                    quantity=10.0,
                    tax_rate=Decimal("0.00")
                )
            ],
            amount_received=Decimal("1500.00"),
            payment_method="upi"
        ),
        user_id=user.id
    )

    # 3. Add expense 200
    ExpenseService.create_expense(
        db=db_session,
        business_id=biz.id,
        data=ExpenseCreate(
            category="Utilities",
            amount=Decimal("200.00"),
            payment_method="cash",
            description="Power bill"
        ),
        user_id=user.id
    )

    # 4. Calculate Summary
    now = datetime.now(timezone.utc)
    summary = AnalyticsService.get_financial_summary(
        db=db_session,
        business_id=biz.id,
        start_date=now - timedelta(days=7),
        end_date=now + timedelta(days=1)
    )

    kpis = summary.kpis
    assert kpis.total_sales == Decimal("1500.00")
    assert kpis.gross_profit == Decimal("500.00")
    assert kpis.total_expenses == Decimal("200.00")
    assert kpis.net_operating_profit == Decimal("300.00") # 500 - 200 = 300
    assert kpis.total_invoices == 1
    assert kpis.total_products == 1
