from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business
from backend.app.models import Business
from backend.app.schemas import SupplierOut, SupplierCreate
from backend.app.services.partner_service import PartnerService

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("/", response_model=List[SupplierOut])
def list_suppliers(
    search: Optional[str] = Query(None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    suppliers = PartnerService.get_suppliers(db, business.id, search=search)
    return [SupplierOut.model_validate(s) for s in suppliers]

@router.post("/", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    data: SupplierCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    s = PartnerService.create_supplier(db, business.id, data)
    return SupplierOut.model_validate(s)
