from typing import Optional, List
from decimal import Decimal
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import Product, ProductCategory, InventoryBalance
from backend.app.schemas import ProductCreate, ProductUpdate, CategoryCreate
from backend.app.services.inventory_service import InventoryService

class ProductService:
    # ---------------- Categories ----------------
    @staticmethod
    def get_categories(db: Session, business_id: str) -> List[ProductCategory]:
        return db.query(ProductCategory).filter(
            ProductCategory.business_id == business_id
        ).order_by(ProductCategory.name.asc()).all()

    @staticmethod
    def create_category(db: Session, business_id: str, data: CategoryCreate) -> ProductCategory:
        cat = ProductCategory(
            business_id=business_id,
            name=data.name.strip(),
            description=data.description
        )
        db.add(cat)
        db.commit()
        db.refresh(cat)
        return cat

    # ---------------- Products ----------------
    @staticmethod
    def get_products(
        db: Session,
        business_id: str,
        search: Optional[str] = None,
        category_id: Optional[str] = None,
        active_only: bool = True
    ) -> List[Product]:
        query = db.query(Product).filter(Product.business_id == business_id)
        if active_only:
            query = query.filter(Product.is_active == True)
        if category_id:
            query = query.filter(Product.category_id == category_id)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter(
                (Product.name.ilike(s)) | (Product.sku.ilike(s)) | (Product.barcode.ilike(s))
            )
        return query.order_by(Product.name.asc()).all()

    @staticmethod
    def get_product(db: Session, business_id: str, product_id: str) -> Optional[Product]:
        return db.query(Product).filter(
            Product.id == product_id,
            Product.business_id == business_id
        ).first()

    @staticmethod
    def create_product(
        db: Session,
        business_id: str,
        data: ProductCreate,
        user_id: Optional[str] = None
    ) -> Product:
        # Check SKU uniqueness in business
        existing = db.query(Product).filter(
            Product.business_id == business_id,
            Product.sku == data.sku.strip()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A product with SKU '{data.sku}' already exists in your catalogue."
            )

        product = Product(
            business_id=business_id,
            category_id=data.category_id,
            sku=data.sku.strip(),
            barcode=data.barcode.strip() if data.barcode else None,
            name=data.name.strip(),
            description=data.description,
            unit_of_measure=data.unit_of_measure,
            selling_price=Decimal(str(data.selling_price)),
            purchase_cost=Decimal(str(data.purchase_cost)),
            tax_rate=Decimal(str(data.tax_rate)),
            reorder_threshold=data.reorder_threshold,
            is_active=True
        )
        db.add(product)
        db.flush()

        # Initialize inventory balance
        balance = InventoryService.get_or_create_balance(db, business_id, product.id)
        if data.initial_stock > 0:
            InventoryService.record_stock_movement(
                db=db,
                business_id=business_id,
                product_id=product.id,
                movement_type="opening",
                quantity_delta=data.initial_stock,
                unit_cost=product.purchase_cost,
                notes="Initial opening stock",
                user_id=user_id
            )

        db.commit()
        db.refresh(product)
        return product

    @staticmethod
    def update_product(
        db: Session,
        business_id: str,
        product_id: str,
        data: ProductUpdate
    ) -> Product:
        product = ProductService.get_product(db, business_id, product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found."
            )

        if data.sku and data.sku.strip() != product.sku:
            existing = db.query(Product).filter(
                Product.business_id == business_id,
                Product.sku == data.sku.strip(),
                Product.id != product_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"SKU '{data.sku}' is already in use by another product."
                )
            product.sku = data.sku.strip()

        if data.category_id is not None:
            product.category_id = data.category_id
        if data.barcode is not None:
            product.barcode = data.barcode.strip() if data.barcode else None
        if data.name is not None:
            product.name = data.name.strip()
        if data.description is not None:
            product.description = data.description
        if data.unit_of_measure is not None:
            product.unit_of_measure = data.unit_of_measure
        if data.selling_price is not None:
            product.selling_price = Decimal(str(data.selling_price))
        if data.purchase_cost is not None:
            product.purchase_cost = Decimal(str(data.purchase_cost))
        if data.tax_rate is not None:
            product.tax_rate = Decimal(str(data.tax_rate))
        if data.reorder_threshold is not None:
            product.reorder_threshold = data.reorder_threshold
        if data.is_active is not None:
            product.is_active = data.is_active

        db.commit()
        db.refresh(product)
        return product
