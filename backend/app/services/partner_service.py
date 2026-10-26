from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models import Customer, Supplier
from backend.app.schemas import (
    CustomerCreate, CustomerUpdate, SupplierCreate, SupplierUpdate
)

class PartnerService:
    # ---------------- Customers ----------------
    @staticmethod
    def get_customers(db: Session, business_id: str, search: Optional[str] = None) -> List[Customer]:
        query = db.query(Customer).filter(Customer.business_id == business_id)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter((Customer.name.ilike(s)) | (Customer.phone.ilike(s)))
        return query.order_by(Customer.name.asc()).all()

    @staticmethod
    def get_customer(db: Session, business_id: str, customer_id: str) -> Optional[Customer]:
        return db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.business_id == business_id
        ).first()

    @staticmethod
    def create_customer(db: Session, business_id: str, data: CustomerCreate) -> Customer:
        cust = Customer(
            business_id=business_id,
            name=data.name.strip(),
            phone=data.phone.strip() if data.phone else None,
            email=data.email.lower() if data.email else None,
            address=data.address
        )
        db.add(cust)
        db.commit()
        db.refresh(cust)
        return cust

    # ---------------- Suppliers ----------------
    @staticmethod
    def get_suppliers(db: Session, business_id: str, search: Optional[str] = None) -> List[Supplier]:
        query = db.query(Supplier).filter(Supplier.business_id == business_id)
        if search:
            s = f"%{search.strip()}%"
            query = query.filter((Supplier.name.ilike(s)) | (Supplier.phone.ilike(s)))
        return query.order_by(Supplier.name.asc()).all()

    @staticmethod
    def get_supplier(db: Session, business_id: str, supplier_id: str) -> Optional[Supplier]:
        return db.query(Supplier).filter(
            Supplier.id == supplier_id,
            Supplier.business_id == business_id
        ).first()

    @staticmethod
    def create_supplier(db: Session, business_id: str, data: SupplierCreate) -> Supplier:
        supplier = Supplier(
            business_id=business_id,
            name=data.name.strip(),
            contact_person=data.contact_person,
            phone=data.phone.strip() if data.phone else None,
            email=data.email.lower() if data.email else None,
            address=data.address
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return supplier
