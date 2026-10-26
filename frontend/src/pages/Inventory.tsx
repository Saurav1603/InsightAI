import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  History,
  SlidersHorizontal,
  CheckCircle2,
  DollarSign,
  TrendingDown
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Category, StockMovement } from '../types';
import { useAuth } from '../context/AuthContext';

export const Inventory: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'movements'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // New Product Form State
  const [newProductName, setNewProductName] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newPurchaseCost, setNewPurchaseCost] = useState('');
  const [newTaxRate, setNewTaxRate] = useState('5.0');
  const [newReorderThreshold, setNewReorderThreshold] = useState('10');
  const [newInitialStock, setNewInitialStock] = useState('0');

  // Adjustment Form State
  const [adjDelta, setAdjDelta] = useState('');
  const [adjType, setAdjType] = useState('adjustment');
  const [adjNotes, setAdjNotes] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pList, cList] = await Promise.all([
        api.getProducts(search || undefined, selectedCategory || undefined),
        api.getCategories()
      ]);
      setProducts(pList);
      setCategories(cList);
      if (activeTab === 'movements') {
        const mList = await api.getStockMovements();
        setMovements(mList);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeBusiness, search, selectedCategory, activeTab]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct({
        name: newProductName,
        sku: newSku,
        barcode: newBarcode || null,
        category_id: newCategoryId || null,
        unit_of_measure: newUnit,
        selling_price: parseFloat(newSellingPrice) || 0,
        purchase_cost: parseFloat(newPurchaseCost) || 0,
        tax_rate: parseFloat(newTaxRate) || 0,
        reorder_threshold: parseFloat(newReorderThreshold) || 10,
        initial_stock: parseFloat(newInitialStock) || 0
      });
      setShowAddModal(false);
      // Reset form
      setNewProductName('');
      setNewSku('');
      setNewBarcode('');
      setNewSellingPrice('');
      setNewPurchaseCost('');
      setNewInitialStock('0');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add product.');
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    try {
      await api.recordStockAdjustment({
        product_id: selectedProduct.id,
        quantity_delta: parseFloat(adjDelta),
        movement_type: adjType,
        notes: adjNotes
      });
      setShowAdjustModal(false);
      setAdjDelta('');
      setAdjNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record adjustment.');
    }
  };

  const filteredProducts = products.filter(p => {
    if (lowStockOnly) return p.current_stock <= p.reorder_threshold;
    return true;
  });

  const totalInventoryValuation = products.reduce(
    (sum, p) => sum + (p.current_stock * p.purchase_cost), 0
  );
  const lowStockCount = products.filter(p => p.current_stock <= p.reorder_threshold).length;
  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalogue & Stock Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit inventory balances, reorder points, and atomic stock movement provenance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Active Products</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{products.length} Items</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Stock Valuation</span>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {curr}{totalInventoryValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Low Stock Alerts</span>
            <div className="text-xl font-extrabold text-amber-600 mt-0.5">{lowStockCount} Items</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-2.5 px-4 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'products'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalogue</span>
        </button>
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-2.5 px-4 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'movements'
              ? 'border-violet-600 text-violet-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Movement Ledger</span>
        </button>
      </div>

      {activeTab === 'products' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products by SKU, name, or barcode..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-violet-500 font-medium"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 ${
                  lowStockOnly
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Low Stock</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">SKU / Barcode</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Purchase Cost</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading products...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No products match your filter criteria.</td>
                  </tr>
                ) : (
                  filteredProducts.map(p => {
                    const isLow = p.current_stock <= p.reorder_threshold;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div>{p.sku}</div>
                          {p.barcode && <span className="text-[10px] text-slate-400 font-normal">{p.barcode}</span>}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{curr}{Number(p.selling_price).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-slate-500 font-medium">{curr}{Number(p.purchase_cost).toFixed(2)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-extrabold text-slate-900 text-sm">{p.current_stock}</span>
                          <span className="text-[10px] text-slate-500 ml-1">{p.unit_of_measure}</span>
                          <span className="block text-[10px] text-slate-400">Threshold: {p.reorder_threshold}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.current_stock <= 0 ? (
                            <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                              Low Stock
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              Healthy
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedProduct(p);
                              setShowAdjustModal(true);
                            }}
                            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Movements Ledger Tab */
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-right">Delta Qty</th>
                <th className="py-3 px-4 text-right">Resulting Balance</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      m.movement_type === 'sale'
                        ? 'bg-rose-50 text-rose-700'
                        : m.movement_type === 'purchase' || m.movement_type === 'opening'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {m.movement_type}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-extrabold ${
                    m.quantity_delta > 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{m.resulting_balance}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{m.reference_id || '-'}</td>
                  <td className="py-3 px-4 text-slate-500 truncate max-w-xs">{m.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Catalogue Product</h3>
            <p className="text-xs text-slate-500 mb-4">Register new SKU with pricing and opening inventory</p>

            <form onSubmit={handleCreateProduct} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="e.g. Basmati Rice 5kg"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="e.g. RIC-005"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="Optional barcode"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Unit</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="litre">Litres (L)</option>
                    <option value="pack">Pack</option>
                    <option value="box">Box</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Selling Price ({curr}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Purchase Cost ({curr}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newPurchaseCost}
                    onChange={(e) => setNewPurchaseCost(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Initial Opening Stock</label>
                  <input
                    type="number"
                    step="1"
                    value={newInitialStock}
                    onChange={(e) => setNewInitialStock(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reorder Threshold</label>
                  <input
                    type="number"
                    step="1"
                    value={newReorderThreshold}
                    onChange={(e) => setNewReorderThreshold(e.target.value)}
                    placeholder="10"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="py-2 text-xs text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustModal && selectedProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-1">Adjust Inventory Balance</h3>
            <p className="text-xs text-slate-500 mb-3">
              Product: <span className="font-semibold text-slate-800">{selectedProduct.name}</span>
              <br />
              Current Stock: <span className="font-bold text-violet-700">{selectedProduct.current_stock} {selectedProduct.unit_of_measure}</span>
            </p>

            <form onSubmit={handleStockAdjustment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Adjustment Delta (positive or negative)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjDelta}
                  onChange={(e) => setAdjDelta(e.target.value)}
                  placeholder="e.g. -2 for damage or +10 for found stock"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Reason / Movement Type</label>
                <select
                  value={adjType}
                  onChange={(e) => setAdjType(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                >
                  <option value="adjustment">Stock Audit Count Adjustment</option>
                  <option value="damage">Damaged or Wasted Goods</option>
                  <option value="return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Notes</label>
                <textarea
                  value={adjNotes}
                  onChange={(e) => setAdjNotes(e.target.value)}
                  placeholder="e.g. Expired batch discarded during inspection"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                  rows={2}
                ></textarea>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="py-2 text-xs text-slate-600 font-semibold hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
