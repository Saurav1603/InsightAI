import os
import re
import json
import math
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from backend.app.models import Document, DocumentChunk
from backend.app.schemas import DocumentOut, DocumentCitation, DocumentQueryResponse
from backend.app.core.config import settings

def simple_tokenize(text: str) -> List[str]:
    return re.findall(r'\b[a-zA-Z0-9_]{2,}\b', text.lower())

def compute_tf_idf_similarity(query: str, doc_text: str) -> float:
    q_tokens = simple_tokenize(query)
    d_tokens = simple_tokenize(doc_text)
    if not q_tokens or not d_tokens:
        return 0.0

    d_freq: Dict[str, int] = {}
    for t in d_tokens:
        d_freq[t] = d_freq.get(t, 0) + 1

    score = 0.0
    for qt in q_tokens:
        if qt in d_freq:
            # TF score with length dampening
            score += (1 + math.log(d_freq[qt])) * (1.0 / math.sqrt(len(d_tokens)))
    return score

class DocumentService:
    @staticmethod
    def upload_document(
        db: Session,
        business_id: str,
        file: UploadFile,
        title: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Document:
        filename = file.filename or "uploaded_file"
        title_str = title or filename
        
        # Save file to disk
        biz_dir = os.path.join(settings.UPLOAD_DIR, business_id)
        os.makedirs(biz_dir, exist_ok=True)
        file_path = os.path.join(biz_dir, f"{int(datetime.now().timestamp())}_{filename}")

        contents = file.file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        file_size = len(contents)
        mime_type = file.content_type or "application/octet-stream"

        # Extract text based on file format
        extracted_text = ""
        try:
            if filename.endswith(".txt") or filename.endswith(".csv") or filename.endswith(".json"):
                extracted_text = contents.decode("utf-8", errors="ignore")
            elif filename.endswith(".pdf"):
                # Simple fallback PDF text extraction or decoded string
                try:
                    import pypdf
                    reader = pypdf.PdfReader(file_path)
                    extracted_text = "\n".join([page.extract_text() or "" for page in reader.pages])
                except Exception:
                    # Raw decode if pypdf is not available
                    extracted_text = contents.decode("latin-1", errors="ignore")
            else:
                extracted_text = contents.decode("latin-1", errors="ignore")
        except Exception as e:
            extracted_text = f"Error extracting text: {str(e)}"

        # Chunk text
        chunks = DocumentService.chunk_text(extracted_text, chunk_size=400, overlap=50)

        summary_preview = extracted_text[:300] + ("..." if len(extracted_text) > 300 else "")

        document = Document(
            business_id=business_id,
            title=title_str,
            original_filename=filename,
            file_path=file_path,
            file_size_bytes=file_size,
            mime_type=mime_type,
            status="processed",
            total_chunks=len(chunks),
            extracted_text_summary=summary_preview,
            created_by_user_id=user_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(document)
        db.flush()

        for idx, chunk_content in enumerate(chunks):
            chunk = DocumentChunk(
                document_id=document.id,
                business_id=business_id,
                chunk_index=idx,
                content=chunk_content,
                metadata_json=json.dumps({"source": filename, "chunk": idx}),
                created_at=datetime.now(timezone.utc)
            )
            db.add(chunk)

        db.commit()
        db.refresh(document)
        return document

    @staticmethod
    def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> List[str]:
        cleaned = re.sub(r'\s+', ' ', text).strip()
        if not cleaned:
            return ["No readable text content found."]
        
        chunks = []
        start = 0
        while start < len(cleaned):
            end = min(start + chunk_size, len(cleaned))
            # Try to break on a sentence or space boundary
            if end < len(cleaned):
                last_space = cleaned.rfind(' ', start, end)
                if last_space != -1 and last_space > start + 50:
                    end = last_space
            
            chunk = cleaned[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end - overlap if end < len(cleaned) else len(cleaned)
        return chunks

    @staticmethod
    def retrieve_relevant_chunks(
        db: Session,
        business_id: str,
        query: str,
        top_k: int = 4,
        document_id: Optional[str] = None
    ) -> List[DocumentCitation]:
        chunk_query = db.query(DocumentChunk).join(
            Document, DocumentChunk.document_id == Document.id
        ).filter(
            DocumentChunk.business_id == business_id
        )

        if document_id:
            chunk_query = chunk_query.filter(DocumentChunk.document_id == document_id)

        all_chunks = chunk_query.all()
        if not all_chunks:
            return []

        scored: List[Tuple[float, DocumentChunk]] = []
        for chk in all_chunks:
            score = compute_tf_idf_similarity(query, chk.content)
            if score > 0:
                scored.append((score, chk))

        scored.sort(key=lambda x: x[0], reverse=True)
        top = scored[:top_k]

        citations = []
        for score, chk in top:
            citations.append(
                DocumentCitation(
                    document_id=chk.document_id,
                    document_title=chk.document.title if chk.document else "Document",
                    chunk_index=chk.chunk_index,
                    snippet=chk.content[:250] + ("..." if len(chk.content) > 250 else ""),
                    relevance_score=round(score, 3)
                )
            )
        return citations

    @staticmethod
    def get_documents(db: Session, business_id: str) -> List[Document]:
        return db.query(Document).filter(
            Document.business_id == business_id
        ).order_by(Document.created_at.desc()).all()
