from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User, Product
from backend.app.schemas import StockMovementOut, StockAdjustmentCreate, ProductOut
from backend.app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory & Stock Movements"])

@router.get("/movements", response_model=List[StockMovementOut])
def list_stock_movements(
    product_id: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    movements = InventoryService.get_stock_movements(db, business.id, product_id=product_id, limit=limit)
    return [StockMovementOut.model_validate(m) for m in movements]

@router.post("/adjustments", response_model=StockMovementOut, status_code=status.HTTP_201_CREATED)
def record_adjustment(
    data: StockAdjustmentCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    movement = InventoryService.record_stock_movement(
        db=db,
        business_id=business.id,
        product_id=data.product_id,
        movement_type=data.movement_type,
        quantity_delta=data.quantity_delta,
        unit_cost=data.unit_cost or 0,
        notes=data.notes,
        user_id=current_user.id,
        allow_negative=False
    )
    db.commit()
    db.refresh(movement)
    return StockMovementOut.model_validate(movement)

@router.get("/low-stock", response_model=List[ProductOut])
def get_low_stock(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    low_products = InventoryService.get_low_stock_products(db, business.id)
    return [
        ProductOut(
            id=p.id,
            business_id=p.business_id,
            category_id=p.category_id,
            sku=p.sku,
            barcode=p.barcode,
            name=p.name,
            description=p.description,
            unit_of_measure=p.unit_of_measure,
            selling_price=p.selling_price,
            purchase_cost=p.purchase_cost,
            tax_rate=p.tax_rate,
            reorder_threshold=p.reorder_threshold,
            is_active=p.is_active,
            current_stock=p.inventory_balance.current_stock if p.inventory_balance else 0.0,
            created_at=p.created_at
        )
        for p in low_products
    ]
