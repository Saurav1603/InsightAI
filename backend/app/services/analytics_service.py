from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.app.models import (
    Invoice, InvoiceItem, Expense, Product, ProductCategory, InventoryBalance, Customer
)
from backend.app.schemas import (
    DashboardKPIs, SalesTrendPoint, CategorySalesPoint, TopProductPoint,
    ExpenseBreakdownPoint, FinancialSummary
)

class AnalyticsService:
    @staticmethod
    def get_financial_summary(
        db: Session,
        business_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> FinancialSummary:
        now = datetime.now(timezone.utc)
        if not end_date:
            end_date = now
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # 1. Finalized Invoices Query in Date Range
        invoices = db.query(Invoice).filter(
            Invoice.business_id == business_id,
            Invoice.status == "finalized",
            Invoice.created_at >= start_date,
            Invoice.created_at <= end_date
        ).all()

        total_sales = Decimal("0.00")
        total_cogs = Decimal("0.00")
        total_invoices = len(invoices)
        outstanding_receivables = Decimal("0.00")

        # Trend dictionary keyed by date string YYYY-MM-DD
        trend_dict: Dict[str, Dict[str, Any]] = {}
        # Pre-fill daily slots
        cur_day = start_date.date()
        end_day = end_date.date()
        while cur_day <= end_day:
            day_str = cur_day.strftime("%Y-%m-%d")
            trend_dict[day_str] = {"sales": 0.0, "cogs": 0.0, "profit": 0.0, "count": 0}
            cur_day += timedelta(days=1)

        product_sales_map: Dict[str, Dict[str, Any]] = {}

        for inv in invoices:
            total_sales += inv.total_amount
            outstanding_receivables += inv.balance_amount
            day_str = inv.created_at.strftime("%Y-%m-%d")
            
            inv_cogs = Decimal("0.00")
            for itm in inv.items:
                cost = Decimal(str(itm.purchase_cost_snapshot or "0.00")) * Decimal(str(itm.quantity))
                inv_cogs += cost

                # Aggregate product sales
                p_key = itm.product_name
                if p_key not in product_sales_map:
                    product_sales_map[p_key] = {
                        "name": itm.product_name,
                        "sku": itm.sku,
                        "units": 0.0,
                        "revenue": Decimal("0.00"),
                        "cogs": Decimal("0.00")
                    }
                product_sales_map[p_key]["units"] += itm.quantity
                product_sales_map[p_key]["revenue"] += itm.line_total
                product_sales_map[p_key]["cogs"] += cost

            total_cogs += inv_cogs

            if day_str in trend_dict:
                trend_dict[day_str]["sales"] += float(inv.total_amount)
                trend_dict[day_str]["cogs"] += float(inv_cogs)
                trend_dict[day_str]["profit"] += float(inv.total_amount - inv_cogs)
                trend_dict[day_str]["count"] += 1

        gross_profit = total_sales - total_cogs
        gross_margin_pct = (float(gross_profit) / float(total_sales) * 100.0) if total_sales > 0 else 0.0

        # 2. Operating Expenses in Date Range
        expenses = db.query(Expense).filter(
            Expense.business_id == business_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date
        ).all()

        total_expenses = Decimal("0.00")
        expense_cat_map: Dict[str, Decimal] = {}
        for exp in expenses:
            total_expenses += exp.amount
            expense_cat_map[exp.category] = expense_cat_map.get(exp.category, Decimal("0.00")) + exp.amount

        net_operating_profit = gross_profit - total_expenses

        # 3. Product Count & Low Stock Items
        products = db.query(Product).filter(
            Product.business_id == business_id,
            Product.is_active == True
        ).all()
        total_products = len(products)
        low_stock_count = 0
        for p in products:
            stock = p.inventory_balance.current_stock if p.inventory_balance else 0.0
            if stock <= p.reorder_threshold:
                low_stock_count += 1

        kpis = DashboardKPIs(
            total_sales=total_sales,
            gross_profit=gross_profit,
            gross_margin_percentage=round(gross_margin_pct, 1),
            total_invoices=total_invoices,
            total_products=total_products,
            low_stock_items=low_stock_count,
            outstanding_receivables=outstanding_receivables,
            total_expenses=total_expenses,
            net_operating_profit=net_operating_profit
        )

        # 4. Format Sales Trend Points
        sales_trend = [
            SalesTrendPoint(
                date=k,
                sales=round(v["sales"], 2),
                gross_profit=round(v["profit"], 2),
                invoice_count=v["count"]
            )
            for k, v in sorted(trend_dict.items())
        ]

        # 5. Format Top Products
        sorted_prods = sorted(product_sales_map.values(), key=lambda x: x["revenue"], reverse=True)[:8]
        top_products = [
            TopProductPoint(
                product_name=p["name"],
                sku=p["sku"],
                units_sold=round(p["units"], 1),
                revenue=float(p["revenue"]),
                gross_profit=float(p["revenue"] - p["cogs"])
            )
            for p in sorted_prods
        ]

        # 6. Format Category Breakdown
        categories = db.query(ProductCategory).filter(ProductCategory.business_id == business_id).all()
        cat_id_name = {c.id: c.name for c in categories}
        cat_revenue_map: Dict[str, float] = {}

        for p in products:
            c_name = cat_id_name.get(p.category_id, "General")
            p_data = product_sales_map.get(p.name)
            if p_data:
                cat_revenue_map[c_name] = cat_revenue_map.get(c_name, 0.0) + float(p_data["revenue"])

        total_cat_rev = sum(cat_revenue_map.values()) or 1.0
        category_breakdown = [
            CategorySalesPoint(
                category=cat,
                sales=round(rev, 2),
                percentage=round((rev / total_cat_rev) * 100.0, 1)
            )
            for cat, rev in sorted(cat_revenue_map.items(), key=lambda x: x[1], reverse=True)
        ]

        # 7. Format Expense Breakdown
        total_exp_float = float(total_expenses) or 1.0
        expense_breakdown = [
            ExpenseBreakdownPoint(
                category=cat,
                amount=float(amt),
                percentage=round((float(amt) / total_exp_float) * 100.0, 1)
            )
            for cat, amt in sorted(expense_cat_map.items(), key=lambda x: x[1], reverse=True)
        ]

        return FinancialSummary(
            kpis=kpis,
            sales_trend=sales_trend,
            category_breakdown=category_breakdown,
            top_products=top_products,
            expense_breakdown=expense_breakdown
        )
