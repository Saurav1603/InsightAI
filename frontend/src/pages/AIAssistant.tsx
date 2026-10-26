import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BarChart2,
  LineChart,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { api } from '../services/api';
import { AIChatResponse, AgentExecutionStep } from '../types';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  agentsInvolved?: string[];
  executionSteps?: AgentExecutionStep[];
  chartData?: any;
  citations?: any[];
}

export const AIAssistant: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [mode, setMode] = useState<string>('auto');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: `Hello! I am your **InsightAI Multi-Agent Business Copilot**. 

I coordinate specialized AI agents to help you optimize operations:
- **Analytics Agent**: Deterministic SQL calculations for revenue, gross margin, COGS, and sales trends.
- **Forecasting Agent**: 30-day time-series demand projections and uncertainty bounds.
- **Document Intelligence Agent**: Grounded answers from your uploaded contracts and policies with direct citations.
- **Recommendation Agent**: Stock replenishment and financial guardrail alerts.

Ask a question below or choose a suggested business prompt to begin!`,
      agentsInvolved: ['SupervisorAgent']
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});

  const suggestedPrompts = [
    { text: "What are my top selling products and gross margins?", mode: "analyze" },
    { text: "Forecast daily sales and revenue for the next 30 days", mode: "forecast" },
    { text: "Which products should I reorder based on current stock?", mode: "recommendations" },
    { text: "What is our customer return policy for dairy and dry items?", mode: "documents" },
    { text: "What are my top products and what will sales be next month?", mode: "auto" }
  ];

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = msgText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      content: textToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: AIChatResponse = await api.chatWithAgent(textToSend, mode);
      const asstMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        content: response.assistant_reply,
        agentsInvolved: response.agents_involved,
        executionSteps: response.execution_steps,
        chartData: response.chart_data,
        citations: response.citations
      };
      setMessages(prev => [...prev, asstMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        content: `**Error:** ${err.message || 'Failed to process inquiry with multi-agent system.'}`
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSteps = (msgId: string) => {
    setExpandedSteps(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Top Bar: Mode Selector */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900">LangGraph Multi-Agent Orchestrator</h2>
            <p className="text-[10px] text-slate-500">Autonomous intent classification, tool routing, & grounded synthesis</p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          {[
            { id: 'auto', label: 'Auto (Supervisor)' },
            { id: 'analyze', label: 'Analytics' },
            { id: 'forecast', label: 'Forecasting' },
            { id: 'documents', label: 'Documents (RAG)' },
            { id: 'recommendations', label: 'Insights' }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition ${
                mode === m.id
                  ? 'bg-violet-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${
              msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
              msg.sender === 'user'
                ? 'bg-slate-900 text-white'
                : 'bg-violet-100 text-violet-700'
            }`}>
              {msg.sender === 'user' ? 'U' : <Bot className="w-4 h-4" />}
            </div>

            {/* Content Bubble */}
            <div className={`flex-1 rounded-2xl p-4 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                : 'bg-slate-50 border border-slate-200/80 text-slate-800'
            }`}>
              {/* Agent Badge & Execution Trace Header */}
              {msg.sender === 'assistant' && msg.agentsInvolved && (
                <div className="flex flex-wrap items-center gap-1.5 pb-2 mb-2 border-b border-slate-200/60 text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Agents:</span>
                  {msg.agentsInvolved.map((agent, i) => (
                    <span key={i} className="bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">
                      {agent}
                    </span>
                  ))}

                  {msg.executionSteps && msg.executionSteps.length > 0 && (
                    <button
                      onClick={() => toggleSteps(msg.id)}
                      className="ml-auto flex items-center gap-1 text-slate-500 hover:text-slate-800 font-semibold transition"
                    >
                      <Layers className="w-3 h-3 text-violet-600" />
                      <span>{msg.executionSteps.length} Execution Steps</span>
                      {expandedSteps[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              )}

              {/* Collapsible Execution Steps Timeline */}
              {msg.sender === 'assistant' && expandedSteps[msg.id] && msg.executionSteps && (
                <div className="mb-3 p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-[11px]">
                  <div className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">LangGraph Execution Timeline</div>
                  {msg.executionSteps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-600">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900">{step.agent}</span>: {step.action}
                        {step.details && <span className="block text-[10px] text-slate-400 mt-0.5">{step.details}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Message Text */}
              <div className="whitespace-pre-line leading-relaxed">
                {msg.content}
              </div>

              {/* Inline Structured Chart (if returned by AnalyticsAgent) */}
              {msg.chartData && msg.chartData.type === 'bar' && msg.chartData.data && (
                <div className="mt-4 pt-3 border-t border-slate-200 bg-white p-3 rounded-xl border">
                  <div className="text-[11px] font-bold text-slate-800 mb-2">{msg.chartData.title}</div>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={msg.chartData.data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="product_name" tickLine={false} tick={{ fontSize: 9 }} />
                        <YAxis tickLine={false} tick={{ fontSize: 9 }} />
                        <Tooltip
                          formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, 'Revenue']}
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', color: '#fff', fontSize: '11px' }}
                        />
                        <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Document Citations List (if returned by DocumentAgent) */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passage Citations</div>
                  {msg.citations.map((c, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                      <span className="font-bold text-violet-700">{c.document_title}</span> (Relevance: {c.relevance_score}):
                      <p className="italic text-slate-600 mt-0.5">"{c.snippet}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
              <span>LangGraph supervisor delegating tasks to specialized agents...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompts Pill Carousel */}
      <div className="px-6 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-wider">Suggested:</span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setMode(p.mode);
              handleSendMessage(p.text);
            }}
            className="px-2.5 py-1 bg-white hover:bg-violet-50 hover:text-violet-700 text-slate-600 border border-slate-200 hover:border-violet-300 rounded-lg text-[11px] font-medium whitespace-nowrap transition"
          >
            {p.text}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask a business question in ${mode === 'auto' ? 'Auto-Supervisor' : mode} mode...`}
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-violet-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <span>Ask Agents</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
