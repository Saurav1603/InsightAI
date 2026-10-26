import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  ShoppingCart,
  LogOut,
  User as UserIcon,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const { user, activeBusiness, businesses, switchBusiness, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-20">
      {/* Left: Active Workspace Selector */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition text-slate-800 text-xs font-semibold"
          >
            <div className="w-6 h-6 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <span className="block leading-tight text-slate-900">{activeBusiness?.name || 'Select Workspace'}</span>
              <span className="block text-[10px] text-slate-600 font-normal">{activeBusiness?.currency || 'INR'} ({activeBusiness?.currency_symbol || '₹'})</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Switch Business
              </div>
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    switchBusiness(b);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                    activeBusiness?.id === b.id ? 'bg-violet-50 text-violet-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <span>{b.name}</span>
                  {activeBusiness?.id === b.id && <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Live DB Connected</span>
        </div>
      </div>

      {/* Right: Quick POS Action & Profile */}
      <div className="flex items-center gap-3">
        <Link
          to="/pos"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>New Sale (POS)</span>
        </Link>

        <Link
          to="/ai"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
          <span>Ask AI</span>
        </Link>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-slate-200 hover:border-slate-300 transition"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-xs font-medium text-slate-700 pr-1">{user?.full_name || 'User'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-[11px] text-slate-600 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  setUserMenuOpen(false);
                  navigate('/login');
                }}
                className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
