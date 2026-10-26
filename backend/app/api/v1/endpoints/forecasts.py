from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business
from backend.app.models import Business
from backend.app.schemas import ForecastResponse
from backend.app.services.forecast_service import ForecastService

router = APIRouter(prefix="/forecasts", tags=["Forecasting Engine"])

@router.get("/sales", response_model=ForecastResponse)
def get_sales_forecast(
    horizon_days: int = Query(30, ge=7, le=90),
    product_id: Optional[str] = Query(None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    return ForecastService.generate_sales_forecast(
        db=db,
        business_id=business.id,
        horizon_days=horizon_days,
        product_id=product_id
    )
