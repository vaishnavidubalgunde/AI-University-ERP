import React, { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Upload,
  RefreshCw,
  Trash2,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  ArrowRight,
  Eye,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import { aiService } from '../../services/aiService'
import { DocumentItem, DocumentDetailResponse, DocumentSummaryResponse } from '../../types/ai'
import MarkdownRenderer from './MarkdownRenderer'

interface DocumentLibraryViewProps {
  onSelectDocumentForChat: (docId: number, docTitle: string) => void
  onNavigateToChat: () => void
}

export const DocumentLibraryView: React.FC<DocumentLibraryViewProps> = ({
  onSelectDocumentForChat,
  onNavigateToChat,
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgressText, setUploadProgressText] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Summary & Inspection Modal State
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false)
  const [activeSummaryDoc, setActiveSummaryDoc] = useState<DocumentItem | null>(null)
  const [summaryData, setSummaryData] = useState<DocumentSummaryResponse | null>(null)
  const [summaryMode, setSummaryMode] = useState<string>('detailed')
  const [isLoadingSummary, setIsLoadingSummary] = useState(false)

  // Details / Outline Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [activeDetailDoc, setActiveDetailDoc] = useState<DocumentDetailResponse | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchDocuments = async () => {
    setIsLoading(true)
    try {
      const data = await aiService.getDocuments()
      setDocuments(data)
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadError(null)
    setUploadProgressText('Uploading document and validating format...')

    try {
      setUploadProgressText('Extracting all pages, headings, and tables...')
      const res = await aiService.uploadDocument(file)
      setUploadProgressText('Creating semantic chunks and vector embeddings...')
      await fetchDocuments()
      setUploadProgressText('Ready ✓')
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgressText('')
      }, 1200)

      // Optionally offer to jump right into chat
      if (res.doc_id) {
        onSelectDocumentForChat(res.doc_id, res.title)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to process document'
      setUploadError(msg)
      setIsUploading(false)
      setUploadProgressText('')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (docId: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will also remove its vector embeddings.`)) {
      return
    }

    try {
      await aiService.deleteDocument(docId)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete document.')
    }
  }

  const handleReprocess = async (docId: number) => {
    try {
      await aiService.reprocessDocument(docId)
      await fetchDocuments()
    } catch (err) {
      console.error('Reprocess failed:', err)
      alert('Failed to reprocess document.')
    }
  }

  const handleOpenSummary = async (doc: DocumentItem, mode: string = 'detailed') => {
    setActiveSummaryDoc(doc)
    setSummaryMode(mode)
    setIsSummaryModalOpen(true)
    setIsLoadingSummary(true)

    try {
      const res = await aiService.getDocumentSummary(doc.id, mode)
      setSummaryData(res)
    } catch (err) {
      console.error('Failed to get summary:', err)
    } finally {
      setIsLoadingSummary(false)
    }
  }

  const handleOpenDetails = async (docId: number) => {
    setIsDetailModalOpen(true)
    setIsLoadingDetail(true)
    try {
      const res = await aiService.getDocumentDetails(docId)
      setActiveDetailDoc(res)
    } catch (err) {
      console.error('Failed to fetch details:', err)
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const categories = ['ALL', 'Academic Regulations', 'Examination Guidelines', 'Student Handbook', 'General Document']

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'ALL' || d.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">University Document Intelligence & RAG Library</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30">
                Full-Text Vector Index
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Upload multi-page academic regulations, course syllabi, handbooks, and examination circulars for 100% full-text AI analysis and citations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={onNavigateToChat}
            className="border-purple-400/40 text-purple-200 hover:bg-purple-900/40 text-xs font-semibold gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Open AI Chat</span>
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx"
            className="hidden"
          />

          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-md text-xs font-semibold gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Uploading & Indexing...' : 'Upload PDF Document'}</span>
          </Button>
        </div>
      </div>

      {/* Upload Progress Alert Banner */}
      {isUploading && (
        <div className="p-4 bg-purple-900/30 border border-purple-500/40 rounded-2xl flex items-center justify-between text-xs text-purple-200 animate-pulse shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin" />
            <span className="font-semibold">{uploadProgressText || 'Processing document pipeline...'}</span>
          </div>
          <span className="text-[11px] text-purple-300 font-mono">Status: PROCESSING</span>
        </div>
      )}

      {uploadError && (
        <div className="p-4 bg-rose-900/30 border border-rose-500/40 rounded-2xl flex items-center justify-between text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-rose-400 font-bold hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by title or filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
            />
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid / Ledger */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold">Loading document library and vector indexes...</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <Card className="border-slate-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">No Documents Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Upload your academic regulations, syllabus PDFs, or student handbook to start performing ChatGPT-style Q&A and extracting instant summaries.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => fileInputRef.current?.click()}
            className="bg-purple-600 hover:bg-purple-500 text-xs px-4"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            <span>Upload Your First PDF</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className="border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                      {doc.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5" title={doc.original_filename}>
                      {doc.original_filename} • {doc.file_size_formatted}
                    </p>
                  </div>
                </div>

                <Badge
                  variant={doc.status === 'READY' ? 'success' : doc.status === 'FAILED' ? 'danger' : 'info'}
                  size="sm"
                  dot
                >
                  {doc.status}
                </Badge>
              </CardHeader>

              <CardContent className="py-3 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Total Pages</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-purple-600" />
                      {doc.total_pages} Pages
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Classification</span>
                    <span className="font-semibold text-slate-700 truncate block">{doc.category}</span>
                  </div>
                </div>

                {doc.is_scanned && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[10px] flex items-center gap-1.5 font-medium">
                    <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Scanned PDF processed via Optical Character Recognition ({doc.ocr_confidence * 100}%)</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2">
                  <span>Uploaded {doc.created_at}</span>
                  {doc.is_public && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <ShieldCheck className="w-3 h-3" /> Public Verified
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] h-8 font-bold gap-1"
                    onClick={() => onSelectDocumentForChat(doc.id, doc.title)}
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Ask AI</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="border-slate-200 text-slate-700 hover:bg-slate-100 text-[11px] h-8 font-semibold gap-1"
                    onClick={() => handleOpenSummary(doc)}
                  >
                    <FileText className="w-3 h-3 text-purple-600" />
                    <span>Summary</span>
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenDetails(doc.id)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> Outline
                  </button>

                  <button
                    onClick={() => handleReprocess(doc.id)}
                    className="text-[10px] font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" /> Reprocess
                  </button>

                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    className="text-[10px] font-semibold text-rose-500 hover:text-rose-700 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Modal */}
      {isSummaryModalOpen && activeSummaryDoc && (
        <Modal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          title={`Document Intelligence Summary: ${activeSummaryDoc.title}`}
          size="lg"
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
              {[
                { id: 'detailed', label: 'Detailed Overview' },
                { id: 'quick', label: 'Quick Takeaways' },
                { id: 'rules', label: 'Rules & Mandates' },
                { id: 'dates', label: 'Important Dates' },
                { id: 'study_notes', label: 'Study & Practice MCQs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleOpenSummary(activeSummaryDoc, tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    summaryMode === tab.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {isLoadingSummary ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
                <span className="text-xs">Synthesizing document overview...</span>
              </div>
            ) : summaryData ? (
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs leading-relaxed">
                <MarkdownRenderer content={summaryData.summary_markdown} />
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                className="bg-purple-600 hover:bg-purple-500 text-xs font-bold gap-1.5"
                onClick={() => {
                  setIsSummaryModalOpen(false)
                  onSelectDocumentForChat(activeSummaryDoc.id, activeSummaryDoc.title)
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Ask Questions About This Document</span>
              </Button>

              <Button variant="secondary" size="sm" onClick={() => setIsSummaryModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Outline & Metadata Modal */}
      {isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={activeDetailDoc?.title || 'Document Outline'}
          size="md"
        >
          {isLoadingDetail ? (
            <div className="p-8 text-center text-slate-400">Loading document metadata...</div>
          ) : activeDetailDoc ? (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto text-xs text-slate-700">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div><strong>Original Filename:</strong> {activeDetailDoc.original_filename}</div>
                <div><strong>Total Pages:</strong> {activeDetailDoc.total_pages} Pages</div>
                <div><strong>Classification:</strong> {activeDetailDoc.category}</div>
                <div><strong>File Size:</strong> {activeDetailDoc.file_size_formatted}</div>
                <div><strong>Index Status:</strong> <Badge variant="success" size="sm">{activeDetailDoc.status}</Badge></div>
              </div>

              {activeDetailDoc.overview?.sections && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Indexed Sections</h4>
                  <ul className="space-y-1 pl-2">
                    {activeDetailDoc.overview.sections.map((s, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-600">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      )}
    </div>
  )
}

export default DocumentLibraryView
