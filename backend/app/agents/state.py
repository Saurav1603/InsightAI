from typing import TypedDict, List, Dict, Any, Optional

class AgentStep(TypedDict):
    agent: str
    action: str
    details: Optional[str]
    status: str

class AgentState(TypedDict):
    # Context
    question: str
    business_id: str
    user_id: Optional[str]
    mode: str # auto, analyze, forecast, documents, recommendations

    # Supervisor routing decisions
    intent: str
    selected_agents: List[str] # e.g. ["analytics", "forecast"]
    
    # Execution traces and intermediate outputs
    execution_steps: List[AgentStep]
    analytics_output: Optional[Dict[str, Any]]
    forecast_output: Optional[Dict[str, Any]]
    document_output: Optional[Dict[str, Any]]
    recommendation_output: Optional[Dict[str, Any]]
    
    # Evidence & Citations
    citations: List[Dict[str, Any]]
    chart_data: Optional[Dict[str, Any]]
    evidence: Dict[str, Any]
    errors: List[str]
    
    # Final response
    final_answer: str
