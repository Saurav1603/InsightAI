from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User
from backend.app.schemas import PurchaseOut, PurchaseCreate
from backend.app.services.purchase_service import PurchaseService

router = APIRouter(prefix="/purchases", tags=["Purchases & Suppliers"])

@router.get("/", response_model=List[PurchaseOut])
def list_purchases(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    purchases = PurchaseService.get_purchases(db, business.id)
    results = []
    for p in purchases:
        s_name = p.supplier.name if p.supplier else None
        p_dict = PurchaseOut.model_validate(p).model_dump()
        p_dict["supplier_name"] = s_name
        results.append(PurchaseOut(**p_dict))
    return results

@router.post("/", response_model=PurchaseOut, status_code=status.HTTP_201_CREATED)
def create_purchase(
    data: PurchaseCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = PurchaseService.create_purchase(db, business.id, data, user_id=current_user.id)
    s_name = p.supplier.name if p.supplier else None
    p_dict = PurchaseOut.model_validate(p).model_dump()
    p_dict["supplier_name"] = s_name
    return PurchaseOut(**p_dict)
