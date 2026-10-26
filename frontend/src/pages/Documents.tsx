import React, { useState, useEffect } from 'react';
import {
  FileText,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem, DocumentCitation } from '../types';
import { useAuth } from '../context/AuthContext';

export const Documents: React.FC = () => {
  const { activeBusiness } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Semantic Query State
  const [query, setQuery] = useState('');
  const [queryAnswer, setQueryAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<DocumentCitation[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  const loadDocuments = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [activeBusiness]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadMessage(null);
    try {
      await api.uploadDocument(selectedFile, docTitle || selectedFile.name);
      setUploadMessage('Document uploaded, indexed, and chunked successfully!');
      setSelectedFile(null);
      setDocTitle('');
      loadDocuments();
    } catch (err: any) {
      setUploadMessage('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsQuerying(true);
    setQueryAnswer(null);
    setCitations([]);
    try {
      const res = await api.queryDocuments(query);
      setQueryAnswer(res.answer);
      setCitations(res.citations);
    } catch (err: any) {
      setQueryAnswer('Query failed: ' + err.message);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Document Hub & RAG Intelligence</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest supplier contracts, store policies, and paper registers for semantic passage retrieval
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UploadCloud className="w-5 h-5 text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">Upload Business Document</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Supported formats: PDF, TXT, CSV. Files are chunked and embedded in isolated workspace memory.
            </p>

            {uploadMessage && (
              <div className={`p-2.5 rounded-lg text-xs mb-3 flex items-center gap-2 ${
                uploadMessage.includes('failed')
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {uploadMessage.includes('failed') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{uploadMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Document Title (Optional)</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Supplier Agreement 2026"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Select File</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.txt,.csv,.json"
                  onChange={(e) => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full mt-2 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload & Generate Chunks</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Semantic Search & Query Tester */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-violet-600" />
              <h3 className="text-sm font-bold text-slate-900">Semantic Document Retrieval (RAG)</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Ask questions to retrieve supporting passages with direct document references and relevance scores.
            </p>

            <form onSubmit={handleQuery} className="flex gap-2 mb-4">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. What is our return policy for milk and fresh dairy?"
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={isQuerying || !query.trim()}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isQuerying ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 'Search'}
              </button>
            </form>

            {/* Answer & Citations */}
            {queryAnswer && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                <div className="text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-line">
                  {queryAnswer}
                </div>

                {citations.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Supporting Citations:</span>
                    {citations.map((c, i) => (
                      <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-700">
                        <span className="font-bold text-violet-700">{c.document_title}</span> (Chunk #{c.chunk_index}, Relevance: {c.relevance_score})
                        <p className="italic text-slate-600 mt-0.5">"{c.snippet}"</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Uploaded Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Indexed Business Documents</h3>
          <span className="text-xs text-slate-500">{documents.length} Files</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4 text-center">Chunks</th>
                <th className="py-3 px-4 text-right">Size</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Upload Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                    <span>{doc.title}</span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{doc.original_filename}</td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">{doc.total_chunks}</td>
                  <td className="py-3 px-4 text-right text-slate-500">{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {new Date(doc.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
