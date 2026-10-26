from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token
from backend.app.models import User, Business, BusinessMembership

security_bearer = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Validate bearer token and return authenticated User."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials not provided.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_business(
    x_business_id: Optional[str] = Header(None, alias="X-Business-Id"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Business:
    """Validate user has active membership in the requested business workspace."""
    if not x_business_id:
        # Check if user has any active business membership as default fallback
        membership = db.query(BusinessMembership).filter(
            BusinessMembership.user_id == current_user.id,
            BusinessMembership.is_active == True
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No business workspace found. Please select or create a business."
            )
        business = db.query(Business).filter(Business.id == membership.business_id).first()
        return business

    membership = db.query(BusinessMembership).filter(
        BusinessMembership.user_id == current_user.id,
        BusinessMembership.business_id == x_business_id,
        BusinessMembership.is_active == True
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this business workspace."
        )

    business = db.query(Business).filter(Business.id == x_business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Business workspace not found."
        )
    return business


class RoleChecker:
    """Enforce minimum required role within the active business."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(
        self,
        current_user: User = Depends(get_current_user),
        current_business: Business = Depends(get_current_business),
        db: Session = Depends(get_db)
    ) -> BusinessMembership:
        membership = db.query(BusinessMembership).filter(
            BusinessMembership.user_id == current_user.id,
            BusinessMembership.business_id == current_business.id,
            BusinessMembership.is_active == True
        ).first()

        if not membership or membership.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Action requires one of roles: {', '.join(self.allowed_roles)}"
            )
        return membership
