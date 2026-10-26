import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Database,
  Download,
  Layers,
  FileCheck,
  Package,
  Users,
  Truck,
  Receipt,
  X,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const DataImport: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'suppliers' | 'sales'>('products');
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => {
        const combined = [...prev];
        for (const nf of newFiles) {
          if (!combined.some((f) => f.name === nf.name && f.size === nf.size)) {
            combined.push(nf);
          }
        }
        return combined;
      });
      setPreviewData(null);
      setErrorMessage(null);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewData(null);
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    setCommitResult(null);

    try {
      const res = await api.previewImport(files);
      setPreviewData(res);
      // Auto-select tab with data
      if (res.summary?.products_count > 0) setActiveTab('products');
      else if (res.summary?.customers_count > 0) setActiveTab('customers');
      else if (res.summary?.suppliers_count > 0) setActiveTab('suppliers');
      else if (res.summary?.sales_count > 0) setActiveTab('sales');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to preview files. Please check file format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData) return;
    setIsCommitting(true);
    try {
      const payload = previewData.batch_id
        ? { batch_id: previewData.batch_id }
        : (previewData.staged_records || previewData.preview_rows);
      const res = await api.commitImport(payload);
      setCommitResult(res);
      setPreviewData(null);
      setFiles([]);
    } catch (err: any) {
      alert(err.message || 'Failed to commit import.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,product_id,product_name,category,subcategory,unit_price,unit_of_measure,is_perishable,supplier_id,cost_price,reorder_level\n"
      + "1,Aashirvaad Whole Wheat Atta 5kg,Groceries,Staples,265,Pack,False,3,159.0,53\n"
      + "2,Amul Pure Ghee 500ml,Groceries,Dairy,315,Jar,False,1,189.0,31\n"
      + "3,Britannia Good Day 150g,Groceries,Snacks,40,Pack,False,6,24.0,50\n"
      + "4,Surf Excel Matic 2kg,Household,Laundry,430,Pack,False,2,258.0,24\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "insightai_sample_products_catalogue.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadInventorySample = () => {
    const csvContent = "data:text/csv;charset=utf-8,product_id,stock_level,batch_id,expiry_date,quantity_received\n"
      + "1,155,BATCH-1-20250101,2027-07-23,172\n"
      + "2,1153,BATCH-2-20250101,2027-01-27,1180\n"
      + "3,86,BATCH-3-20250101,2026-11-16,96\n"
      + "4,43,BATCH-4-20250101,2028-03-15,72\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "insightai_sample_inventory_batches.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const curr = activeBusiness?.currency_symbol || '₹';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Multi-Dataset Ingestion & Digitization</h1>
            <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
              Batch Ingestion
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload multiple CSV datasets simultaneously (Products, Stock & Batches, Customers, Suppliers, Sales) with automatic schema detection and cross-table joins.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Products Template</span>
          </button>
          <button
            onClick={handleDownloadInventorySample}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Stock Batches Template</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {commitResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm text-emerald-950 block">All Datasets Successfully Committed to Live Database!</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-emerald-800 mt-1">
                <span>📦 <strong>{commitResult.created_products}</strong> Products created</span>
                {commitResult.updated_products > 0 && <span>🔄 <strong>{commitResult.updated_products}</strong> Stock balances updated</span>}
                <span>🏷️ <strong>{commitResult.created_categories}</strong> Categories created</span>
                {commitResult.created_invoices > 0 && <span>🧾 <strong>{commitResult.created_invoices}</strong> Invoices imported ({commitResult.created_invoice_items} line items)</span>}
                {commitResult.created_customers > 0 && <span>👥 <strong>{commitResult.created_customers}</strong> Customers imported</span>}
                {commitResult.created_suppliers > 0 && <span>🚚 <strong>{commitResult.created_suppliers}</strong> Suppliers imported</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setCommitResult(null)}
            className="text-xs font-bold text-emerald-700 hover:underline px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="border-2 border-dashed border-slate-200 hover:border-violet-400 bg-slate-50/50 hover:bg-violet-50/20 rounded-2xl p-6 text-center transition cursor-pointer relative">
            <input
              type="file"
              multiple
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center pointer-events-none">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Choose or Drop All Your CSV Files Here
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Select 1 to 5 CSV files at once (e.g. <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded">products.csv</code> and <code className="text-violet-700 bg-violet-50 px-1 py-0.5 rounded">inventory.csv</code>). InsightAI will auto-link them on <code className="text-slate-800 font-mono">product_id</code>.
              </p>
            </div>
          </div>

          {/* Selected Files Badge List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Selected Files ({files.length}):</span>
                <button
                  type="button"
                  onClick={() => setFiles([])}
                  className="text-rose-600 hover:underline text-[11px]"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-800"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-violet-600" />
                    <span>{f.name}</span>
                    <span className="text-[10px] text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={files.length === 0 || isLoading}
              className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Parse, Auto-Classify & Preview ({files.length} {files.length === 1 ? 'file' : 'files'})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden space-y-4">
          {/* Header Summary */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">Multi-Dataset Verified Staging Layer</h3>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                    {previewData.total_files} Files Analyzed
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Review the automatically extracted, mapped, and relationally linked business records before writing to the ledger.
                </p>
              </div>
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isCommitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    <span>Commit All Verified Datasets</span>
                  </>
                )}
              </button>
            </div>

            {/* Relational Join Notice */}
            {previewData.merged_notice && (
              <div className="mt-3.5 p-3 bg-violet-50 border border-violet-200/80 rounded-xl text-xs text-violet-900 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="font-semibold">{previewData.merged_notice}</span>
              </div>
            )}

            {/* Detected Files Breakdown */}
            <div className="mt-4 flex flex-wrap gap-2">
              {previewData.files_detected?.map((fd: any, i: number) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-2xs"
                >
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-800">{fd.filename}</span>
                  <span className="text-[10px] uppercase font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">
                    {fd.detected_type}
                  </span>
                  <span className="text-slate-400 text-[11px] font-mono">{fd.rows_count} rows</span>
                </div>
              ))}
            </div>

            {/* Dataset Selector Tabs */}
            <div className="mt-4 flex items-center gap-2 border-b border-slate-200 pt-2">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition ${
                  activeTab === 'products'
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Products & Stock ({previewData.summary?.products_count || 0})</span>
              </button>
              {previewData.summary?.customers_count > 0 && (
                <button
                  onClick={() => setActiveTab('customers')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition ${
                    activeTab === 'customers'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Customers ({previewData.summary?.customers_count || 0})</span>
                </button>
              )}
              {previewData.summary?.suppliers_count > 0 && (
                <button
                  onClick={() => setActiveTab('suppliers')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition ${
                    activeTab === 'suppliers'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Suppliers ({previewData.summary?.suppliers_count || 0})</span>
                </button>
              )}
              {previewData.summary?.sales_count > 0 && (
                <button
                  onClick={() => setActiveTab('sales')}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition ${
                    activeTab === 'sales'
                      ? 'border-violet-600 text-violet-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Sales Invoices ({previewData.summary?.sales_count || 0})</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab 1: Products Preview */}
          {activeTab === 'products' && (
            <div className="overflow-x-auto p-4 pt-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/80">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3 text-right">Selling Price</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Opening Stock</th>
                    <th className="py-2.5 px-3 text-right">Reorder Threshold</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3">Batch & Expiry</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview_data?.products?.map((row: any) => (
                    <tr key={row.row_index} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.row_index}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 max-w-xs truncate">{row.name}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-700 font-medium">{row.sku}</td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{curr}{Number(row.selling_price).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-600">{curr}{Number(row.purchase_cost).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-black text-emerald-600">{row.initial_stock}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{row.reorder_threshold}</td>
                      <td className="py-2 px-3 text-slate-500">{row.unit_of_measure}</td>
                      <td className="py-2 px-3 text-[11px] text-slate-500 font-mono">
                        {row.batch_id ? (
                          <span>
                            {row.batch_id} <span className="text-slate-400">({row.expiry_date})</span>
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Valid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.summary?.products_count > 50 && (
                <p className="text-center text-xs text-slate-400 py-3">
                  Showing first 50 of {previewData.summary.products_count} records. All {previewData.summary.products_count} records will be committed.
                </p>
              )}
            </div>
          )}

          {/* Tab 2: Customers Preview */}
          {activeTab === 'customers' && (
            <div className="overflow-x-auto p-4 pt-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/80">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-right">Credit Limit</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview_data?.customers?.map((row: any) => (
                    <tr key={row.row_index} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.row_index}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{row.phone || '-'}</td>
                      <td className="py-2 px-3 text-slate-500">{row.email || '-'}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{row.address || '-'}</td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">{curr}{Number(row.credit_limit).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-bold text-rose-600">{curr}{Number(row.outstanding_balance).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Valid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Suppliers Preview */}
          {activeTab === 'suppliers' && (
            <div className="overflow-x-auto p-4 pt-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/80">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Supplier Name</th>
                    <th className="py-2.5 px-3">Contact Person</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Address</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview_data?.suppliers?.map((row: any) => (
                    <tr key={row.row_index} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.row_index}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.name}</td>
                      <td className="py-2 px-3 text-slate-700">{row.contact_person || '-'}</td>
                      <td className="py-2 px-3 font-mono text-slate-700">{row.phone || '-'}</td>
                      <td className="py-2 px-3 text-slate-500">{row.email || '-'}</td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{row.address || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Valid
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Sales Preview */}
          {activeTab === 'sales' && (
            <div className="overflow-x-auto p-4 pt-0">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase bg-slate-50/80">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Order / Invoice #</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-center">Qty Sold</th>
                    <th className="py-2.5 px-3 text-right">Sale Price</th>
                    <th className="py-2.5 px-3 text-right">Cost Price</th>
                    <th className="py-2.5 px-3 text-right">Total Revenue</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.preview_data?.sales?.map((row: any) => (
                    <tr key={row.row_index} className="hover:bg-slate-50/60 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{row.row_index}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-900">{row.invoice_number}</td>
                      <td className="py-2 px-3 font-mono text-slate-600 text-[11px]">{row.date || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-slate-900 max-w-xs truncate">{row.product_name || 'Walk-in Item'}</td>
                      <td className="py-2 px-3 font-medium text-slate-700">{row.customer_name || 'Walk-in Customer'}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full font-mono">
                          {row.quantity || row.item_count || 1} units
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-800">{curr}{Number(row.unit_price || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-slate-500">{curr}{Number(row.purchase_cost || 0).toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-black text-emerald-600">{curr}{Number(row.total_amount).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          Finalized
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.summary?.sales_count > 50 && (
                <p className="text-center text-xs text-slate-400 py-3">
                  Showing first 50 of {previewData.summary.sales_count.toLocaleString()} invoices ({previewData.summary.transactions_count.toLocaleString()} line items). All historical records will be committed to live analytics.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
