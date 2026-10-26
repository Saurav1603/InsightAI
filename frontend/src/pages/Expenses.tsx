import React, { useState, useEffect } from 'react';
import { TrendingDown, Plus, Calendar, DollarSign, Tag } from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';
import { useAuth } from '../context/AuthContext';

export const Expenses: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState('Rent');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadExpenses = async () => {
    setIsLoading(true);
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [activeBusiness]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    try {
      await api.createExpense({
        category,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        description
      });
      setShowModal(false);
      setAmount('');
      setDescription('');
      loadExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to add expense.');
    }
  };

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Operating Expense Register</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log overhead, utilities, store rent, and employee payroll
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* Overview Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase">Recorded Operating Expenses</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            {curr}{totalExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
          <TrendingDown className="w-5 h-5" />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Payment Method</th>
              <th className="py-3 px-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 text-slate-500">
                  {new Date(e.expense_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {e.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-700 font-medium">{e.description || '-'}</td>
                <td className="py-3 px-4 uppercase text-[10px] text-slate-500 font-semibold">{e.payment_method}</td>
                <td className="py-3 px-4 text-right font-extrabold text-rose-600">
                  {curr}{Number(e.amount).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Record Overhead Expense</h3>
            <p className="text-xs text-slate-500 mb-4">Included in P&L Net Operating Profit calculations.</p>

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                >
                  <option value="Store Rent">Store Rent</option>
                  <option value="Electricity & Utilities">Electricity & Utilities</option>
                  <option value="Staff Wages">Staff Wages</option>
                  <option value="Logistics & Transport">Logistics & Transport</option>
                  <option value="Packaging & Bags">Packaging & Bags</option>
                  <option value="Maintenance & Repair">Maintenance & Repair</option>
                  <option value="Marketing & Signage">Marketing & Signage</option>
                  <option value="Misc">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Amount ({curr}) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Memo</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly maintenance fee"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  rows={2}
                ></textarea>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="py-2 text-xs text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
