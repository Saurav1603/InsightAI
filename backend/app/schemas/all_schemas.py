from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ==============================================================================
# AUTH & BUSINESS SCHEMAS
# ==============================================================================

class UserRegister(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str
    business_name: Optional[str] = "My Retail Store"


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    is_superuser: bool
    created_at: datetime

    class Config:
        from_attributes = True


class BusinessCreate(BaseModel):
    name: str
    currency: str = "INR"
    currency_symbol: str = "₹"
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class BusinessOut(BaseModel):
    id: str
    name: str
    slug: str
    currency: str
    currency_symbol: str
    tax_identifier: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    invoice_prefix: str
    invoice_next_number: int
    created_at: datetime

    class Config:
        from_attributes = True


class MembershipOut(BaseModel):
    id: str
    user_id: str
    business_id: str
    role: str
    is_active: bool
    business: Optional[BusinessOut] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    businesses: List[BusinessOut]
    active_business_id: Optional[str] = None


# ==============================================================================
# PRODUCT & INVENTORY SCHEMAS
# ==============================================================================

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: str
    business_id: str
    name: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    category_id: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit_of_measure: str = "pcs"
    selling_price: Decimal = Field(default=Decimal("0.00"), ge=0)
    purchase_cost: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0)
    reorder_threshold: float = Field(default=10.0, ge=0)
    initial_stock: float = Field(default=0.0, ge=0)


class ProductUpdate(BaseModel):
    category_id: Optional[str] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    unit_of_measure: Optional[str] = None
    selling_price: Optional[Decimal] = None
    purchase_cost: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    reorder_threshold: Optional[float] = None
    is_active: Optional[bool] = None


class ProductOut(BaseModel):
    id: str
    business_id: str
    category_id: Optional[str] = None
    sku: str
    barcode: Optional[str] = None
    name: str
    description: Optional[str] = None
    unit_of_measure: str
    selling_price: Decimal
    purchase_cost: Decimal
    tax_rate: Decimal
    reorder_threshold: float
    is_active: bool
    current_stock: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True


class StockAdjustmentCreate(BaseModel):
    product_id: str
    quantity_delta: float
    movement_type: str = "adjustment" # adjustment, damage, return
    unit_cost: Optional[Decimal] = None
    notes: Optional[str] = None


class StockMovementOut(BaseModel):
    id: str
    product_id: str
    movement_type: str
    quantity_delta: float
    resulting_balance: float
    unit_cost: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# PARTNER SCHEMAS
# ==============================================================================

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class CustomerOut(BaseModel):
    id: str
    business_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    outstanding_balance: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class SupplierCreate(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class SupplierOut(BaseModel):
    id: str
    business_id: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    outstanding_balance: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# BILLING & INVOICE SCHEMAS
# ==============================================================================

class InvoiceItemCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    sku: Optional[str] = ""
    unit_price: Decimal = Field(gt=0)
    quantity: float = Field(gt=0)
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0)


class InvoiceCreate(BaseModel):
    customer_id: Optional[str] = None
    walk_in_customer_name: Optional[str] = None
    items: List[InvoiceItemCreate]
    discount_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    payment_method: str = "cash" # cash, upi, card, credit, mixed
    amount_received: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None
    is_draft: bool = False


class PaymentCreate(BaseModel):
    amount: Decimal = Field(gt=0)
    payment_method: str = "cash"
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class InvoiceItemOut(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: str
    sku: str
    unit_price: Decimal
    quantity: float
    discount_amount: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True


class InvoiceOut(BaseModel):
    id: str
    business_id: str
    invoice_number: str
    customer_id: Optional[str] = None
    walk_in_customer_name: Optional[str] = None
    customer_name: Optional[str] = None
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_amount: Decimal
    payment_status: str
    payment_method: str
    notes: Optional[str] = None
    finalized_at: Optional[datetime] = None
    created_at: datetime
    items: List[InvoiceItemOut] = []

    class Config:
        from_attributes = True


# ==============================================================================
# PURCHASES & EXPENSES SCHEMAS
# ==============================================================================

class PurchaseItemCreate(BaseModel):
    product_id: Optional[str] = None
    product_name: str
    quantity: float = Field(gt=0)
    unit_cost: Decimal = Field(gt=0)


class PurchaseCreate(BaseModel):
    supplier_id: Optional[str] = None
    purchase_number: Optional[str] = None
    items: List[PurchaseItemCreate]
    paid_amount: Decimal = Field(default=Decimal("0.00"), ge=0)
    notes: Optional[str] = None


class PurchaseItemOut(BaseModel):
    id: str
    product_id: Optional[str] = None
    product_name: str
    quantity: float
    unit_cost: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True


class PurchaseOut(BaseModel):
    id: str
    business_id: str
    purchase_number: str
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    status: str
    total_amount: Decimal
    paid_amount: Decimal
    notes: Optional[str] = None
    received_at: Optional[datetime] = None
    created_at: datetime
    items: List[PurchaseItemOut] = []

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    category: str
    amount: Decimal = Field(gt=0)
    payment_method: str = "cash"
    description: Optional[str] = None
    expense_date: Optional[datetime] = None


class ExpenseOut(BaseModel):
    id: str
    business_id: str
    category: str
    amount: Decimal
    payment_method: str
    description: Optional[str] = None
    expense_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# ANALYTICS & DASHBOARD SCHEMAS
# ==============================================================================

class DashboardKPIs(BaseModel):
    total_sales: Decimal
    gross_profit: Decimal
    gross_margin_percentage: float
    total_invoices: int
    total_products: int
    low_stock_items: int
    outstanding_receivables: Decimal
    total_expenses: Decimal
    net_operating_profit: Decimal


class SalesTrendPoint(BaseModel):
    date: str
    sales: float
    gross_profit: float
    invoice_count: int


class CategorySalesPoint(BaseModel):
    category: str
    sales: float
    percentage: float


class TopProductPoint(BaseModel):
    product_name: str
    sku: str
    units_sold: float
    revenue: float
    gross_profit: float


class ExpenseBreakdownPoint(BaseModel):
    category: str
    amount: float
    percentage: float


class FinancialSummary(BaseModel):
    kpis: DashboardKPIs
    sales_trend: List[SalesTrendPoint]
    category_breakdown: List[CategorySalesPoint]
    top_products: List[TopProductPoint]
    expense_breakdown: List[ExpenseBreakdownPoint]


# ==============================================================================
# FORECASTING SCHEMAS
# ==============================================================================

class ForecastRequest(BaseModel):
    horizon_days: int = 30
    product_id: Optional[str] = None


class ForecastPoint(BaseModel):
    date: str
    predicted_sales: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    model_name: str
    target_metric: str
    horizon_days: int
    evaluation_metrics: Dict[str, Any]
    data_points_used: int
    is_data_sufficient: bool
    data_limitation_warning: Optional[str] = None
    historical_trend: List[Dict[str, Any]]
    forecast: List[ForecastPoint]


# ==============================================================================
# DOCUMENT INTELLIGENCE (RAG) SCHEMAS
# ==============================================================================

class DocumentOut(BaseModel):
    id: str
    business_id: str
    title: str
    original_filename: str
    file_size_bytes: int
    mime_type: str
    status: str
    total_chunks: int
    extracted_text_summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentQueryRequest(BaseModel):
    question: str
    document_id: Optional[str] = None


class DocumentCitation(BaseModel):
    document_id: str
    document_title: str
    chunk_index: int
    snippet: str
    relevance_score: float


class DocumentQueryResponse(BaseModel):
    question: str
    answer: str
    citations: List[DocumentCitation]


# ==============================================================================
# RECOMMENDATION SCHEMAS
# ==============================================================================

class RecommendationOut(BaseModel):
    id: str
    business_id: str
    title: str
    severity: str
    category: str
    explanation: str
    suggested_action: str
    evidence_json: Optional[str] = None
    status: str
    rule_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ==============================================================================
# MULTI-AGENT & AI CHAT SCHEMAS
# ==============================================================================

class AIChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    mode: str = "auto" # auto, analyze, forecast, documents, recommendations


class AgentExecutionStep(BaseModel):
    agent: str
    action: str
    details: Optional[str] = None
    status: str = "completed" # running, completed, error


class AIChatResponse(BaseModel):
    conversation_id: str
    user_message: str
    assistant_reply: str
    agents_involved: List[str]
    execution_steps: List[AgentExecutionStep]
    chart_data: Optional[Dict[str, Any]] = None
    citations: Optional[List[DocumentCitation]] = None
    evidence: Optional[Dict[str, Any]] = None
