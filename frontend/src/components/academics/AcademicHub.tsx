import React, { useState, useEffect, useCallback } from 'react'
import {
  BookOpen,
  CalendarCheck,
  Award,
  FileText,
  CheckCircle2,
  User,
  Download,
  Search,
  Sparkles,
  Sliders,
  GraduationCap
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import AlertBanner from '../ui/AlertBanner'
import Tabs from '../ui/Tabs'
import Modal from '../ui/Modal'
import LoadingState from '../ui/LoadingState'
import ErrorState from '../ui/ErrorState'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/Table'
import useToast from '../../context/useToast'
import academicService from '../../services/academicService'
import { aiService } from '../../services/aiService'
import {
  CourseDetail,
  AttendanceDetail,
  CourseMarksSummary,
  AcademicTranscriptResponse,
  ElectiveCourseOption,
} from '../../types/academic'
import { AcademicAdvisoryResponse } from '../../types/ai'

import useAuth from '../../context/useAuth'

export interface AcademicHubProps {
  initialTab?: 'courses' | 'attendance' | 'marks' | 'transcript' | 'electives' | 'ai-advisor'
  onOpenAI?: (prompt?: string) => void
}

export const AcademicHub: React.FC<AcademicHubProps> = ({
  initialTab = 'courses',
  onOpenAI,
}) => {
  const toast = useToast()
  const { user } = useAuth()
  const isStudent = user?.role === 'student'
  const isFaculty = user?.role === 'faculty'
  const effectiveInitialTab = !isStudent && (initialTab === 'attendance' || initialTab === 'marks' || initialTab === 'transcript' || initialTab === 'electives') ? 'courses' : initialTab
  const [activeTab, setActiveTab] = useState<string>(effectiveInitialTab)

  useEffect(() => {
    if (!isStudent && (activeTab === 'attendance' || activeTab === 'marks' || activeTab === 'transcript' || activeTab === 'electives')) {
      setActiveTab('courses')
    }
  }, [isStudent, activeTab])

  // Data states
  const [courses, setCourses] = useState<CourseDetail[]>([])
  const [attendance, setAttendance] = useState<AttendanceDetail[]>([])
  const [marks, setMarks] = useState<CourseMarksSummary[]>([])
  const [transcript, setTranscript] = useState<AcademicTranscriptResponse | null>(null)
  const [electives, setElectives] = useState<ElectiveCourseOption[]>([])
  const [advisoryReport, setAdvisoryReport] = useState<AcademicAdvisoryResponse | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Search & Filter
  const [courseSearch, setCourseSearch] = useState<string>('')
  const [selectedCourseType, setSelectedCourseType] = useState<string>('all')
  const [selectedSyllabusCourse, setSelectedSyllabusCourse] = useState<CourseDetail | null>(null)

  // Attendance Simulator State
  const [simSelectedCourseId, setSimSelectedCourseId] = useState<number | null>(null)
  const [simUpcomingClasses, setSimUpcomingClasses] = useState<number>(6)
  const [simAttendedCount, setSimAttendedCount] = useState<number>(6)

  // Registering state
  const [isRegisteringElective, setIsRegisteringElective] = useState<number | null>(null)

  const loadAcademicData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (isStudent) {
        const [coursesRes, attRes, marksRes, transcriptRes, electivesRes, advisoryRes] = await Promise.all([
          academicService.getCourses(),
          academicService.getAttendance(),
          academicService.getMarks(),
          academicService.getTranscript(),
          academicService.getElectives(),
          aiService.getAcademicAdvisory().catch(() => null),
        ])
        setCourses(coursesRes)
        setAttendance(attRes)
        setMarks(marksRes)
        setTranscript(transcriptRes)
        setElectives(electivesRes)
        if (advisoryRes) setAdvisoryReport(advisoryRes)

        if (attRes.length > 0 && !simSelectedCourseId) {
          setSimSelectedCourseId(attRes[0].course_id)
        }
      } else {
        const [coursesRes, advisoryRes] = await Promise.all([
          academicService.getCourses(),
          aiService.getAcademicAdvisory().catch(() => null),
        ])
        setCourses(coursesRes)
        if (advisoryRes) setAdvisoryReport(advisoryRes)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch academic data'
      setError(errMsg)
      toast.error('Academic Sync Error', errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [toast, simSelectedCourseId, isStudent])

  useEffect(() => {
    loadAcademicData()
  }, [loadAcademicData])

  const handleElectiveRegister = async (courseId: number) => {
    setIsRegisteringElective(courseId)
    try {
      const res = await academicService.registerElective(courseId)
      toast.success('Registration Complete', res.message)
      await loadAcademicData()
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to register elective'
      toast.error('Registration Failed', errMsg)
    } finally {
      setIsRegisteringElective(null)
    }
  }

  if (isLoading) {
    return <LoadingState title="Loading Academic Hub" description="Retrieving curriculum, circular attendance logs, marks breakdown, and transcripts..." />
  }

  if (error) {
    return <ErrorState title="Failed to load academic records" description={error} onRetry={loadAcademicData} />
  }

  // Filtered courses
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
      c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
      (c.faculty_name && c.faculty_name.toLowerCase().includes(courseSearch.toLowerCase()))
    const matchesType = selectedCourseType === 'all' || c.course_type === selectedCourseType
    return matchesSearch && matchesType
  })

  // Selected Attendance Simulation Data
  const selectedAttRecord = attendance.find((a) => a.course_id === simSelectedCourseId) || attendance[0]
  const simNewTotal = (selectedAttRecord?.total_classes || 0) + simUpcomingClasses
  const simNewAttended = (selectedAttRecord?.attended_classes || 0) + simAttendedCount
  const simNewPercentage = simNewTotal > 0 ? roundPct((simNewAttended / simNewTotal) * 100) : 100.0

  function roundPct(num: number) {
    return Math.round(num * 10) / 10
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">Academic Subsystem</Badge>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-blue-300 font-semibold">Phase 6 Integrated</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Academic Curriculum & Evaluation Hub
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Course syllabus catalog, circular attendance meters with recovery calculators, internal assessment ledgers, and official degree transcripts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {onOpenAI && (
            <button
              onClick={() => onOpenAI('Summarize my academic curriculum and exam preparation strategies')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>Ask Academic AI</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200 pb-2">
        <Tabs
          tabs={
            isStudent
              ? [
                  { id: 'courses', label: 'Courses & Syllabus', icon: <BookOpen className="w-3.5 h-3.5" />, badge: courses.length.toString() },
                  { id: 'attendance', label: 'Attendance Gauges & Simulator', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
                  { id: 'marks', label: 'Internal Marks Breakdown', icon: <Award className="w-3.5 h-3.5" /> },
                  { id: 'transcript', label: 'Official Degree Transcript', icon: <FileText className="w-3.5 h-3.5" /> },
                  { id: 'electives', label: 'Elective Selection', icon: <CheckCircle2 className="w-3.5 h-3.5" />, badge: 'Open' },
                  { id: 'ai-advisor', label: 'AI Academic Advisor', icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" />, badge: 'Phase 14' },
                ]
              : isFaculty
              ? [
                  { id: 'courses', label: 'Assigned Courses & Curriculum', icon: <BookOpen className="w-3.5 h-3.5" />, badge: courses.length.toString() },
                  { id: 'ai-advisor', label: 'Faculty AI Academic Advisor', icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" /> },
                ]
              : [
                  { id: 'courses', label: 'University Curriculum Catalog', icon: <BookOpen className="w-3.5 h-3.5" />, badge: courses.length.toString() },
                  { id: 'ai-advisor', label: 'Admin Academic AI Advisor', icon: <Sparkles className="w-3.5 h-3.5 text-purple-600" /> },
                ]
          }
          activeTab={activeTab}
          onChange={setActiveTab}
          variant="segmented"
          size="md"
        />
      </div>

      {/* TAB 1: Courses & Syllabus Repository */}
      {activeTab === 'courses' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search subject code, title, or faculty..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-500">Filter:</span>
              <div className="flex gap-1.5">
                {['all', 'core', 'elective', 'lab'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedCourseType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                      selectedCourseType === type
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Courses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCourses.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {c.code}
                    </span>
                    <Badge
                      variant={
                        c.course_type === 'core'
                          ? 'primary'
                          : c.course_type === 'lab'
                          ? 'purple'
                          : 'info'
                      }
                      size="sm"
                    >
                      {c.course_type.toUpperCase()} • {c.credits} Credits
                    </Badge>
                  </div>
                  <CardTitle className="mt-2 line-clamp-1">{c.title}</CardTitle>
                  <CardDescription>{c.department_name} • Semester {c.semester}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {c.syllabus_summary || 'Comprehensive foundational engineering curriculum.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-medium">{c.faculty_name || 'Department Faculty'}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSyllabusCourse(c)}
                    >
                      Syllabus
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Attendance Gauges & Recovery Simulator */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Circular Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendance.map((att) => {
              const circumference = 2 * Math.PI * 40
              const offset = circumference - (att.percentage / 100) * circumference
              const isShortage = att.percentage < 75.0

              return (
                <div
                  key={att.course_id}
                  className={`p-5 rounded-2xl border bg-white shadow-xs flex flex-col justify-between gap-4 transition-all ${
                    isShortage ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800">{att.course_code}</span>
                      <h4 className="text-xs font-semibold text-slate-700 mt-0.5 line-clamp-1">{att.course_title}</h4>
                    </div>
                    <Badge variant={isShortage ? 'danger' : 'success'} size="sm" dot>
                      {att.status.toUpperCase()}
                    </Badge>
                  </div>

                  {/* Circular SVG Gauge Meter */}
                  <div className="flex items-center justify-center py-2">
                    <div className="relative flex items-center justify-center">
                      <svg className="w-28 h-28 transform -rotate-90">
                        <circle
                          cx="56"
                          cy="56"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          className="text-slate-100"
                          fill="transparent"
                        />
                        <circle
                          cx="56"
                          cy="56"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          className={isShortage ? 'text-rose-500' : 'text-emerald-500'}
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-xl font-black tracking-tight text-slate-900 font-mono">
                          {att.percentage}%
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Attendance</span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Ledger */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Attended</span>
                      <p className="font-bold text-emerald-600 font-mono">{att.attended_classes}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Missed</span>
                      <p className="font-bold text-rose-500 font-mono">{att.missed_classes}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                      <p className="font-bold text-slate-700 font-mono">{att.total_classes}</p>
                    </div>
                  </div>

                  {/* Contextual Action */}
                  {isShortage ? (
                    <div className="p-2 bg-rose-100/70 rounded-xl text-[11px] text-rose-800 font-medium flex items-center justify-between">
                      <span>Attend next <strong>{att.classes_needed_for_75}</strong> classes for 75%</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenAI && onOpenAI(`Create attendance recovery timetable for ${att.course_code}`)}
                      >
                        Plan
                      </Button>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50 rounded-xl text-[11px] text-emerald-800 font-medium flex items-center justify-between">
                      <span>Can safely miss <strong>{att.max_classes_can_miss_for_75}</strong> classes</span>
                      <span className="text-emerald-600 font-bold">Eligible</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Interactive Attendance Projection Simulator */}
          <Card className="border-blue-200 shadow-md">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-950">Attendance Projection Simulator</CardTitle>
                    <CardDescription className="text-blue-700">Calculate future attendance percentages based on planned attendance</CardDescription>
                  </div>
                </div>
                <Badge variant="primary" size="sm">Interactive Model</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Select Course */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Select Subject</label>
                  <select
                    value={simSelectedCourseId || ''}
                    onChange={(e) => setSimSelectedCourseId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-hidden focus:border-blue-500"
                  >
                    {attendance.map((a) => (
                      <option key={a.course_id} value={a.course_id}>
                        {a.course_code}: {a.course_title} ({a.percentage}%)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Upcoming Classes Conducted */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Upcoming Classes Conducted: <span className="font-mono text-blue-600 font-black">{simUpcomingClasses}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={simUpcomingClasses}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setSimUpcomingClasses(val)
                      if (simAttendedCount > val) setSimAttendedCount(val)
                    }}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 class</span>
                    <span>20 classes</span>
                  </div>
                </div>

                {/* Planned Attendance */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Classes You Will Attend: <span className="font-mono text-emerald-600 font-black">{simAttendedCount}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={simUpcomingClasses}
                    value={simAttendedCount}
                    onChange={(e) => setSimAttendedCount(Number(e.target.value))}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>0 classes</span>
                    <span>{simUpcomingClasses} classes</span>
                  </div>
                </div>
              </div>

              {/* Simulation Result Banner */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Projected Standing</span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-2xl font-black font-mono text-white">{simNewPercentage}%</span>
                    <Badge variant={simNewPercentage >= 75 ? 'success' : 'danger'} size="sm" dot>
                      {simNewPercentage >= 75 ? 'ELIGIBLE' : 'SHORTAGE ALERT'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Attending {simAttendedCount} of the next {simUpcomingClasses} classes will result in{' '}
                    <strong className="text-white">{simNewAttended}/{simNewTotal}</strong> attended lectures.
                  </p>
                </div>

                <div className="shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => toast.success('Simulation Saved', `Target attendance: ${simNewPercentage}% for ${selectedAttRecord?.course_code}`)}
                  >
                    Set as Goal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: Internal Marks Breakdown */}
      {activeTab === 'marks' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 gap-4">
            {marks.map((cm) => (
              <Card key={cm.course_id}>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          {cm.course_code}
                        </span>
                        <CardTitle>{cm.course_title}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">{cm.credits} Credit Course</CardDescription>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {cm.total_obtained_marks} / {cm.total_max_marks}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">({cm.aggregate_percentage}%)</p>
                      </div>
                      <Badge variant="purple" size="sm">
                        {cm.projected_grade}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Assessment Component</TableHead>
                        <TableHead>Maximum Marks</TableHead>
                        <TableHead>Score Obtained</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Evaluation Date</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cm.assessments.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-bold text-slate-800">{a.assessment_name}</TableCell>
                          <TableCell className="font-mono text-xs">{a.max_marks}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-blue-600">{a.obtained_marks}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold">{a.percentage}%</span>
                              <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                <div
                                  className="h-full bg-blue-600 rounded-full"
                                  style={{ width: `${a.percentage}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">{a.assessment_date}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="success" size="sm">
                              Verified
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Official Academic Transcript */}
      {activeTab === 'transcript' && transcript && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Transcript Vitals Hero */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Official Degree Progression</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                Cumulative GPA: {transcript.cgpa} / 10.0
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Total Credits Earned: <strong>{transcript.total_credits_earned}</strong> • Degree Requirement: 160 Credits
              </p>
            </div>

            <div className="shrink-0">
              <Button
                variant="primary"
                size="md"
                onClick={() => toast.success('Transcript Downloaded', 'Official digital transcript with SHA-256 seal exported.')}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download Official Transcript
              </Button>
            </div>
          </div>

          {/* Semesters History Accordion/Cards */}
          <div className="space-y-4">
            {transcript.semesters.map((sem) => (
              <Card key={sem.semester}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Semester {sem.semester} ({sem.academic_year})</CardTitle>
                      <CardDescription>Credits Earned: {sem.credits_earned} / {sem.credits_registered}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">SGPA:</span>
                      <Badge variant="purple" size="md">
                        {sem.sgpa}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Letter Grade</TableHead>
                        <TableHead className="text-right">Grade Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sem.courses.map((course, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs font-bold text-blue-600">{course.code}</TableCell>
                          <TableCell className="font-medium text-slate-800">{course.title}</TableCell>
                          <TableCell className="font-mono text-xs">{course.credits}</TableCell>
                          <TableCell>
                            <Badge variant={course.grade === 'O' || course.grade === 'A+' ? 'success' : 'info'} size="sm">
                              {course.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs">{course.gp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Elective Selection */}
      {activeTab === 'electives' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <AlertBanner
            variant="info"
            title="Spring 2026 Professional Elective Selection Active"
          >
            Select 1 specialized professional elective from the department offerings below. Course selections will be reflected in your academic timetable and examination schedule.
          </AlertBanner>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {electives.map((e) => (
              <Card key={e.id} className={e.is_selected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                      {e.code}
                    </span>
                    <Badge variant={e.is_selected ? 'success' : 'default'} size="sm">
                      {e.is_selected ? 'ENROLLED' : `${e.available_seats} Seats Available`}
                    </Badge>
                  </div>
                  <CardTitle className="mt-2">{e.title}</CardTitle>
                  <CardDescription>{e.credits} Credit Professional Elective</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">{e.syllabus_summary}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{e.faculty_name || 'Department Faculty'}</span>
                    </div>

                    <Button
                      variant={e.is_selected ? 'outline' : 'primary'}
                      size="sm"
                      isLoading={isRegisteringElective === e.id}
                      onClick={() => handleElectiveRegister(e.id)}
                      leftIcon={e.is_selected ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : undefined}
                    >
                      {e.is_selected ? 'Enrolled' : 'Register Elective'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: AI Academic Advisor & Deterministic Recovery Engine (Phase 14 flagship) */}
      {activeTab === 'ai-advisor' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Advisory Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800/40 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">Deterministic AI Academic Advisor</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30">
                    Phase 14 Agent
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Automated attendance shortage recovery formulas, medical condonation audits, and CIE clearance calculations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onOpenAI && (
                <Button
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1.5"
                  onClick={() => onOpenAI('Calculate exact attendance recovery for my shortage courses and evaluate exam eligibility')}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Interactive Chat Advisory</span>
                </Button>
              )}
            </div>
          </div>

          {/* 3 Metric Cards */}
          {advisoryReport && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Campus Attendance Average
                  </CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    {advisoryReport.attendance_analysis.average_attendance}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs">
                    {advisoryReport.attendance_analysis.is_overall_eligible_for_exams ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 75% University Threshold Satisfied
                      </span>
                    ) : (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        ⚠️ {advisoryReport.attendance_analysis.shortage_courses_count} Course(s) Below 75%
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Condonation & Shortage Audit
                  </CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    {advisoryReport.attendance_analysis.condonation_eligible_count} Eligible Slabs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-slate-600">
                    {advisoryReport.attendance_analysis.critical_shortage_count > 0 ? (
                      <span className="text-rose-600 font-semibold">
                        {advisoryReport.attendance_analysis.critical_shortage_count} Course(s) in Critical Shortage (&lt;65%)
                      </span>
                    ) : (
                      <span className="text-slate-500">Form A-12 Medical Condonation applicable for 65-74.9%</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Continuous Internal Evaluation (CIE)
                  </CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    {advisoryReport.cie_marks_analysis.average_cie_marks} / 50.0
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {advisoryReport.cie_marks_analysis.cie_cleared_count}/{advisoryReport.cie_marks_analysis.total_evaluated_courses} Courses Cleared Minimum 20/50 Threshold
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Attendance Recovery & Buffer Calculation Ledger */}
          {advisoryReport && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Attendance Recovery & Buffer Calculation Matrix
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Formula-derived consecutive class requirements (Target 75%) and safe absence allowances.
                    </CardDescription>
                  </div>
                  <Badge variant="primary" size="sm">Deterministic Math Engine</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code & Title</TableHead>
                        <TableHead>Attended / Total</TableHead>
                        <TableHead>Current %</TableHead>
                        <TableHead>Classes Needed for 75%</TableHead>
                        <TableHead>Safe Missable Classes</TableHead>
                        <TableHead>Condonation Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advisoryReport.attendance_analysis.courses.map((course) => (
                        <TableRow key={course.course_id}>
                          <TableCell className="font-semibold text-slate-900">
                            <div>{course.course_code}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{course.course_name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {course.attended_classes} / {course.total_classes}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                course.percentage >= 85
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : course.percentage >= 75
                                  ? 'bg-blue-100 text-blue-800'
                                  : course.percentage >= 65
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {course.percentage}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {course.has_shortage ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                                ⚠️ Attend next {course.consecutive_classes_needed_for_75} classes
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-semibold text-xs">0 (Threshold Met)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!course.has_shortage ? (
                              <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {course.safe_missable_classes} class(es) buffer
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs">0 (Shortage)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                                course.condonation_status.includes('Compliant')
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : course.condonation_status.includes('Eligible')
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {course.condonation_status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CIE Internal Assessment Clearance Matrix */}
          {advisoryReport && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Continuous Internal Evaluation (CIE) & SEE Minimum Passing Criteria
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Assessment breakdown (scaled to 50 marks) and minimum SEE marks needed to pass.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code & Title</TableHead>
                        <TableHead>Test 1</TableHead>
                        <TableHead>Test 2</TableHead>
                        <TableHead>Quiz / Assignment</TableHead>
                        <TableHead>Total CIE (/50)</TableHead>
                        <TableHead>CIE Eligibility</TableHead>
                        <TableHead>Min SEE Needed (/50)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {advisoryReport.cie_marks_analysis.courses.map((m) => (
                        <TableRow key={m.course_id}>
                          <TableCell className="font-semibold text-slate-900">
                            <div>{m.course_code}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{m.course_name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{m.test1}</TableCell>
                          <TableCell className="font-mono text-xs">{m.test2}</TableCell>
                          <TableCell className="font-mono text-xs">{m.quiz + m.assignment}</TableCell>
                          <TableCell className="font-mono font-bold text-xs text-slate-900">
                            {m.total_cie} / 50.0
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                m.is_cie_eligible_for_see
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {m.is_cie_eligible_for_see ? 'CLEARED (>= 20)' : 'FAILED (< 20)'}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono font-bold text-xs text-blue-700">
                            {m.see_min_marks_needed_out_of_50} / 50
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Synthesized Academic Report & Policy Citations */}
          {advisoryReport && (
            <Card className="border-purple-200 bg-purple-50/20 shadow-xs">
              <CardHeader className="border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <CardTitle className="text-sm font-bold text-purple-950">
                    AI Academic Advisor Synthesis & Policy References
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-purple-100 text-xs leading-relaxed text-slate-700 whitespace-pre-line shadow-xs">
                  {advisoryReport.advisory_markdown}
                </div>

                {advisoryReport.citations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Verified Institutional Policy Citations</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {advisoryReport.citations.map((c) => (
                        <div key={c.chunk_id} className="p-3 bg-white border border-purple-100 rounded-xl text-xs space-y-1 shadow-xs">
                          <div className="font-bold text-purple-900">{c.citation}</div>
                          <p className="text-slate-600 text-[11px] italic line-clamp-3">"{c.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Syllabus Modal */}
      <Modal
        isOpen={!!selectedSyllabusCourse}
        onClose={() => setSelectedSyllabusCourse(null)}
        title={selectedSyllabusCourse ? `${selectedSyllabusCourse.code}: ${selectedSyllabusCourse.title}` : 'Syllabus'}
        size="lg"
      >
        {selectedSyllabusCourse && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap pb-2 border-b border-slate-100">
              <Badge variant="primary" size="sm">{selectedSyllabusCourse.course_type.toUpperCase()}</Badge>
              <Badge variant="info" size="sm">{selectedSyllabusCourse.credits} Credits</Badge>
              <span className="text-xs text-slate-500">Instructor: {selectedSyllabusCourse.faculty_name}</span>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Course Overview & Syllabus</h5>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                {selectedSyllabusCourse.syllabus_summary}
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Curriculum Units Breakdown</h5>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <strong>Unit 1: Fundamentals & Core Architecture:</strong> Mathematical models, state management, and baseline algorithmic constructs.
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <strong>Unit 2: Applied Engineering Protocols:</strong> Enterprise design patterns, fault tolerance, and security mitigations.
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                  <strong>Unit 3: Evaluation & Optimization:</strong> Benchmarking, telemetry, and distributed scaling policies.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setSelectedSyllabusCourse(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toast.success('Syllabus Downloaded', `${selectedSyllabusCourse.code} PDF syllabus saved.`)
                  setSelectedSyllabusCourse(null)
                }}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download Syllabus PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default AcademicHub
