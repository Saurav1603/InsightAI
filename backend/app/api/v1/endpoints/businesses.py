from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user, get_current_business
from backend.app.models import User, Business, BusinessMembership
from backend.app.schemas import BusinessOut, BusinessCreate
from backend.app.services.auth_service import slugify

router = APIRouter(prefix="/businesses", tags=["Businesses"])

@router.get("/", response_model=List[BusinessOut])
def list_user_businesses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    memberships = db.query(BusinessMembership).filter(
        BusinessMembership.user_id == current_user.id,
        BusinessMembership.is_active == True
    ).all()
    biz_ids = [m.business_id for m in memberships]
    businesses = db.query(Business).filter(Business.id.in_(biz_ids)).all() if biz_ids else []
    return [BusinessOut.model_validate(b) for b in businesses]

@router.post("/", response_model=BusinessOut, status_code=status.HTTP_201_CREATED)
def create_business(
    data: BusinessCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    base_slug = slugify(data.name) or "business"
    slug = f"{base_slug}-{current_user.id[:6]}"

    business = Business(
        name=data.name.strip(),
        slug=slug,
        currency=data.currency,
        currency_symbol=data.currency_symbol,
        tax_identifier=data.tax_identifier,
        address=data.address,
        phone=data.phone,
        email=data.email
    )
    db.add(business)
    db.flush()

    membership = BusinessMembership(
        user_id=current_user.id,
        business_id=business.id,
        role="owner",
        is_active=True
    )
    db.add(membership)
    db.commit()
    db.refresh(business)
    return BusinessOut.model_validate(business)

@router.get("/current", response_model=BusinessOut)
def get_active_business(
    current_business: Business = Depends(get_current_business)
):
    return BusinessOut.model_validate(current_business)
