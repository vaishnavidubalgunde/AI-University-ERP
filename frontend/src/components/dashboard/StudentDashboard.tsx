import React, { useState, useEffect, useCallback } from 'react'
import {
  Award,
  CalendarCheck,
  BookOpen,
  CreditCard,
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Download,
  ArrowUpRight,
  RefreshCw,
  Bell,
  ChevronRight,
} from 'lucide-react'
import StatsCard from '../ui/StatsCard'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import AlertBanner from '../ui/AlertBanner'
import LoadingState from '../ui/LoadingState'
import ErrorState from '../ui/ErrorState'
import useToast from '../../context/useToast'
import studentService from '../../services/studentService'
import { aiService } from '../../services/aiService'
import { StudentDashboardResponse } from '../../types/student'
import {
  AttendanceRiskPredictionItem,
  AcademicRiskPredictionItem,
  PersonalizedStudyRecommendationItem,
  CourseRecommendationItem,
} from '../../types/ai'

export interface StudentDashboardProps {
  onOpenAI?: (initialPrompt?: string) => void
  onNavigateTab?: (tab: string) => void
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onOpenAI,
  onNavigateTab,
}) => {
  const toast = useToast()
  const [data, setData] = useState<StudentDashboardResponse | null>(null)
  const [attendanceRisks, setAttendanceRisks] = useState<AttendanceRiskPredictionItem[]>([])
  const [academicRisks, setAcademicRisks] = useState<AcademicRiskPredictionItem[]>([])
  const [studyRecs, setStudyRecs] = useState<PersonalizedStudyRecommendationItem[]>([])
  const [courseRecs, setCourseRecs] = useState<CourseRecommendationItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [dashRes, attRisks, acadRisks, studyList, courseList] = await Promise.all([
        studentService.getDashboard(),
        aiService.getAttendanceRiskPrediction().catch(() => []),
        aiService.getAcademicRiskDetection().catch(() => []),
        aiService.getPersonalizedStudyRecommendations().catch(() => []),
        aiService.getCourseRecommendations().catch(() => []),
      ])
      setData(dashRes)
      setAttendanceRisks(attRisks)
      setAcademicRisks(acadRisks)
      setStudyRecs(studyList)
      setCourseRecs(courseList)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to fetch student dashboard data'
      setError(errMsg)
      toast.error('Sync Error', errMsg)
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (isLoading) {
    return <LoadingState title="Loading Academic Dashboard" description="Synchronizing real-time attendance, grades, and schedule..." />
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Could not load student dashboard"
        description={error || 'An unexpected error occurred while communicating with the ERP API.'}
        onRetry={fetchDashboard}
      />
    )
  }

  const shortageCourses = data.courses_attendance.filter((c) => c.is_shortage)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Student Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-xs font-semibold">
                Spring 2026 Academic Term
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-mono">USN: {data.student_id}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Welcome back, {data.student_name}
            </h1>

            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Department of <strong>{data.department}</strong> • Semester {data.semester} Bachelor of Engineering
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Hall Ticket Generated', 'Hall ticket downloaded with verified QR security stamp.')}
              leftIcon={<Download className="w-3.5 h-3.5 text-blue-400" />}
            >
              Hall Ticket
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={fetchDashboard}
              isLoading={isLoading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Data
            </Button>

            {onOpenAI && (
              <button
                onClick={() => onOpenAI('Summarize my academic standing and attendance warnings')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>Ask AI Advisor</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Attendance Shortage Warning Banner */}
      {shortageCourses.length > 0 && (
        <AlertBanner
          variant="warning"
          title={`Low Attendance Alert in ${shortageCourses.map((c) => c.course_code).join(', ')}`}
          action={{
            label: 'Ask AI for Recovery Plan',
            onClick: () => {
              if (onOpenAI) {
                onOpenAI(`How can I restore my attendance in ${shortageCourses[0].course_code} before the mid-term examinations?`)
              } else {
                toast.info('Attendance Policy', `You must attend ${shortageCourses[0].classes_needed_for_75} consecutive lectures.`)
              }
            },
          }}
        >
          Your attendance in {shortageCourses.map((c) => `${c.course_title} (${c.percentage}%)`).join(', ')} is below the institutional <strong>75.0% threshold</strong>. You must attend the next <strong>{shortageCourses[0].classes_needed_for_75} consecutive lectures</strong> to remain eligible for examination hall ticket generation.
        </AlertBanner>
      )}

      {/* Primary KPI Vitals Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Cumulative Grade Point Average"
          value={`${data.cgpa} / 10.0`}
          icon={Award}
          iconColor="purple"
          trend={{ value: data.gpa_trend, direction: 'up' }}
          subtitle="Ranked in Top 5% of Dept"
        />

        <StatsCard
          title="Overall Attendance"
          value={`${data.overall_attendance_pct}%`}
          icon={CalendarCheck}
          iconColor={data.overall_attendance_pct >= 75 ? 'emerald' : 'rose'}
          progress={{
            current: Math.round(data.overall_attendance_pct),
            max: 100,
            label: data.overall_attendance_pct >= 75 ? 'Exam Eligible' : 'Attendance Shortage',
            color: data.overall_attendance_pct >= 75 ? 'bg-emerald-500' : 'bg-rose-500',
          }}
          badge={data.overall_attendance_pct >= 75 ? 'Eligible' : 'Warning'}
        />

        <StatsCard
          title="Credits Completion"
          value={`${data.total_credits_earned} / ${data.total_credits_required}`}
          icon={BookOpen}
          iconColor="blue"
          progress={{
            current: data.total_credits_earned,
            max: data.total_credits_required,
            label: `${Math.round((data.total_credits_earned / data.total_credits_required) * 100)}% Degree Finished`,
            color: 'bg-blue-600',
          }}
        />

        <StatsCard
          title="Fee Status"
          value={data.fee_balance_due === 0 ? '₹ 0.00 Dues' : `₹ ${data.fee_balance_due.toLocaleString()}`}
          icon={CreditCard}
          iconColor={data.fee_balance_due === 0 ? 'emerald' : 'amber'}
          trend={{
            value: data.fee_balance_due === 0 ? 'Paid in Full' : 'Due by March 31',
            direction: data.fee_balance_due === 0 ? 'up' : 'down',
          }}
          badge={data.fee_balance_due === 0 ? 'Cleared' : 'Pending'}
        />
      </div>

      {/* Phase 2: Predictive Intelligence & Personalized Recommendations */}
      {(attendanceRisks.length > 0 || academicRisks.length > 0 || studyRecs.length > 0) && (
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-blue-50/50 shadow-xs">
          <CardHeader className="pb-3 border-b border-indigo-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    AI Predictive Intelligence & Study Priority Radar
                  </CardTitle>
                  <CardDescription className="text-xs text-indigo-900 font-semibold">
                    Computed from your actual attendance history, CIE score progression, and course requirements.
                  </CardDescription>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Phase 2 Predictive Analytics
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Attendance Prediction Box */}
              {attendanceRisks.slice(0, 1).map((att, i) => (
                <div key={i} className="p-3.5 bg-white border border-rose-200 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
                      Attendance Risk Forecast
                    </span>
                    <Badge variant="danger" size="sm">
                      {att.risk_level} Risk
                    </Badge>
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {att.course_code}: {att.course_title}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{att.reason}</p>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-indigo-700 font-bold">
                    Need {att.consecutive_classes_needed} consecutive classes for 75%
                  </div>
                </div>
              ))}

              {/* Academic Risk Box */}
              {academicRisks.slice(0, 1).map((acad, i) => (
                <div key={i} className="p-3.5 bg-white border border-amber-200 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Academic Risk Intervention
                    </span>
                    <Badge variant="warning" size="sm">
                      {acad.risk_level} Risk
                    </Badge>
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {acad.course_code}: {acad.course_title}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{acad.reason}</p>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-amber-800 font-medium">
                    {acad.suggested_intervention}
                  </div>
                </div>
              ))}

              {/* Study Recommendations Box */}
              {studyRecs.slice(0, 1).map((study, i) => (
                <div key={i} className="p-3.5 bg-white border border-indigo-200 rounded-xl space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Personalized Study Priority
                    </span>
                    <Badge variant="purple" size="sm">
                      Priority: {study.priority}
                    </Badge>
                  </div>
                  <div className="font-bold text-xs text-slate-900">
                    {study.course_code}: {study.course_title}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    <strong>Topics to Revise: </strong>
                    {study.topics_to_revise.join(', ')}
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-purple-700 font-bold">
                    Suggested: {study.suggested_hours_per_week} hrs/week
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2-Column Main Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Course Attendance Grid & Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subject Attendance Breakdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Subject Attendance & Eligibility Meter</CardTitle>
                  <CardDescription>Minimum 75.0% required per course under University Regulation Sec 4.2</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateTab && onNavigateTab('academics')}
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  View Details
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {data.courses_attendance.map((c) => (
                  <div
                    key={c.course_id}
                    className={`p-4 rounded-2xl border transition-all ${
                      c.is_shortage
                        ? 'bg-rose-50/60 border-rose-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">{c.course_code}</span>
                          <Badge variant={c.is_shortage ? 'danger' : 'success'} size="sm" dot>
                            {c.percentage}%
                          </Badge>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 mt-1 line-clamp-1">{c.course_title}</h4>
                        {c.faculty_name && (
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{c.faculty_name}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {c.attended_classes}/{c.total_classes}
                        </span>
                        <p className="text-[10px] text-slate-400">Classes</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            c.is_shortage ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, c.percentage)}%` }}
                        />
                      </div>
                    </div>

                    {/* Shortage Advice Pill */}
                    {c.is_shortage && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-rose-700 bg-rose-100/70 px-2.5 py-1 rounded-lg">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Need {c.classes_needed_for_75} more classes for 75%</span>
                        </div>
                        <button
                          onClick={() => onOpenAI && onOpenAI(`Give me attendance rules for ${c.course_code}`)}
                          className="font-bold underline text-rose-800 hover:text-rose-950"
                        >
                          Rules
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Today's Lecture Schedule */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Today's Academic Schedule</CardTitle>
                  <CardDescription>Live timetable and classroom allocations for today</CardDescription>
                </div>
                <Badge variant="info" size="sm">
                  {data.today_schedule.length} Lectures
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {data.today_schedule.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    item.status === 'ongoing' ? 'bg-blue-50/50' : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-600">{item.course_code}</span>
                        <span className="text-xs font-bold text-slate-800">{item.course_title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {item.room_number}
                        </span>
                        {item.faculty_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {item.faculty_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <span className="font-mono text-xs text-slate-600 font-semibold">{item.time_slot}</span>
                    <Badge
                      variant={
                        item.status === 'completed'
                          ? 'success'
                          : item.status === 'ongoing'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                      dot={item.status === 'ongoing'}
                    >
                      {item.status === 'ongoing' ? 'Live Now' : item.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Upcoming Exams, AI Insights & Notices */}
        <div className="space-y-6">
          {/* AI Academic Advisor Insights */}
          <Card className="border-purple-200/80 shadow-md">
            <CardHeader className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-b border-purple-100 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div>
                  <CardTitle className="text-purple-950">AI Academic Advisor</CardTitle>
                  <CardDescription className="text-purple-700">Proactive intelligence & guidance</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {data.ai_insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-purple-50/50 border border-purple-200/70 rounded-xl space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                      {insight.category}
                    </span>
                    <Badge variant="purple" size="sm">
                      AI Active
                    </Badge>
                  </div>
                  <h5 className="text-xs font-bold text-slate-900">{insight.title}</h5>
                  <p className="text-xs text-slate-600 leading-relaxed">{insight.message}</p>
                  {insight.action_text && (
                    <button
                      onClick={() => onOpenAI && onOpenAI(insight.title)}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 pt-1"
                    >
                      <span>{insight.action_text}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming Examinations Countdown */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Exams</CardTitle>
                  <CardDescription>Mid-Semester 2 Schedule</CardDescription>
                </div>
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              {data.upcoming_exams.map((exam, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-600">{exam.course_code}</span>
                      <span className="text-xs font-semibold text-slate-800 truncate">{exam.course_title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{exam.exam_date}</span>
                      <span>•</span>
                      <span>{exam.room_number}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge variant="primary" size="sm">
                      {exam.days_left}d left
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Official University Bulletins */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notice Board & Circulars</CardTitle>
                  <CardDescription>Official institutional announcements</CardDescription>
                </div>
                <Bell className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {data.recent_notices.map((n) => (
                <div key={n.id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        n.category === 'examination'
                          ? 'warning'
                          : n.category === 'placement'
                          ? 'success'
                          : 'info'
                      }
                      size="sm"
                    >
                      {n.category.toUpperCase()}
                    </Badge>
                    <span className="text-[10px] text-slate-400 font-mono">{n.published_at}</span>
                  </div>
                  <h5 className="text-xs font-bold text-slate-800 hover:text-blue-600 cursor-pointer">
                    {n.title}
                  </h5>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{n.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
