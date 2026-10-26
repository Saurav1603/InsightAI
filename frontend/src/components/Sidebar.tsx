import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Package,
  Truck,
  TrendingDown,
  Users,
  Building2,
  BarChart3,
  LineChart,
  Bot,
  FileText,
  AlertTriangle,
  UploadCloud,
  Sparkles
} from 'lucide-react';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const sections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', to: '/', icon: LayoutDashboard }
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'POS / New Sale', to: '/pos', icon: ShoppingCart, badge: 'Fast' },
        { name: 'Invoices', to: '/invoices', icon: Receipt },
        { name: 'Inventory & Stock', to: '/inventory', icon: Package },
        { name: 'Purchases', to: '/purchases', icon: Truck },
        { name: 'Expenses', to: '/expenses', icon: TrendingDown },
        { name: 'Customers', to: '/customers', icon: Users },
        { name: 'Suppliers', to: '/suppliers', icon: Building2 }
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'Analytics', to: '/analytics', icon: BarChart3 },
        { name: 'Forecasting', to: '/forecasting', icon: LineChart },
        { name: 'AI Assistant', to: '/ai', icon: Bot, badge: 'Agents' },
        { name: 'Document Hub', to: '/documents', icon: FileText },
        { name: 'Insights & Alerts', to: '/recommendations', icon: AlertTriangle }
      ]
    },
    {
      title: 'DATA DIGITIZATION',
      items: [
        { name: 'Data Import', to: '/imports', icon: UploadCloud }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen select-none shrink-0">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20 text-white font-bold text-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-lg tracking-tight">InsightAI</span>
            <span className="text-[10px] font-semibold bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded border border-violet-500/30">v1.0</span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Business Operations SaaS</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {sections.map((sec) => (
          <div key={sec.title}>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sec.title}
            </div>
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30 font-semibold'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0 opacity-80" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded font-medium">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-300 font-medium">Multi-Agent Engine</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">Active</span>
        </div>
      </div>
    </aside>
  );
};
