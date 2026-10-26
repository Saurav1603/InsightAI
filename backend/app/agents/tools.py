from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.app.services.analytics_service import AnalyticsService
from backend.app.services.forecast_service import ForecastService
from backend.app.services.document_service import DocumentService
from backend.app.services.recommendation_service import RecommendationService

class BusinessTools:
    @staticmethod
    def get_financial_summary(db: Session, business_id: str, days: int = 30) -> Dict[str, Any]:
        """Fetch total sales, gross profit, margin, expenses, and net profit."""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        summary = AnalyticsService.get_financial_summary(db, business_id, start_date, end_date)
        return {
            "period_days": days,
            "kpis": summary.kpis.model_dump(),
            "top_products": [p.model_dump() for p in summary.top_products[:5]],
            "category_breakdown": [c.model_dump() for c in summary.category_breakdown],
            "expense_breakdown": [e.model_dump() for e in summary.expense_breakdown],
        }

    @staticmethod
    def run_sales_forecast(db: Session, business_id: str, horizon_days: int = 30) -> Dict[str, Any]:
        """Generate time-series sales projection with confidence intervals and backtesting metrics."""
        result = ForecastService.generate_sales_forecast(db, business_id, horizon_days=horizon_days)
        return result.model_dump()

    @staticmethod
    def search_documents(db: Session, business_id: str, query: str) -> Dict[str, Any]:
        """Search uploaded business documents and retrieve passages with relevance citations."""
        citations = DocumentService.retrieve_relevant_chunks(db, business_id, query, top_k=4)
        return {
            "query": query,
            "citations_found": len(citations),
            "citations": [c.model_dump() for c in citations]
        }

    @staticmethod
    def get_recommendations(db: Session, business_id: str) -> Dict[str, Any]:
        """Evaluate deterministic rules for stock levels, margin drops, and overdue customer payments."""
        recs = RecommendationService.get_recommendations(db, business_id)
        return {
            "total_recommendations": len(recs),
            "recommendations": [
                {
                    "title": r.title,
                    "severity": r.severity,
                    "category": r.category,
                    "explanation": r.explanation,
                    "suggested_action": r.suggested_action
                }
                for r in recs
            ]
        }
