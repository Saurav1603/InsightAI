import json
from typing import List, Optional
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from backend.app.models import Recommendation, Product, Customer, Invoice, Expense
from backend.app.schemas import RecommendationOut

class RecommendationService:
    @staticmethod
    def evaluate_and_generate_recommendations(db: Session, business_id: str) -> List[Recommendation]:
        """
        Evaluate deterministic business rules and generate/update prioritized recommendations.
        """
        recommendations: List[Recommendation] = []
        now = datetime.now(timezone.utc)

        # ---------------- Rule 1: Out of Stock & Low Stock ----------------
        products = db.query(Product).filter(
            Product.business_id == business_id,
            Product.is_active == True
        ).all()

        for p in products:
            stock = p.inventory_balance.current_stock if p.inventory_balance else 0.0
            if stock == 0:
                rule_id = f"RULE_STOCK_ZERO_{p.id}"
                rec = RecommendationService._upsert_rec(
                    db=db,
                    business_id=business_id,
                    rule_id=rule_id,
                    title=f"Critical: '{p.name}' is Completely Out of Stock",
                    severity="critical",
                    category="inventory",
                    explanation=f"Product {p.name} (SKU: {p.sku}) has 0 units remaining. Customers cannot purchase this item.",
                    suggested_action=f"Create a purchase order immediately to restock at least {int(p.reorder_threshold * 2)} units.",
                    evidence={"sku": p.sku, "current_stock": 0.0, "reorder_threshold": p.reorder_threshold}
                )
                recommendations.append(rec)
            elif stock <= p.reorder_threshold:
                rule_id = f"RULE_STOCK_LOW_{p.id}"
                rec = RecommendationService._upsert_rec(
                    db=db,
                    business_id=business_id,
                    rule_id=rule_id,
                    title=f"Low Stock Alert: '{p.name}'",
                    severity="high",
                    category="inventory",
                    explanation=f"Stock for {p.name} is down to {stock} {p.unit_of_measure}, which is below the threshold of {p.reorder_threshold}.",
                    suggested_action=f"Reorder {p.name} from your preferred supplier before inventory is depleted.",
                    evidence={"sku": p.sku, "current_stock": stock, "reorder_threshold": p.reorder_threshold}
                )
                recommendations.append(rec)

        # ---------------- Rule 2: Negative/Thin Product Margins ----------------
        for p in products:
            if p.selling_price > 0 and p.purchase_cost > 0:
                margin = (p.selling_price - p.purchase_cost) / p.selling_price * Decimal("100.0")
                if margin <= 5.0:
                    rule_id = f"RULE_THIN_MARGIN_{p.id}"
                    rec = RecommendationService._upsert_rec(
                        db=db,
                        business_id=business_id,
                        rule_id=rule_id,
                        title=f"Margin Warning: Thin Profit on '{p.name}' ({float(margin):.1f}%)",
                        severity="medium",
                        category="margin",
                        explanation=f"Selling price is ₹{p.selling_price} against purchase cost ₹{p.purchase_cost}, yielding only {float(margin):.1f}% margin.",
                        suggested_action=f"Consider adjusting selling price upward or negotiating volume discounts with suppliers.",
                        evidence={"sku": p.sku, "selling_price": float(p.selling_price), "cost": float(p.purchase_cost)}
                    )
                    recommendations.append(rec)

        # ---------------- Rule 3: Outstanding Customer Receivables ----------------
        customers_with_balance = db.query(Customer).filter(
            Customer.business_id == business_id,
            Customer.outstanding_balance > Decimal("500.00")
        ).all()

        for c in customers_with_balance:
            rule_id = f"RULE_OVERDUE_PAYMENT_{c.id}"
            rec = RecommendationService._upsert_rec(
                db=db,
                business_id=business_id,
                rule_id=rule_id,
                title=f"Outstanding Receivable: ₹{c.outstanding_balance} from {c.name}",
                severity="medium",
                category="payment",
                explanation=f"Customer {c.name} has an unpaid account balance of ₹{c.outstanding_balance}.",
                suggested_action="Send a payment reminder via WhatsApp/SMS or follow up on the next store visit.",
                evidence={"customer_name": c.name, "phone": c.phone, "balance": float(c.outstanding_balance)}
            )
            recommendations.append(rec)

        db.commit()
        return recommendations

    @staticmethod
    def _upsert_rec(
        db: Session,
        business_id: str,
        rule_id: str,
        title: str,
        severity: str,
        category: str,
        explanation: str,
        suggested_action: str,
        evidence: dict
    ) -> Recommendation:
        rec = db.query(Recommendation).filter(
            Recommendation.business_id == business_id,
            Recommendation.rule_id == rule_id
        ).first()

        if rec:
            rec.title = title
            rec.severity = severity
            rec.explanation = explanation
            rec.suggested_action = suggested_action
            rec.evidence_json = json.dumps(evidence)
            rec.updated_at = datetime.now(timezone.utc)
        else:
            rec = Recommendation(
                business_id=business_id,
                rule_id=rule_id,
                title=title,
                severity=severity,
                category=category,
                explanation=explanation,
                suggested_action=suggested_action,
                evidence_json=json.dumps(evidence),
                status="new",
                created_at=datetime.now(timezone.utc)
            )
            db.add(rec)
        db.flush()
        return rec

    @staticmethod
    def get_recommendations(
        db: Session,
        business_id: str,
        status: Optional[str] = None
    ) -> List[Recommendation]:
        # Always run fresh evaluation so recommendations reflect live database state
        RecommendationService.evaluate_and_generate_recommendations(db, business_id)

        query = db.query(Recommendation).filter(Recommendation.business_id == business_id)
        if status:
            query = query.filter(Recommendation.status == status)
        
        # Order by severity priority
        severity_order = {"critical": 1, "high": 2, "medium": 3, "low": 4}
        recs = query.all()
        return sorted(recs, key=lambda r: (severity_order.get(r.severity, 5), r.created_at), reverse=False)
