import os
import json
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, START, END
from backend.app.agents.state import AgentState, AgentStep
from backend.app.agents.tools import BusinessTools
from backend.app.core.config import settings

# Optional Google Generative AI integration
try:
    import google.generativeai as genai
    if settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
except Exception:
    genai = None


class MultiAgentOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.workflow = self._build_graph()

    def _build_graph(self):
        builder = StateGraph(AgentState)

        # Register nodes
        builder.add_node("supervisor_classify", self._supervisor_classify)
        builder.add_node("analytics_node", self._analytics_node)
        builder.add_node("forecast_node", self._forecast_node)
        builder.add_node("document_node", self._document_node)
        builder.add_node("recommendation_node", self._recommendation_node)
        builder.add_node("supervisor_synthesize", self._supervisor_synthesize)

        # Add edges
        builder.add_edge(START, "supervisor_classify")
        
        # Conditional edge from supervisor to appropriate agent nodes
        builder.add_conditional_edges(
            "supervisor_classify",
            self._route_intent,
            {
                "analytics": "analytics_node",
                "forecast": "forecast_node",
                "documents": "document_node",
                "recommendations": "recommendation_node",
                "compound_analytics_forecast": "analytics_node",
                "compound_forecast_rec": "forecast_node",
                "direct_synthesis": "supervisor_synthesize"
            }
        )

        # Route from individual agent nodes to next node or synthesize
        builder.add_conditional_edges(
            "analytics_node",
            lambda state: "forecast_node" if "forecast" in state.get("selected_agents", []) and not state.get("forecast_output") else "supervisor_synthesize",
            {
                "forecast_node": "forecast_node",
                "supervisor_synthesize": "supervisor_synthesize"
            }
        )

        builder.add_conditional_edges(
            "forecast_node",
            lambda state: "recommendation_node" if "recommendations" in state.get("selected_agents", []) and not state.get("recommendation_output") else "supervisor_synthesize",
            {
                "recommendation_node": "recommendation_node",
                "supervisor_synthesize": "supervisor_synthesize"
            }
        )

        builder.add_edge("document_node", "supervisor_synthesize")
        builder.add_edge("recommendation_node", "supervisor_synthesize")
        builder.add_edge("supervisor_synthesize", END)

        return builder.compile()

    # ---------------- Nodes ----------------

    def _supervisor_classify(self, state: AgentState) -> Dict[str, Any]:
        q = state["question"].lower()
        mode = state.get("mode", "auto")

        selected = []
        intent = "general"

        if mode == "analyze":
            selected = ["analytics"]
            intent = "analytics"
        elif mode == "forecast":
            selected = ["forecast"]
            intent = "forecast"
        elif mode == "documents":
            selected = ["documents"]
            intent = "documents"
        elif mode == "recommendations":
            selected = ["recommendations"]
            intent = "recommendations"
        else:
            # Auto-detect intent
            is_compound = False
            has_analytics = any(k in q for k in ["sale", "revenue", "profit", "margin", "cogs", "top product", "expense", "kpi", "perform"])
            has_forecast = any(k in q for k in ["forecast", "predict", "future", "next month", "trend", "projection", "next 30"])
            has_doc = any(k in q for k in ["document", "pdf", "contract", "agreement", "policy", "clause", "terms", "file"])
            has_rec = any(k in q for k in ["reorder", "recommend", "stock out", "low stock", "overdue", "suggest", "action"])

            if has_analytics and has_forecast:
                selected = ["analytics", "forecast"]
                intent = "compound_analytics_forecast"
            elif has_forecast and has_rec:
                selected = ["forecast", "recommendations"]
                intent = "compound_forecast_rec"
            elif has_forecast:
                selected = ["forecast"]
                intent = "forecast"
            elif has_doc:
                selected = ["documents"]
                intent = "documents"
            elif has_rec:
                selected = ["recommendations"]
                intent = "recommendations"
            elif has_analytics:
                selected = ["analytics"]
                intent = "analytics"
            else:
                # Default to analytics for general business queries
                selected = ["analytics"]
                intent = "analytics"

        steps = list(state.get("execution_steps", []))
        steps.append({
            "agent": "SupervisorAgent",
            "action": "Intent Analysis & Task Routing",
            "details": f"Detected intent: {intent}. Delegated to specialized agents: {', '.join(selected)}",
            "status": "completed"
        })

        return {
            "intent": intent,
            "selected_agents": selected,
            "execution_steps": steps
        }

    def _route_intent(self, state: AgentState) -> str:
        intent = state.get("intent", "analytics")
        if intent == "compound_analytics_forecast":
            return "compound_analytics_forecast"
        elif intent == "compound_forecast_rec":
            return "compound_forecast_rec"
        elif intent in ["analytics", "forecast", "documents", "recommendations"]:
            return intent
        return "direct_synthesis"

    def _analytics_node(self, state: AgentState) -> Dict[str, Any]:
        steps = list(state.get("execution_steps", []))
        steps.append({
            "agent": "AnalyticsAgent",
            "action": "Executing approved parameterized SQL analytics",
            "details": "Calculating net sales, gross margin, COGS, expenses, and product rankings",
            "status": "completed"
        })

        data = BusinessTools.get_financial_summary(self.db, state["business_id"], days=30)
        
        # Prepare structured chart data
        chart_data = {
            "type": "bar",
            "title": "Top Selling Products by Revenue",
            "data": data["top_products"]
        }

        return {
            "analytics_output": data,
            "chart_data": chart_data,
            "execution_steps": steps
        }

    def _forecast_node(self, state: AgentState) -> Dict[str, Any]:
        steps = list(state.get("execution_steps", []))
        steps.append({
            "agent": "ForecastingAgent",
            "action": "Fitting Adaptive Trend & Seasonal Time-Series Model",
            "details": "Aggregating daily historical sales and computing 30-day projection intervals",
            "status": "completed"
        })

        data = BusinessTools.run_sales_forecast(self.db, state["business_id"], horizon_days=30)
        
        chart_data = {
            "type": "area",
            "title": "30-Day Sales Forecast with Prediction Bounds",
            "historical": data["historical_trend"][-14:],
            "forecast": data["forecast"]
        }

        return {
            "forecast_output": data,
            "chart_data": chart_data,
            "execution_steps": steps
        }

    def _document_node(self, state: AgentState) -> Dict[str, Any]:
        steps = list(state.get("execution_steps", []))
        steps.append({
            "agent": "DocumentIntelligenceAgent",
            "action": "Semantic Passage Retrieval & Citation Verification",
            "details": f"Querying verified document chunks for '{state['question']}'",
            "status": "completed"
        })

        result = BusinessTools.search_documents(self.db, state["business_id"], state["question"])
        citations = result.get("citations", [])

        return {
            "document_output": result,
            "citations": citations,
            "execution_steps": steps
        }

    def _recommendation_node(self, state: AgentState) -> Dict[str, Any]:
        steps = list(state.get("execution_steps", []))
        steps.append({
            "agent": "RecommendationAgent",
            "action": "Evaluating Deterministic Business Guardrails",
            "details": "Auditing stock reorder thresholds, gross margins, and unpaid balances",
            "status": "completed"
        })

        result = BusinessTools.get_recommendations(self.db, state["business_id"])

        return {
            "recommendation_output": result,
            "execution_steps": steps
        }

    def _supervisor_synthesize(self, state: AgentState) -> Dict[str, Any]:
        steps = list(state.get("execution_steps", []))
        steps.append({
            "agent": "SupervisorAgent",
            "action": "Evidence Validation & Final Synthesis",
            "details": "Synthesizing multi-agent outputs into an executive response",
            "status": "completed"
        })

        # Try LLM generation if configured
        answer = None
        try:
            from dotenv import load_dotenv
            load_dotenv(override=True)
        except Exception:
            pass
        api_key = (os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY or "").strip()
        if genai and api_key:
            try:
                genai.configure(api_key=api_key)
                
                # Determine candidate models prioritizing Gemini 3.5 Flash-Lite (highest free limits)
                requested_model = (os.getenv("DEFAULT_LLM_MODEL") or settings.DEFAULT_LLM_MODEL or "gemini-3.5-flash-lite").strip()
                
                # Build fallback candidates list
                candidate_models = [requested_model]
                flash_lite_variants = [
                    "gemini-3.5-flash-lite",
                    "gemini-2.0-flash-lite",
                    "gemini-2.0-flash-lite-preview-02-05",
                    "gemini-1.5-flash-8b",
                    "gemini-2.0-flash",
                    "gemini-1.5-flash"
                ]
                for v in flash_lite_variants:
                    if v not in candidate_models:
                        candidate_models.append(v)

                prompt = self._build_synthesis_prompt(state)
                
                for candidate in candidate_models:
                    try:
                        model = genai.GenerativeModel(candidate)
                        response = model.generate_content(prompt)
                        if response and response.text:
                            answer = response.text.strip()
                            break
                    except Exception:
                        continue
            except Exception:
                # Fallback to deterministic synthesis
                pass

        if not answer:
            answer = self._deterministic_synthesis(state)

        return {
            "final_answer": answer,
            "execution_steps": steps
        }

    def _build_synthesis_prompt(self, state: AgentState) -> str:
        evidence = {}
        if state.get("analytics_output"):
            evidence["financial_analytics"] = state["analytics_output"]
        if state.get("forecast_output"):
            evidence["sales_forecast"] = state["forecast_output"]
        if state.get("document_output"):
            evidence["document_retrieval"] = state["document_output"]
        if state.get("recommendation_output"):
            evidence["business_recommendations"] = state["recommendation_output"]

        return f"""You are the InsightAI Executive Business Intelligence Assistant.
Answer the user's question accurately using ONLY the provided verified business evidence.
Never fabricate numbers. Cite metrics, product names, and document sources clearly.

User Question: {state['question']}
Selected Agents: {', '.join(state.get('selected_agents', []))}

Verified Evidence:
{json.dumps(evidence, default=str, indent=2)}

Provide a concise, professional, structured answer formatted in Markdown with key bullet points and clear takeaways.
"""

    def _deterministic_synthesis(self, state: AgentState) -> str:
        q = state["question"]
        parts = []

        # 1. Analytics Part
        if state.get("analytics_output"):
            kpis = state["analytics_output"]["kpis"]
            top_p = state["analytics_output"]["top_products"]
            parts.append(f"### Financial & Sales Performance Overview\n"
                         f"- **Total Sales (30 Days):** ₹{kpis['total_sales']:,.2f}\n"
                         f"- **Gross Profit:** ₹{kpis['gross_profit']:,.2f} ({kpis['gross_margin_percentage']}% margin)\n"
                         f"- **Net Operating Profit:** ₹{kpis['net_operating_profit']:,.2f}\n"
                         f"- **Operating Expenses:** ₹{kpis['total_expenses']:,.2f}\n"
                         f"- **Outstanding Receivables:** ₹{kpis['outstanding_receivables']:,.2f}\n")
            if top_p:
                parts.append("**Top Selling Products:**\n" + "\n".join([
                    f"- **{p['product_name']}** (SKU: {p['sku']}): ₹{p['revenue']:,.2f} revenue ({p['units_sold']} units sold)"
                    for p in top_p[:3]
                ]))

        # 2. Forecast Part
        if state.get("forecast_output"):
            fc = state["forecast_output"]
            pts = fc["forecast"]
            first_week_pred = sum(p["predicted_sales"] for p in pts[:7])
            month_pred = sum(p["predicted_sales"] for p in pts[:30])
            eval_m = fc.get("evaluation_metrics", {})
            parts.append(f"\n### Predictive Sales Forecast\n"
                         f"- **Model:** {fc['model_name']} (MAE: ₹{eval_m.get('mae', 0):,.2f}, RMSE: ₹{eval_m.get('rmse', 0):,.2f})\n"
                         f"- **7-Day Projected Sales:** ₹{first_week_pred:,.2f}\n"
                         f"- **30-Day Projected Sales:** ₹{month_pred:,.2f}\n")
            if fc.get("data_limitation_warning"):
                parts.append(f"> ⚠️ **Data Limitation:** {fc['data_limitation_warning']}")

        # 3. Document Retrieval Part
        if state.get("document_output"):
            cits = state.get("citations", [])
            if cits:
                parts.append("\n### Document Intelligence (Passages & Citations)")
                for idx, c in enumerate(cits, start=1):
                    parts.append(f"{idx}. **{c['document_title']}** (Relevance: {c['relevance_score']}):\n   > \"{c['snippet']}\"")
            else:
                parts.append("\n### Document Intelligence\nNo matching passages were found in your uploaded business documents for this inquiry.")

        # 4. Recommendation Part
        if state.get("recommendation_output"):
            recs = state["recommendation_output"]["recommendations"]
            if recs:
                parts.append("\n### Actionable Business Recommendations")
                for r in recs[:3]:
                    parts.append(f"- **[{r['severity'].upper()}] {r['title']}**\n  {r['explanation']}\n  *Action:* {r['suggested_action']}")
            else:
                parts.append("\n### Actionable Recommendations\nAll operational metrics are currently healthy. No urgent alerts detected.")

        if not parts:
            return "I have analyzed your business records. Please provide a specific question regarding sales, margins, forecasts, inventory, or uploaded documents."

        return "\n\n".join(parts)

    def run(self, question: str, business_id: str, mode: str = "auto", user_id: Optional[str] = None) -> Dict[str, Any]:
        initial_state: AgentState = {
            "question": question,
            "business_id": business_id,
            "user_id": user_id,
            "mode": mode,
            "intent": "",
            "selected_agents": [],
            "execution_steps": [],
            "analytics_output": None,
            "forecast_output": None,
            "document_output": None,
            "recommendation_output": None,
            "citations": [],
            "chart_data": None,
            "evidence": {},
            "errors": [],
            "final_answer": ""
        }

        final_state = self.workflow.invoke(initial_state)
        return {
            "final_answer": final_state.get("final_answer", ""),
            "selected_agents": final_state.get("selected_agents", []),
            "execution_steps": final_state.get("execution_steps", []),
            "chart_data": final_state.get("chart_data"),
            "citations": final_state.get("citations", [])
        }
