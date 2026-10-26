export interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  currency: string;
  currency_symbol: string;
  tax_identifier?: string;
  address?: string;
  phone?: string;
  email?: string;
  invoice_prefix: string;
  invoice_next_number: number;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  businesses: Business[];
  activeBusiness: Business | null;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  unit_of_measure: string;
  selling_price: number;
  purchase_cost: number;
  tax_rate: number;
  reorder_threshold: number;
  is_active: boolean;
  current_stock: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity_delta: number;
  resulting_balance: number;
  unit_cost: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface InvoiceItem {
  id?: string;
  product_id?: string;
  product_name: string;
  sku?: string;
  unit_price: number;
  quantity: number;
  discount_amount?: number;
  tax_rate?: number;
  tax_amount?: number;
  line_total: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id?: string;
  customer_name?: string;
  walk_in_customer_name?: string;
  status: 'draft' | 'finalized' | 'cancelled' | 'returned';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'paid' | 'partially_paid' | 'unpaid';
  payment_method: string;
  notes?: string;
  created_at: string;
  items: InvoiceItem[];
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  outstanding_balance: number;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  outstanding_balance: number;
}

export interface Expense {
  id: string;
  business_id: string;
  category: string;
  amount: number;
  payment_method: string;
  description?: string;
  expense_date: string;
}

export interface DashboardKPIs {
  total_sales: number;
  gross_profit: number;
  gross_margin_percentage: number;
  total_invoices: number;
  total_products: number;
  low_stock_items: number;
  outstanding_receivables: number;
  total_expenses: number;
  net_operating_profit: number;
}

export interface SalesTrendPoint {
  date: string;
  sales: number;
  gross_profit: number;
  invoice_count: number;
}

export interface CategorySalesPoint {
  category: string;
  sales: number;
  percentage: number;
}

export interface TopProductPoint {
  product_name: string;
  sku: string;
  units_sold: number;
  revenue: number;
  gross_profit: number;
}

export interface ExpenseBreakdownPoint {
  category: string;
  amount: number;
  percentage: number;
}

export interface FinancialSummary {
  kpis: DashboardKPIs;
  sales_trend: SalesTrendPoint[];
  category_breakdown: CategorySalesPoint[];
  top_products: TopProductPoint[];
  expense_breakdown: ExpenseBreakdownPoint[];
}

export interface ForecastPoint {
  date: string;
  predicted_sales: number;
  lower_bound: number;
  upper_bound: number;
}

export interface ForecastResponse {
  model_name: string;
  target_metric: string;
  horizon_days: number;
  evaluation_metrics: {
    mae: number;
    rmse: number;
    mape_percent: number;
  };
  data_points_used: number;
  is_data_sufficient: boolean;
  data_limitation_warning?: string;
  historical_trend: { date: string; sales: number }[];
  forecast: ForecastPoint[];
}

export interface DocumentItem {
  id: string;
  title: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  total_chunks: number;
  extracted_text_summary?: string;
  created_at: string;
}

export interface DocumentCitation {
  document_id: string;
  document_title: string;
  chunk_index: number;
  snippet: string;
  relevance_score: number;
}

export interface RecommendationItem {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  explanation: string;
  suggested_action: string;
  status: string;
  rule_id: string;
  created_at: string;
}

export interface AgentExecutionStep {
  agent: string;
  action: string;
  details?: string;
  status: string;
}

export interface AIChatResponse {
  conversation_id: string;
  user_message: string;
  assistant_reply: string;
  agents_involved: string[];
  execution_steps: AgentExecutionStep[];
  chart_data?: any;
  citations?: DocumentCitation[];
}
