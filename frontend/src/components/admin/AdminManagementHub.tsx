import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldAlert,
  Users,
  Building2,
  Database,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  FileText,
  Percent,
  GraduationCap,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Filter,
  BarChart3,
  Activity,
  Layers,
  Award,
  Radio,
  SlidersHorizontal,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { adminService } from '../../services/adminService'
import {
  AdminStatsResponse,
  StudentRegistryItem,
  KnowledgeDocItem,
  AttendanceAnalyticsResponse,
  AcademicAnalyticsResponse,
  PlacementAnalyticsResponse,
  GrievanceAnalyticsResponse,
  FeeAnalyticsResponse,
  RealtimeTelemetryResponse,
} from '../../types/admin'

const THEME_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']

interface AdminManagementHubProps {
  initialTab?:
    | 'analytics'
    | 'attendance_analytics'
    | 'academic_analytics'
    | 'placement_analytics'
    | 'grievance_analytics'
    | 'fee_analytics'
    | 'students'
    | 'documents'
  onOpenAI?: (prompt?: string) => void
}

export const AdminManagementHub: React.FC<AdminManagementHubProps> = ({
  initialTab = 'analytics',
  onOpenAI,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'analytics'
    | 'attendance_analytics'
    | 'academic_analytics'
    | 'placement_analytics'
    | 'grievance_analytics'
    | 'fee_analytics'
    | 'students'
    | 'documents'
  >(initialTab)

  // University Stats & Telemetry
  const [stats, setStats] = useState<AdminStatsResponse | null>(null)
  const [telemetry, setTelemetry] = useState<RealtimeTelemetryResponse | null>(null)
  const [autoPoll, setAutoPoll] = useState(true)

  // Analytics Deep Dives
  const [attendanceData, setAttendanceData] = useState<AttendanceAnalyticsResponse | null>(null)
  const [academicData, setAcademicData] = useState<AcademicAnalyticsResponse | null>(null)
  const [placementData, setPlacementData] = useState<PlacementAnalyticsResponse | null>(null)
  const [grievanceData, setGrievanceData] = useState<GrievanceAnalyticsResponse | null>(null)
  const [feeData, setFeeData] = useState<FeeAnalyticsResponse | null>(null)

  // Global Filters for Analytics
  const [filterDept, setFilterDept] = useState('')
  const [filterSemester, setFilterSemester] = useState('')

  // Student Registry State
  const [students, setStudents] = useState<StudentRegistryItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentEmail, setNewStudentEmail] = useState('')
  const [newStudentId, setNewStudentId] = useState('')
  const [newStudentDept, setNewStudentDept] = useState('Computer Science & Engineering')
  const [newStudentSem, setNewStudentSem] = useState(1)
  const [newStudentCgpa, setNewStudentCgpa] = useState(8.5)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollSuccessMsg, setEnrollSuccessMsg] = useState<string | null>(null)

  // Knowledge Documents & RAG State
  const [documents, setDocuments] = useState<KnowledgeDocItem[]>([])
  const [isDocModalOpen, setIsDocModalOpen] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState('Academic Policy')
  const [docFilename, setDocFilename] = useState('')
  const [docContent, setDocContent] = useState('')
  const [isUploadingDoc, setIsUploadingDoc] = useState(false)
  const [isReindexing, setIsReindexing] = useState(false)
  const [reindexResult, setReindexResult] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch core admin data
  const fetchAdminData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [statsData, studentsData, docsData, telemetryData] = await Promise.all([
        adminService.getStats(),
        adminService.getStudents(),
        adminService.getDocuments(),
        adminService.getTelemetry(),
      ])
      setStats(statsData)
      setStudents(studentsData)
      setDocuments(docsData)
      setTelemetry(telemetryData)
    } catch (err: any) {
      setError(
        err.response?.status === 403
          ? 'Access Denied: Administrative privileges required to view the governance portal.'
          : err.response?.data?.detail || 'Failed to load administrative records.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch specific analytics module
  const fetchAnalyticsModule = useCallback(async (tab: string, dept?: string, sem?: number) => {
    try {
      if (tab === 'attendance_analytics') {
        const data = await adminService.getAttendanceAnalytics({ department: dept, semester: sem })
        setAttendanceData(data)
      } else if (tab === 'academic_analytics') {
        const data = await adminService.getAcademicAnalytics({ department: dept, semester: sem })
        setAcademicData(data)
      } else if (tab === 'placement_analytics') {
        const data = await adminService.getPlacementAnalytics()
        setPlacementData(data)
      } else if (tab === 'grievance_analytics') {
        const data = await adminService.getGrievanceAnalytics()
        setGrievanceData(data)
      } else if (tab === 'fee_analytics') {
        const data = await adminService.getFeeAnalytics()
        setFeeData(data)
      }
    } catch {
      // Gracefully retain existing state
    }
  }, [])

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  useEffect(() => {
    const semNum = filterSemester ? parseInt(filterSemester) : undefined
    fetchAnalyticsModule(activeTab, filterDept || undefined, semNum)
  }, [activeTab, filterDept, filterSemester, fetchAnalyticsModule])

  // Real-time telemetry auto-polling (15s heartbeat)
  useEffect(() => {
    if (!autoPoll) return
    const interval = setInterval(async () => {
      try {
        const updatedTelemetry = await adminService.getTelemetry()
        setTelemetry(updatedTelemetry)
      } catch {
        // quiet fail on poll
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [autoPoll])

  const handleSearchStudents = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const filtered = await adminService.getStudents({ search: searchQuery, department: selectedDept || undefined })
      setStudents(filtered)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to filter students.')
    }
  }

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudentName || !newStudentEmail || !newStudentId) {
      alert('Please provide name, email, and student ID.')
      return
    }

    setIsEnrolling(true)
    setEnrollSuccessMsg(null)

    try {
      const res = await adminService.createStudent({
        full_name: newStudentName,
        email: newStudentEmail,
        student_id: newStudentId,
        department: newStudentDept,
        semester: newStudentSem,
        cgpa: newStudentCgpa,
      })
      setEnrollSuccessMsg(res.message)
      setNewStudentName('')
      setNewStudentEmail('')
      setNewStudentId('')
      const updated = await adminService.getStudents()
      setStudents(updated)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Enrollment failed.')
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docTitle || !docContent) {
      alert('Please provide document title and content.')
      return
    }

    setIsUploadingDoc(true)
    try {
      const filename = docFilename.trim() !== '' ? docFilename : `${docTitle.toLowerCase().replace(/\\s+/g, '_')}.md`
      const res = await adminService.uploadDocument({
        title: docTitle,
        category: docCategory,
        filename,
        content: docContent,
      })
      alert(res.message)
      setDocTitle('')
      setDocFilename('')
      setDocContent('')
      setIsDocModalOpen(false)
      const updated = await adminService.getDocuments()
      setDocuments(updated)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to upload document.')
    } finally {
      setIsUploadingDoc(false)
    }
  }

  const handleReindexRAG = async () => {
    setIsReindexing(true)
    setReindexResult(null)
    try {
      const res = await adminService.reindexVectorStore()
      setReindexResult(`${res.message} (${res.total_vectors_indexed} chunks indexed across ${res.total_documents} documents).`)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Reindexing failed.')
    } finally {
      setIsReindexing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Executive Command Center Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">University Executive Command Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider">
                Admin ERP
              </span>
              {autoPoll && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-[10px] text-emerald-300 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Telemetry Sync
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              University-wide KPI monitoring, multi-dimensional academic analytics, student registry, and RAG knowledge base.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setAutoPoll(!autoPoll)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              autoPoll
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                : 'bg-white/10 text-slate-300 border-white/10'
            }`}
          >
            <Radio className="w-3.5 h-3.5 inline mr-1" />
            {autoPoll ? 'Auto-Sync On (15s)' : 'Auto-Sync Off'}
          </button>

          <button
            type="button"
            onClick={() => fetchAdminData()}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <Button
            variant="secondary"
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-md text-xs font-bold gap-1.5"
            onClick={() =>
              onOpenAI?.(
                'Generate an executive university analytics briefing on campus attendance trends, at-risk departments, and placement rate.'
              )
            }
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Executive Brief</span>
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Switcher */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        {[
          { id: 'analytics', label: 'University KPIs', icon: Building2 },
          { id: 'attendance_analytics', label: 'Attendance Analytics', icon: Percent },
          { id: 'academic_analytics', label: 'Academic Performance', icon: Award },
          { id: 'placement_analytics', label: 'Placement Insights', icon: Briefcase },
          { id: 'grievance_analytics', label: 'Grievance Desk', icon: Activity },
          { id: 'fee_analytics', label: 'Fee Governance', icon: DollarSign },
          { id: 'students', label: `Student Registry (${students.length})`, icon: Users },
          { id: 'documents', label: `RAG Vectors (${documents.length})`, icon: Database },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Global Drill-Down Toolbar (for analytics tabs) */}
      {['attendance_analytics', 'academic_analytics', 'placement_analytics', 'grievance_analytics', 'fee_analytics'].includes(
        activeTab
      ) && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Analytics Filters:</span>
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science (CSE)</option>
              <option value="Information Science & Engineering">Information Science (ISE)</option>
              <option value="Electronics & Communication Engineering">Electronics & Communication (ECE)</option>
            </select>

            {['attendance_analytics', 'academic_analytics'].includes(activeTab) && (
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Semesters</option>
                <option value="1">1st Semester</option>
                <option value="2">2nd Semester</option>
                <option value="3">3rd Semester</option>
                <option value="4">4th Semester</option>
                <option value="5">5th Semester</option>
                <option value="6">6th Semester</option>
                <option value="7">7th Semester</option>
                <option value="8">8th Semester</option>
              </select>
            )}
          </div>

          <span className="text-xs text-slate-500 font-semibold">
            Institutional Scope: <span className="font-bold text-indigo-700">{filterDept || 'University Wide'}</span>
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: UNIVERSITY EXECUTIVE OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-6">
          {/* Main 8 KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Total Enrolled</span>
                  <div className="text-xl font-black text-slate-900">{stats.total_students} Students</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Faculty Roster</span>
                  <div className="text-xl font-black text-slate-900">{stats.total_faculty} Professors</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Campus Attendance</span>
                  <div className="text-xl font-black text-emerald-700">{stats.campus_average_attendance}%</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Fee Collection</span>
                  <div className="text-xl font-black text-amber-700">{stats.fee_collection_rate}%</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Active Placement Drives</span>
                  <div className="text-xl font-black text-indigo-700">{stats.kpis?.total_placement_offers ?? 5} Drives</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Open Grievances</span>
                  <div className="text-xl font-black text-rose-700">{stats.kpis?.open_grievances ?? 0} Inquiries</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Scheduled Exams</span>
                  <div className="text-xl font-black text-sky-700">{stats.kpis?.active_exams_count ?? 4} Papers</div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-400">Active Circulars</span>
                  <div className="text-xl font-black text-teal-700">{stats.kpis?.recent_notices_count ?? 3} Bulletins</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Breakdown Table */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900">Academic Departmental Distribution & Course Matrix</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Department chairpersons, active curriculum counts, and institutional divisions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Department Name</th>
                      <th className="py-3 px-4">Head of Department</th>
                      <th className="py-3 px-4">Active Courses</th>
                      <th className="py-3 px-4 text-right">Executive Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.department_distribution.map((d) => (
                      <tr key={d.code} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{d.code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{d.name}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{d.head_of_department}</td>
                        <td className="py-3.5 px-4">
                          <span className="bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[11px]">
                            {d.courses_count} Courses
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-[11px] h-7"
                            onClick={() => onOpenAI?.(`Generate a comprehensive executive report for department ${d.name} (${d.code})`)}
                          >
                            <Sparkles className="w-3 h-3 text-purple-600" />
                          </Button>
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

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'attendance_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Selected Scope Attendance</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{attendanceData?.campus_average ?? 85}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Students Below 75%</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{attendanceData?.low_attendance_students?.length ?? 0}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Departments Monitored</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">{attendanceData?.department_attendance?.length ?? 3}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Department-wise Attendance Averages</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData?.department_attendance || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="department_code" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="average_attendance" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Semester Attendance Trends */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Semester Attendance Averages</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attendanceData?.semester_attendance || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="attendance" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Low Attendance Student Register */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Low Attendance Student Register (&lt;75% Shortage)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Student USN</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Semester</th>
                    <th className="py-2.5 px-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(attendanceData?.low_attendance_students || []).map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{s.student_id}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{s.student_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{s.department}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-800">Sem {s.semester}</td>
                      <td className="py-2.5 px-3 font-black text-rose-600">{s.attendance_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACADEMIC ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'academic_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Campus Average Marks</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">{academicData?.overall_average_marks ?? 78.4}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Overall Pass Rate</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{academicData?.overall_pass_rate ?? 92.5}%</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">At-Risk Students Identified</span>
              <div className="text-2xl font-black text-rose-600 mt-1">{academicData?.at_risk_students?.length ?? 0}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Performance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Subject-wise Average Marks</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={academicData?.subject_performance || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="course_code" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="average_marks" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Department Performance */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Department Performance Comparison</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={academicData?.department_performance || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="department_code" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="average_cgpa" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Average CGPA" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PLACEMENT ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'placement_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Eligible Students</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{placementData?.eligible_students_count ?? 120}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Selected / Placed</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{placementData?.total_offers ?? 45}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Average CTC</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">{placementData?.average_ctc ?? 14.5} LPA</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Highest CTC</span>
              <div className="text-2xl font-black text-purple-700 mt-1">{placementData?.highest_ctc ?? 38.0} LPA</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Placements */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Placement Rate by Department</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={placementData?.department_placements || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="placed" fill="#4f46e5" radius={[6, 6, 0, 0]} name="Placed Count" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Readiness Distribution */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Placement Readiness Distribution</h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(placementData?.readiness_distribution || {}).map(([tier, count]) => ({
                      tier: tier.replace('_', ' ').toUpperCase(),
                      count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GRIEVANCE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'grievance_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Total Grievances</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{grievanceData?.total_grievances ?? 0}</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Open & In Progress</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {(grievanceData?.open_count ?? 0) + (grievanceData?.in_progress_count ?? 0)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Resolved</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{grievanceData?.resolved_count ?? 0}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Grievances by Category</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(grievanceData?.category_breakdown || {}).map(([category, count]) => ({
                    category,
                    count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: FEE ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'fee_analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Total Billed Fees</span>
              <div className="text-2xl font-black text-slate-900 mt-1">₹{((feeData?.total_billed ?? 5000000) / 100000).toFixed(1)} Lakhs</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Total Collected</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">₹{((feeData?.total_collected ?? 4500000) / 100000).toFixed(1)} Lakhs</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500">Collection Rate</span>
              <div className="text-2xl font-black text-indigo-700 mt-1">{feeData?.collection_rate ?? 90}%</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Category-wise Fee Collection</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feeData?.category_breakdown || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="collected" fill="#10b981" radius={[6, 6, 0, 0]} name="Collected (₹)" />
                  <Bar dataKey="billed" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Billed (₹)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: STUDENT DIRECTORY & ENROLLMENT */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <form onSubmit={handleSearchStudents} className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by student name, ID, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Departments</option>
                <option value="Computer Science & Engineering">CSE</option>
                <option value="Information Science & Engineering">ISE</option>
                <option value="Electronics & Communication Engineering">ECE</option>
              </select>
              <Button type="submit" variant="secondary" size="sm" className="text-xs font-semibold">
                Filter
              </Button>
            </form>

            <Button
              variant="primary"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5"
              onClick={() => {
                setEnrollSuccessMsg(null)
                setIsEnrollModalOpen(true)
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Enroll New Student</span>
            </Button>
          </div>

          <Card className="border-slate-200 shadow-xs">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Sem</th>
                      <th className="py-3 px-4">CGPA</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{s.student_id}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{s.full_name}</td>
                        <td className="py-3.5 px-4 text-slate-500">{s.email}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{s.department}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">Sem {s.semester}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-700">{s.cgpa}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {s.is_active ? 'Active' : 'Inactive'}
                          </span>
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

      {/* ========================================================================= */}
      {/* TAB 8: RAG KNOWLEDGE BASE & INDEXING */}
      {/* ========================================================================= */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">RAG Semantic Vector Knowledge Base</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Institutional documents ingested and vector-indexed for the multi-agent conversational engine.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs font-semibold gap-1.5"
                onClick={() => setIsDocModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold gap-1.5"
                disabled={isReindexing}
                onClick={handleReindexRAG}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
                <span>{isReindexing ? 'Rebuilding Index...' : 'Rebuild FAISS Vector Index'}</span>
              </Button>
            </div>
          </div>

          {reindexResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{reindexResult}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="border-slate-200 shadow-xs hover:shadow-md transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {doc.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {doc.status}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">{doc.title}</CardTitle>
                  <CardDescription className="text-xs text-indigo-700 font-semibold">
                    {doc.category} • {doc.filename}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 mt-2">
                  <span>Size: {doc.file_size}</span>
                  <span className="font-bold text-slate-700">{doc.chunk_count} Semantic Chunks</span>
                  <span>{doc.uploaded_at}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Enroll New Student */}
      {isEnrollModalOpen && (
        <Modal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          title="Enroll New University Student"
          size="md"
        >
          <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
            {enrollSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm">Enrollment Complete!</h4>
                <p className="text-xs font-mono">{enrollSuccessMsg}</p>
                <Button variant="primary" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rohan Sharma"
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Student ID / USN</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1DT23CS099"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Institutional Email</label>
                    <input
                      type="email"
                      required
                      placeholder="rohan.sharma@univ.edu"
                      value={newStudentEmail}
                      onChange={(e) => setNewStudentEmail(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Academic Department</label>
                  <select
                    value={newStudentDept}
                    onChange={(e) => setNewStudentDept(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    <option value="Information Science & Engineering">Information Science & Engineering</option>
                    <option value="Electronics & Communication Engineering">Electronics & Communication Engineering</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={newStudentSem}
                      onChange={(e) => setNewStudentSem(parseInt(e.target.value) || 1)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Initial CGPA</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      max={10}
                      value={newStudentCgpa}
                      onChange={(e) => setNewStudentCgpa(parseFloat(e.target.value) || 8.0)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                    disabled={isEnrolling}
                  >
                    {isEnrolling ? 'Enrolling...' : 'Enroll Student'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* MODAL: Upload Institutional Document */}
      {isDocModalOpen && (
        <Modal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          title="Upload Institutional Document to RAG Store"
          size="md"
        >
          <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">Document Title</label>
              <input
                type="text"
                required
                placeholder="e.g. AI Research Ethics & GPU Lab Usage Policy"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
                >
                  <option value="Academic Policy">Academic Policy</option>
                  <option value="Curriculum">Curriculum Syllabus</option>
                  <option value="Examination">Examination Code</option>
                  <option value="Placements">Placements Policy</option>
                  <option value="Hostel & Facilities">Hostel & Facilities</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Filename</label>
                <input
                  type="text"
                  placeholder="e.g. ai_ethics_2026.pdf"
                  value={docFilename}
                  onChange={(e) => setDocFilename(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Document Markdown / Text Content</label>
              <textarea
                rows={5}
                required
                placeholder="Paste institutional policy paragraphs, attendance clauses, or grading rubrics here for semantic chunking..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsDocModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                disabled={isUploadingDoc}
              >
                {isUploadingDoc ? 'Ingesting...' : 'Ingest & Chunk'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default AdminManagementHub
