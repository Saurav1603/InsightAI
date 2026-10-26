from backend.app.agents import MultiAgentOrchestrator

def test_langgraph_single_agent_routing(db_session, test_setup):
    biz = test_setup["business"]
    orchestrator = MultiAgentOrchestrator(db_session)

    # 1. Ask purely analytics question
    res = orchestrator.run("What were my sales and gross margin this month?", biz.id)
    assert "analytics" in res["selected_agents"]
    assert len(res["execution_steps"]) >= 2
    assert "Financial" in res["final_answer"] or "Sales" in res["final_answer"]

def test_langgraph_compound_agent_routing(db_session, test_setup):
    biz = test_setup["business"]
    orchestrator = MultiAgentOrchestrator(db_session)

    # 2. Ask compound question requiring Analytics + Forecast
    res = orchestrator.run("Show top selling products and forecast revenue for next 30 days", biz.id)
    assert "analytics" in res["selected_agents"]
    assert "forecast" in res["selected_agents"]
    assert len(res["execution_steps"]) >= 3
    assert res["chart_data"] is not None
