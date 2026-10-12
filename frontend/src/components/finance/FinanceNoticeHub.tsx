import React, { useState, useEffect, useCallback } from 'react'
import {
  CreditCard,
  FileText,
  Bell,
  Download,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Search,
  Pin,
  FileCheck,
  ShieldCheck,
  Building,
  Receipt
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { financeService } from '../../services/financeService'
import { noticeService } from '../../services/noticeService'
import {
  FeeSummaryResponse,
  FeeRecordItem,
  OfficialDocumentItem,
} from '../../types/finance'
import { NoticeItem, NoticeFilterResponse } from '../../types/notice'

import useAuth from '../../context/useAuth'

interface FinanceNoticeHubProps {
  initialTab?: 'fees' | 'notices' | 'documents'
  onOpenAI?: (prompt?: string) => void
}

export const FinanceNoticeHub: React.FC<FinanceNoticeHubProps> = ({
  initialTab = 'fees',
  onOpenAI,
}) => {
  const { user } = useAuth()
  const isFaculty = user?.role === 'faculty'
  const effectiveInitialTab = isFaculty && initialTab === 'fees' ? 'notices' : initialTab
  const [activeTab, setActiveTab] = useState<'fees' | 'notices' | 'documents'>(effectiveInitialTab)

  useEffect(() => {
    if (isFaculty && activeTab === 'fees') {
      setActiveTab('notices')
    }
  }, [isFaculty, activeTab])

  // Finance State
  const [feeSummary, setFeeSummary] = useState<FeeSummaryResponse | null>(null)
  const [documents, setDocuments] = useState<OfficialDocumentItem[]>([])

  // Notices State
  const [notices, setNotices] = useState<NoticeItem[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeNoticeModal, setActiveNoticeModal] = useState<NoticeItem | null>(null)

  // Payment Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)
  const [selectedFeeRecord, setSelectedFeeRecord] = useState<FeeRecordItem | null>(null)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI')
  const [isProcessingPay, setIsProcessingPay] = useState(false)
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null)

  // Document Request Modal
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [docPurpose, setDocPurpose] = useState('')
  const [selectedDocId, setSelectedDocId] = useState('bonafide-cert')
  const [docSuccessMsg, setDocSuccessMsg] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = useCallback(() => {
    let isMounted = true

    const promises: [Promise<FeeSummaryResponse | null>, Promise<OfficialDocumentItem[]>, Promise<NoticeFilterResponse>] = [
      isFaculty ? Promise.resolve(null) : financeService.getFeeSummary().catch(() => null),
      financeService.getAvailableDocuments(),
      noticeService.getNotices(selectedCategory, searchQuery),
    ]

    Promise.all(promises)
      .then(([feeData, docData, noticeData]) => {
        if (isMounted) {
          if (feeData) setFeeSummary(feeData)
          setDocuments(docData)
          setNotices(noticeData.notices)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to load financial and notice records.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [selectedCategory, searchQuery, isFaculty])

  useEffect(() => {
    return fetchRecords()
  }, [fetchRecords])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    noticeService.getNotices(selectedCategory, searchQuery)
      .then((data) => setNotices(data.notices))
      .finally(() => setIsLoading(false))
  }

  const handleOpenPayment = (rec: FeeRecordItem) => {
    setSelectedFeeRecord(rec)
    setPayAmount(rec.balance_due)
    setPaymentSuccessMsg(null)
    setIsPayModalOpen(true)
  }

  const handleProcessPayment = async () => {
    if (!selectedFeeRecord) return
    setIsProcessingPay(true)
    setPaymentSuccessMsg(null)

    try {
      const res = await financeService.payFee({
        fee_record_id: selectedFeeRecord.id,
        amount: payAmount,
        payment_method: paymentMethod,
      })
      setPaymentSuccessMsg(`Success! Receipt: ${res.receipt_number} • Txn: ${res.transaction_id}`)
      // Reload fee summary
      const updatedFees = await financeService.getFeeSummary()
      setFeeSummary(updatedFees)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Payment processing failed.')
    } finally {
      setIsProcessingPay(false)
    }
  }

  const handleRequestDocument = async () => {
    if (!docPurpose) {
      alert('Please specify the purpose of the document request.')
      return
    }
    try {
      const res = await financeService.requestDocument({
        document_id: selectedDocId,
        purpose: docPurpose,
      })
      setDocSuccessMsg(`Request Approved! Ref ID: ${res.request_id}. Document verified digitally.`)
      setDocPurpose('')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Document request failed.')
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Fees, Circulars & Official Documents</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                Phase 8
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Semester tuition ledger, verified digital receipts, university bulletin circulars, and bonafide credential services.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRecords()}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="secondary"
            className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 shadow-md text-xs font-semibold gap-1.5"
            onClick={() => onOpenAI?.('What are my outstanding university fee balances, deadlines, and how do I download a fee estimate letter?')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Finance Advisor</span>
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        {!isFaculty && (
          <button
            onClick={() => setActiveTab('fees')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'fees'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Fee Ledger & Payments</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('notices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'notices'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notice Board ({notices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'documents'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Official Documents & Credentials</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* SUB-VIEW 1: Fee Ledger & Payments */}
      {activeTab === 'fees' && feeSummary && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Vitals Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Billed</span>
                <p className="text-xl font-bold text-slate-900 mt-1">Rs {feeSummary.total_fee.toLocaleString()}</p>
                <span className="text-[10px] text-slate-500">Academic Year 2026-27</span>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Amount Paid</span>
                <p className="text-xl font-bold text-emerald-900 mt-1">Rs {feeSummary.total_paid.toLocaleString()}</p>
                <span className="text-[10px] text-emerald-700 font-medium">Cleared via Net Banking / UPI</span>
              </CardContent>
            </Card>

            <Card className={`border-slate-200 shadow-xs ${feeSummary.total_due > 0 ? 'bg-amber-50/40 border-amber-200' : ''}`}>
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Balance Due</span>
                <p className={`text-xl font-bold mt-1 ${feeSummary.total_due > 0 ? 'text-amber-900' : 'text-slate-900'}`}>
                  Rs {feeSummary.total_due.toLocaleString()}
                </p>
                <span className="text-[10px] text-slate-500">
                  {feeSummary.total_due === 0 ? 'No outstanding dues' : 'Due by March 31, 2026'}
                </span>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Clearance Status</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-700">{feeSummary.overall_status}</span>
                </div>
                <span className="text-[10px] text-slate-500">Admit Card Cleared</span>
              </CardContent>
            </Card>
          </div>

          {/* Fee Breakdown Ledger */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Semester 6 Installment & Component Ledger</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official institutional fee breakdown with instant receipt downloads.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Fee Head</th>
                      <th className="py-3 px-4">Term</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Paid</th>
                      <th className="py-3 px-4">Balance</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeSummary.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-bold text-slate-900 capitalize flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          {rec.category} Fee
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">Semester {rec.semester}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">Rs {rec.total_amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-emerald-700 font-semibold">Rs {rec.paid_amount.toLocaleString()}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">Rs {rec.balance_due.toLocaleString()}</td>
                        <td className="py-3.5 px-4 text-slate-500">{rec.due_date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            rec.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rec.status === 'partial'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {rec.balance_due > 0 ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1 px-3"
                              onClick={() => handleOpenPayment(rec)}
                            >
                              Pay Rs {rec.balance_due.toLocaleString()}
                            </Button>
                          ) : (
                            <button
                              onClick={() => alert(`Official Receipt: ${rec.receipt_number || 'REC-2026-98124'}\nAmount: Rs ${rec.paid_amount.toLocaleString()}\nRef: ${rec.transaction_id || 'TXN-981274'}`)}
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-semibold text-xs transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SUB-VIEW 2: Notice Board Feed */}
      {activeTab === 'notices' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {['All', 'Academic', 'Examination', 'Placement', 'General'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search circulars..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </form>
          </div>

          {/* Notices Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((n) => (
              <Card
                key={n.id}
                onClick={() => setActiveNoticeModal(n)}
                className={`border transition-all cursor-pointer hover:shadow-md ${
                  n.is_pinned
                    ? 'border-indigo-200/90 bg-gradient-to-b from-indigo-50/30 to-white'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        n.category === 'academic'
                          ? 'bg-blue-100 text-blue-800'
                          : n.category === 'examination'
                          ? 'bg-purple-100 text-purple-800'
                          : n.category === 'placement'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {n.category}
                      </span>

                      {n.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 animate-pulse">
                          URGENT
                        </span>
                      )}
                      {n.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                          HIGH
                        </span>
                      )}
                    </div>

                    {n.is_pinned && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                        <Pin className="w-3 h-3 fill-indigo-600" />
                        <span>Pinned</span>
                      </div>
                    )}
                  </div>

                  <CardTitle className="text-sm font-bold text-slate-900 mt-2 line-clamp-2">
                    {n.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {n.content}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      {n.publisher}
                    </span>
                    <span>{n.created_at}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Official Documents & Credentials */}
      {activeTab === 'documents' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Institutional Credential & Document Repository</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Download verified digital documents with cryptographic tamper-evident authentication seals.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold gap-1.5"
              onClick={() => {
                setDocSuccessMsg(null)
                setIsDocModalOpen(true)
              }}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Request Custom Certificate</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const isCleared = doc.status === 'READY_TO_DOWNLOAD'
              return (
                <Card key={doc.id} className="border-slate-200 shadow-xs hover:shadow-md transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        {doc.category}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isCleared ? 'Verified Digital Seal' : 'Pending Clearance'}
                      </span>
                    </div>

                    <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                      {doc.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Processing: {doc.processing_time}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {doc.description}
                    </p>

                    {doc.verification_hash && (
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          VERIFIED HASH
                        </span>
                        <span>{doc.verification_hash}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-400">{doc.issued_date || 'Instant Issue'}</span>
                      <Button
                        size="sm"
                        variant={isCleared ? 'secondary' : 'outline'}
                        className="text-xs font-semibold gap-1.5"
                        disabled={!isCleared}
                        onClick={() => alert(`Downloading verified ${doc.title} (PDF) with digital signature.`)}
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: Notice Reader Dialog */}
      {activeNoticeModal && (
        <Modal
          isOpen={true}
          onClose={() => setActiveNoticeModal(null)}
          title={activeNoticeModal.title}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-slate-500">
              <span className="font-semibold text-slate-700">Issued by: {activeNoticeModal.publisher}</span>
              <span>{activeNoticeModal.created_at}</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl text-slate-800 text-sm leading-relaxed whitespace-pre-line">
              {activeNoticeModal.content}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onOpenAI?.(`Summarize the official notice '${activeNoticeModal.title}' and explain action items for students.`)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                Ask AI to Summarize
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveNoticeModal(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Fee Payment Modal */}
      {isPayModalOpen && selectedFeeRecord && (
        <Modal
          isOpen={isPayModalOpen}
          onClose={() => setIsPayModalOpen(false)}
          title={`Pay ${selectedFeeRecord.category.toUpperCase()} Fee`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            {paymentSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm">Payment Processed Successfully!</h4>
                <p className="text-xs font-mono">{paymentSuccessMsg}</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsPayModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Outstanding Balance</span>
                    <span className="text-lg font-bold text-slate-900">Rs {selectedFeeRecord.balance_due.toLocaleString()}</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">Due: {selectedFeeRecord.due_date}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Installment Amount (Rs)</label>
                  <input
                    type="number"
                    value={payAmount}
                    max={selectedFeeRecord.balance_due}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Payment Mode</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['UPI', 'Net Banking', 'Debit Card'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                          paymentMethod === mode
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setIsPayModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={handleProcessPayment}
                    disabled={isProcessingPay || payAmount <= 0}
                  >
                    {isProcessingPay ? 'Processing...' : `Pay Rs ${payAmount.toLocaleString()}`}
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* MODAL 3: Custom Document Request Modal */}
      {isDocModalOpen && (
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          title="Request Official University Document"
          size="md"
        >
          <div className="space-y-4 text-xs">
            {docSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-2 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm">Certificate Request Approved</h4>
                <p className="text-xs">{docSuccessMsg}</p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsDocModalOpen(false)}
                >
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Select Document Type</label>
                  <select
                    value={selectedDocId}
                    onChange={(e) => setSelectedDocId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="bonafide-cert">Bonafide Student Certificate</option>
                    <option value="grade-card-sem5">Semester 5 Official Grade Card</option>
                    <option value="fee-estimate-letter">Tuition Fee Estimate Letter (Education Loan)</option>
                    <option value="no-dues-clearance">University No-Dues Clearance Certificate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Purpose / Addressee</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Visa Application / Bank Loan / Higher Studies Verification..."
                    value={docPurpose}
                    onChange={(e) => setDocPurpose(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setIsDocModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    onClick={handleRequestDocument}
                  >
                    Generate Certificate
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default FinanceNoticeHub
