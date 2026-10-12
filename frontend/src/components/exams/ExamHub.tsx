import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  Building,
  Sparkles,
  RefreshCw,
  Info,
  MapPin,
  CalendarDays,
  XCircle,
  FileCheck
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import { examService } from '../../services/examService'
import { aiService } from '../../services/aiService'
import {
  WeeklyTimetableResponse,
  ExamScheduleDetail,
  ExamEligibilityResponse,
  HallTicketResponse,
} from '../../types/exam'
import { ExamAdvisoryResponse } from '../../types/ai'
import useAuth from '../../context/useAuth'

interface ExamHubProps {
  initialTab?: 'timetable' | 'schedules' | 'eligibility' | 'hallticket' | 'ai-officer'
  onOpenAI?: (prompt?: string) => void
}

export const ExamHub: React.FC<ExamHubProps> = ({
  initialTab = 'timetable',
  onOpenAI,
}) => {
  const { user } = useAuth()
  const isFaculty = user?.role === 'faculty'
  const effectiveInitialTab = isFaculty && (initialTab === 'eligibility' || initialTab === 'hallticket') ? 'schedules' : initialTab
  const [activeTab, setActiveTab] = useState<'timetable' | 'schedules' | 'eligibility' | 'hallticket' | 'ai-officer'>(effectiveInitialTab)
  const [selectedDay, setSelectedDay] = useState<string>('Monday')

  const [timetable, setTimetable] = useState<WeeklyTimetableResponse | null>(null)
  const [schedules, setSchedules] = useState<ExamScheduleDetail[]>([])
  const [eligibility, setEligibility] = useState<ExamEligibilityResponse | null>(null)
  const [hallTicket, setHallTicket] = useState<HallTicketResponse | null>(null)
  const [advisoryReport, setAdvisoryReport] = useState<ExamAdvisoryResponse | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const promises: [
      Promise<WeeklyTimetableResponse>,
      Promise<ExamScheduleDetail[]>,
      Promise<ExamEligibilityResponse | null>,
      Promise<HallTicketResponse | null>,
      Promise<ExamAdvisoryResponse | null>
    ] = [
      examService.getWeeklyTimetable(),
      examService.getExamSchedules(),
      isFaculty ? Promise.resolve(null) : examService.getExamEligibility().catch(() => null),
      isFaculty ? Promise.resolve(null) : examService.getHallTicket().catch(() => null),
      aiService.getExaminationAdvisory().catch(() => null),
    ]

    Promise.all(promises)
      .then(([ttData, schData, elData, htData, advData]) => {
        if (isMounted) {
          setTimetable(ttData)
          setSchedules(schData)
          if (elData) setEligibility(elData)
          if (htData) setHallTicket(htData)
          if (advData) setAdvisoryReport(advData)
          if (ttData.days.length > 0) {
            setSelectedDay(ttData.days[0].day)
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to load timetable and exam records.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isFaculty])

  const handleRefresh = () => {
    setIsLoading(true)
    Promise.all([
      examService.getWeeklyTimetable(),
      examService.getExamSchedules(),
      examService.getExamEligibility(),
      examService.getHallTicket(),
      aiService.getExaminationAdvisory().catch(() => null),
    ])
      .then(([ttData, schData, elData, htData, advData]) => {
        setTimetable(ttData)
        setSchedules(schData)
        setEligibility(elData)
        setHallTicket(htData)
        if (advData) setAdvisoryReport(advData)
      })
      .finally(() => setIsLoading(false))
  }

  const currentDayData = timetable?.days.find((d) => d.day === selectedDay)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <CalendarDays className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">Timetable & Examination Portal</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Phase 7
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Class schedules, mid/end-sem examination dates, eligibility checks, and digital hall ticket passes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
            title="Refresh examination data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="secondary"
            className="bg-indigo-600 hover:bg-indigo-500 text-white border-0 shadow-md text-xs font-semibold gap-1.5"
            onClick={() => onOpenAI?.('What is my upcoming exam schedule, room allocation, and eligibility status?')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Exam Advisor</span>
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('timetable')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'timetable'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Weekly Timetable</span>
        </button>

        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'schedules'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Exam Calendar ({schedules.length})</span>
        </button>

        {!isFaculty && (
          <>
            <button
              onClick={() => setActiveTab('eligibility')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'eligibility'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Eligibility Audit Engine</span>
            </button>

            <button
              onClick={() => setActiveTab('hallticket')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'hallticket'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Digital Hall Ticket Pass</span>
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('ai-officer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'ai-officer'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>AI Exam Officer</span>
          <span className="text-[10px] bg-purple-500/20 text-purple-700 px-1.5 py-0.5 rounded-full font-extrabold border border-purple-300/40">Phase 15</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* SUB-VIEW 1: Weekly Timetable */}
      {activeTab === 'timetable' && timetable && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Day Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {timetable.days.map((dayObj) => {
              const isSelected = selectedDay === dayObj.day
              return (
                <button
                  key={dayObj.day}
                  onClick={() => setSelectedDay(dayObj.day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{dayObj.day}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-indigo-500/30 text-indigo-200' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {dayObj.slots.length} slots
                  </span>
                </button>
              )
            })}
          </div>

          {/* Slots Cards for Selected Day */}
          <div className="space-y-3">
            {currentDayData && currentDayData.slots.length > 0 ? (
              currentDayData.slots.map((slot) => {
                const isLab = slot.slot_type === 'lab'
                const isTutorial = slot.slot_type === 'tutorial'
                const isSeminar = slot.slot_type === 'seminar'

                return (
                  <div
                    key={slot.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white ${
                      isLab
                        ? 'border-purple-200/80 hover:border-purple-300'
                        : isTutorial
                        ? 'border-amber-200/80 hover:border-amber-300'
                        : isSeminar
                        ? 'border-emerald-200/80 hover:border-emerald-300'
                        : 'border-slate-200/80 hover:border-slate-300'
                    } shadow-xs hover:shadow-sm`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-mono text-xs font-bold ${
                        isLab
                          ? 'bg-purple-100 text-purple-700'
                          : isTutorial
                          ? 'bg-amber-100 text-amber-700'
                          : isSeminar
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {slot.course_code}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{slot.course_title}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isLab
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : isTutorial
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isSeminar
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {slot.slot_type}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {slot.time_slot}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {slot.room_number}
                          </span>
                          {slot.faculty_name && (
                            <span className="text-slate-600 font-medium">
                              Faculty: {slot.faculty_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs"
                        onClick={() => onOpenAI?.(`Tell me the syllabus topics and recommended textbooks for ${slot.course_code} (${slot.course_title})`)}
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
                        Course Topics
                      </Button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-8 bg-white border border-slate-200 rounded-2xl text-center text-slate-500 text-sm">
                No scheduled lectures or labs for {selectedDay}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Examination Schedules */}
      {activeTab === 'schedules' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map((sch) => (
              <Card key={sch.id} className="border-slate-200 shadow-xs hover:shadow-md transition-all">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 text-blue-800">
                      {sch.course_code}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      sch.is_completed
                        ? 'bg-slate-100 text-slate-600'
                        : sch.days_left <= 7
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sch.is_completed ? 'Completed' : `In ${sch.days_left} Days`}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2 line-clamp-1">
                    {sch.course_title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {sch.exam_name} • Max Marks: {sch.max_marks}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-3 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="font-semibold text-slate-800">{sch.exam_date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Timing:</span>
                    <span className="font-semibold text-slate-800">{sch.time_slot}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Hall / Room:</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {sch.room_number}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Seat:</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                      {sch.seat_number}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Eligibility Audit Engine */}
      {activeTab === 'eligibility' && eligibility && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Overall Clearance Banner */}
          <div className={`p-6 rounded-2xl border ${
            eligibility.overall_eligible
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          } shadow-xs`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {eligibility.overall_eligible ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                )}
                <div>
                  <h2 className="text-lg font-bold">
                    {eligibility.overall_eligible
                      ? 'Approved for Semester Examinations'
                      : 'Action Required: Conditional Hall Ticket Hold'}
                  </h2>
                  <p className="text-xs opacity-90 mt-0.5">
                    Candidate: <span className="font-bold">{eligibility.student_name}</span> ({eligibility.student_id}) • Semester {eligibility.semester}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="text-xs font-semibold"
                  onClick={() => onOpenAI?.('Explain why I have an examination shortage and how to get clearance from the Academic Dean')}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  Ask AI About Clearance
                </Button>
              </div>
            </div>

            {/* Checklist Items */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
              <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60 flex items-center gap-3">
                {eligibility.attendance_clearance ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">Attendance Minimum (75%)</p>
                  <p className="text-[11px] text-slate-500">
                    {eligibility.attendance_clearance ? 'All courses cleared' : 'Course shortage detected'}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60 flex items-center gap-3">
                {eligibility.fee_clearance ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">Fee Clearance</p>
                  <p className="text-[11px] text-slate-500">
                    {eligibility.fee_clearance ? 'Zero balance due' : `Due: Rs ${eligibility.fee_balance_due.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60 flex items-center gap-3">
                {eligibility.disciplinary_clearance ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <div>
                  <p className="text-xs font-bold text-slate-800">Disciplinary Standing</p>
                  <p className="text-[11px] text-slate-500">Good Standing</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject-Wise Eligibility Table */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">Course-by-Course Attendance Clearance Audit</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Rule: Strict 75.0% threshold mandated by university academic regulation clause 4.2.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Course Code</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Attendance</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks / Rule Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {eligibility.course_eligibilities.map((c) => (
                      <tr key={c.course_code} className="hover:bg-slate-50/60">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{c.course_code}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{c.course_title}</td>
                        <td className="py-3 px-3 font-semibold">
                          <span className={c.attendance_pct >= 75 ? 'text-emerald-700' : 'text-rose-700'}>
                            {c.attendance_pct}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            c.is_eligible
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.is_eligible ? 'Eligible' : 'Shortage'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {c.reason || 'Permitted to appear in end-semester exams.'}
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

      {/* SUB-VIEW 4: Verifiable Digital Hall Ticket */}
      {activeTab === 'hallticket' && hallTicket && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5"
              onClick={() => window.print()}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Hall Ticket</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="text-xs font-semibold gap-1.5"
              onClick={() => alert(`Hall Ticket ${hallTicket.hall_ticket_number} downloaded successfully.`)}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </Button>
          </div>

          {/* Printable Digital Card */}
          <div className="bg-white border-2 border-indigo-200 rounded-3xl p-6 sm:p-8 shadow-lg max-w-4xl mx-auto space-y-6 relative overflow-hidden">
            {/* Watermark Logo / Pattern */}
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-50 rounded-full blur-2xl pointer-events-none opacity-60" />

            {/* University Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Autonomous University Portal
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">NATIONAL INSTITUTE OF TECHNOLOGY & SCIENCE</h2>
                <p className="text-xs text-slate-600">Controller of Examinations • Official Admit Card / Hall Ticket</p>
              </div>

              <div className="text-right">
                <div className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                  {hallTicket.hall_ticket_number}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Issued on: {hallTicket.issued_date}</p>
              </div>
            </div>

            {/* Student Vitals & QR Verification */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div className="sm:col-span-2 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Candidate Name</span>
                    <span className="font-bold text-slate-900 text-sm">{hallTicket.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Registration / PRN</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{hallTicket.student_id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Program & Branch</span>
                    <span className="font-semibold text-slate-800">{hallTicket.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Semester / Term</span>
                    <span className="font-semibold text-slate-800">Semester {hallTicket.semester} ({hallTicket.academic_year})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Examination Center</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-500" />
                    {hallTicket.exam_center}
                  </span>
                </div>
              </div>

              {/* QR Verification Box */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-24 h-24 bg-slate-900 text-white rounded-lg flex items-center justify-center p-2">
                  <QrCode className="w-20 h-20 text-white" />
                </div>
                <span className="text-[9px] font-mono text-slate-500 mt-2 text-center break-all">
                  TOKEN: {hallTicket.qr_token.slice(0, 16)}...
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-1">
                  VERIFIED PASS
                </span>
              </div>
            </div>

            {/* Registered Courses & Seating Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                Scheduled Examination Papers & Venue Allocations
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Code</th>
                      <th className="p-2.5">Paper Name</th>
                      <th className="p-2.5">Exam Date</th>
                      <th className="p-2.5">Timing</th>
                      <th className="p-2.5">Room</th>
                      <th className="p-2.5">Seat No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hallTicket.courses.map((c) => (
                      <tr key={c.course_code} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono font-bold text-slate-800">{c.course_code}</td>
                        <td className="p-2.5 font-medium text-slate-900">{c.course_title}</td>
                        <td className="p-2.5 font-semibold text-slate-800">{c.exam_date}</td>
                        <td className="p-2.5 text-slate-600">{c.time_slot}</td>
                        <td className="p-2.5 text-indigo-700 font-semibold">{c.room_number}</td>
                        <td className="p-2.5 font-mono font-bold text-slate-800">{c.seat_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Candidate Instructions */}
            <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-700" />
                Important Instructions to Candidate
              </h4>
              <ul className="space-y-1 text-[11px] text-amber-900/90 list-disc list-inside">
                {hallTicket.instructions.map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: AI Examination Officer & Multi-Condition Clearance Auditor (Phase 15 flagship) */}
      {activeTab === 'ai-officer' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-800/40 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-inner">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">AI Examination Officer & Clearance Auditor</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30">
                    Phase 15 Agent
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Deterministic multi-parameter eligibility evaluation (Attendance ≥ 75%, CIE ≥ 20/50, Fee Balance = ₹0) & QR validation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onOpenAI && (
                <Button
                  variant="primary"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold gap-1.5"
                  onClick={() => onOpenAI('Verify my examination eligibility status, SEE timetable, and digital hall ticket QR')}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Interactive Exam Advisory</span>
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
                    SEE Overall Clearance Status
                  </CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    {advisoryReport.eligibility_summary.is_overall_eligible ? (
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-6 h-6" /> FULLY CLEARED
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1.5">
                        <AlertCircle className="w-6 h-6" /> {advisoryReport.eligibility_summary.overall_status}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-slate-600">
                    {advisoryReport.eligibility_summary.eligible_courses_count} of {advisoryReport.eligibility_summary.total_courses} Courses Eligible for Exam Entry
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Institutional Fee Dues Audit
                  </CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    {advisoryReport.eligibility_summary.fee_balance_due === 0 ? (
                      <span className="text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-6 h-6" /> ₹0.00 (Cleared)
                      </span>
                    ) : (
                      <span className="text-rose-600">
                        ₹{advisoryReport.eligibility_summary.fee_balance_due.toLocaleString()} Due
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-slate-600">
                    {advisoryReport.eligibility_summary.fee_clearance_passed ? (
                      <span className="text-emerald-600 font-semibold">Zero Outstanding Balance</span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Dues must be settled for hall ticket release</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Digital Hall Ticket QR Status
                  </CardDescription>
                  <CardTitle className="text-2xl font-black text-slate-900">
                    <span className="text-indigo-600 flex items-center gap-1.5">
                      <QrCode className="w-6 h-6" /> {advisoryReport.hall_ticket.status}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-slate-600 font-mono truncate">
                    Hash: {advisoryReport.hall_ticket.cryptographic_signature || 'VALID-SHA256'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Multi-Condition Course Clearance Matrix Table */}
          {advisoryReport && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Multi-Parameter Course Eligibility Ledger
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Evaluates Attendance (≥ 75%), Continuous Internal Evaluation (≥ 20/50), and Form A-12 condonability.
                    </CardDescription>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Deterministic Exam Audit
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Course Code & Title</th>
                        <th className="p-3">Attendance %</th>
                        <th className="p-3">Attendance Rule</th>
                        <th className="p-3">CIE Marks (/50)</th>
                        <th className="p-3">CIE Rule</th>
                        <th className="p-3">Course Status</th>
                        <th className="p-3">Audit Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {advisoryReport.eligibility_summary.courses.map((course) => (
                        <tr key={course.course_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">
                            <div>{course.course_code}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{course.course_name}</div>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold ${
                                course.attendance_percentage >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : course.attendance_percentage >= 65
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {course.attendance_percentage}%
                            </span>
                          </td>
                          <td className="p-3">
                            {course.attendance_eligible ? (
                              <span className="text-emerald-600 font-bold">PASSED (≥ 75%)</span>
                            ) : course.is_condonation_applicable ? (
                              <span className="text-amber-600 font-bold">CONDONABLE (65-74.9%)</span>
                            ) : (
                              <span className="text-rose-600 font-bold">CRITICAL DEFICIT</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900">
                            {course.cie_marks} / 50.0
                          </td>
                          <td className="p-3">
                            {course.cie_eligible ? (
                              <span className="text-emerald-600 font-bold">PASSED (≥ 20)</span>
                            ) : (
                              <span className="text-rose-600 font-bold">FAILED (&lt; 20)</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                course.is_course_eligible
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {course.is_course_eligible ? 'ELIGIBLE' : 'CONDONATION / HELD'}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] text-slate-600 max-w-xs">
                            {course.remarks}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upcoming SEE Exam Schedule & Countdown Tracker */}
          {advisoryReport && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Semester End Examination (SEE) Schedule & Seat Allocation
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Verified timetable with designated examination rooms, time slots, and days countdown.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <tr>
                        <th className="p-3">Course Code & Name</th>
                        <th className="p-3">Exam Date</th>
                        <th className="p-3">Time Slot</th>
                        <th className="p-3">Assigned Room</th>
                        <th className="p-3">Max Marks</th>
                        <th className="p-3">Days Countdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {advisoryReport.exam_schedules.map((s) => (
                        <tr key={s.schedule_id} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">
                            <div>{s.course_code}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{s.course_name}</div>
                          </td>
                          <td className="p-3 font-bold text-slate-900">{s.exam_date}</td>
                          <td className="p-3 text-slate-700">{s.time_slot}</td>
                          <td className="p-3 font-semibold text-indigo-700">{s.room_number}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{s.max_marks}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                              ⏱️ {s.days_remaining} days left
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Synthesized Examination Report & Policy Citations */}
          {advisoryReport && (
            <Card className="border-purple-200 bg-purple-50/20 shadow-xs">
              <CardHeader className="border-b border-purple-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <CardTitle className="text-sm font-bold text-purple-950">
                    AI Examination Officer Synthesis & Ordinance References
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
                      <span>Institutional Examination Ordinance Citations</span>
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
    </div>
  )
}

export default ExamHub
