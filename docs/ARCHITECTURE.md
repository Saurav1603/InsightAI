# InsightAI Architecture Specification

## Overview

InsightAI is a modular, multi-tenant Business Operations and Multi-Agent Intelligence SaaS platform designed for retail shops, distributors, and growing enterprises.

The system connects transactional commerce (POS, inventory movements, purchases, expenses) directly with analytical and AI reasoning layers without compromising transactional atomicity or data security.

```mermaid
graph TD
    Client[React + TypeScript + Tailwind Frontend] -->|REST API / Bearer Auth + X-Business-Id| API[FastAPI Application Gateway]
    
    subgraph Core Services
        API --> Auth[Auth & Tenant Isolation Service]
        API --> Billing[Billing & POS Engine]
        API --> Inventory[Inventory & Movement Ledger]
        API --> Analytics[Deterministic Financial Analytics]
        API --> Forecast[Adaptive Forecasting Service]
        API --> Document[Document Intelligence RAG Service]
    end

    subgraph Data Layer
        Billing -->|Atomic Transactions| DB[(PostgreSQL / SQLite Storage)]
        Inventory -->|Append-Only Movement Records| DB
        Analytics -->|Optimized Aggregations| DB
        Forecast -->|Daily Time Series Fitting| DB
        Document -->|Text Chunks & Metadata| DB
    end

    subgraph LangGraph Multi-Agent Architecture
        API -->|AI Query| Supervisor[Supervisor Agent]
        Supervisor -->|Routing / Decomposing| AnalyticsAgent[Analytics Agent]
        Supervisor -->|Forecasting| ForecastAgent[Forecasting Agent]
        Supervisor -->|Document Retrieval| DocAgent[Document Intelligence Agent]
        Supervisor -->|Guardrail Audit| RecAgent[Recommendation Agent]
        
        AnalyticsAgent -->|Approved Tool Call| Analytics
        ForecastAgent -->|Approved Tool Call| Forecast
        DocAgent -->|Passage Retrieval| Document
        RecAgent -->|Rule Evaluation| Inventory
        
        Supervisor -->|Grounded Synthesis| API
    end
```

## Architectural Principles

1. **Strict Modular Monolith**: Transactional business workflows, analytical calculations, and multi-agent coordination reside in clearly separated modules within a cohesive codebase.
2. **Deterministic Financial Correctness**: Numerical analytics, gross margin calculations, and financial summaries are computed deterministically using SQL/Python (Pandas/NumPy) rather than relying on LLM arithmetic hallucinations.
3. **Multi-Tenancy by Design**: Every database table, document chunk, invoice, and AI execution enforces tenant ownership via `business_id` and role-based permissions (`owner`, `manager`, `cashier`).
4. **Append-Only Stock Ledger**: Stock quantities are maintained alongside an immutable `stock_movements` ledger to guarantee auditability and prevent silent stock discrepancies.
