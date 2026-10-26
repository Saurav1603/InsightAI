# InsightAI Testing Strategy & Test Execution

## Test Suite Overview

InsightAI includes an automated test suite implemented with `pytest` and `httpx`.

Tests reside in `backend/tests/`:
- `test_billing.py`: Tests POS checkout, atomic stock deduction, sequential numbering, and cancellation stock restoration.
- `test_analytics.py`: Tests deterministic calculation of sales, COGS, gross margin %, and net operating profit.
- `test_agents.py`: Tests LangGraph single-agent intent routing and compound multi-agent execution.

## Running Tests

Run the full automated test suite:
```bash
python -m pytest backend/tests/ -v
```

Expected output:
```text
backend/tests/test_agents.py::test_langgraph_single_agent_routing PASSED
backend/tests/test_agents.py::test_langgraph_compound_agent_routing PASSED
backend/tests/test_analytics.py::test_financial_analytics_calculations PASSED
backend/tests/test_billing.py::test_atomic_pos_invoice_creation PASSED

4 passed in 0.40s
```
