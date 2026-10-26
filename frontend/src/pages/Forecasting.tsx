import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Line, ComposedChart
} from 'recharts';
import { api } from '../services/api';
import { ForecastResponse } from '../types';
import { useAuth } from '../context/AuthContext';

export const Forecasting: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [horizon, setHorizon] = useState<number>(30);
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadForecast = async () => {
      setIsLoading(true);
      try {
        const res = await api.getSalesForecast(horizon);
        setForecastData(res);
      } catch (err) {
        console.error('Failed to load forecast:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadForecast();
  }, [activeBusiness, horizon]);

  if (isLoading || !forecastData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 rounded-xl"></div>)}
        </div>
        <div className="h-80 bg-slate-200 rounded-xl"></div>
      </div>
    );
  }

  // Combine historical and forecast for seamless visualization
  const chartData: any[] = [];
  forecastData.historical_trend.forEach(pt => {
    chartData.push({
      date: pt.date,
      actual_sales: pt.sales,
      predicted_sales: null,
      lower_bound: null,
      upper_bound: null
    });
  });

  forecastData.forecast.forEach(pt => {
    chartData.push({
      date: pt.date,
      actual_sales: null,
      predicted_sales: pt.predicted_sales,
      lower_bound: pt.lower_bound,
      upper_bound: pt.upper_bound
    });
  });

  const next7DaysRevenue = forecastData.forecast.slice(0, 7).reduce((sum, p) => sum + p.predicted_sales, 0);
  const totalHorizonRevenue = forecastData.forecast.reduce((sum, p) => sum + p.predicted_sales, 0);
  const evalMetrics = forecastData.evaluation_metrics;
  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales & Demand Forecasting Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Statistical exponential smoothing and trend extrapolation with 95% confidence intervals
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold">
          {[14, 30, 60].map(h => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              className={`px-3 py-1.5 rounded-lg transition ${
                horizon === h
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {h} Days Horizon
            </button>
          ))}
        </div>
      </div>

      {/* Model & Evaluation Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Model Architecture</span>
          <div className="text-base font-extrabold text-slate-900 mt-1">{forecastData.model_name}</div>
          <span className="text-[10px] text-slate-400">Trained on {forecastData.data_points_used} daily time-series points</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Next 7 Days Projected</span>
          <div className="text-base font-extrabold text-emerald-600 mt-1">
            {curr}{next7DaysRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Short-term operational cash projection</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">{horizon}-Day Cumulative Forecast</span>
          <div className="text-base font-extrabold text-violet-700 mt-1">
            {curr}{totalHorizonRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400">Expected total top-line revenue</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Backtested Evaluation</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-slate-800">MAE: {curr}{evalMetrics.mae}</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-800">MAPE: {evalMetrics.mape_percent}%</span>
          </div>
          <span className="text-[10px] text-slate-400">RMSE: {curr}{evalMetrics.rmse}</span>
        </div>
      </div>

      {forecastData.data_limitation_warning && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>{forecastData.data_limitation_warning}</span>
        </div>
      )}

      {/* Main Forecast Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Historical Actuals vs {horizon}-Day Predictive Horizon</h3>
            <p className="text-[11px] text-slate-500">Includes upper and lower expanding prediction bounds</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-slate-900"></span>
              <span className="text-slate-600">Historical Actuals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-violet-600"></span>
              <span className="text-slate-600">Forecast Projection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-violet-100 border border-violet-300"></span>
              <span className="text-slate-600">95% Uncertainty Bounds</span>
            </div>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -5, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                formatter={(val: any, name: any) => {
                  if (val === null || val === undefined) return ['', ''];
                  const labelMap: Record<string, string> = {
                    actual_sales: 'Historical Sales',
                    predicted_sales: 'Projected Sales',
                    upper_bound: 'Upper 95% Bound',
                    lower_bound: 'Lower 95% Bound'
                  };
                  return [`₹${Number(val).toFixed(2)}`, labelMap[String(name)] || String(name)];
                }}
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="upper_bound" stroke="none" fill="url(#forecastBand)" />
              <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#ffffff" />
              <Line type="monotone" dataKey="actual_sales" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="predicted_sales" stroke="#7c3aed" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3, fill: '#7c3aed' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
