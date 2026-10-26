# InsightAI Security & Tenant Isolation Specification

## Security Principles

1. **Multi-Tenancy Isolation**:
   - Every tenant data query filters explicitly by `business_id`.
   - Access to businesses is validated on every incoming request through the `get_current_business` dependency.
   - Users can only interact with workspaces where they possess an active `BusinessMembership`.

2. **Cryptographic Standards**:
   - Passwords hashed using bcrypt with salt rounds >= 12.
   - Session access tokens generated with HMAC-SHA256 (HS256) JWT signatures and strict expiration.

3. **Atomic Financial Transactions**:
   - Sales checkouts utilize database transaction boundaries (`db.flush()` and `db.commit()`).
   - If stock deduction fails, all invoice and payment operations roll back atomically.

4. **Document & RAG Safety**:
   - Uploaded files are stored in isolated workspace directories (`uploads/<business_id>/`).
   - Document chunks are tagged with `business_id` to prevent cross-tenant retrieval leakage.
   - Uploaded text is treated strictly as untrusted context data to defend against prompt injection.
