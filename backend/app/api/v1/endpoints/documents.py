from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User
from backend.app.schemas import DocumentOut, DocumentQueryRequest, DocumentQueryResponse, DocumentCitation
from backend.app.services.document_service import DocumentService

router = APIRouter(prefix="/documents", tags=["Document Intelligence (RAG)"])

@router.get("/", response_model=List[DocumentOut])
def list_documents(
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    docs = DocumentService.get_documents(db, business.id)
    return [DocumentOut.model_validate(d) for d in docs]

@router.post("/upload", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = DocumentService.upload_document(
        db=db,
        business_id=business.id,
        file=file,
        title=title,
        user_id=current_user.id
    )
    return DocumentOut.model_validate(doc)

@router.post("/query", response_model=DocumentQueryResponse)
def query_documents(
    data: DocumentQueryRequest,
    business: Business = Depends(get_current_business),
    db: Session = Depends(get_db)
):
    citations = DocumentService.retrieve_relevant_chunks(
        db=db,
        business_id=business.id,
        query=data.question,
        document_id=data.document_id,
        top_k=4
    )
    if not citations:
        answer = "No relevant text passages found in your uploaded business documents."
    else:
        snippets = "\n".join([f"- From '{c.document_title}': \"{c.snippet}\"" for c in citations])
        answer = f"Based on the following extracted passages from your business documents:\n\n{snippets}"

    return DocumentQueryResponse(
        question=data.question,
        answer=answer,
        citations=citations
    )
