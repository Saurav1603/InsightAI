from typing import Optional, List
from decimal import Decimal
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import InventoryBalance, StockMovement, Product

class InventoryService:
    @staticmethod
    def get_or_create_balance(db: Session, business_id: str, product_id: str) -> InventoryBalance:
        balance = db.query(InventoryBalance).filter(
            InventoryBalance.business_id == business_id,
            InventoryBalance.product_id == product_id
        ).first()

        if not balance:
            balance = InventoryBalance(
                business_id=business_id,
                product_id=product_id,
                current_stock=0.0,
                reserved_stock=0.0,
                last_movement_at=datetime.now(timezone.utc)
            )
            db.add(balance)
            db.flush()
        return balance

    @staticmethod
    def record_stock_movement(
        db: Session,
        business_id: str,
        product_id: str,
        movement_type: str,
        quantity_delta: float,
        unit_cost: Decimal = Decimal("0.00"),
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        notes: Optional[str] = None,
        user_id: Optional[str] = None,
        allow_negative: bool = False
    ) -> StockMovement:
        """
        Record an immutable stock movement and update the running inventory balance atomically.
        """
        # Lock balance row if supported or fetch
        balance = InventoryService.get_or_create_balance(db, business_id, product_id)
        
        new_stock = balance.current_stock + quantity_delta
        if new_stock < 0 and not allow_negative:
            product = db.query(Product).filter(Product.id == product_id).first()
            p_name = product.name if product else product_id
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient inventory for '{p_name}'. Available: {balance.current_stock}, Requested deduction: {abs(quantity_delta)}"
            )

        balance.current_stock = new_stock
        balance.last_movement_at = datetime.now(timezone.utc)

        movement = StockMovement(
            business_id=business_id,
            product_id=product_id,
            movement_type=movement_type,
            quantity_delta=quantity_delta,
            resulting_balance=new_stock,
            unit_cost=unit_cost,
            reference_type=reference_type,
            reference_id=reference_id,
            notes=notes,
            created_by_user_id=user_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(movement)
        db.flush()
        return movement

    @staticmethod
    def get_stock_movements(
        db: Session,
        business_id: str,
        product_id: Optional[str] = None,
        limit: int = 100
    ) -> List[StockMovement]:
        query = db.query(StockMovement).filter(StockMovement.business_id == business_id)
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        return query.order_by(StockMovement.created_at.desc()).limit(limit).all()

    @staticmethod
    def get_low_stock_products(db: Session, business_id: str) -> List[Product]:
        """Fetch active products whose current stock is at or below the reorder threshold."""
        products = db.query(Product).join(
            InventoryBalance, Product.id == InventoryBalance.product_id, isouter=True
        ).filter(
            Product.business_id == business_id,
            Product.is_active == True
        ).all()

        low_stock = []
        for p in products:
            curr = p.inventory_balance.current_stock if p.inventory_balance else 0.0
            if curr <= p.reorder_threshold:
                low_stock.append(p)
        return low_stock
