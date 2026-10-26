import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Download,
  RotateCcw,
  PlusCircle,
  Eye,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';
import { Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

export const Invoices: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const data = await api.getInvoices(statusFilter || undefined, search || undefined);
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeBusiness, statusFilter, search]);

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to cancel this invoice? Stock will be atomically restored.')) {
      return;
    }
    try {
      await api.cancelInvoice(invoiceId);
      setMessage('Invoice cancelled and stock restored to inventory.');
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel invoice.');
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount) return;
    setIsSubmitting(true);
    try {
      await api.addInvoicePayment(
        selectedInvoice.id,
        parseFloat(paymentAmount),
        paymentMethod,
        'Manual payment record'
      );
      setMessage('Payment recorded successfully.');
      setSelectedInvoice(null);
      setPaymentAmount('');
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Invoices & Billing History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Sequential auditable invoice register with atomic stock synchronisation
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice number or customer name..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-violet-500 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="finalized">Finalized</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Payment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">No invoices found matching criteria.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {inv.customer_name || inv.walk_in_customer_name || 'Walk-in'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {curr}{Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      {curr}{Number(inv.paid_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700">
                      {curr}{Number(inv.balance_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        inv.status === 'finalized'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {inv.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <a
                        href={api.getInvoicePdfUrl(inv.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      {inv.status === 'finalized' && inv.balance_amount > 0 && (
                        <button
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1 p-1.5 text-violet-600 hover:text-violet-900 hover:bg-violet-50 rounded transition"
                          title="Record Payment"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {inv.status === 'finalized' && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id)}
                          className="inline-flex items-center gap-1 p-1.5 text-rose-600 hover:text-rose-900 hover:bg-rose-50 rounded transition"
                          title="Cancel Invoice & Restore Stock"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Record Customer Payment</h3>
            <p className="text-xs text-slate-500 mb-4">
              Invoice <span className="font-bold text-slate-800">{selectedInvoice.invoice_number}</span> (Balance Due: {curr}{Number(selectedInvoice.balance_amount).toFixed(2)})
            </p>

            <form onSubmit={handleAddPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Amount ({curr})</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={selectedInvoice.balance_amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={String(selectedInvoice.balance_amount)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                >
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / QR</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="py-2 text-xs text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
