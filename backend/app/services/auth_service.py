import re
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import User, Business, BusinessMembership, AuditLog
from backend.app.schemas import UserRegister, UserLogin
from backend.app.core.security import hash_password, verify_password, create_access_token

def slugify(text: str) -> str:
    slug = re.sub(r'[^\w\s-]', '', text.lower()).strip()
    return re.sub(r'[-\s]+', '-', slug)

class AuthService:
    @staticmethod
    def register_user(db: Session, data: UserRegister) -> Tuple[User, Business, str]:
        # Check if email exists
        existing = db.query(User).filter(User.email == data.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists."
            )

        # Create user
        user = User(
            email=data.email.lower(),
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            is_active=True
        )
        db.add(user)
        db.flush()

        # Create initial business workspace
        biz_name = data.business_name or f"{data.full_name}'s Business"
        base_slug = slugify(biz_name) or "workspace"
        slug = f"{base_slug}-{user.id[:6]}"

        business = Business(
            name=biz_name,
            slug=slug,
            currency="INR",
            currency_symbol="₹",
            email=data.email.lower(),
            invoice_prefix="INV-",
            invoice_next_number=1001
        )
        db.add(business)
        db.flush()

        # Add user as Owner
        membership = BusinessMembership(
            user_id=user.id,
            business_id=business.id,
            role="owner",
            is_active=True
        )
        db.add(membership)

        # Log audit
        audit = AuditLog(
            business_id=business.id,
            user_id=user.id,
            action="USER_REGISTER",
            entity_type="User",
            entity_id=user.id,
            details_json=f'{{"email": "{user.email}", "business": "{business.name}"}}'
        )
        db.add(audit)
        db.commit()
        db.refresh(user)
        db.refresh(business)

        token = create_access_token(subject=user.id)
        return user, business, token

    @staticmethod
    def authenticate_user(db: Session, data: UserLogin) -> Tuple[User, List[Business], str]:
        user = db.query(User).filter(User.email == data.email.lower()).first()
        if not user or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password."
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated."
            )

        # Fetch active businesses
        memberships = db.query(BusinessMembership).filter(
            BusinessMembership.user_id == user.id,
            BusinessMembership.is_active == True
        ).all()
        biz_ids = [m.business_id for m in memberships]
        businesses = db.query(Business).filter(Business.id.in_(biz_ids)).all() if biz_ids else []

        token = create_access_token(subject=user.id)
        return user, businesses, token
