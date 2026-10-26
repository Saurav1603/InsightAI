from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User, Product
from backend.app.schemas import (
    ProductOut, ProductCreate, ProductUpdate, CategoryOut, CategoryCreate
)
from backend.app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products & Catalogue"])

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    cats = ProductService.get_categories(db, business.id)
    return [CategoryOut.model_validate(c) for c in cats]

@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    cat = ProductService.create_category(db, business.id, data)
    return CategoryOut.model_validate(cat)

@router.get("/", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    products = ProductService.get_products(db, business.id, search=search, category_id=category_id)
    results = []
    for p in products:
        stock = p.inventory_balance.current_stock if p.inventory_balance else 0.0
        p_out = ProductOut(
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
            current_stock=stock,
            created_at=p.created_at
        )
        results.append(p_out)
    return results

@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    prod = ProductService.create_product(db, business.id, data, user_id=current_user.id)
    stock = prod.inventory_balance.current_stock if prod.inventory_balance else 0.0
    return ProductOut(
        id=prod.id,
        business_id=prod.business_id,
        category_id=prod.category_id,
        sku=prod.sku,
        barcode=prod.barcode,
        name=prod.name,
        description=prod.description,
        unit_of_measure=prod.unit_of_measure,
        selling_price=prod.selling_price,
        purchase_cost=prod.purchase_cost,
        tax_rate=prod.tax_rate,
        reorder_threshold=prod.reorder_threshold,
        is_active=prod.is_active,
        current_stock=stock,
        created_at=prod.created_at
    )

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    p = ProductService.get_product(db, business.id, product_id)
    stock = p.inventory_balance.current_stock if p.inventory_balance else 0.0
    return ProductOut(
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
        current_stock=stock,
        created_at=p.created_at
    )

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: str,
    data: ProductUpdate,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    prod = ProductService.update_product(db, business.id, product_id, data)
    stock = prod.inventory_balance.current_stock if prod.inventory_balance else 0.0
    return ProductOut(
        id=prod.id,
        business_id=prod.business_id,
        category_id=prod.category_id,
        sku=prod.sku,
        barcode=prod.barcode,
        name=prod.name,
        description=prod.description,
        unit_of_measure=prod.unit_of_measure,
        selling_price=prod.selling_price,
        purchase_cost=prod.purchase_cost,
        tax_rate=prod.tax_rate,
        reorder_threshold=prod.reorder_threshold,
        is_active=prod.is_active,
        current_stock=stock,
        created_at=prod.created_at
    )
