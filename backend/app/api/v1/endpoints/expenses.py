from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User
from backend.app.schemas import ExpenseOut, ExpenseCreate
from backend.app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.get("/", response_model=List[ExpenseOut])
def list_expenses(
    category: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    expenses = ExpenseService.get_expenses(db, business.id, category=category, limit=limit)
    return [ExpenseOut.model_validate(e) for e in expenses]

@router.post("/", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    data: ExpenseCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exp = ExpenseService.create_expense(db, business.id, data, user_id=current_user.id)
    return ExpenseOut.model_validate(exp)
