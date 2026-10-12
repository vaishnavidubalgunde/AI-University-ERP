import React, { useState, useEffect } from 'react'
import {
  FileText,
  BookOpen,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Scale,
  RefreshCw,
  Search,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Table as TableIcon,
  Tag,
  Copy,
  Check
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { aiService } from '../../services/aiService'
import { DocumentDetailResponse, DocumentAnalysisData, DocumentPageItem } from '../../types/ai'
import MarkdownRenderer from './MarkdownRenderer'

interface DocumentAnalysisViewerProps {
  documentId: number
  onAskQuestion?: (prompt: string) => void
  onCompareWithAnother?: (docId: number) => void
}

type TabType = 'overview' | 'summary' | 'structure' | 'rules' | 'dates' | 'eligibility' | 'definitions' | 'changes' | 'tables' | 'pages'

export const DocumentAnalysisViewer: React.FC<DocumentAnalysisViewerProps> = ({
  documentId,
  onAskQuestion,
  onCompareWithAnother,
}) => {
  const [analysis, setAnalysis] = useState<DocumentAnalysisData | null>(null)
  const [docDetails, setDocDetails] = useState<DocumentDetailResponse | null>(null)
  const [pages, setPages] = useState<DocumentPageItem[]>([])
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedText, setCopiedText] = useState(false)

  // Page inspector state
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1)
  const [isLoadingPages, setIsLoadingPages] = useState(false)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    Promise.all([
      aiService.getDocumentAnalysis(documentId),
      aiService.getDocumentDetails(documentId),
    ])
      .then(([analysisData, detailData]) => {
        if (isMounted) {
          setAnalysis(analysisData)
          setDocDetails(detailData)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Failed to load document analysis:', err)
          setError('Failed to load complete document intelligence. Please try again.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [documentId])

  const loadPages = async () => {
    if (pages.length > 0) return
    setIsLoadingPages(true)
    try {
      const pageList = await aiService.getDocumentPages(documentId)
      setPages(pageList)
    } catch (err) {
      console.error('Failed to fetch pages:', err)
    } finally {
      setIsLoadingPages(false)
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'pages') {
      loadPages()
    }
  }

  const handleCopySummary = () => {
    if (analysis?.summary_markdown) {
      navigator.clipboard.writeText(analysis.summary_markdown)
      setCopiedText(true)
      setTimeout(() => setCopiedText(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-white rounded-2xl border border-slate-200">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 animate-spin mb-4">
          <RefreshCw className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Reading Entire Document...</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Extracting all pages, structured tables, rules, and semantic context into complete document intelligence.
        </p>
      </div>
    )
  }

  if (error || !analysis) {
    return (
      <div className="p-8 text-center bg-rose-50/50 rounded-2xl border border-rose-200">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-rose-900">Analysis Unavailable</h3>
        <p className="text-xs text-rose-700 mt-1">{error || 'Could not load document analysis.'}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => window.location.reload()}
        >
          Retry Analysis
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Document Header */}
      <div className="p-4 md:p-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 text-white shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">{analysis.title}</h2>
                <Badge variant="success" size="sm" dot>
                  Fully Analyzed ✓
                </Badge>
                <Badge variant="info" size="sm">
                  {analysis.total_pages} Pages Indexed
                </Badge>
                <Badge variant="purple" size="sm">
                  AY {analysis.academic_year}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Category: <strong className="text-white">{analysis.document_type}</strong> • Complete page-level semantic indexing ready.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
              leftIcon={copiedText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedText ? 'Copied' : 'Copy Summary'}
            </Button>
            {onCompareWithAnother && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onCompareWithAnother(documentId)}
                className="text-xs"
                leftIcon={<Layers className="w-3.5 h-3.5 text-blue-600" />}
              >
                Compare Version
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-4 mt-1 border-t border-slate-800/80 scrollbar-none text-xs">
          {[
            { id: 'overview', label: 'Overview', icon: <Sparkles className="w-3.5 h-3.5" /> },
            { id: 'summary', label: 'Executive Summary', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'structure', label: 'Structure', count: analysis.document_structure.length, icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'rules', label: 'Rules & Policies', count: analysis.important_rules.length, icon: <Scale className="w-3.5 h-3.5" /> },
            { id: 'dates', label: 'Dates & Deadlines', count: analysis.important_dates.length, icon: <Calendar className="w-3.5 h-3.5" /> },
            { id: 'eligibility', label: 'Eligibility', count: analysis.eligibility_requirements.length, icon: <Award className="w-3.5 h-3.5" /> },
            { id: 'definitions', label: 'Definitions', count: analysis.important_definitions.length, icon: <HelpCircle className="w-3.5 h-3.5" /> },
            { id: 'changes', label: 'Amendments', count: analysis.notable_changes.length, icon: <RefreshCw className="w-3.5 h-3.5" /> },
            { id: 'tables', label: 'Tables', count: analysis.extracted_tables.length, icon: <TableIcon className="w-3.5 h-3.5" /> },
            { id: 'pages', label: 'Page Inspector', count: analysis.total_pages, icon: <Hash className="w-3.5 h-3.5" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40">
        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Pages</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{analysis.total_pages}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5 font-medium">100% Granular Index</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Codified Rules</div>
                <div className="text-xl font-bold text-blue-600 mt-1">{analysis.important_rules.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Verified thresholds</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Key Deadlines</div>
                <div className="text-xl font-bold text-amber-600 mt-1">{analysis.important_dates.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Milestones found</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tables Extracted</div>
                <div className="text-xl font-bold text-indigo-600 mt-1">{analysis.extracted_tables.length}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Tabular structures</div>
              </div>
            </div>

            {/* Executive Summary Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Executive Summary
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-600"
                    onClick={() => setActiveTab('summary')}
                  >
                    View Full Text
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {analysis.executive_summary}
                </p>
              </CardContent>
            </Card>

            {/* Quick Action Prompt Pills */}
            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-blue-950">Ask AI directly about this document:</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  'What are the attendance rules?',
                  'What is the examination eligibility?',
                  'Are there any changes in this document?',
                  'What are the key deadlines?',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAskQuestion && onAskQuestion(prompt)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-white text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white font-medium transition-all shadow-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Two Column Grid: Top Rules & Structure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rules Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-blue-600" />
                    Key Regulations & Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {analysis.important_rules.slice(0, 4).map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-xs text-slate-800 flex items-start justify-between gap-2 hover:bg-slate-100/80 transition-all cursor-pointer"
                      onClick={() => onAskQuestion && onAskQuestion(`Explain the rule: "${rule.text}" from page ${rule.page_number}`)}
                    >
                      <span className="leading-relaxed">{rule.text}</span>
                      <Badge variant="info" size="sm" className="shrink-0 text-[10px]">
                        Page {rule.page_number}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Structure Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    Document Structure & Sections
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 pt-0">
                  {analysis.document_structure.slice(0, 6).map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 text-xs text-slate-800 flex items-center justify-between hover:bg-slate-100 transition-all"
                    >
                      <span className="font-medium truncate">{sec}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Tab 2: Full Executive Summary */}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <MarkdownRenderer content={analysis.summary_markdown} />
          </div>
        )}

        {/* Tab 3: Structure */}
        {activeTab === 'structure' && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
              Complete hierarchical section breakdown identified across {analysis.total_pages} pages.
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {analysis.document_structure.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{sec}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-indigo-600"
                    onClick={() => onAskQuestion && onAskQuestion(`What does section "${sec}" say in ${analysis.title}?`)}
                  >
                    Ask AI
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Rules & Policies */}
        {activeTab === 'rules' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-blue-900 flex items-center justify-between">
              <span>Extracted <strong>{analysis.important_rules.length} official regulations</strong> with exact page grounding.</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {analysis.important_rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">{rule.section || 'General Regulation'}</span>
                      <Badge variant="info" size="sm">Page {rule.page_number}</Badge>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{rule.text}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => onAskQuestion && onAskQuestion(`Explain the rule on page ${rule.page_number}: "${rule.text}"`)}
                  >
                    Query Rule
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Dates & Deadlines */}
        {activeTab === 'dates' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-900">
              Found <strong>{analysis.important_dates.length} scheduled dates, deadlines, and milestone windows</strong>.
            </div>
            <div className="grid grid-cols-1 gap-3">
              {analysis.important_dates.map((dateItem, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">{dateItem.section || 'Schedule'}</span>
                      <Badge variant="warning" size="sm">Page {dateItem.page_number}</Badge>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{dateItem.text}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={() => onAskQuestion && onAskQuestion(`What are the deadlines and dates related to: "${dateItem.text}"?`)}
                  >
                    Query Date
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: Eligibility */}
        {activeTab === 'eligibility' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900">
              Codified eligibility requirements and prerequisite benchmarks.
            </div>
            <div className="grid grid-cols-1 gap-3">
              {analysis.eligibility_requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-900">{req.section || 'Eligibility Standard'}</span>
                      <Badge variant="success" size="sm">Page {req.page_number}</Badge>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{req.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 7: Definitions */}
        {activeTab === 'definitions' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs text-purple-900">
              Institutional definitions and terminology index.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.important_definitions.map((defItem, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-purple-300 transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                      Definition
                    </span>
                    <Badge variant="purple" size="sm">Page {defItem.page_number}</Badge>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{defItem.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 8: Amendments / Notable Changes */}
        {activeTab === 'changes' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs text-amber-900">
              Explicit amendment notices, modified clauses, and revision markers detected in this document.
            </div>
            {analysis.notable_changes.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                No explicit internal amendment markers found. This appears to be a baseline regulation document.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {analysis.notable_changes.map((chg, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-300 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-900">{chg.section || 'Amendment'}</span>
                        <Badge variant="warning" size="sm">Page {chg.page_number}</Badge>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{chg.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 9: Tables */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900">
              Extracted structured tabular grids and matrices from document pages.
            </div>
            {analysis.extracted_tables.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                No complex tabular structures detected. Text is primarily paragraph/clause-based.
              </div>
            ) : (
              analysis.extracted_tables.map((t, idx) => (
                <Card key={idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <TableIcon className="w-4 h-4 text-indigo-600" />
                        {t.title || `Table on Page ${t.page_number}`}
                      </span>
                      <Badge variant="info" size="sm">Page {t.page_number}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 overflow-x-auto">
                    {t.raw_markdown ? (
                      <MarkdownRenderer content={t.raw_markdown} />
                    ) : (
                      <table className="w-full text-left text-xs border border-slate-200">
                        {t.headers && (
                          <thead className="bg-slate-100 text-slate-700">
                            <tr>
                              {t.headers.map((h, i) => (
                                <th key={i} className="p-2 border-b border-slate-200 font-semibold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {t.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2 border-b border-slate-100 text-slate-700">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 10: Page Inspector */}
        {activeTab === 'pages' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Select Page Number (1 to {analysis.total_pages}):</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                {Array.from({ length: analysis.total_pages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setSelectedPageNum(pNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                      selectedPageNum === pNum
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingPages ? (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-500">
                Loading page content...
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold text-slate-800">
                      Page {selectedPageNum} Content
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600"
                      onClick={() => onAskQuestion && onAskQuestion(`What does page ${selectedPageNum} say in ${analysis.title}?`)}
                    >
                      Query This Page
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap max-h-[450px] overflow-y-auto">
                    {pages.find((p) => p.page_number === selectedPageNum)?.text ||
                      `Content for page ${selectedPageNum} is indexed in the vector store. Click "Query This Page" to inspect specific regulatory clauses.`}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentAnalysisViewer
