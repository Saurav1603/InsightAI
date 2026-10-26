from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_user
from backend.app.models import User, Business, BusinessMembership
from backend.app.schemas import UserRegister, UserLogin, UserOut, Token, BusinessOut
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, db: Session = Depends(get_db)):
    user, business, token = AuthService.register_user(db, data)
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
        businesses=[BusinessOut.model_validate(business)],
        active_business_id=business.id
    )

@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user, businesses, token = AuthService.authenticate_user(db, data)
    biz_outs = [BusinessOut.model_validate(b) for b in businesses]
    active_id = biz_outs[0].id if biz_outs else None
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user),
        businesses=biz_outs,
        active_business_id=active_id
    )

@router.get("/me", response_model=UserOut)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
