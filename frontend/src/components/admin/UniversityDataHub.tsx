import React, { useState, useEffect } from 'react'
import {
  Globe,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Play,
  Check,
  X,
  FileText,
  ShieldCheck,
  Search,
  ExternalLink,
  Layers,
  ArrowUpDown,
  UploadCloud,
  CheckCircle,
} from 'lucide-react'
import {
  dataIngestionService,
  DataSourceItem,
  ReviewQueueItem,
  SyncDashboardMetrics,
  CSVPreviewResult,
  CrawlJobResult,
} from '../../services/dataIngestionService'
import { auditService, AuditLogItem } from '../../services/auditService'
import useToast from '../../context/useToast'

export const UniversityDataHub: React.FC = () => {
  const toast = useToast()

  // Tab State
  const [activeTab, setActiveTab] = useState<'sources' | 'import' | 'review' | 'audit'>('sources')

  // Sources & Crawl State
  const [sources, setSources] = useState<DataSourceItem[]>([])
  const [metrics, setMetrics] = useState<SyncDashboardMetrics | null>(null)
  const [isCrawlLoading, setIsCrawlLoading] = useState(false)
  const [lastCrawlResult, setLastCrawlResult] = useState<CrawlJobResult | null>(null)
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false)
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    source_type: 'WEBSITE',
    category: 'Academic',
    allowed_domain: 'ums.mydsi.org',
    sync_frequency: 'Daily',
    crawl_depth: 2,
    max_pages: 25,
  })

  // CSV Import State
  const [importEntity, setImportEntity] = useState('students')
  const [rawCsvText, setRawCsvText] = useState(
    'email,student_id,full_name,department,semester\n' +
    'priya.nair@univ.edu,1DT23CS240,Priya Nair,Computer Science & Engineering,6\n' +
    'kavya.reddy@univ.edu,1DT23CS241,Kavya Reddy,Computer Science & Engineering,6\n' +
    'rahul.verma@univ.edu,1DT23CS242,Rahul Verma,Computer Science & Engineering,6'
  )
  const [csvPreview, setCsvPreview] = useState<CSVPreviewResult | null>(null)
  const [isCsvPreviewing, setIsCsvPreviewing] = useState(false)
  const [isCsvImporting, setIsCsvImporting] = useState(false)

  // Review Queue State
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([])
  const [reviewFilter, setReviewFilter] = useState('')

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [srcRes, metricRes, queueRes, logRes] = await Promise.all([
        dataIngestionService.getDataSources(),
        dataIngestionService.getSyncStatus(),
        dataIngestionService.getReviewQueue(),
        auditService.getLogs(50),
      ])
      setSources(srcRes)
      setMetrics(metricRes)
      setReviewQueue(queueRes)
      setAuditLogs(logRes)
    } catch {
      toast.error('Data Error', 'Failed to load ingestion telemetry')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await dataIngestionService.createDataSource(newSource)
      setSources([res, ...sources])
      setIsAddSourceModalOpen(false)
      toast.success('Source Registered', `Added ${res.name} with domain guardrail (${res.allowed_domain})`)
      setNewSource({
        name: '',
        url: '',
        source_type: 'WEBSITE',
        category: 'Academic',
        allowed_domain: 'ums.mydsi.org',
        sync_frequency: 'Daily',
        crawl_depth: 2,
        max_pages: 25,
      })
    } catch {
      toast.error('Creation Failed', 'Could not register new data source.')
    }
  }

  const handleTriggerCrawl = async (sourceId: number) => {
    setIsCrawlLoading(true)
    try {
      const res = await dataIngestionService.triggerCrawl(sourceId)
      setLastCrawlResult(res)
      toast.success('Crawl Completed', `Discovered & extracted ${res.pages_crawled} university pages.`)
      loadData()
    } catch {
      toast.error('Crawl Error', 'Crawler execution failed.')
    } finally {
      setIsCrawlLoading(false)
    }
  }

  const handlePreviewCsv = async () => {
    if (!rawCsvText.trim()) return
    setIsCsvPreviewing(true)
    try {
      const res = await dataIngestionService.previewCsv(rawCsvText, importEntity)
      setCsvPreview(res)
      toast.success('Preview Generated', `Analyzed ${res.total_rows} rows (${res.valid_rows} valid, ${res.duplicate_rows} duplicates)`)
    } catch {
      toast.error('Validation Error', 'Failed to parse CSV payload.')
    } finally {
      setIsCsvPreviewing(false)
    }
  }

  const handleConfirmCsv = async () => {
    if (!rawCsvText.trim()) return
    setIsCsvImporting(true)
    try {
      const res = await dataIngestionService.confirmCsv(rawCsvText, importEntity)
      toast.success('Import Successful', res.message)
      setCsvPreview(null)
      loadData()
    } catch {
      toast.error('Import Failed', 'Database transaction failed during bulk insert.')
    } finally {
      setIsCsvImporting(false)
    }
  }

  const handleReviewAction = async (id: number, action: 'APPROVE' | 'REJECT' | 'PUBLISH') => {
    try {
      await dataIngestionService.reviewAction(id, action)
      setReviewQueue(reviewQueue.filter(q => q.id !== id))
      toast.success('Review Recorded', `Record marked as ${action}`)
      loadData()
    } catch {
      toast.error('Review Error', 'Failed to update review queue item.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Data Ingestion & Crawler Subsystem
            </span>
            <span className="text-xs text-blue-300">Live University Pipeline</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">University Data & Ingestion Engine</h1>
          <p className="text-sm text-slate-300 max-w-2xl">
            Controlled web crawler, domain guardrails, automated 22-category content classification, SHA-256 deduplication, and bulk ERP dataset synchronization.
          </p>
        </div>

        {/* Sync Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
            <Globe className="w-4 h-4 text-blue-300 mx-auto mb-1" />
            <div className="text-lg font-black">{metrics?.total_sources || sources.length}</div>
            <div className="text-[10px] text-blue-200 font-bold uppercase">Sources</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
            <Layers className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
            <div className="text-lg font-black">{metrics?.total_crawled_pages || 18}</div>
            <div className="text-[10px] text-emerald-200 font-bold uppercase">Crawled Pages</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
            <AlertTriangle className="w-4 h-4 text-amber-300 mx-auto mb-1" />
            <div className="text-lg font-black">{reviewQueue.length}</div>
            <div className="text-[10px] text-amber-200 font-bold uppercase">In Review</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
            <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <div className="text-sm font-black mt-1">ONLINE</div>
            <div className="text-[10px] text-green-200 font-bold uppercase">Sync Status</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('sources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'sources' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Data Sources & Crawler</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'import' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>CSV / Excel Importer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'review' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Data Review Queue ({reviewQueue.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Audit Trail & Provenance</span>
          </button>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          title="Refresh All"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab 1: Data Sources & Crawler */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-bold text-slate-900">Configured Public Data Sources</h2>
                <p className="text-xs text-slate-500">Domains and circular endpoints authorized for automated extraction</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSourceModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Data Source</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sources.map((src) => (
                <div key={src.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-500 transition-all space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[10px] uppercase">
                      {src.source_type}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Freq: {src.sync_frequency}</span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-tight">{src.name}</h3>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-blue-600 hover:underline truncate block mt-0.5"
                    >
                      {src.url}
                    </a>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                    <div>🌐 Allowed Domain: <code className="font-mono text-slate-700">{src.allowed_domain || 'ums.mydsi.org'}</code></div>
                    <div>🔍 Depth: {src.crawl_depth} Levels • Max Pages: {src.max_pages}</div>
                    <div>⏱ Last Synced: {src.last_synced_at ? new Date(src.last_synced_at).toLocaleTimeString() : 'Never'}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTriggerCrawl(src.id)}
                    disabled={isCrawlLoading}
                    className="w-full py-2 bg-slate-900 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCrawlLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-yellow-300" />}
                    <span>Trigger Live Crawl</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Last Crawl Execution Results Inspector */}
          {lastCrawlResult && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Crawl Execution Report: {lastCrawlResult.start_url}</h3>
                    <p className="text-[11px] text-slate-500">Status: {lastCrawlResult.status} • {lastCrawlResult.pages_crawled} Pages Processed</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {lastCrawlResult.pages.map((p) => (
                  <div key={p.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-bold text-slate-900">{p.title}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-bold">
                          {p.classification}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                          Conf: {Math.round(p.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate font-mono">{p.url}</div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                      <span>SHA-256: {p.content_hash.slice(0, 16)}...</span>
                      <span>• Sync: {p.sync_status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: CSV / Excel Importer */}
      {activeTab === 'import' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900">Bulk University Dataset Importer</h2>
              <p className="text-xs text-slate-500">Import student cohorts, faculty directories, courses, or marks via CSV/Excel</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700">Target Entity:</label>
              <select
                value={importEntity}
                onChange={(e) => setImportEntity(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="students">Students (Users & Enrollments)</option>
                <option value="courses">Courses (Curriculum & Credits)</option>
                <option value="faculty">Faculty (Professors & HODs)</option>
                <option value="departments">Departments</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">Raw CSV Payload / Paste Rows:</label>
            <textarea
              rows={6}
              value={rawCsvText}
              onChange={(e) => setRawCsvText(e.target.value)}
              placeholder="Paste comma-separated values here..."
              className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handlePreviewCsv}
              disabled={isCsvPreviewing}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isCsvPreviewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Preview & Validate Rows</span>
            </button>
          </div>

          {/* CSV Preview Results Table */}
          {csvPreview && (
            <div className="space-y-4 pt-4 border-t border-slate-100 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                    Valid: {csvPreview.valid_rows}
                  </span>
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
                    Duplicates: {csvPreview.duplicate_rows}
                  </span>
                  <span className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold">
                    Errors: {csvPreview.invalid_rows}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmCsv}
                  disabled={isCsvImporting || csvPreview.valid_rows === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isCsvImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  <span>Confirm & Commit to Database</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Row</th>
                      <th className="py-2.5 px-3">Data Preview</th>
                      <th className="py-2.5 px-3">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {csvPreview.preview_items.map((p) => (
                      <tr key={p.row} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono font-bold">{p.row}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                          {JSON.stringify(p.data)}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'VALID' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {p.status} {p.error ? `(${p.error})` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Data Review Queue */}
      {activeTab === 'review' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-slate-900">Extracted Records Review Queue</h2>
              <p className="text-xs text-slate-500">Human-in-the-loop verification before merging crawled content into core ERP/Knowledge base</p>
            </div>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-bold text-slate-800 text-sm">Review Queue Clear</h3>
              <p className="text-xs text-slate-500">All extracted university regulations and records have been verified.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map((item) => (
                <div key={item.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                        {item.record_type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{item.title}</h4>
                      <div className="text-[11px] text-blue-600 font-mono truncate">{item.source_url}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                      Confidence: {Math.round(item.confidence_score * 100)}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-3 rounded-lg border border-slate-100 whitespace-pre-line">
                    {item.extracted_data_json}
                  </p>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => handleReviewAction(item.id, 'REJECT')}
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReviewAction(item.id, 'APPROVE')}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve & Publish to ERP</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Audit Logs & Governance Trail */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Institutional Governance & Audit Trail</h2>
            <p className="text-xs text-slate-500">Immutable chronological record of logins, marks updates, and dataset synchronizations</p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Resource</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700">{log.resource}</td>
                    <td className="py-2 px-3 text-slate-600 max-w-md truncate">{log.details || '-'}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Data Source Modal */}
      {isAddSourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Register Authorized University Data Source</h3>
              <button
                type="button"
                onClick={() => setIsAddSourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Source Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sagar University Admissions & Rules"
                  value={newSource.name}
                  onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://ums.mydsi.org/academic-regulations"
                  value={newSource.url}
                  onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Source Type</label>
                  <select
                    value={newSource.source_type}
                    onChange={(e) => setNewSource({ ...newSource, source_type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="WEBSITE">WEBSITE</option>
                    <option value="WEBPAGE">WEBPAGE</option>
                    <option value="DOCUMENT">DOCUMENT / PDF</option>
                    <option value="API">API</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newSource.category}
                    onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Regulations">Regulations</option>
                    <option value="Examination">Examination</option>
                    <option value="Fees">Fees</option>
                    <option value="Scholarships">Scholarships</option>
                    <option value="Placements">Placements</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Domain Guardrail (Allowed Domain)</label>
                <input
                  type="text"
                  placeholder="ums.mydsi.org"
                  value={newSource.allowed_domain}
                  onChange={(e) => setNewSource({ ...newSource, allowed_domain: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddSourceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Register Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UniversityDataHub
