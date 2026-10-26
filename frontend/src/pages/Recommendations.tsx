import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Package,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { RecommendationItem } from '../types';
import { useAuth } from '../context/AuthContext';

export const Recommendations: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getRecommendations(statusFilter || undefined);
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness, statusFilter]);

  const handleResolve = async (id: string) => {
    try {
      await api.resolveRecommendation(id);
      loadData();
    } catch (err) {
      alert('Failed to resolve recommendation');
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'border-rose-300 bg-rose-50/50 text-rose-900';
      case 'high':
        return 'border-amber-300 bg-amber-50/50 text-amber-900';
      case 'medium':
        return 'border-blue-300 bg-blue-50/50 text-blue-900';
      default:
        return 'border-slate-200 bg-slate-50 text-slate-800';
    }
  };

  const getBadgeStyle = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-600 text-white';
      case 'high':
        return 'bg-amber-600 text-white';
      case 'medium':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-slate-600 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Business Insights & Automated Guardrails</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic rule evaluations detecting out-of-stock threats, margin compressions, and overdue receivables
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-violet-500 font-medium"
        >
          <option value="">All Alerts</option>
          <option value="new">New Alerts</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-slate-400">Evaluating deterministic business guardrails...</div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200/80 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">All Systems Operational</h3>
            <p className="text-xs text-slate-500 mt-1">No pending business guardrail alerts or stock-out anomalies detected.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-5 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${getSeverityStyle(rec.severity)}`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getBadgeStyle(rec.severity)}`}>
                    {rec.severity} Priority
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-slate-500 bg-white/80 border border-slate-200/60 px-2 py-0.5 rounded-full">
                    {rec.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">#{rec.rule_id}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">{rec.title}</h3>
                <p className="text-xs text-slate-700 leading-relaxed">{rec.explanation}</p>

                <div className="p-3 bg-white/90 rounded-xl border border-slate-200/60 flex items-start gap-2 text-xs text-slate-800">
                  <ArrowRight className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900">Recommended Next Step: </span>
                    <span>{rec.suggested_action}</span>
                  </div>
                </div>
              </div>

              {rec.status === 'new' && (
                <button
                  onClick={() => handleResolve(rec.id)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-sm shrink-0 transition"
                >
                  Mark Resolved
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
