from typing import Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business
from backend.app.models import Business
from backend.app.schemas import FinancialSummary
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics & Reporting"])

@router.get("/summary", response_model=FinancialSummary)
def get_analytics_summary(
    days: int = Query(30, ge=1, le=365),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)
    return AnalyticsService.get_financial_summary(db, business.id, start_date, end_date)
