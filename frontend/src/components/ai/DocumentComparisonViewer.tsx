import React, { useState, useEffect } from 'react'
import {
  Layers,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Scale,
  Calendar,
  Award,
  Plus,
  Minus,
  Sparkles,
  Table as TableIcon,
  Copy,
  Check
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Select from '../ui/Select'
import { aiService } from '../../services/aiService'
import { DocumentItem, DocumentComparisonResponse, ComparisonTableItem } from '../../types/ai'
import MarkdownRenderer from './MarkdownRenderer'

interface DocumentComparisonViewerProps {
  initialDocAId?: number
  initialDocBId?: number
  availableDocuments: DocumentItem[]
  onAskAboutComparison?: (prompt: string) => void
}

type FilterCategory = 'ALL' | 'RULES' | 'DATES' | 'REQUIREMENTS' | 'NEW' | 'REMOVED' | 'UNCHANGED'

export const DocumentComparisonViewer: React.FC<DocumentComparisonViewerProps> = ({
  initialDocAId,
  initialDocBId,
  availableDocuments,
  onAskAboutComparison,
}) => {
  const [docAId, setDocAId] = useState<number | undefined>(initialDocAId || (availableDocuments[1]?.id ?? availableDocuments[0]?.id))
  const [docBId, setDocBId] = useState<number | undefined>(initialDocBId || (availableDocuments[0]?.id ?? availableDocuments[1]?.id))
  const [comparison, setComparison] = useState<DocumentComparisonResponse | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('ALL')
  const [viewMode, setViewMode] = useState<'matrix' | 'markdown' | 'categories'>('matrix')
  const [copied, setCopied] = useState(false)

  const handleRunComparison = async (aId?: number, bId?: number) => {
    const targetA = aId || docAId
    const targetB = bId || docBId

    if (!targetA || !targetB) {
      setError('Please select two distinct documents to compare.')
      return
    }

    setIsComparing(true)
    setError(null)

    try {
      const res = await aiService.compareDocuments({
        doc_a_id: targetA,
        doc_b_id: targetB,
      })
      setComparison(res)
    } catch (err) {
      console.error('Comparison failed:', err)
      setError('Failed to complete document comparison. Please ensure both documents are fully analyzed.')
    } finally {
      setIsComparing(false)
    }
  }

  useEffect(() => {
    if (docAId && docBId && docAId !== docBId) {
      handleRunComparison(docAId, docBId)
    }
  }, [docAId, docBId])

  const handleCopyReport = () => {
    if (comparison?.comparison_markdown) {
      navigator.clipboard.writeText(comparison.comparison_markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getFilteredItems = (): ComparisonTableItem[] => {
    if (!comparison) return []
    if (activeFilter === 'RULES') return comparison.changed_rules
    if (activeFilter === 'DATES') return comparison.changed_dates
    if (activeFilter === 'REQUIREMENTS') return comparison.changed_requirements
    if (activeFilter === 'NEW') return comparison.new_items
    if (activeFilter === 'REMOVED') return comparison.removed_items
    if (activeFilter === 'UNCHANGED') return comparison.unchanged_items
    return comparison.comparison_matrix
  }

  const filteredMatrix = getFilteredItems()

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Comparison Selector Bar */}
      <div className="p-4 md:p-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Document Comparison Engine
                <Badge variant="purple" size="sm">Dual-Page Citations</Badge>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Deep structural, textual, rule-based, and semantic diffing between two document editions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyReport}
              disabled={!comparison}
              className="bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs"
              leftIcon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Report'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isComparing}
              onClick={() => handleRunComparison()}
              className="text-xs bg-blue-600 hover:bg-blue-500"
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Re-Compare
            </Button>
          </div>
        </div>

        {/* Dual Document Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-800/80">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Document A (Baseline / Old Version)
            </label>
            <select
              value={docAId || ''}
              onChange={(e) => setDocAId(Number(e.target.value))}
              className="w-full bg-slate-800/90 text-white text-xs border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {availableDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.version || 'Baseline'} • {doc.total_pages} Pages)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Document B (Revised / New Version)
            </label>
            <select
              value={docBId || ''}
              onChange={(e) => setDocBId(Number(e.target.value))}
              className="w-full bg-slate-800/90 text-white text-xs border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {availableDocuments.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.version || 'Revised'} • {doc.total_pages} Pages)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/40">
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isComparing ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Aligning Sections & Extracting Diffs...</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Comparing structural outlines, compliance rules, dates, and requirements with dual-page grounding.
            </p>
          </div>
        ) : !comparison ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
            <Layers className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-xs">Select two documents above to generate an instant comparative analysis.</p>
          </div>
        ) : comparison.is_identical ? (
          <div className="p-8 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200 max-w-lg mx-auto">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-emerald-950">100% Identical Documents</h3>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              No meaningful rule changes, schedule modifications, or new clauses were detected between{' '}
              <strong>{comparison.doc_a_title}</strong> and <strong>{comparison.doc_b_title}</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Major Changes Highlights Card */}
            <Card className="border-blue-200/80 bg-gradient-to-r from-blue-50/40 to-indigo-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-blue-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    Summary of Major Changes
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-blue-700"
                    onClick={() =>
                      onAskAboutComparison &&
                      onAskAboutComparison(
                        `Explain the major changes between ${comparison.doc_a_title} and ${comparison.doc_b_title}`
                      )
                    }
                  >
                    Ask AI to Elaborate
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {comparison.summary_of_major_changes.map((change, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-white/90 border border-blue-100/80 text-xs text-slate-800 flex items-start gap-2.5 shadow-2xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{change}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Filter Pills & View Mode Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                {[
                  { id: 'ALL', label: 'All Diffs', count: comparison.comparison_matrix.length },
                  { id: 'RULES', label: 'Changed Rules', count: comparison.changed_rules.length },
                  { id: 'DATES', label: 'Changed Dates', count: comparison.changed_dates.length },
                  { id: 'REQUIREMENTS', label: 'Requirements', count: comparison.changed_requirements.length },
                  { id: 'NEW', label: 'New Clauses', count: comparison.new_items.length },
                  { id: 'REMOVED', label: 'Removed', count: comparison.removed_items.length },
                  { id: 'UNCHANGED', label: 'Unchanged', count: comparison.unchanged_items.length },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id as FilterCategory)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeFilter === f.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {f.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant={viewMode === 'matrix' ? 'primary' : 'ghost'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode('matrix')}
                >
                  Table Matrix
                </Button>
                <Button
                  variant={viewMode === 'categories' ? 'primary' : 'ghost'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode('categories')}
                >
                  Card View
                </Button>
                <Button
                  variant={viewMode === 'markdown' ? 'primary' : 'ghost'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setViewMode('markdown')}
                >
                  Report View
                </Button>
              </div>
            </div>

            {/* View Mode 1: Table Matrix */}
            {viewMode === 'matrix' && (
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <tr>
                        <th className="p-3 font-semibold w-28">Category</th>
                        <th className="p-3 font-semibold w-1/3">
                          {comparison.doc_a_title} ({comparison.doc_a_version})
                        </th>
                        <th className="p-3 font-semibold w-1/3">
                          {comparison.doc_b_title} ({comparison.doc_b_version})
                        </th>
                        <th className="p-3 font-semibold w-24 text-center">Status</th>
                        <th className="p-3 font-semibold w-20 text-center">Old Page</th>
                        <th className="p-3 font-semibold w-20 text-center">New Page</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMatrix.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400">
                            No items match the selected category filter.
                          </td>
                        </tr>
                      ) : (
                        filteredMatrix.map((item, idx) => {
                          const badgeVariant =
                            item.change_type === 'NEW'
                              ? 'success'
                              : item.change_type === 'REMOVED'
                              ? 'danger'
                              : item.change_type === 'MODIFIED'
                              ? 'warning'
                              : 'default'

                          return (
                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 font-bold text-slate-800 align-top">
                                {item.category}
                              </td>
                              <td className="p-3 text-slate-600 align-top leading-relaxed whitespace-pre-wrap">
                                {item.old_value}
                              </td>
                              <td className="p-3 text-slate-900 font-medium align-top leading-relaxed whitespace-pre-wrap">
                                {item.new_value}
                              </td>
                              <td className="p-3 text-center align-top">
                                <Badge variant={badgeVariant} size="sm">
                                  {item.change_type}
                                </Badge>
                              </td>
                              <td className="p-3 text-center text-slate-500 font-mono text-[11px] align-top">
                                {item.old_page ? `p. ${item.old_page}` : '—'}
                              </td>
                              <td className="p-3 text-center text-blue-600 font-mono font-bold text-[11px] align-top">
                                {item.new_page ? `p. ${item.new_page}` : '—'}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* View Mode 2: Card View */}
            {viewMode === 'categories' && (
              <div className="grid grid-cols-1 gap-3">
                {filteredMatrix.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-2 hover:border-blue-300 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                        <Scale className="w-3.5 h-3.5 text-blue-600" />
                        {item.category}
                      </span>
                      <div className="flex items-center gap-2">
                        {item.old_page && <Badge variant="default" size="sm">Old: Page {item.old_page}</Badge>}
                        {item.new_page && <Badge variant="info" size="sm">New: Page {item.new_page}</Badge>}
                        <Badge variant={item.change_type === 'MODIFIED' ? 'warning' : item.change_type === 'NEW' ? 'success' : 'danger'} size="sm">
                          {item.change_type}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Old Clause</div>
                        <p className="leading-relaxed">{item.old_value}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-slate-900 font-medium">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">New Clause</div>
                        <p className="leading-relaxed">{item.new_value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View Mode 3: Markdown Report */}
            {viewMode === 'markdown' && (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs">
                <MarkdownRenderer content={comparison.comparison_markdown} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DocumentComparisonViewer
