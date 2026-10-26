# InsightAI REST API Reference

All endpoints are prefixed with `/api/v1` and require Bearer Token authorization and `X-Business-Id` header (except public auth routes).

## Endpoint Groups

### Authentication (`/api/v1/auth`)
- `POST /register`: Register user and create initial business workspace.
- `POST /login`: Authenticate with email/password and obtain JWT access token.
- `GET /me`: Fetch authenticated user profile.

### Business Workspaces (`/api/v1/businesses`)
- `GET /`: List all businesses accessible by the user.
- `POST /`: Create a new business workspace.
- `GET /current`: Retrieve details of the currently active business workspace.

### Products & Inventory (`/api/v1/products` & `/api/v1/inventory`)
- `GET /products/`: List products with search, category filters, and live stock levels.
- `POST /products/`: Create catalogue product with initial opening stock.
- `GET /products/categories`: List product categories.
- `POST /products/categories`: Create product category.
- `GET /inventory/movements`: View immutable stock ledger history.
- `POST /inventory/adjustments`: Record stock adjustment (damage, return, audit count).
- `GET /inventory/low-stock`: Fetch items with current stock at or below reorder threshold.

### Invoices & POS Billing (`/api/v1/invoices`)
- `GET /`: List historical invoices with status filter.
- `POST /`: Finalize POS sale, deduct stock atomically, and generate sequential invoice number.
- `GET /{id}`: Retrieve invoice details.
- `POST /{id}/cancel`: Cancel invoice and atomically restore stock quantities.
- `POST /{id}/payments`: Record partial or complete payment against an invoice.
- `GET /{id}/pdf`: Generate and stream ReportLab PDF invoice.

### Multi-Agent AI (`/api/v1/ai`)
- `POST /chat`: Query the LangGraph multi-agent orchestrator.
  - Body: `{ "message": "string", "mode": "auto" | "analyze" | "forecast" | "documents" | "recommendations" }`
  - Response: `{ "assistant_reply": "string", "agents_involved": [], "execution_steps": [], "chart_data": {}, "citations": [] }`

### Document Intelligence (`/api/v1/documents`)
- `GET /`: List uploaded documents.
- `POST /upload`: Upload file (PDF, TXT, CSV) and generate text chunks.
- `POST /query`: Semantic search across document passages.

### Forecasting (`/api/v1/forecasts`)
- `GET /sales`: Generate 14/30/60-day demand forecast with prediction bounds and backtested evaluation metrics.

### Recommendations (`/api/v1/recommendations`)
- `GET /`: Retrieve prioritized business guardrail alerts.
- `POST /{id}/resolve`: Mark recommendation resolved.

### Data Ingestion (`/api/v1/imports`)
- `POST /preview`: Upload CSV register to preview and validate staging rows.
- `POST /commit`: Commit approved staged items into live product catalogue.
