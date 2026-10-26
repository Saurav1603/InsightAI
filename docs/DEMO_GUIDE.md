# InsightAI Capstone Demonstration Guide

Follow this step-by-step walkthrough to evaluate the complete end-to-end functionality of InsightAI.

## 1. Quick Access Demo Credentials
- **URL**: http://127.0.0.1:5173/login
- **Email**: `demo@insightai.com`
- **Password**: `DemoPassword123!`
- *(Or simply click the **"Fill Demo Login"** button on the login screen!)*

## 2. Demonstration Flow

### Step 1: Operations Dashboard
- Observe real-time KPI cards: Total Sales, Gross Profit, Gross Margin %, Invoices, Active Products, and Low Stock count.
- Inspect the 30-day Sales & Profit Trend area chart and Revenue by Category pie chart.
- Notice the **"Live DB Connected"** indicator in the global navigation bar.

### Step 2: High-Speed POS Counter Checkout (`/pos`)
- Navigate to **POS / New Sale**.
- Search for a product (e.g. `Atta` or `Oil`) or click any item to add to the cart.
- Adjust quantity or review tax calculations.
- Select a payment method (Cash, UPI, Card, Credit).
- Click **"Finalize Sale"**.
- Celebrate with the visual confetti and inspect the generated invoice modal.
- Click **"Download PDF"** to view the ReportLab generated tax invoice.

### Step 3: Sequential Invoices Register (`/invoices`)
- Navigate to **Invoices**.
- Locate the newly generated invoice (e.g. `APX-1055`).
- Verify its status is `finalized`.
- Notice the option to download the official PDF or cancel/refund the invoice with atomic stock restoration.

### Step 4: Inventory & Stock Movements (`/inventory`)
- Navigate to **Inventory & Stock**.
- Check the **Product Catalogue** tab.
- Click **"Low Stock"** filter to view items currently at or below their reorder threshold (e.g. `Mother Dairy Paneer`, `Lay's Magic Masala`).
- Click **"Adjust Stock"** on any item to log an audited inventory adjustment (damage, customer return, count audit).
- Switch to the **Movement Ledger** tab to observe the audit history of every stock delta.

### Step 5: Sales & Demand Forecasting (`/forecasting`)
- Navigate to **Forecasting**.
- Inspect the 30-day projected sales curve along with 95% upper and lower prediction intervals.
- Review model performance metrics: MAE, RMSE, and MAPE.
- Toggle between 14-day, 30-day, and 60-day horizons.

### Step 6: Multi-Agent AI Assistant (`/ai`)
- Navigate to **AI Assistant**.
- Toggle between modes (`Auto`, `Analytics`, `Forecasting`, `Documents`, `Recommendations`).
- Ask a single-agent question: *"Which products generated the highest gross profit?"*
- Ask a compound question: *"What are my top products and what will sales be next month?"*
- Observe the **Execution Timeline**:
  1. `SupervisorAgent`: Analyzed intent and delegated tasks.
  2. `AnalyticsAgent`: Executed parameterized SQL queries.
  3. `ForecastingAgent`: Projected sales with confidence bounds.
  4. `SupervisorAgent`: Synthesized an evidence-backed executive summary.
- Inspect the rendered inline charts and verified document citations.

### Step 7: Document Intelligence & RAG (`/documents`)
- Navigate to **Document Hub**.
- Inspect the indexed store policies and agreements.
- Ask: *"What is our customer return policy for dairy and milk?"*
- View the extracted passage snippets with document references and relevance scores.

### Step 8: Offline Data Ingestion (`/imports`)
- Navigate to **Data Import**.
- Click **"Download Sample CSV Template"** or upload a store register spreadsheet.
- Inspect the live **Staging Layer** preview table.
- Click **"Commit Records"** to import verified rows into the official catalogue.
