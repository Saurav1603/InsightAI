# InsightAI — Next-Generation Multi-Agent Business Intelligence & Operations SaaS

Live Link - https://insight-ai-gilt.vercel.app/

> **Turn Business Data into Intelligent Decisions.**

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-orange.svg)](https://github.com/langchain-ai/langgraph)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS%20v4-38B2AC.svg)](https://tailwindcss.com)

---

## Executive Summary

**InsightAI** is an all-in-one Business Operations and Multi-Agent Business Intelligence SaaS platform built for small-and-medium businesses (retail kirana stores, supermarkets, restaurants, and distributors). 

Unlike conventional dashboards that only display static charts or proof-of-concept chatbots that fabricate numbers, InsightAI integrates:
1. **High-Speed POS Counter Billing** with atomic inventory deductions and sequential tax invoices.
2. **Immutable Stock Movement Ledger** tracking every quantity delta with cost provenance.
3. **Deterministic Financial Analytics** computing Net Sales, COGS, Gross Profit, and Operating Profit via SQL/Pandas.
4. **Adaptive Time-Series Demand Forecasting** with 95% uncertainty intervals and backtested error metrics.
5. **Document Intelligence (RAG)** extracting passages and citations from uploaded contracts and policies.
6. **LangGraph Multi-Agent Orchestrator** coordinating specialized agents for single and compound queries.
7. **Offline Business Digitization** with CSV/register pre-commit staging.

---

## Architecture Overview

```
Frontend (React 18 + TS + Tailwind + Recharts)
   │
   ▼  REST API / Bearer Auth + X-Business-Id
FastAPI Application Gateway
   ├── Core Services: Auth (bcrypt + JWT), Multi-Tenancy, Role-Based Access Control
   ├── Business Engines: Products, Inventory, Billing/POS, Purchases, Expenses
   ├── Deterministic Analytics & Reporting Engine (SQL/Pandas/NumPy)
   ├── Adaptive Time-Series Forecasting Engine (Exponential Smoothing + Trend)
   ├── Document Intelligence & RAG Retrieval Engine (PDF/TXT extraction + Citations)
   └── LangGraph Multi-Agent Orchestration Graph:
         ├── Supervisor / Router Agent
         ├── Analytics Agent
         ├── Forecasting Agent
         ├── Document Intelligence Agent
         └── Business Recommendation Agent
   │
   ▼  ACID Storage & Ledgers
PostgreSQL / SQLite Database
```

---

## Quick Start (Zero-Friction Local Run)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r backend/requirements.txt

# Run deterministic demo seed script (populates 45 days of sales, products, and documents)
python -m backend.scripts.seed_demo

# Start the FastAPI backend server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Backend API will be live at: `http://127.0.0.1:8000` (Interactive Swagger Docs at `http://127.0.0.1:8000/docs`).

### 3. Frontend Setup
```bash
cd frontend

# Install npm packages
npm install

# Start Vite development server
npx vite --host 127.0.0.1 --port 5173
```
Frontend Web Application will be live at: `http://127.0.0.1:5173`.

### 4. Demo Login Credentials
- **Email**: `demo@insightai.com`
- **Password**: `DemoPassword123!`
- *(Or click **"Fill Demo Login"** on the login screen for 1-click access!)*

---

## Automated Test Suite

Run all unit and integration tests covering billing atomicity, inventory ledger consistency, analytics, and LangGraph agent routing:
```bash
python -m pytest backend/tests/ -v
```

---

## Detailed Documentation Directory

- [`docs/ARCHITECTURE.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/ARCHITECTURE.md) — System components, data flows, and architecture diagrams.
- [`docs/DATABASE.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/DATABASE.md) — Database schema, entity relationships, and ledger models.
- [`docs/AI_AGENTS.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/AI_AGENTS.md) — LangGraph state graph, node specializations, and tool routing.
- [`docs/API.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/API.md) — REST API endpoints and request/response specifications.
- [`docs/SECURITY.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/SECURITY.md) — Authentication, multi-tenant isolation, and privacy controls.
- [`docs/TESTING.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/TESTING.md) — Test matrix and verification instructions.
- [`docs/DEMO_GUIDE.md`](file:///c:/Users/rajsa/OneDrive/Desktop/InsightAI/docs/DEMO_GUIDE.md) — Step-by-step evaluator walkthrough.
