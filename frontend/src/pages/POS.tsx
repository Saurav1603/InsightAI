import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  Download,
  User,
  CreditCard,
  QrCode,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { Product, Customer, Invoice } from '../types';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export const POS: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkInName, setWalkInName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalizedInvoice, setFinalizedInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodList, custList] = await Promise.all([
          api.getProducts(),
          api.getCustomers()
        ]);
        setProducts(prodList);
        setCustomers(custList);
      } catch (err) {
        console.error('Failed to load POS catalogue:', err);
      }
    };
    loadData();
  }, [activeBusiness]);

  const addToCart = (product: Product) => {
    setErrorMessage(null);
    if (product.current_stock <= 0) {
      setErrorMessage(`Cannot add "${product.name}" - out of stock!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.current_stock) {
          setErrorMessage(`Cannot add more than available stock (${product.current_stock} ${product.unit_of_measure})`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setErrorMessage(null);
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.current_stock) {
              setErrorMessage(`Cannot exceed available stock (${item.product.current_stock} ${item.product.unit_of_measure})`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.product.selling_price * item.quantity), 0);
  const totalTax = cart.reduce((sum, item) => {
    const gross = item.product.selling_price * item.quantity - item.discount;
    return sum + (gross * (item.product.tax_rate / 100));
  }, 0);
  const grandTotal = Math.max(0, subtotal + totalTax);

  const receivedNum = parseFloat(amountReceived) || grandTotal;
  const balanceDue = Math.max(0, grandTotal - receivedNum);
  const changeToReturn = Math.max(0, receivedNum - grandTotal);

  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Please add items to checkout.');
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const invoiceData = {
        customer_id: selectedCustomerId || null,
        walk_in_customer_name: selectedCustomerId ? null : walkInName,
        items: cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          sku: item.product.sku,
          unit_price: item.product.selling_price,
          quantity: item.quantity,
          discount_amount: item.discount,
          tax_rate: item.product.tax_rate
        })),
        discount_amount: 0,
        payment_method: paymentMethod,
        amount_received: receivedNum,
        notes: notes,
        is_draft: false
      };

      const result = await api.createInvoice(invoiceData);
      setFinalizedInvoice(result);
      setCart([]);
      setAmountReceived('');
      setNotes('');

      // Confetti celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Refresh product stock
      const updatedProducts = await api.getProducts();
      setProducts(updatedProducts);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to finalize invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.includes(search))
  );

  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col lg:flex-row gap-6">
      {/* Left: Product Search & Catalogue Selection */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product by name, SKU, or scan barcode..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:bg-white transition"
              autoFocus
            />
          </div>
        </div>

        {errorMessage && (
          <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {filteredProducts.map(product => {
            const isOutOfStock = product.current_stock <= 0;
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={isOutOfStock}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  isOutOfStock
                    ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                    : 'border-slate-200/80 bg-white hover:border-violet-400 hover:shadow-md'
                }`}
              >
                <div>
                  <span className="text-[10px] font-mono font-semibold text-slate-400 block">{product.sku}</span>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-0.5">{product.name}</h4>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-violet-700">
                    {curr}{Number(product.selling_price).toFixed(2)}
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    product.current_stock <= product.reorder_threshold
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {product.current_stock} {product.unit_of_measure}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Cart, Customer & Checkout Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-violet-600" />
            <h3 className="text-sm font-bold text-slate-900">Current Cart</h3>
          </div>
          <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
            {cart.reduce((sum, i) => sum + i.quantity, 0)} items
          </span>
        </div>

        {/* Customer Select */}
        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Customer</label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-violet-500"
          >
            <option value="">Walk-in Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
              <ShoppingCart className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs">Cart is empty. Tap products to add.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-semibold text-slate-900 truncate">{item.product.name}</h5>
                  <span className="text-[10px] text-slate-500">
                    {curr}{Number(item.product.selling_price).toFixed(2)} x {item.quantity}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold w-5 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="w-5 h-5 rounded text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals Summary */}
        <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs text-slate-600 mb-3">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">{curr}{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax (GST)</span>
            <span className="font-semibold text-slate-900">{curr}{totalTax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1 border-t border-slate-200">
            <span>Grand Total</span>
            <span className="text-violet-700 text-base">{curr}{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div className="mb-3">
          <label className="block text-[11px] font-semibold text-slate-500 mb-1">Payment Method</label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['cash', 'upi', 'card', 'credit'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setPaymentMethod(m)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold uppercase transition border ${
                  paymentMethod === m
                    ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Finalize Button */}
        <button
          onClick={handleFinalizeSale}
          disabled={cart.length === 0 || isSubmitting}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalize Sale ({curr}{grandTotal.toFixed(2)})</span>
            </>
          )}
        </button>
      </div>

      {/* Sale Success Modal */}
      {finalizedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Sale Successfully Finalized!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Invoice <span className="font-mono font-bold text-slate-800">{finalizedInvoice.invoice_number}</span> has been committed to the ledger. Stock updated atomically.
            </p>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs space-y-1 text-slate-700 text-left">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold">{curr}{Number(finalizedInvoice.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Mode:</span>
                <span className="font-semibold uppercase">{finalizedInvoice.payment_method}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <a
                href={api.getInvoicePdfUrl(finalizedInvoice.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
              <button
                onClick={() => setFinalizedInvoice(null)}
                className="py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
