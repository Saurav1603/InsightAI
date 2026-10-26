import React, { useState, useEffect } from 'react';
import { Truck, Plus, Package, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Supplier, Product } from '../types';
import { useAuth } from '../context/AuthContext';

export const Purchases: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('10');
  const [unitCost, setUnitCost] = useState('0');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [supList, prodList] = await Promise.all([
        api.getSuppliers(),
        api.getProducts()
      ]);
      setSuppliers(supList);
      setProducts(prodList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness]);

  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;
    setItems(prev => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.name,
        quantity: parseFloat(quantity) || 1,
        unit_cost: parseFloat(unitCost) || prod.purchase_cost
      }
    ]);
    setSelectedProductId('');
    setQuantity('10');
    setUnitCost('0');
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Add at least one item');
      return;
    }
    try {
      await api.createPurchase({
        supplier_id: selectedSupplier || null,
        purchase_number: purchaseNumber || null,
        paid_amount: parseFloat(paidAmount) || 0,
        items
      });
      setShowModal(false);
      setItems([]);
      alert('Purchase recorded and stock received into inventory!');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase.');
    }
  };

  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Purchases & Goods Receiving</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log supplier restock receipts with atomic inventory quantity increments
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Purchase</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Registered Wholesale Suppliers</h3>
          <p className="text-xs text-slate-500 mt-0.5">Maintain supplier relationships and inventory replenishment</p>
        </div>
        <span className="text-xs font-bold bg-violet-100 text-violet-700 px-3 py-1 rounded-full">
          {suppliers.length} Active Suppliers
        </span>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
              <th className="py-3 px-4">Supplier Name</th>
              <th className="py-3 px-4">Contact Person</th>
              <th className="py-3 px-4">Phone / Contact</th>
              <th className="py-3 px-4 text-right">Outstanding Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/60 transition">
                <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                <td className="py-3 px-4 text-slate-700 font-medium">{s.contact_person || '-'}</td>
                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{s.phone || '-'}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{curr}{Number(s.outstanding_balance).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Purchase Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">Record Supplier Purchase</h3>
            <p className="text-xs text-slate-500 mb-4">Stock will be automatically received and added to running balances.</p>

            <form onSubmit={handleCreatePurchase} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Supplier</label>
                  <select
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">PO / Bill Number</label>
                  <input
                    type="text"
                    value={purchaseNumber}
                    onChange={(e) => setPurchaseNumber(e.target.value)}
                    placeholder="e.g. PO-9842"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              {/* Add Line Items Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">Add Restock Product</span>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 sm:col-span-1">
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const p = products.find(x => x.id === e.target.value);
                        if (p) setUnitCost(String(p.purchase_cost));
                      }}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Cost"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1 text-xs bg-violet-100 hover:bg-violet-200 text-violet-800 font-semibold rounded-lg transition"
                >
                  + Add Item to Purchase
                </button>
              </div>

              {/* Line Items List */}
              {items.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-100 p-2 font-bold flex justify-between">
                    <span>Product</span>
                    <span>Total</span>
                  </div>
                  {items.map((it, idx) => (
                    <div key={idx} className="p-2 border-t border-slate-100 flex justify-between">
                      <span>{it.product_name} ({it.quantity} x {curr}{it.unit_cost})</span>
                      <span className="font-bold">{curr}{(it.quantity * it.unit_cost).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
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
                  Confirm & Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
