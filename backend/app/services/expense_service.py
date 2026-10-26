from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models import Expense
from backend.app.schemas import ExpenseCreate
from backend.app.services.billing_service import quantize_dec

class ExpenseService:
    @staticmethod
    def get_expenses(
        db: Session,
        business_id: str,
        category: Optional[str] = None,
        limit: int = 100
    ) -> List[Expense]:
        query = db.query(Expense).filter(Expense.business_id == business_id)
        if category:
            query = query.filter(Expense.category == category)
        return query.order_by(Expense.expense_date.desc()).limit(limit).all()

    @staticmethod
    def create_expense(
        db: Session,
        business_id: str,
        data: ExpenseCreate,
        user_id: Optional[str] = None
    ) -> Expense:
        amount = quantize_dec(Decimal(str(data.amount)))
        expense = Expense(
            business_id=business_id,
            category=data.category.strip(),
            amount=amount,
            payment_method=data.payment_method,
            description=data.description,
            expense_date=data.expense_date or datetime.now(timezone.utc),
            created_by_user_id=user_id
        )
        db.add(expense)
        db.commit()
        db.refresh(expense)
        return expense
