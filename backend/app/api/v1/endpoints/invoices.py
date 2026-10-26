from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User, Invoice
from backend.app.schemas import InvoiceOut, InvoiceCreate, PaymentCreate
from backend.app.services.billing_service import BillingService
from backend.app.services.pdf_service import PDFService

router = APIRouter(prefix="/invoices", tags=["Invoices & POS Billing"])

@router.get("/", response_model=List[InvoiceOut])
def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(100, le=500),
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    invoices = BillingService.get_invoices(db, business.id, status_filter=status_filter, search=search, limit=limit)
    results = []
    for inv in invoices:
        cust_name = inv.customer.name if inv.customer else inv.walk_in_customer_name
        inv_dict = InvoiceOut.model_validate(inv).model_dump()
        inv_dict["customer_name"] = cust_name
        results.append(InvoiceOut(**inv_dict))
    return results

@router.post("/", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
def create_pos_invoice(
    data: InvoiceCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = BillingService.create_invoice(db, business.id, data, user_id=current_user.id)
    cust_name = inv.customer.name if inv.customer else inv.walk_in_customer_name
    inv_dict = InvoiceOut.model_validate(inv).model_dump()
    inv_dict["customer_name"] = cust_name
    return InvoiceOut(**inv_dict)

@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    inv = BillingService.get_invoice(db, business.id, invoice_id)
    cust_name = inv.customer.name if inv.customer else inv.walk_in_customer_name
    inv_dict = InvoiceOut.model_validate(inv).model_dump()
    inv_dict["customer_name"] = cust_name
    return InvoiceOut(**inv_dict)

@router.post("/{invoice_id}/cancel", response_model=InvoiceOut)
def cancel_invoice(
    invoice_id: str,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = BillingService.cancel_invoice(db, business.id, invoice_id, user_id=current_user.id)
    cust_name = inv.customer.name if inv.customer else inv.walk_in_customer_name
    inv_dict = InvoiceOut.model_validate(inv).model_dump()
    inv_dict["customer_name"] = cust_name
    return InvoiceOut(**inv_dict)

@router.post("/{invoice_id}/payments", response_model=InvoiceOut)
def add_invoice_payment(
    invoice_id: str,
    data: PaymentCreate,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    inv = BillingService.add_payment(db, business.id, invoice_id, data, user_id=current_user.id)
    cust_name = inv.customer.name if inv.customer else inv.walk_in_customer_name
    inv_dict = InvoiceOut.model_validate(inv).model_dump()
    inv_dict["customer_name"] = cust_name
    return InvoiceOut(**inv_dict)

@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: str,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    inv = BillingService.get_invoice(db, business.id, invoice_id)
    pdf_buffer = PDFService.generate_invoice_pdf(inv, business)
    filename = f"Invoice_{inv.invoice_number}.pdf"
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
