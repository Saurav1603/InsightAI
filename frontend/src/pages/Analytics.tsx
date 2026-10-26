import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  TrendingUp,
  DollarSign,
  TrendingDown,
  PieChart as PieIcon
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../services/api';
import { FinancialSummary } from '../types';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1'];

export const Analytics: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await api.getAnalyticsSummary(days);
        setSummary(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [activeBusiness, days]);

  if (isLoading || !summary) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>)}
        </div>
        <div className="h-72 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  const kpis = summary.kpis;
  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Business Intelligence & Financial Audit</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic gross margin, net operating profit, and inventory turnover analysis
          </p>
        </div>
        {/* Horizon selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg transition ${
                days === d
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Last {d} Days
            </button>
          ))}
        </div>
      </div>

      {/* Financial Statement P&L Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Sales</span>
          <div className="text-lg font-extrabold text-slate-900 mt-1">
            {curr}{Number(kpis.total_sales).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">{kpis.total_invoices} Finalized Invoices</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">COGS</span>
          <div className="text-lg font-extrabold text-slate-700 mt-1">
            {curr}{(Number(kpis.total_sales) - Number(kpis.gross_profit)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">Cost of Goods Sold</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Gross Profit</span>
          <div className="text-lg font-extrabold text-emerald-600 mt-1">
            {curr}{Number(kpis.gross_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
            {kpis.gross_margin_percentage}% Margin
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operating Expenses</span>
          <div className="text-lg font-extrabold text-rose-600 mt-1">
            {curr}{Number(kpis.total_expenses).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">Rent, Utilities, Wages</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Operating Profit</span>
          <div className="text-lg font-extrabold text-violet-700 mt-1">
            {curr}{Number(kpis.net_operating_profit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-500">Gross Profit - Expenses</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales & Profit Breakdown Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Daily Sales Trend</h3>
          <p className="text-[11px] text-slate-500 mb-4">Historical daily revenue in selected period</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.sales_trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="sales" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operating Expense Breakdown Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Operating Expense Breakdown</h3>
          <p className="text-[11px] text-slate-500 mb-4">Expense distribution by category</p>
          <div className="h-64 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.expense_breakdown}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {summary.expense_breakdown.map((_, index) => (
                    <Cell key={`cell-exp-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Profitability Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Product Profitability Breakdown</h3>
            <p className="text-[11px] text-slate-500">Margin and revenue contribution per catalogue product</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Revenue</th>
                <th className="py-3 px-4 text-right">Gross Profit</th>
                <th className="py-3 px-4 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.top_products.map((p, idx) => {
                const marginPct = p.revenue > 0 ? (p.gross_profit / p.revenue) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">{p.product_name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{p.sku}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">{p.units_sold}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">{curr}{Number(p.revenue).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">{curr}{Number(p.gross_profit).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        marginPct >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {marginPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
