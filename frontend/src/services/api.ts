import {
  User, Business, Product, Category, Invoice, Customer, Supplier,
  Expense, FinancialSummary, ForecastResponse, DocumentItem,
  DocumentCitation, RecommendationItem, AIChatResponse, StockMovement
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '') + '/api/v1';

class ApiClient {
  private token: string | null = null;
  private activeBusinessId: string | null = null;

  constructor() {
    this.token = localStorage.getItem('insightai_token');
    this.activeBusinessId = localStorage.getItem('insightai_biz_id');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) localStorage.setItem('insightai_token', token);
    else localStorage.removeItem('insightai_token');
  }

  setActiveBusiness(bizId: string | null) {
    this.activeBusinessId = bizId;
    if (bizId) localStorage.setItem('insightai_biz_id', bizId);
    else localStorage.removeItem('insightai_biz_id');
  }

  getActiveBusinessId() {
    return this.activeBusinessId;
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (this.activeBusinessId) {
      headers.set('X-Business-Id', this.activeBusinessId);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      let errorMsg = `API Error: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch (e) {
        // use default statusText
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    const res = await this.request<{
      access_token: string;
      user: User;
      businesses: Business[];
      active_business_id?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.access_token);
    if (res.active_business_id) {
      this.setActiveBusiness(res.active_business_id);
    }
    return res;
  }

  async register(email: string, password: string, fullName: string, businessName: string) {
    const res = await this.request<{
      access_token: string;
      user: User;
      businesses: Business[];
      active_business_id?: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        business_name: businessName
      })
    });
    this.setToken(res.access_token);
    if (res.active_business_id) {
      this.setActiveBusiness(res.active_business_id);
    }
    return res;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async getBusinesses(): Promise<Business[]> {
    return this.request<Business[]>('/businesses/');
  }

  // Products
  async getProducts(search?: string, categoryId?: string): Promise<Product[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('category_id', categoryId);
    return this.request<Product[]>(`/products/?${params.toString()}`);
  }

  async createProduct(data: any): Promise<Product> {
    return this.request<Product>('/products/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/products/categories');
  }

  async createCategory(name: string, description?: string): Promise<Category> {
    return this.request<Category>('/products/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  // Inventory
  async getStockMovements(productId?: string): Promise<StockMovement[]> {
    const q = productId ? `?product_id=${productId}` : '';
    return this.request<StockMovement[]>(`/inventory/movements${q}`);
  }

  async recordStockAdjustment(data: { product_id: string; quantity_delta: number; movement_type: string; notes?: string }) {
    return this.request<StockMovement>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getLowStockProducts(): Promise<Product[]> {
    return this.request<Product[]>('/inventory/low-stock');
  }

  // Invoices & POS
  async getInvoices(status?: string, search?: string): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return this.request<Invoice[]>(`/invoices/?${params.toString()}`);
  }

  async createInvoice(data: any): Promise<Invoice> {
    return this.request<Invoice>('/invoices/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}`);
  }

  async cancelInvoice(id: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/cancel`, { method: 'POST' });
  }

  async addInvoicePayment(id: string, amount: number, paymentMethod: string, notes?: string): Promise<Invoice> {
    return this.request<Invoice>(`/invoices/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount, payment_method: paymentMethod, notes })
    });
  }

  getInvoicePdfUrl(id: string): string {
    return `${API_BASE}/invoices/${id}/pdf`;
  }

  async getPurchases(): Promise<any[]> {
    return this.request<any[]>('/purchases/');
  }

  async createPurchase(data: any): Promise<any> {
    return this.request<any>('/purchases/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Customers & Suppliers
  async getCustomers(search?: string): Promise<Customer[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Customer[]>(`/customers/${q}`);
  }

  async createCustomer(data: { name: string; phone?: string; email?: string; address?: string }): Promise<Customer> {
    return this.request<Customer>('/customers/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getSuppliers(search?: string): Promise<Supplier[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.request<Supplier[]>(`/suppliers/${q}`);
  }

  async createSupplier(data: any): Promise<Supplier> {
    return this.request<Supplier>('/suppliers/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Expenses
  async getExpenses(category?: string): Promise<Expense[]> {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request<Expense[]>(`/expenses/${q}`);
  }

  async createExpense(data: { category: string; amount: number; payment_method: string; description?: string }): Promise<Expense> {
    return this.request<Expense>('/expenses/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Analytics & Forecasts
  async getAnalyticsSummary(days: number = 30): Promise<FinancialSummary> {
    return this.request<FinancialSummary>(`/analytics/summary?days=${days}`);
  }

  async getSalesForecast(horizonDays: number = 30, productId?: string): Promise<ForecastResponse> {
    const p = productId ? `&product_id=${productId}` : '';
    return this.request<ForecastResponse>(`/forecasts/sales?horizon_days=${horizonDays}${p}`);
  }

  // Document Intelligence (RAG)
  async getDocuments(): Promise<DocumentItem[]> {
    return this.request<DocumentItem[]>('/documents/');
  }

  async uploadDocument(file: File, title?: string): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.activeBusinessId) headers['X-Business-Id'] = this.activeBusinessId;

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  async queryDocuments(question: string, documentId?: string): Promise<{ question: string; answer: string; citations: DocumentCitation[] }> {
    return this.request('/documents/query', {
      method: 'POST',
      body: JSON.stringify({ question, document_id: documentId })
    });
  }

  // Recommendations
  async getRecommendations(status?: string): Promise<RecommendationItem[]> {
    const q = status ? `?status=${status}` : '';
    return this.request<RecommendationItem[]>(`/recommendations/${q}`);
  }

  async resolveRecommendation(id: string): Promise<RecommendationItem> {
    return this.request<RecommendationItem>(`/recommendations/${id}/resolve`, { method: 'POST' });
  }

  // AI Multi-Agent Chat
  async chatWithAgent(message: string, mode: string = 'auto', conversationId?: string): Promise<AIChatResponse> {
    return this.request<AIChatResponse>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        mode,
        conversation_id: conversationId
      })
    });
  }

  // Imports
  async previewImport(files: File | File[]): Promise<any> {
    const formData = new FormData();
    const fileList = Array.isArray(files) ? files : [files];
    for (const f of fileList) {
      formData.append('files', f);
    }

    const headers: Record<string, string> = {};
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.activeBusinessId) headers['X-Business-Id'] = this.activeBusinessId;

    const res = await fetch(`${API_BASE}/imports/preview`, {
      method: 'POST',
      headers,
      body: formData
    });

    const text = await res.text();
    if (!res.ok) {
      try {
        const err = JSON.parse(text);
        throw new Error(err.detail || 'Import preview failed');
      } catch {
        throw new Error(`Upload error (${res.status}): ${text.slice(0, 150) || res.statusText}`);
      }
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Server returned an incomplete response. Please try with fewer files or check server capacity.');
    }
  }

  async commitImport(payload: any): Promise<any> {
    return this.request('/imports/commit', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

export const api = new ApiClient();
