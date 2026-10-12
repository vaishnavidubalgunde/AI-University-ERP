import React, { useState, useEffect, useCallback } from 'react'
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Save,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FileText,
  MessageSquare,
  ChevronRight,
  ShieldCheck,
  Eye,
  GraduationCap,
  Layers,
  Send,
  UserCheck,
  Brain,
  HelpCircle,
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
import {
  facultyService,
  FacultyDashboardResponse,
  StudentRosterItem,
  FacultyAnalyticsResponse,
  FacultyTimetableItem,
  FacultyGrievanceItem,
  StudentProfile360,
} from '../../services/facultyService'
import { aiService } from '../../services/aiService'
import { AttendanceRiskPredictionItem, AcademicRiskPredictionItem, PersonalizedStudyRecommendationItem } from '../../types/ai'
import useToast from '../../context/useToast'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export interface FacultyHubProps {
  initialTab?: 'overview' | 'attendance' | 'academics' | 'students' | 'schedule' | 'notices' | 'grievances' | 'predictions'
  onOpenAI?: (prompt?: string) => void
}

export const FacultyHub: React.FC<FacultyHubProps> = ({
  initialTab = 'overview',
  onOpenAI,
}) => {
  const toast = useToast()

  // Primary State
  const [data, setData] = useState<FacultyDashboardResponse | null>(null)
  const [analytics, setAnalytics] = useState<FacultyAnalyticsResponse | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [roster, setRoster] = useState<StudentRosterItem[]>([])
  const [timetable, setTimetable] = useState<FacultyTimetableItem[]>([])
  const [grievances, setGrievances] = useState<FacultyGrievanceItem[]>([])

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'attendance' | 'academics' | 'students' | 'schedule' | 'notices' | 'grievances' | 'predictions'
  >(initialTab)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Filters
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  const [selectedSection, setSelectedSection] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])

  // UI / Async States
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attendanceMap, setAttendanceMap] = useState<Record<number, string>>({})
  const [marksMap, setMarksMap] = useState<Record<number, { cie1?: number; cie2?: number; cie3?: number; assignment?: number }>>({})

  // 360° Profile Modal
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [studentProfile, setStudentProfile] = useState<StudentProfile360 | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  // Grievance Response Modal
  const [selectedGrievance, setSelectedGrievance] = useState<FacultyGrievanceItem | null>(null)
  const [grievanceResolutionText, setGrievanceResolutionText] = useState('')
  const [grievanceStatusAction, setGrievanceStatusAction] = useState<'RESOLVED' | 'IN_PROGRESS' | 'REJECTED'>('RESOLVED')

  // Predictive Recommendations State
  const [attendanceRisks, setAttendanceRisks] = useState<AttendanceRiskPredictionItem[]>([])
  const [academicRisks, setAcademicRisks] = useState<AcademicRiskPredictionItem[]>([])
  const [studyRecommendations, setStudyRecommendations] = useState<PersonalizedStudyRecommendationItem[]>([])
  const [isLoadingPredictions, setIsLoadingPredictions] = useState(false)

  // Initial Load
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [dashRes, analyticsRes, timetableRes, grievanceRes] = await Promise.all([
        facultyService.getDashboard(),
        facultyService.getAnalytics(),
        facultyService.getTimetable(),
        facultyService.getGrievances(),
      ])
      setData(dashRes)
      setAnalytics(analyticsRes)
      setTimetable(timetableRes)
      setGrievances(grievanceRes)

      if (dashRes.assigned_courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(dashRes.assigned_courses[0].id)
      }
    } catch {
      toast.error('Data Error', 'Failed to load faculty academic dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCourseId, toast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Load Roster whenever Course, Semester, or Section filter changes
  const fetchRosterData = useCallback(async (courseId: number, section?: string, sem?: number) => {
    try {
      const res = await facultyService.getCourseRoster(courseId, { section, semester: sem })
      setRoster(res)

      // Initialize maps
      const attInit: Record<number, string> = {}
      const marksInit: Record<number, { cie1?: number; cie2?: number; cie3?: number; assignment?: number }> = {}

      res.forEach((s) => {
        attInit[s.user_id] = 'present'
        marksInit[s.user_id] = {
          cie1: s.cie1_score ?? 22,
          cie2: s.cie2_score ?? 24,
          cie3: s.cie3_score ?? 25,
          assignment: s.assignment_score ?? 18,
        }
      })
      setAttendanceMap(attInit)
      setMarksMap(marksInit)
    } catch {
      toast.error('Roster Error', 'Could not load student roster for the selected filter')
    }
  }, [toast])

  useEffect(() => {
    if (selectedCourseId) {
      const semNum = selectedSemester ? parseInt(selectedSemester) : undefined
      fetchRosterData(selectedCourseId, selectedSection || undefined, semNum)
    }
  }, [selectedCourseId, selectedSection, selectedSemester, fetchRosterData])

  // Load Predictions when entering prediction tab
  const loadPredictions = async () => {
    setIsLoadingPredictions(true)
    try {
      const [att, acad, study] = await Promise.all([
        aiService.getAttendanceRiskPrediction(),
        aiService.getAcademicRiskDetection(),
        aiService.getPersonalizedStudyRecommendations(),
      ])
      setAttendanceRisks(att)
      setAcademicRisks(acad)
      setStudyRecommendations(study)
    } catch {
      toast.error('AI Error', 'Could not load AI risk predictions')
    } finally {
      setIsLoadingPredictions(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'predictions') {
      loadPredictions()
    }
  }, [activeTab])

  // Handlers
  const handleBatchAttendanceSubmit = async () => {
    if (!selectedCourseId) return
    setIsSubmitting(true)
    try {
      const records = Object.entries(attendanceMap).map(([userIdStr, status]) => ({
        user_id: parseInt(userIdStr),
        course_id: selectedCourseId,
        status,
      }))
      await facultyService.batchMarkAttendance(selectedCourseId, attendanceDate, records)
      toast.success('Attendance Recorded', `Successfully updated attendance for ${records.length} students.`)
      fetchRosterData(selectedCourseId, selectedSection || undefined, selectedSemester ? parseInt(selectedSemester) : undefined)
    } catch {
      toast.error('Submission Failed', 'Could not submit attendance records to server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBatchMarksSubmit = async () => {
    if (!selectedCourseId) return
    setIsSubmitting(true)
    try {
      const records = Object.entries(marksMap).map(([userIdStr, scores]) => ({
        user_id: parseInt(userIdStr),
        course_id: selectedCourseId,
        cie1: scores.cie1,
        cie2: scores.cie2,
        cie3: scores.cie3,
        assignment: scores.assignment,
      }))
      await facultyService.batchEnterMarks(selectedCourseId, records)
      toast.success('Marks Published', `Successfully updated CIE evaluation for ${records.length} students.`)
      fetchRosterData(selectedCourseId, selectedSection || undefined, selectedSemester ? parseInt(selectedSemester) : undefined)
    } catch {
      toast.error('Marks Error', 'Could not save internal marks to database.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenStudent360 = async (userId: number) => {
    setSelectedStudentId(userId)
    setIsLoadingProfile(true)
    try {
      const profile = await facultyService.getStudentProfile(userId)
      setStudentProfile(profile)
    } catch {
      toast.error('Profile Error', 'Failed to retrieve 360° academic profile.')
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handleResolveGrievance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGrievance || !grievanceResolutionText.trim()) return
    setIsSubmitting(true)
    try {
      await facultyService.respondToGrievance(
        selectedGrievance.id,
        grievanceResolutionText,
        grievanceStatusAction
      )
      toast.success('Grievance Updated', 'Resolution remarks posted successfully.')
      setSelectedGrievance(null)
      setGrievanceResolutionText('')
      const updated = await facultyService.getGrievances()
      setGrievances(updated)
    } catch {
      toast.error('Action Failed', 'Could not record grievance resolution.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredRoster = roster.filter(
    (s) =>
      s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.section && s.section.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const activeCourse = data?.assigned_courses.find((c) => c.id === selectedCourseId) || data?.assigned_courses[0]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading University Faculty Portal...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Faculty Executive Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-xs font-bold uppercase tracking-wider">
              Faculty ERP Command Center
            </span>
            <span className="text-xs text-blue-300 font-semibold">Department of {data?.department}</span>
            <span className="text-xs text-slate-400">• Academic Year 2025-26</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data?.faculty_name}</h1>
          <p className="text-xs text-slate-300 max-w-xl">{data?.designation} • Course Coordinator & Mentor</p>
        </div>

        {/* Dynamic Top KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center min-w-[95px]">
            <BookOpen className="w-4 h-4 text-blue-300 mx-auto mb-1" />
            <div className="text-lg font-black">{data?.kpis?.assigned_subjects ?? data?.total_assigned_courses ?? 0}</div>
            <div className="text-[9px] text-blue-200 font-bold uppercase">Subjects</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center min-w-[95px]">
            <Users className="w-4 h-4 text-emerald-300 mx-auto mb-1" />
            <div className="text-lg font-black">{data?.kpis?.assigned_students ?? data?.total_active_students ?? 0}</div>
            <div className="text-[9px] text-emerald-200 font-bold uppercase">Students</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center min-w-[95px]">
            <Award className="w-4 h-4 text-amber-300 mx-auto mb-1" />
            <div className="text-lg font-black">{data?.kpis?.average_attendance ?? 85}%</div>
            <div className="text-[9px] text-amber-200 font-bold uppercase">Avg. Attend</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center min-w-[95px]">
            <AlertCircle className="w-4 h-4 text-rose-300 mx-auto mb-1" />
            <div className="text-lg font-black text-rose-300">{data?.kpis?.students_below_threshold ?? 0}</div>
            <div className="text-[9px] text-rose-200 font-bold uppercase">&lt;75% Shortage</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview & KPIs', icon: TrendingUp },
          { id: 'attendance', label: 'Attendance Management', icon: UserCheck },
          { id: 'academics', label: 'Academic Performance', icon: Award },
          { id: 'students', label: 'Student Directory & 360°', icon: Users },
          { id: 'schedule', label: 'Lecture Timetable', icon: Clock },
          { id: 'notices', label: `Notices (${data?.recent_notices?.length || 0})`, icon: FileText },
          { id: 'grievances', label: `Grievances (${data?.kpis?.pending_grievances_count || 0})`, icon: MessageSquare },
          { id: 'predictions', label: 'AI Risk Radar', icon: Brain },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
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

      {/* Multi-Filter Drill-Down Toolbar for Course/Section/Semester */}
      {['attendance', 'academics', 'students'].includes(activeTab) && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Drill-Down:</span>
            </div>

            {/* Subject Selector */}
            <select
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              {data?.assigned_courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}: {c.name}
                </option>
              ))}
            </select>

            {/* Semester Filter */}
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
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

            {/* Section Filter */}
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Showing <span className="font-bold text-slate-900">{filteredRoster.length}</span> students in scope
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & KPIS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main KPI Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Classes & Sections</span>
              <div className="text-2xl font-black text-slate-900">{data?.kpis?.classes_sections ?? 4}</div>
              <div className="text-[10px] text-blue-600 font-bold">CSE Dept (Sec A, B, C, D)</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Class Average Marks</span>
              <div className="text-2xl font-black text-indigo-700">{data?.kpis?.average_class_performance ?? 78.4}%</div>
              <div className="text-[10px] text-emerald-600 font-bold">+3.2% vs last semester</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Upcoming Exams</span>
              <div className="text-2xl font-black text-slate-900">{data?.kpis?.upcoming_exams_count ?? 3}</div>
              <div className="text-[10px] text-amber-600 font-bold">Mid-Term & Lab CIEs</div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Pending Grievances</span>
              <div className="text-2xl font-black text-rose-600">{data?.kpis?.pending_grievances_count ?? 0}</div>
              <div className="text-[10px] text-slate-500 font-bold">Requires Faculty Redressal</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Attendance Distribution Chart */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Attendance Distribution</h3>
                  <p className="text-xs text-slate-500">Students grouped by attendance tier</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  Target &gt;= 75%
                </span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(analytics?.attendance_distribution || {}).map(([range, count]) => ({
                      range: range.replace('_', ' ').toUpperCase(),
                      count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CIE Score Distribution Chart */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">CIE Internal Marks Distribution</h3>
                  <p className="text-xs text-slate-500">Evaluation spread across 50 marks threshold</p>
                </div>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-200">
                  Passing &gt;= 20/50
                </span>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={Object.entries(analytics?.cie_distribution || {}).map(([range, count]) => ({
                      range: range.replace('_', ' ').toUpperCase(),
                      count,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Quick Schedule & Notices Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Classes */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>Today&apos;s Class Schedule</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Full Timetable &rarr;
                </button>
              </div>
              <div className="space-y-2">
                {(data?.recent_classes || []).map((c, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{c.course_title}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.room} • {c.time}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* University & Department Notices */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Important Notices & Circulars</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-2">
                {(data?.recent_notices || []).slice(0, 3).map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {n.category}
                      </span>
                      <span className="text-[10px] text-slate-400">{n.date}</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{n.title}</div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Batch Attendance Register</h2>
              <p className="text-xs text-slate-500">
                Subject: <span className="font-bold text-indigo-700">{activeCourse?.name}</span> ({activeCourse?.code})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleBatchAttendanceSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
              >
                {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Attendance Register</span>
              </Button>
            </div>
          </div>

          {/* Low Attendance Alert Banner */}
          {filteredRoster.some((s) => s.attendance_percentage < 75) && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold">Attendance Shortage Warning</h4>
                  <p className="text-[11px] text-rose-700">
                    {filteredRoster.filter((s) => s.attendance_percentage < 75).length} students in this section are currently below the university 75% threshold.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-0 text-xs font-bold shrink-0"
                onClick={() => setSearchQuery('Warning')}
              >
                Filter At-Risk
              </Button>
            </div>
          )}

          {/* Student Attendance Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRoster.map((s) => {
              const currentStatus = attendanceMap[s.user_id] || 'present'
              const isBelowThreshold = s.attendance_percentage < 75

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    currentStatus === 'present'
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : currentStatus === 'absent'
                      ? 'border-rose-200 bg-rose-50/30'
                      : 'border-amber-200 bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-xs">{s.student_name}</div>
                      <div className="font-mono text-[11px] text-indigo-700">{s.student_id}</div>
                      <div className="text-[10px] text-slate-400">
                        {s.department} • Sem {s.semester} • Sec {s.section || 'A'}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-black ${isBelowThreshold ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {s.attendance_percentage}%
                      </span>
                      <div className="text-[9px] text-slate-400">
                        {s.attended_classes}/{s.total_classes} Classes
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setAttendanceMap({ ...attendanceMap, [s.user_id]: 'present' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        currentStatus === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceMap({ ...attendanceMap, [s.user_id]: 'absent' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        currentStatus === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Absent
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceMap({ ...attendanceMap, [s.user_id]: 'excused' })}
                      className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        currentStatus === 'excused'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Excused
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ACADEMIC PERFORMANCE */}
      {/* ========================================================================= */}
      {activeTab === 'academics' && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Continuous Internal Evaluation (CIE) Marks Entry</h2>
              <p className="text-xs text-slate-500">
                Evaluates CIE 1 (30), CIE 2 (30), CIE 3 (30) + Assignment (20) &rarr; Final CIE out of 50.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleBatchMarksSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
            >
              {isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Publish & Calculate CIE Marks</span>
            </Button>
          </div>

          {/* Academic Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4">Student USN & Name</th>
                    <th className="py-3 px-4">Section</th>
                    <th className="py-3 px-4 text-center">CIE 1 (30)</th>
                    <th className="py-3 px-4 text-center">CIE 2 (30)</th>
                    <th className="py-3 px-4 text-center">CIE 3 (30)</th>
                    <th className="py-3 px-4 text-center">Assignment (20)</th>
                    <th className="py-3 px-4 text-center">Final CIE (50)</th>
                    <th className="py-3 px-4 text-right">Academic Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRoster.map((s) => {
                    const currentScores = marksMap[s.user_id] || {}
                    const c1 = currentScores.cie1 ?? 20
                    const c2 = currentScores.cie2 ?? 20
                    const c3 = currentScores.cie3 ?? 20
                    const asgn = currentScores.assignment ?? 10
                    const bestTwo = [c1, c2, c3].sort((a, b) => b - a)
                    const calcTotal = Math.round(((bestTwo[0] + bestTwo[1]) / 2 + asgn) * 10) / 10
                    const isPassing = calcTotal >= 20

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{s.student_name}</div>
                          <div className="font-mono text-[11px] text-indigo-700">{s.student_id}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-600">Sec {s.section || 'A'}</td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={currentScores.cie1 ?? ''}
                            onChange={(e) =>
                              setMarksMap({
                                ...marksMap,
                                [s.user_id]: { ...currentScores, cie1: parseFloat(e.target.value) || 0 },
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={currentScores.cie2 ?? ''}
                            onChange={(e) =>
                              setMarksMap({
                                ...marksMap,
                                [s.user_id]: { ...currentScores, cie2: parseFloat(e.target.value) || 0 },
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={currentScores.cie3 ?? ''}
                            onChange={(e) =>
                              setMarksMap({
                                ...marksMap,
                                [s.user_id]: { ...currentScores, cie3: parseFloat(e.target.value) || 0 },
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={currentScores.assignment ?? ''}
                            onChange={(e) =>
                              setMarksMap({
                                ...marksMap,
                                [s.user_id]: { ...currentScores, assignment: parseFloat(e.target.value) || 0 },
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-200 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center font-black text-indigo-700 text-sm">{calcTotal} / 50</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isPassing
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isPassing ? 'CIE Cleared' : 'At-Risk (<20)'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENT DIRECTORY & 360° PROFILE */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Enrolled Student Academic Directory</h2>
              <p className="text-xs text-slate-500">Drill down and inspect 360° student performance, attendance & AI advisory</p>
            </div>
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, USN, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Student USN</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Dept / Sem / Sec</th>
                  <th className="py-3 px-4">Attendance</th>
                  <th className="py-3 px-4">Final CIE</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredRoster.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{s.student_id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{s.student_name}</div>
                      <div className="text-[10px] text-slate-400">{s.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {s.department} • Sem {s.semester} • Sec {s.section || 'A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`font-bold ${s.attendance_percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {s.attendance_percentage}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-indigo-700">{s.final_cie ?? '-'}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'Safe'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'Warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenStudent360(s.user_id)}
                        className="text-xs font-bold gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>360° Profile</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LECTURE TIMETABLE */}
      {/* ========================================================================= */}
      {activeTab === 'schedule' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Faculty Lecture & Laboratory Schedule</h2>
              <p className="text-xs text-slate-500">Weekly allocation across classrooms, lecture halls & computing labs</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200">
              Department of {data?.department}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {timetable.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                    {t.room}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.day}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">{t.course_title}</h4>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{t.time}</span>
                  </div>
                  <span className="font-bold text-slate-700">Section {t.section}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: NOTICES */}
      {/* ========================================================================= */}
      {activeTab === 'notices' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">University & Department Circulars</h2>
            <p className="text-xs text-slate-500">Academic calendars, exam timetables, and administrative directives</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data?.recent_notices || []).map((n) => (
              <div key={n.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-md">
                    {n.category}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">{n.date}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: GRIEVANCES & REDRESSAL */}
      {/* ========================================================================= */}
      {activeTab === 'grievances' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Grievances & Redressal Desk</h2>
              <p className="text-xs text-slate-500">Review student academic issues, evaluate claims, and post official faculty resolutions</p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
              {grievances.filter((g) => g.status === 'PENDING').length} Pending Inquiries
            </span>
          </div>

          <div className="space-y-3">
            {grievances.map((g) => (
              <div key={g.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      #{g.id}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{g.student_name}</span>
                    <span className="text-[11px] text-slate-500">({g.student_id})</span>
                    <span className="text-[10px] text-slate-400">• {g.created_at}</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      g.status === 'RESOLVED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : g.status === 'IN_PROGRESS'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {g.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-800">{g.subject}</h4>
                  <p className="text-xs text-slate-600 mt-1">{g.description}</p>
                </div>

                {g.resolution_notes && (
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                    <span className="font-bold">Faculty Resolution: </span>
                    <span>{g.resolution_notes}</span>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedGrievance(g)
                      setGrievanceResolutionText(g.resolution_notes || '')
                    }}
                    className="text-xs font-bold gap-1 text-indigo-700 bg-white border border-slate-200"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{g.resolution_notes ? 'Update Resolution' : 'Redress / Respond'}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: AI PREDICTIVE RISK RADAR */}
      {/* ========================================================================= */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h2 className="text-lg font-black tracking-tight">AI Predictive Risk Radar & Recommendations</h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Proactive forecasting computed from actual ERP attendance history, CIE score trends, and learning curves.
            </p>
          </div>

          {isLoadingPredictions ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Risk Predictions */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Attendance Shortfall Forecast</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">{attendanceRisks.length} Forecasts</span>
                </div>

                <div className="space-y-3">
                  {attendanceRisks.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {item.course_code}: {item.course_title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.risk_level === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : item.risk_level === 'Medium'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.risk_level} Risk
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">{item.reason}</div>
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200 font-medium">
                        <span className="text-slate-500">
                          Current: {item.current_attendance}% &rarr; Proj: {item.projected_attendance}%
                        </span>
                        <span className="font-bold text-indigo-700">
                          Need {item.consecutive_classes_needed} consecutive classes
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academic Risk Detections */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>Academic Difficulty & Intervention</span>
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">{academicRisks.length} Detected</span>
                </div>

                <div className="space-y-3">
                  {academicRisks.map((item, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">
                          {item.course_code}: {item.course_title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.risk_level === 'High'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.risk_level} Difficulty
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">{item.reason}</div>
                      <div className="p-2.5 bg-indigo-50/80 border border-indigo-100 rounded-lg text-xs text-indigo-900">
                        <span className="font-bold">Intervention Plan: </span>
                        <span>{item.suggested_intervention}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 360° STUDENT ACADEMIC PROFILE */}
      {/* ========================================================================= */}
      {selectedStudentId && (
        <Modal
          isOpen={!!selectedStudentId}
          onClose={() => {
            setSelectedStudentId(null)
            setStudentProfile(null)
          }}
          title="Student 360° Academic Intelligence Profile"
          size="lg"
        >
          {isLoadingProfile ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
          ) : studentProfile ? (
            <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-1">
              {/* Profile Card Header */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-black">{studentProfile.student_name}</div>
                  <div className="font-mono text-xs text-indigo-300 font-bold">{studentProfile.student_id}</div>
                  <div className="text-slate-400 mt-1">
                    {studentProfile.department} • Semester {studentProfile.semester} • Section {studentProfile.section || 'A'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-emerald-400">{studentProfile.cgpa}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">CGPA</div>
                </div>
              </div>

              {/* Attendance & CIE Breakdown Tables */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Registered Subject Breakdown</h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Subject</th>
                        <th className="py-2.5 px-3">Attendance</th>
                        <th className="py-2.5 px-3">CIE Marks</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentProfile.attendance_records.map((c, i) => {
                        const marks = studentProfile.internal_marks.find((m) => m.course_code === c.course_code)
                        return (
                          <tr key={i}>
                            <td className="py-2.5 px-3 font-bold text-slate-800">
                              {c.course_code}: {c.course_title}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`font-bold ${c.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {c.percentage}%
                              </span>
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({c.attended_classes}/{c.total_classes})
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-indigo-700">
                              {marks ? `${marks.obtained_marks} / ${marks.max_marks}` : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  c.percentage >= 75
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {c.percentage >= 75 ? 'Eligible' : 'Shortage'}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Placement & Exam Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Placement Status</span>
                  <div className="font-bold text-slate-900">{studentProfile.placement_status || 'Eligible & Training'}</div>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Upcoming Exam Schedules</span>
                  <div className="font-bold text-slate-900">{studentProfile.exam_schedules.length} Papers Scheduled</div>
                </div>
              </div>

              {/* AI Academic Insights */}
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-indigo-900 text-xs">AI Academic Advisor Assessment</span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed space-y-1">
                  {studentProfile.ai_academic_insights.map((insight, idx) => (
                    <p key={idx}>{insight}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500">Student profile data unavailable.</div>
          )}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GRIEVANCE REDRESSAL RESPONSE */}
      {/* ========================================================================= */}
      {selectedGrievance && (
        <Modal
          isOpen={!!selectedGrievance}
          onClose={() => setSelectedGrievance(null)}
          title={`Grievance Redressal #${selectedGrievance.id}`}
          size="md"
        >
          <form onSubmit={handleResolveGrievance} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="font-bold text-slate-900">{selectedGrievance.student_name} ({selectedGrievance.student_id})</div>
              <div className="font-semibold text-indigo-700">{selectedGrievance.subject}</div>
              <p className="text-slate-600">{selectedGrievance.description}</p>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Update Resolution Status</label>
              <select
                value={grievanceStatusAction}
                onChange={(e) => setGrievanceStatusAction(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="RESOLVED">Mark as Resolved</option>
                <option value="IN_PROGRESS">Set In Progress</option>
                <option value="REJECTED">Reject Grievance</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">Faculty Resolution Remarks</label>
              <textarea
                rows={4}
                required
                placeholder="Enter official resolution details, marks adjustments, or attendance rectification notes..."
                value={grievanceResolutionText}
                onChange={(e) => setGrievanceResolutionText(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setSelectedGrievance(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-indigo-600 text-white font-bold" disabled={isSubmitting}>
                {isSubmitting ? 'Posting...' : 'Submit Resolution'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default FacultyHub
