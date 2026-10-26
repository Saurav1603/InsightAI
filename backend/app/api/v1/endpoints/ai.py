import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.dependencies import get_current_business, get_current_user
from backend.app.models import Business, User, AIConversation, AIMessage
from backend.app.schemas import (
    AIChatRequest, AIChatResponse, AgentExecutionStep, DocumentCitation
)
from backend.app.agents import MultiAgentOrchestrator

router = APIRouter(prefix="/ai", tags=["Multi-Agent AI Assistant"])

@router.post("/chat", response_model=AIChatResponse)
def chat_with_multi_agent(
    data: AIChatRequest,
    business: Business = Depends(get_current_business),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Resolve or create AI conversation
    conversation = None
    if data.conversation_id:
        conversation = db.query(AIConversation).filter(
            AIConversation.id == data.conversation_id,
            AIConversation.business_id == business.id
        ).first()

    if not conversation:
        title = data.message[:40] + ("..." if len(data.message) > 40 else "")
        conversation = AIConversation(
            business_id=business.id,
            user_id=current_user.id,
            title=title
        )
        db.add(conversation)
        db.flush()

    # 2. Record User Message
    user_msg = AIMessage(
        conversation_id=conversation.id,
        sender="user",
        role="user",
        content=data.message
    )
    db.add(user_msg)
    db.flush()

    # 3. Invoke LangGraph Multi-Agent Orchestrator
    orchestrator = MultiAgentOrchestrator(db)
    result = orchestrator.run(
        question=data.message,
        business_id=business.id,
        mode=data.mode,
        user_id=current_user.id
    )

    final_reply = result.get("final_answer", "Analysis completed.")
    agents_involved = result.get("selected_agents", ["Supervisor"])
    raw_steps = result.get("execution_steps", [])
    chart_data = result.get("chart_data")
    citations_data = result.get("citations", [])

    # 4. Record Assistant Reply
    asst_msg = AIMessage(
        conversation_id=conversation.id,
        sender="assistant",
        role="assistant",
        content=final_reply,
        agent_name="SupervisorAgent",
        tool_calls_json=json.dumps(raw_steps),
        citations_json=json.dumps(citations_data),
        chart_data_json=json.dumps(chart_data) if chart_data else None
    )
    db.add(asst_msg)
    db.commit()

    # 5. Format Response
    exec_steps = [
        AgentExecutionStep(
            agent=s["agent"],
            action=s["action"],
            details=s.get("details"),
            status=s.get("status", "completed")
        )
        for s in raw_steps
    ]

    typed_citations = [
        DocumentCitation(**c) if isinstance(c, dict) else c
        for c in citations_data
    ]

    return AIChatResponse(
        conversation_id=conversation.id,
        user_message=data.message,
        assistant_reply=final_reply,
        agents_involved=agents_involved,
        execution_steps=exec_steps,
        chart_data=chart_data,
        citations=typed_citations
    )
