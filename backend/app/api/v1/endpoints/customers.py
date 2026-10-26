from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business
from backend.app.models import Business
from backend.app.schemas import CustomerOut, CustomerCreate
from backend.app.services.partner_service import PartnerService

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("/", response_model=List[CustomerOut])
def list_customers(
    search: Optional[str] = Query(None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    customers = PartnerService.get_customers(db, business.id, search=search)
    return [CustomerOut.model_validate(c) for c in customers]

@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    c = PartnerService.create_customer(db, business.id, data)
    return CustomerOut.model_validate(c)
