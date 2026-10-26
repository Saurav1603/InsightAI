import json
import math
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.models import Invoice, ForecastRun
from backend.app.schemas import ForecastResponse, ForecastPoint

class ForecastService:
    @staticmethod
    def generate_sales_forecast(
        db: Session,
        business_id: str,
        horizon_days: int = 30,
        product_id: Optional[str] = None
    ) -> ForecastResponse:
        # 1. Fetch all finalized invoices
        query = db.query(Invoice).filter(
            Invoice.business_id == business_id,
            Invoice.status == "finalized"
        ).order_by(Invoice.created_at.asc())

        invoices = query.all()

        if not invoices:
            # Empty historical data
            today = datetime.now(timezone.utc).date()
            empty_forecast = [
                ForecastPoint(
                    date=(today + timedelta(days=i+1)).strftime("%Y-%m-%d"),
                    predicted_sales=0.0,
                    lower_bound=0.0,
                    upper_bound=0.0
                )
                for i in range(horizon_days)
            ]
            return ForecastResponse(
                model_name="AdaptiveTrendBaseline",
                target_metric="daily_sales",
                horizon_days=horizon_days,
                evaluation_metrics={"mae": 0.0, "rmse": 0.0, "mape_percent": 0.0},
                data_points_used=0,
                is_data_sufficient=False,
                data_limitation_warning="No historical finalized invoices found. Start recording sales to generate accurate forecasts.",
                historical_trend=[],
                forecast=empty_forecast
            )

        # 2. Build Daily Time Series
        daily_sales: Dict[str, float] = {}
        first_date = invoices[0].created_at.date()
        last_date = invoices[-1].created_at.date()

        # Fill all dates from first to last
        curr = first_date
        while curr <= last_date:
            daily_sales[curr.strftime("%Y-%m-%d")] = 0.0
            curr += timedelta(days=1)

        for inv in invoices:
            d_str = inv.created_at.date().strftime("%Y-%m-%d")
            daily_sales[d_str] = daily_sales.get(d_str, 0.0) + float(inv.total_amount)

        sorted_dates = sorted(daily_sales.keys())
        values = np.array([daily_sales[d] for d in sorted_dates], dtype=float)
        n = len(values)

        is_sufficient = n >= 14
        warning = None
        if not is_sufficient:
            warning = f"Only {n} days of history available. Reliable forecasting typically requires at least 14-30 days."

        # 3. Model: Exponential Smoothing + Trend
        # Alpha smoothing parameter
        alpha = 0.3
        smoothed = np.zeros(n)
        smoothed[0] = values[0]
        for t in range(1, n):
            smoothed[t] = alpha * values[t] + (1 - alpha) * smoothed[t-1]

        # Calculate residual std dev for prediction intervals
        residuals = values - smoothed
        mae = float(np.mean(np.abs(residuals)))
        rmse = float(np.sqrt(np.mean(residuals**2)))
        mean_val = float(np.mean(values))
        mape = float((mae / mean_val) * 100.0) if mean_val > 0 else 0.0

        std_err = float(np.std(residuals)) if n > 1 else (mean_val * 0.15)
        last_level = float(smoothed[-1])

        # Trend estimation using linear slope of recent window
        window = min(n, 14)
        if window > 2:
            x_win = np.arange(window)
            y_win = smoothed[-window:]
            slope, _ = np.polyfit(x_win, y_win, 1)
            # Dampen slope to prevent runaway extrapolation
            slope = float(np.clip(slope, -mean_val * 0.05, mean_val * 0.05))
        else:
            slope = 0.0

        # 4. Generate Future Forecast
        forecast_points: List[ForecastPoint] = []
        end_date = datetime.strptime(sorted_dates[-1], "%Y-%m-%d").date()

        for step in range(1, horizon_days + 1):
            future_date = (end_date + timedelta(days=step)).strftime("%Y-%m-%d")
            # Baseline projection with damped trend
            pred = max(0.0, last_level + (slope * step * (0.95 ** step)))
            # Expanding prediction intervals (sqrt of time horizon)
            uncertainty = 1.96 * std_err * math.sqrt(1.0 + 0.05 * step)
            lower = max(0.0, pred - uncertainty)
            upper = pred + uncertainty

            forecast_points.append(
                ForecastPoint(
                    date=future_date,
                    predicted_sales=round(pred, 2),
                    lower_bound=round(lower, 2),
                    upper_bound=round(upper, 2)
                )
            )

        # Historical trend (last 30 points)
        hist_trend = [
            {"date": d, "sales": round(daily_sales[d], 2)}
            for d in sorted_dates[-30:]
        ]

        # 5. Persist run for provenance
        forecast_run = ForecastRun(
            business_id=business_id,
            model_name="AdaptiveTrendBaseline",
            target_metric="daily_sales",
            horizon_days=horizon_days,
            evaluation_metrics_json=json.dumps({"mae": round(mae, 2), "rmse": round(rmse, 2), "mape_percent": round(mape, 1)}),
            historical_actuals_json=json.dumps(hist_trend[-10:]),
            forecast_values_json=json.dumps([f.model_dump() for f in forecast_points[:10]]),
            created_at=datetime.now(timezone.utc)
        )
        db.add(forecast_run)
        db.commit()

        return ForecastResponse(
            model_name="AdaptiveTrendBaseline",
            target_metric="daily_sales",
            horizon_days=horizon_days,
            evaluation_metrics={
                "mae": round(mae, 2),
                "rmse": round(rmse, 2),
                "mape_percent": round(mape, 1)
            },
            data_points_used=n,
            is_data_sufficient=is_sufficient,
            data_limitation_warning=warning,
            historical_trend=hist_trend,
            forecast=forecast_points
        )
