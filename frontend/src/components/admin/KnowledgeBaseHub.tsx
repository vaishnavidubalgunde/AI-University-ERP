import React, { useState, useEffect } from 'react'
import {
  BookOpen,
  Cpu,
  Layers,
  Sparkles,
  UploadCloud,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { adminService, RAGTestResult } from '../../services/adminService'
import { KnowledgeDocItem } from '../../types/admin'
import useToast from '../../context/useToast'

export const KnowledgeBaseHub: React.FC = () => {
  const toast = useToast()
  const [docs, setDocs] = useState<KnowledgeDocItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isReindexing, setIsReindexing] = useState(false)
  const [testQuery, setTestQuery] = useState('What is the minimum attendance requirement for semester exams?')
  const [isTestingQuery, setIsTestingQuery] = useState(false)
  const [testResult, setTestResult] = useState<RAGTestResult | null>(null)

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category: 'Academic Policy',
    filename: 'dsu_guidelines_2026.pdf',
    content: '',
  })
  const [isUploading, setIsUploading] = useState(false)

  const loadDocs = async () => {
    setIsLoading(true)
    try {
      const res = await adminService.getDocuments()
      setDocs(res)
    } catch {
      toast.error('Data Error', 'Failed to load knowledge documents')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [])

  const handleReindex = async () => {
    setIsReindexing(true)
    try {
      const res = await adminService.reindexVectorStore()
      toast.success('Vector Index Rebuilt', res.message)
      loadDocs()
    } catch {
      toast.error('Reindex Error', 'FAISS re-indexing failed.')
    } finally {
      setIsReindexing(false)
    }
  }

  const handleTestQuery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testQuery.trim()) return
    setIsTestingQuery(true)
    try {
      const res = await adminService.testRagKnowledge(testQuery)
      setTestResult(res)
      toast.success('RAG Pipeline Tested', `Retrieved ${res.retrieved_chunks.length} chunks in ${res.latency_ms}ms`)
    } catch {
      toast.error('Test Error', 'RAG query test failed.')
    } finally {
      setIsTestingQuery(false)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadForm.title || !uploadForm.content) return
    setIsUploading(true)
    try {
      const res = await adminService.uploadDocument(uploadForm)
      toast.success('Document Ingested', res.message)
      setIsUploadOpen(false)
      setUploadForm({ title: '', category: 'Academic Policy', filename: 'dsu_guidelines_2026.pdf', content: '' })
      loadDocs()
    } catch {
      toast.error('Ingest Error', 'Failed to chunk and embed document.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-500/30 text-purple-200 border border-purple-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
              AI Knowledge & RAG Management
            </span>
            <span className="text-xs text-purple-300">FAISS Dense Vector Store</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">University Knowledge Base & Vector Index</h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Semantic chunking, SentenceTransformer embeddings, and RAG debug introspection for verifiable AI citations.
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleReindex}
            disabled={isReindexing}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2"
          >
            {isReindexing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4 text-purple-300" />}
            <span>Re-Index Vector Store</span>
          </button>
          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* RAG Knowledge Testing Section (Requirements 54 & 55) */}
      <div className="bg-white border border-purple-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Zap className="w-4 h-4 text-purple-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Admin AI Knowledge Test & RAG Debugger</h2>
              <p className="text-xs text-slate-500">Live inspection of semantic vector search, chunk similarity scores, and LLM synthesis</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 font-mono text-[10px] font-bold border border-purple-200">
            ADMIN DEBUG MODE
          </span>
        </div>

        <form onSubmit={handleTestQuery} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Ask any institutional question to test vector retrieval..."
              className="w-full pl-9 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={isTestingQuery}
            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isTestingQuery ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-yellow-300" />}
            <span>Run RAG Test</span>
          </button>
        </form>

        {/* Test Result Inspector */}
        {testResult && (
          <div className="space-y-4 pt-4 border-t border-slate-100 animate-fade-in">
            {/* Top Telemetry strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Query Intent</span>
                <span className="font-bold text-indigo-700 font-mono">{testResult.intent}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Latency</span>
                <span className="font-bold text-emerald-700 font-mono">{testResult.latency_ms} ms</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Embedding Engine</span>
                <span className="font-semibold text-slate-700 truncate block">{testResult.embedding_model.split('/')[1] || 'all-MiniLM-L6-v2'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 block uppercase">LLM Synthesis</span>
                <span className="font-semibold text-purple-700 truncate block">{testResult.llm_model}</span>
              </div>
            </div>

            {/* Generated Synthesized Answer */}
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-xs space-y-2">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                Synthesized Institutional Answer:
              </span>
              <p className="text-slate-800 leading-relaxed font-sans">{testResult.answer}</p>
            </div>

            {/* Retrieved Semantic Chunks */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800">Retrieved Semantic Chunks (RAG Context):</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {testResult.retrieved_chunks.map((chk) => (
                  <div key={chk.chunk_id} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-purple-700 text-[11px]">{chk.chunk_id}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono font-bold text-[10px]">
                        Score: {chk.similarity_score}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">{chk.document_name}</div>
                    <p className="text-slate-600 text-[11px] leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      "{chk.text}"
                    </p>
                    <div className="text-[10px] text-blue-600 truncate font-mono">{chk.source_url}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Indexed Document Store */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Indexed Institutional Documents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((d) => (
            <div key={d.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md text-[10px] font-bold">
                  {d.category}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {d.status}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-xs leading-snug">{d.title}</h3>
              <div className="text-[11px] text-slate-500 space-y-0.5 bg-white p-2.5 rounded-xl border border-slate-100">
                <div>📄 File: {d.filename} ({d.file_size})</div>
                <div>🧩 Semantic Chunks: <strong className="text-purple-700">{d.chunk_count} vectors</strong></div>
                <div>⏱ Uploaded: {d.uploaded_at}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Upload & Chunk University Document</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hostel Fee Schedule & Refund Regulations"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Academic Policy">Academic Policy</option>
                  <option value="Curriculum">Curriculum & Syllabus</option>
                  <option value="Examination">Examination Ordinance</option>
                  <option value="Placements">Placements</option>
                  <option value="Hostel & Facilities">Hostel & Facilities</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Text Content *</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Paste official policy text for semantic chunking..."
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm({ ...uploadForm, content: e.target.value })}
                  className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Ingest & Embed</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default KnowledgeBaseHub
