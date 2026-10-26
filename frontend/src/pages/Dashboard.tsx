import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Receipt,
  Package,
  AlertTriangle,
  CreditCard,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  Sparkles,
  Send,
  ShoppingCart,
  ChevronRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { api } from '../services/api';
import { FinancialSummary, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

export const Dashboard: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [sumRes, invRes] = await Promise.all([
          api.getAnalyticsSummary(30),
          api.getInvoices(undefined, undefined)
        ]);
        setSummary(sumRes);
        setRecentInvoices(invRes.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [activeBusiness]);

  const handleQuickAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;
    setIsAiLoading(true);
    setAiAnswer(null);
    try {
      const res = await api.chatWithAgent(aiQuestion, 'auto');
      setAiAnswer(res.assistant_reply);
    } catch (err: any) {
      setAiAnswer('Error analyzing records: ' + err.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>)}
        </div>
        <div className="h-80 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  const kpis = summary.kpis;
  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time business telemetry and multi-agent intelligence for <span className="font-semibold text-slate-700">{activeBusiness?.name}</span> (Last 30 Days)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/pos"
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-violet-500/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Counter</span>
          </Link>
          <Link
            to="/analytics"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition"
          >
            <span>Detailed Audit</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-violet-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {curr}{Number(kpis.total_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-emerald-600 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>30 Days Finalized</span>
            </div>
          </div>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-violet-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Profit</span>
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {curr}{Number(kpis.gross_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-1.5 py-0.2 rounded">
                {kpis.gross_margin_percentage}% Margin
              </span>
              <span className="text-[10px] text-slate-400">Net Sales - COGS</span>
            </div>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-violet-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Items</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {kpis.low_stock_items}
            </div>
            <div className="mt-1">
              <Link to="/inventory" className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 underline">
                View Restock Alerts →
              </Link>
            </div>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-violet-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Operating Profit</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">
              {curr}{Number(kpis.net_operating_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500">
              <span>Expenses: {curr}{Number(kpis.total_expenses).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Trends Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Revenue & Profit Trends</h2>
              <p className="text-[11px] text-slate-500">Continuous 30-day transactional trajectory</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-violet-600"></span>
                <span className="text-slate-600">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                <span className="text-slate-600">Gross Profit</span>
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.sales_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, '']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#7c3aed" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="gross_profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Category (Pie Chart) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Sales by Category</h2>
          <p className="text-[11px] text-slate-500 mb-4">Product category revenue share</p>
          <div className="h-60 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.category_breakdown}
                  dataKey="sales"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {summary.category_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Sales']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Assistant Quick Consultation & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Multi-Agent AI Box */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between border border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Ask InsightAI Agents</h3>
                <span className="text-[10px] text-violet-300 font-medium">Deterministic SQL + Forecasting</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Query live business records, sales forecasts, stock replenishment, and supplier terms in plain natural language.
            </p>

            {/* Answer Display */}
            {aiAnswer && (
              <div className="mt-4 p-3.5 bg-slate-800/80 rounded-xl border border-violet-500/30 text-xs text-slate-200 max-h-48 overflow-y-auto whitespace-pre-line leading-relaxed">
                {aiAnswer}
              </div>
            )}
          </div>

          <form onSubmit={handleQuickAsk} className="mt-4 relative">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="e.g. Which products have low stock?"
              className="w-full pl-3 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-violet-500 transition"
            />
            <button
              type="submit"
              disabled={isAiLoading}
              className="absolute right-1.5 top-1.5 w-7 h-7 bg-violet-600 hover:bg-violet-500 rounded-lg flex items-center justify-center text-white disabled:opacity-50 transition"
            >
              {isAiLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </form>
        </div>

        {/* Top Products Table (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Top Selling Products</h2>
              <p className="text-[11px] text-slate-500">Ranked by gross revenue generated</p>
            </div>
            <Link to="/inventory" className="text-xs text-violet-600 hover:text-violet-700 font-semibold">
              Catalogue →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">SKU</th>
                  <th className="pb-3 text-right">Units Sold</th>
                  <th className="pb-3 text-right">Revenue</th>
                  <th className="pb-3 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.top_products.slice(0, 5).map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 font-semibold text-slate-800">{p.product_name}</td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">{p.sku}</td>
                    <td className="py-2.5 text-right font-medium text-slate-700">{p.units_sold}</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900">{curr}{p.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600">{curr}{p.gross_profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
