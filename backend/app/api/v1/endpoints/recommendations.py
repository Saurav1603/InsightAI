from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business
from backend.app.models import Business, Recommendation
from backend.app.schemas import RecommendationOut
from backend.app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["Business Recommendations & Alerts"])

@router.get("/", response_model=List[RecommendationOut])
def get_recommendations(
    status_filter: Optional[str] = Query(None, alias="status"),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    recs = RecommendationService.get_recommendations(db, business.id, status=status_filter)
    return [RecommendationOut.model_validate(r) for r in recs]

@router.post("/{rec_id}/resolve", response_model=RecommendationOut)
def resolve_recommendation(
    rec_id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(
        Recommendation.id == rec_id,
        Recommendation.business_id == business.id
    ).first()
    if rec:
        rec.status = "resolved"
        db.commit()
        db.refresh(rec)
    return RecommendationOut.model_validate(rec)
