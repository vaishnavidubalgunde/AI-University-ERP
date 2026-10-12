import { useState, useEffect } from 'react'
import ERPLayout from './components/layout/ERPLayout'
import StudentDashboard from './components/dashboard/StudentDashboard'
import AcademicHub from './components/academics/AcademicHub'
import ExamHub from './components/exams/ExamHub'
import FinanceNoticeHub from './components/finance/FinanceNoticeHub'
import PlacementGrievanceHub from './components/placements/PlacementGrievanceHub'
import AdminManagementHub from './components/admin/AdminManagementHub'
import FacultyHub from './components/faculty/FacultyHub'
import UniversityDataHub from './components/admin/UniversityDataHub'
import KnowledgeBaseHub from './components/admin/KnowledgeBaseHub'
import AIAssistantDrawer from './components/ai/AIAssistantDrawer'
import AIAssistantHub from './components/ai/AIAssistantHub'
import UniversityAIAssistantPage from './components/ai/UniversityAIAssistantPage'
import DocumentLibraryView from './components/ai/DocumentLibraryView'

import Button from './components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/Card'
import Input from './components/ui/Input'
import Select from './components/ui/Select'
import Badge from './components/ui/Badge'
import Modal from './components/ui/Modal'
import StatsCard from './components/ui/StatsCard'
import AlertBanner from './components/ui/AlertBanner'
import Tabs from './components/ui/Tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/Table'
import LoadingState from './components/ui/LoadingState'
import ErrorState from './components/ui/ErrorState'
import EmptyState from './components/ui/EmptyState'
import LoginPage from './components/auth/LoginPage'
import useAuth from './context/useAuth'
import useToast from './context/useToast'
import { systemService, HealthCheckResponse } from './services/api'
import {
  GraduationCap,
  Sparkles,
  Award,
  CalendarCheck,
  CreditCard,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Layers,
  Code2,
  Sliders,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
  Calendar,
  Briefcase,
  Globe,
  Database,
  Users,
  Clock
} from 'lucide-react'
import { UserRole } from './types/auth'

type ShowcaseTab = 'kpi' | 'auth' | 'primitives' | 'states' | 'api'

export function App() {
  const { user, isAuthenticated, isLoading: isAuthLoading, logout, demoLogin } = useAuth()
  const toast = useToast()

  const [currentPath, setCurrentPath] = useState<string>('dashboard')
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<ShowcaseTab>('kpi')
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false)
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false)
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string>('')
  const [isButtonLoading, setIsButtonLoading] = useState(false)

  // Form states
  const [demoInput, setDemoInput] = useState('')
  const [demoSelect, setDemoSelect] = useState('CSE')

  // Backend health status state
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null)
  const [isHealthLoading, setIsHealthLoading] = useState<boolean>(true)
  const [healthError, setHealthError] = useState<string | null>(null)

  const checkHealth = async () => {
    setIsHealthLoading(true)
    setHealthError(null)
    try {
      const data = await systemService.getHealth()
      setHealthData(data)
      toast.success('Backend Connected', `FastAPI service online (${data.version})`)
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Backend unreachable'
      setHealthError(errMsg)
      toast.error('Connection Failed', errMsg)
    } finally {
      setIsHealthLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    systemService.getHealth()
      .then((data) => {
        if (isMounted) {
          setHealthData(data)
          setHealthError(null)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const errMsg = err instanceof Error ? err.message : 'Backend unreachable'
          setHealthError(errMsg)
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsHealthLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  // If verifying authentication on first load
  if (isAuthLoading) {
    return <LoadingState message="Verifying session token..." fullScreen />
  }

  // If not logged in, render the University Login Portal
  if (!isAuthenticated || !user) {
    return <LoginPage />
  }

  const sampleModules = [
    { id: '1', name: 'Authentication & RBAC', phase: 'Phase 3', status: 'Completed', category: 'Security' },
    { id: '2', name: 'SQLAlchemy Database Models', phase: 'Phase 4', status: 'Completed', category: 'Database' },
    { id: '3', name: 'Student Dashboard & KPI Meters', phase: 'Phase 5', status: 'Active (Current)', category: 'Core ERP' },
    { id: '4', name: 'Academic Course Catalog', phase: 'Phase 6', status: 'Ready to Build', category: 'Core ERP' },
    { id: '5', name: 'RAG Vector Pipeline (FAISS)', phase: 'Phase 11', status: 'Engine Spec Ready', category: 'AI Subsystem' },
  ]

  const handleRoleSwitch = async (role: UserRole) => {
    try {
      await demoLogin(role)
      setCurrentPath('dashboard')
      toast.success('Role Switched', `Active user is now ${role.toUpperCase()}`)
    } catch {
      toast.error('Switch Failed', 'Could not switch demo user')
    }
  }

  const handleOpenAiWithPrompt = (prompt?: string) => {
    if (prompt) setAiInitialPrompt(prompt)
    setIsAiDrawerOpen(true)
  }

  return (
    <ERPLayout
      currentPath={currentPath}
      onNavigate={setCurrentPath}
      breadcrumbs={
        user.role === 'faculty'
          ? currentPath === 'dashboard' || currentPath === 'faculty'
            ? ['Faculty Portal', 'Academic & Teaching Command Center']
            : currentPath === 'students'
              ? ['Faculty Workspace', 'Student Directory & 360° Profile']
              : currentPath === 'attendance'
                ? ['Faculty Workspace', 'Class Attendance Management']
                : currentPath === 'marks' || currentPath === 'academics'
                  ? ['Faculty Academics', 'CIE Marks Entry & Curriculum']
                  : currentPath === 'timetable'
                    ? ['Faculty Teaching', 'Lecture & Lab Timetable']
                    : currentPath === 'exams'
                      ? ['Faculty Examination', 'Invigilation Duties & Schedules']
                      : currentPath === 'notices' || currentPath === 'documents' || currentPath === 'fees'
                        ? ['Faculty Registry', 'Institutional Circulars & Documents']
                        : currentPath === 'grievances'
                          ? ['Student Redressal', 'Faculty Grievance Desk']
                          : ['Faculty Workspace', currentPath.charAt(0).toUpperCase() + currentPath.slice(1)]
          : user.role === 'admin'
            ? currentPath === 'dashboard' || currentPath === 'admin'
              ? ['University Governance', 'Executive KPI & Intelligence']
              : currentPath === 'students'
                ? ['University Registry', 'Student & User Management']
                : currentPath === 'academics' || currentPath === 'attendance'
                  ? ['Academic Operations', 'Curriculum & Attendance Analytics']
                  : currentPath === 'exams' || currentPath === 'timetable'
                    ? ['Examination Division', 'Exam Controller & Schedules']
                    : currentPath === 'fees'
                      ? ['Finance Division', 'Fee Structure & Collection Ledgers']
                      : currentPath === 'notices' || currentPath === 'documents'
                        ? ['University Communications', 'Publish Circulars & Documents']
                        : currentPath === 'data-sources'
                          ? ['Data Engineering', 'University Web Crawler & Ingestion']
                          : currentPath === 'knowledge-base'
                            ? ['AI Infrastructure', 'Knowledge Base & Vector Index']
                            : ['University Administration', currentPath.charAt(0).toUpperCase() + currentPath.slice(1)]
            : currentPath === 'dashboard'
              ? ['Student Portal', 'Academic Dashboard']
              : currentPath === 'academics' || currentPath === 'attendance'
                ? ['Academic Affairs', 'Curriculum & Evaluation']
                : currentPath === 'exams' || currentPath === 'timetable'
                  ? ['Examination Division', 'Timetable & Hall Tickets']
                  : currentPath === 'fees' || currentPath === 'notices' || currentPath === 'documents'
                    ? ['Accounts & Registry', 'Finance, Circulars & Credentials']
                    : currentPath === 'placements' || currentPath === 'grievances' || currentPath === 'applications'
                      ? ['Corporate Relations & Support', 'Placements & Redressal']
                      : currentPath === 'admin' || currentPath === 'students' || currentPath === 'settings'
                        ? ['University Governance', 'Executive Administration & RAG']
                        : currentPath === 'ai-assistant/documents' || currentPath === 'ai-documents'
                          ? ['Artificial Intelligence', 'Document Intelligence & RAG Library']
                          : currentPath === 'ai-assistant' || currentPath === 'ai-chat' || currentPath === 'ai'
                            ? ['Artificial Intelligence', 'ChatGPT-Style University Assistant']
                            : ['Core ERP', currentPath.charAt(0).toUpperCase() + currentPath.slice(1)]
      }
      isBackendHealthy={!!healthData && !healthError}
      onOpenAI={() => handleOpenAiWithPrompt()}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation View Switcher (Dashboard vs Academics vs Exams vs Fees vs Placements vs Admin vs AI vs Showcase) */}
        <div className="flex items-center justify-between bg-white border border-slate-200/80 rounded-2xl p-2 shadow-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {user.role === 'faculty' ? (
              <>
                <button
                  onClick={() => setCurrentPath('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'dashboard' || currentPath === 'faculty'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Faculty Dashboard</span>
                </button>

                <button
                  onClick={() => setCurrentPath('students')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'students'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Student Rosters</span>
                </button>

                <button
                  onClick={() => setCurrentPath('attendance')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'attendance'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Mark Attendance</span>
                </button>

                <button
                  onClick={() => setCurrentPath('marks')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'marks'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>CIE Marks Entry</span>
                </button>

                <button
                  onClick={() => setCurrentPath('timetable')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'timetable'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Teaching Timetable</span>
                </button>

                <button
                  onClick={() => setCurrentPath('exams')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'exams'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Exam Duty</span>
                </button>

                <button
                  onClick={() => setCurrentPath('notices')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'notices' || currentPath === 'documents'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Notices & Circulars</span>
                </button>
              </>
            ) : user.role === 'admin' ? (
              <>
                <button
                  onClick={() => setCurrentPath('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'dashboard' || currentPath === 'admin'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Admin Dashboard</span>
                </button>

                <button
                  onClick={() => setCurrentPath('students')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'students'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>User Registry</span>
                </button>

                <button
                  onClick={() => setCurrentPath('academics')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'academics'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Academic Operations</span>
                </button>

                <button
                  onClick={() => setCurrentPath('attendance')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'attendance'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Attendance Analytics</span>
                </button>

                <button
                  onClick={() => setCurrentPath('exams')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'exams'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Exam Controller</span>
                </button>

                <button
                  onClick={() => setCurrentPath('fees')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'fees'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Finance & Fees</span>
                </button>

                <button
                  onClick={() => setCurrentPath('data-sources')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'data-sources'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Data Crawler</span>
                </button>

                <button
                  onClick={() => setCurrentPath('knowledge-base')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'knowledge-base'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>Knowledge Base</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setCurrentPath('dashboard')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'dashboard'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard (Phase 5)</span>
                </button>

                <button
                  onClick={() => setCurrentPath('academics')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'academics' || currentPath === 'attendance'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Academics (Phase 6)</span>
                </button>

                <button
                  onClick={() => setCurrentPath('exams')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'exams' || currentPath === 'timetable'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Exams (Phase 7)</span>
                </button>

                <button
                  onClick={() => setCurrentPath('fees')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'fees' || currentPath === 'notices' || currentPath === 'documents'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Fees & Circulars (Phase 8)</span>
                </button>

                <button
                  onClick={() => setCurrentPath('placements')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    currentPath === 'placements' || currentPath === 'grievances' || currentPath === 'applications'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Placements (Phase 9)</span>
                </button>
              </>
            )}

            <button
              onClick={() => setCurrentPath('ai-chat')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                currentPath === 'ai-chat' || currentPath === 'ai' || currentPath === 'ai-assistant'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Assistant</span>
            </button>
          </div>

          {/* Quick Demo Role Switcher */}
          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Role:</span>
            <button
              onClick={() => handleRoleSwitch('student')}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                user.role === 'student' ? 'bg-blue-100 text-blue-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Student
            </button>
            <button
              onClick={() => handleRoleSwitch('faculty')}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                user.role === 'faculty' ? 'bg-purple-100 text-purple-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Faculty
            </button>
            <button
              onClick={() => handleRoleSwitch('admin')}
              className={`px-2 py-1 rounded-lg text-xs font-bold ${
                user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Admin
            </button>
          </div>
        </div>

        {/* View 1: Role-Specific Dashboard Switcher */}
        {currentPath === 'dashboard' && (
          user.role === 'faculty' ? (
            <FacultyHub initialTab="overview" onOpenAI={handleOpenAiWithPrompt} />
          ) : user.role === 'admin' ? (
            <AdminManagementHub initialTab="analytics" onOpenAI={handleOpenAiWithPrompt} />
          ) : (
            <StudentDashboard
              onOpenAI={handleOpenAiWithPrompt}
              onNavigateTab={setCurrentPath}
            />
          )
        )}

        {/* Faculty Portal Dedicated Views */}
        {currentPath === 'faculty' && (
          <FacultyHub initialTab="overview" onOpenAI={handleOpenAiWithPrompt} />
        )}
        {user.role === 'faculty' && currentPath === 'attendance' && (
          <FacultyHub initialTab="attendance" onOpenAI={handleOpenAiWithPrompt} />
        )}
        {user.role === 'faculty' && currentPath === 'marks' && (
          <FacultyHub initialTab="academics" onOpenAI={handleOpenAiWithPrompt} />
        )}
        {user.role === 'faculty' && currentPath === 'students' && (
          <FacultyHub initialTab="students" onOpenAI={handleOpenAiWithPrompt} />
        )}
        {user.role === 'faculty' && currentPath === 'timetable' && (
          <FacultyHub initialTab="schedule" onOpenAI={handleOpenAiWithPrompt} />
        )}
        {user.role === 'faculty' && currentPath === 'grievances' && (
          <FacultyHub initialTab="grievances" onOpenAI={handleOpenAiWithPrompt} />
        )}

        {/* View 1.8: University Data Ingestion & Public Crawler */}
        {currentPath === 'data-sources' && (
          <UniversityDataHub />
        )}

        {/* View 1.9: University Knowledge Base & Vector Index */}
        {currentPath === 'knowledge-base' && (
          <KnowledgeBaseHub />
        )}

        {/* View 2: Academic Curriculum & Evaluation Hub */}
        {(currentPath === 'academics' || (user.role === 'student' && currentPath === 'attendance')) && (
          user.role === 'faculty' ? (
            <FacultyHub initialTab="academics" onOpenAI={handleOpenAiWithPrompt} />
          ) : user.role === 'admin' ? (
            <AdminManagementHub initialTab="academic_analytics" onOpenAI={handleOpenAiWithPrompt} />
          ) : (
            <AcademicHub
              initialTab={currentPath === 'attendance' ? 'attendance' : 'courses'}
              onOpenAI={handleOpenAiWithPrompt}
            />
          )
        )}

        {/* View 3: Timetable & Examinations Hub */}
        {(currentPath === 'exams' || (user.role !== 'faculty' && currentPath === 'timetable')) && (
          <ExamHub
            initialTab={currentPath === 'timetable' ? 'timetable' : 'schedules'}
            onOpenAI={handleOpenAiWithPrompt}
          />
        )}

        {/* View 4: Finance, Notices & Credentials Hub */}
        {(currentPath === 'fees' || currentPath === 'notices' || currentPath === 'documents') && (
          user.role === 'admin' && currentPath === 'fees' ? (
            <AdminManagementHub initialTab="fee_analytics" onOpenAI={handleOpenAiWithPrompt} />
          ) : (
            <FinanceNoticeHub
              initialTab={currentPath === 'notices' ? 'notices' : currentPath === 'documents' ? 'documents' : 'fees'}
              onOpenAI={handleOpenAiWithPrompt}
            />
          )
        )}

        {/* View 5: Placement Drives & Grievance Redressal */}
        {(currentPath === 'placements' || (user.role === 'student' && (currentPath === 'grievances' || currentPath === 'applications'))) && (
          <PlacementGrievanceHub
            initialTab={currentPath === 'grievances' ? 'grievances' : currentPath === 'applications' ? 'my-apps' : 'drives'}
            onOpenAI={handleOpenAiWithPrompt}
          />
        )}

        {/* View 6: Administration & Institutional Governance Hub */}
        {(currentPath === 'admin' || (user.role === 'admin' && (currentPath === 'students' || currentPath === 'settings'))) && (
          <AdminManagementHub
            initialTab={currentPath === 'students' ? 'students' : 'analytics'}
            onOpenAI={handleOpenAiWithPrompt}
          />
        )}

        {/* View 7: Dedicated AI Assistant Hub & Multi-Source Document Intelligence */}
        {(currentPath === 'ai-assistant' || currentPath === 'ai-chat' || currentPath === 'ai') && (
          <UniversityAIAssistantPage />
        )}

        {/* View 7.5: University Document Intelligence Library */}
        {(currentPath === 'ai-assistant/documents' || currentPath === 'ai-documents') && (
          <DocumentLibraryView
            onSelectDocumentForChat={(docId, docTitle) => {
              setCurrentPath('ai-assistant')
            }}
            onNavigateToChat={() => setCurrentPath('ai-assistant')}
          />
        )}


        {/* View 2: Design System & Backend Contract Showcase */}
        {currentPath === 'showcase' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Phase Header Hero Banner */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold tracking-tight">AI-Integrated University ERP Portal</h1>
                    <Badge variant="success" size="sm" dot>Phase 5 Active</Badge>
                    <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'faculty' ? 'purple' : 'info'} size="sm">
                      {user.role.toUpperCase()} MODE
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Authenticated as <strong className="text-white">{user.full_name}</strong> ({user.email}) • Department of {user.department || 'Computer Science'}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  leftIcon={<LogOut className="w-3.5 h-3.5 text-rose-400" />}
                >
                  Sign Out
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={checkHealth}
                  isLoading={isHealthLoading}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  API Status
                </Button>
              </div>
            </div>

            {/* System Announcements & Alerts */}
            <AlertBanner
              variant="success"
              title="Phase 5 Active: Student Dashboard & Real-Time KPI Meters"
              action={{
                label: 'Switch to Student View',
                onClick: () => setCurrentPath('dashboard'),
              }}
            >
              Direct FastAPI integration, attendance shortage alert calculation, exam timetable sync, and AI insights are fully connected.
            </AlertBanner>

            {/* Showcase Tab Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <Tabs<ShowcaseTab>
                tabs={[
                  { id: 'kpi', label: 'Academic KPI Widgets', icon: <Layers className="w-3.5 h-3.5" />, badge: '4' },
                  { id: 'auth', label: 'Session & RBAC Claims', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
                  { id: 'primitives', label: 'UI Tokens & Primitives', icon: <Sliders className="w-3.5 h-3.5" /> },
                  { id: 'states', label: 'Interactive States & Overlays', icon: <Code2 className="w-3.5 h-3.5" /> },
                  { id: 'api', label: 'FastAPI Backend Contract', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                ]}
                activeTab={activeShowcaseTab}
                onChange={setActiveShowcaseTab}
                variant="segmented"
                size="md"
              />

              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Press</span>
                <kbd className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono shadow-2xs">⌘K</kbd>
                <span>for quick search</span>
              </div>
            </div>

            {/* Tab 1: KPI Widgets */}
            {activeShowcaseTab === 'kpi' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatsCard
                    title="Current Cumulative GPA"
                    value="9.24 / 10.0"
                    icon={Award}
                    iconColor="purple"
                    trend={{ value: '+0.18 vs Sem 5', direction: 'up' }}
                    subtitle="Top 5% of CSE Dept"
                  />

                  <StatsCard
                    title="Overall Attendance"
                    value="88.5%"
                    icon={CalendarCheck}
                    iconColor="emerald"
                    progress={{ current: 177, max: 200, label: 'Attended Classes' }}
                    badge="Eligible"
                  />

                  <StatsCard
                    title="Earned Credits"
                    value="132 / 160"
                    icon={BookOpen}
                    iconColor="blue"
                    progress={{ current: 132, max: 160, label: 'Degree Completion', color: 'bg-blue-600' }}
                  />

                  <StatsCard
                    title="Fee Clearance"
                    value="₹ 0.00"
                    icon={CreditCard}
                    iconColor="emerald"
                    trend={{ value: 'No Outstanding Dues', direction: 'neutral' }}
                    badge="Paid"
                  />
                </div>
              </div>
            )}

            {/* Tab 2: Session & RBAC Claims */}
            {activeShowcaseTab === 'auth' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <Card>
                  <CardHeader>
                    <CardTitle>Current Session Profile & JWT Claims</CardTitle>
                    <CardDescription>Decoded security claims from authenticated FastAPI session</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider">User Identity</h5>
                        <div className="text-xs space-y-1 text-slate-700">
                          <p><strong>Full Name:</strong> {user.full_name}</p>
                          <p><strong>Email Address:</strong> {user.email}</p>
                          <p><strong>University Role:</strong> <span className="font-bold text-blue-600 uppercase">{user.role}</span></p>
                          <p><strong>Department:</strong> {user.department || 'Not Assigned'}</p>
                          {user.student_id && <p><strong>Student USN:</strong> {user.student_id}</p>}
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Access Rights & Permissions</h5>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200">
                            <span>View Academic Records</span>
                            <Badge variant="success" size="sm">Allowed</Badge>
                          </div>
                          <div className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200">
                            <span>AI Student Assistant Query</span>
                            <Badge variant="success" size="sm">Allowed</Badge>
                          </div>
                          <div className="flex items-center justify-between p-1.5 bg-white rounded-md border border-slate-200">
                            <span>Modify Official Grades</span>
                            <Badge variant={user.role === 'faculty' || user.role === 'admin' ? 'success' : 'danger'} size="sm">
                              {user.role === 'faculty' || user.role === 'admin' ? 'Allowed' : 'Denied'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab 3: Primitives & Tokens */}
            {activeShowcaseTab === 'primitives' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Buttons & Badges */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Buttons & Status Badges</CardTitle>
                      <CardDescription>Core interactive primitives with variant and size scales</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="primary" size="sm">Primary</Button>
                        <Button variant="secondary" size="sm">Secondary</Button>
                        <Button variant="outline" size="sm">Outline</Button>
                        <Button variant="ghost" size="sm">Ghost</Button>
                        <Button variant="danger" size="sm">Danger</Button>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={isButtonLoading}
                          onClick={() => {
                            setIsButtonLoading(true)
                            setTimeout(() => setIsButtonLoading(false), 1500)
                          }}
                        >
                          Click Loading
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form Inputs & Selects */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Form Elements & Selectors</CardTitle>
                      <CardDescription>Form controls with helper text and error states</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Input
                        label="Student University Serial Number (USN)"
                        placeholder="e.g. 1DT23CS238"
                        value={demoInput}
                        onChange={(e) => setDemoInput(e.target.value)}
                        helperText="Enter official 10-digit institutional identifier"
                      />

                      <Select
                        label="Academic Department"
                        value={demoSelect}
                        onChange={(e) => setDemoSelect(e.target.value)}
                        options={[
                          { value: 'CSE', label: 'Computer Science & Engineering' },
                          { value: 'ISE', label: 'Information Science & Engineering' },
                          { value: 'ECE', label: 'Electronics & Communication' },
                          { value: 'MECH', label: 'Mechanical Engineering' },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Table Component */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Academic Roadmap Ledger</CardTitle>
                        <CardDescription>Structured rows and action badges</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Module / Subsystem</TableHead>
                          <TableHead>Target Phase</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sampleModules.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-semibold text-slate-900">{m.name}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                                {m.phase}
                              </span>
                            </TableCell>
                            <TableCell className="text-slate-600">{m.category}</TableCell>
                            <TableCell>
                              <Badge variant="info" size="sm" dot>{m.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toast.info('Module Selected', m.name)}
                              >
                                Inspect
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Tab 4: Interactive States */}
            {activeShowcaseTab === 'states' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Toast Notification Triggers</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => toast.success('Operation Successful', 'Student record updated in database.')}
                      >
                        Trigger Success Toast
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        fullWidth
                        onClick={() => toast.warning('Fee Due Warning', 'Tuition deadline approaching in 3 days.')}
                      >
                        Trigger Warning Toast
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="p-4">
                    <LoadingState title="Fetching Academic Records" description="Synchronizing marks and attendance..." />
                  </Card>

                  <Card className="p-4">
                    <EmptyState
                      title="No Pending Grievances"
                      description="You have zero active support tickets or academic disputes."
                      action={{
                        label: 'Raise Grievance',
                        onClick: () => toast.info('Grievance Portal', 'Phase 9 module opening.'),
                      }}
                    />
                  </Card>
                </div>
              </div>
            )}

            {/* Tab 5: Backend Contract */}
            {activeShowcaseTab === 'api' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>FastAPI Backend Synchronization</CardTitle>
                        <CardDescription>Contract verification between FastAPI ASGI backend and React client</CardDescription>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={checkHealth}
                        isLoading={isHealthLoading}
                        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Refresh Healthcheck
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isHealthLoading ? (
                      <LoadingState title="Querying /api/health" />
                    ) : healthError ? (
                      <ErrorState
                        title="Backend Communication Error"
                        description={healthError}
                        onRetry={checkHealth}
                      />
                    ) : (
                      <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs space-y-2 border border-slate-800">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-emerald-400 font-bold">● GET /api/v1/health (200 OK)</span>
                          <span className="text-slate-400">{healthData?.timestamp}</span>
                        </div>
                        <pre className="text-slate-300 overflow-x-auto">
                          {JSON.stringify(healthData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Demo Interactive Modal */}
        <Modal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
          title="University ERP System Information"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              This interactive modal demonstrates the design system overlay layer.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsDemoModalOpen(false)}>
                Close Preview
              </Button>
            </div>
          </div>
        </Modal>

        {/* Phase 12 Flagship: Interactive Global AI Assistant Drawer */}
        <AIAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          initialPrompt={aiInitialPrompt}
          onClearInitialPrompt={() => setAiInitialPrompt('')}
        />
      </div>
    </ERPLayout>
  )
}

export default App
