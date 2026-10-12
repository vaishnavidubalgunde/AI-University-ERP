import React from 'react'
import {
  GraduationCap,
  LayoutDashboard,
  User,
  BookOpen,
  CalendarCheck,
  Award,
  FileSpreadsheet,
  Calendar,
  Clock,
  CreditCard,
  Bell,
  FileText,
  Briefcase,
  LifeBuoy,
  Bot,
  BrainCircuit,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Users,
  Globe,
  Database,
  ShieldCheck,
} from 'lucide-react'
import useAuth from '../../context/useAuth'

export interface SidebarProps {
  currentPath?: string
  onNavigate?: (path: string) => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string
  isAI?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = 'dashboard',
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user } = useAuth()
  const role = user?.role || 'student'

  const studentSections: NavSection[] = [
    {
      title: 'Core ERP',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Academics',
      items: [
        { id: 'subjects', label: 'Subjects', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'attendance', label: 'Attendance', icon: <CalendarCheck className="w-4 h-4" />, badge: '88%' },
        { id: 'marks', label: 'Internal Marks', icon: <Award className="w-4 h-4" /> },
        { id: 'results', label: 'Semester Results', icon: <FileSpreadsheet className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Schedule & Exams',
      items: [
        { id: 'timetable', label: 'Timetable', icon: <Clock className="w-4 h-4" /> },
        { id: 'exams', label: 'Examinations', icon: <Calendar className="w-4 h-4" />, badge: '2 Upcoming' },
      ],
    },
    {
      title: 'Student Services',
      items: [
        { id: 'fees', label: 'Fees & Dues', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'notices', label: 'Notices & Circulars', icon: <Bell className="w-4 h-4" /> },
        { id: 'documents', label: 'Documents Store', icon: <FileText className="w-4 h-4" /> },
        { id: 'placements', label: 'Placements & Career', icon: <Briefcase className="w-4 h-4" /> },
        { id: 'grievances', label: 'Grievance / Support', icon: <LifeBuoy className="w-4 h-4" /> },
      ],
    },
    {
      title: 'AI Student Hub',
      items: [
        { id: 'ai-assistant', label: 'AI Student Assistant', icon: <Sparkles className="w-4 h-4 text-purple-400" />, isAI: true },
        { id: 'ai-documents', label: 'Document Intelligence', icon: <FileText className="w-4 h-4 text-blue-400" />, isAI: true },
        { id: 'academic-agent', label: 'Academic AI Agent', icon: <Bot className="w-4 h-4 text-emerald-400" />, isAI: true },
        { id: 'exam-agent', label: 'Exam & Rules Agent', icon: <BrainCircuit className="w-4 h-4 text-amber-400" />, isAI: true },
      ],
    },

  ]

  const facultySections: NavSection[] = [
    {
      title: 'Faculty Workspace',
      items: [
        { id: 'dashboard', label: 'Faculty Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'students', label: 'Student Rosters & 360°', icon: <Users className="w-4 h-4" /> },
        { id: 'attendance', label: 'Mark Attendance', icon: <CalendarCheck className="w-4 h-4" /> },
        { id: 'marks', label: 'CIE Marks Entry', icon: <Award className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Teaching & Schedule',
      items: [
        { id: 'timetable', label: 'Teaching Timetable', icon: <Clock className="w-4 h-4" /> },
        { id: 'academics', label: 'Assigned Courses', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'exams', label: 'Exam Duty & Invigilation', icon: <Calendar className="w-4 h-4" /> },
        { id: 'notices', label: 'Notices & Circulars', icon: <Bell className="w-4 h-4" /> },
        { id: 'grievances', label: 'Student Grievances', icon: <LifeBuoy className="w-4 h-4" /> },
      ],
    },
    {
      title: 'AI Advisory',
      items: [
        { id: 'ai-assistant', label: 'Faculty AI Assistant', icon: <Sparkles className="w-4 h-4 text-purple-400" />, isAI: true },
      ],
    },
  ]

  const adminSections: NavSection[] = [
    {
      title: 'Executive Governance',
      items: [
        { id: 'dashboard', label: 'Governance Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
        { id: 'students', label: 'User & Student Registry', icon: <Users className="w-4 h-4" /> },
        { id: 'academics', label: 'Curriculum & Academic Hub', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'attendance', label: 'Attendance Monitoring', icon: <CalendarCheck className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Operations & Finance',
      items: [
        { id: 'exams', label: 'Exam Controller Hub', icon: <Calendar className="w-4 h-4" /> },
        { id: 'fees', label: 'Fee Management & Ledgers', icon: <CreditCard className="w-4 h-4" /> },
        { id: 'notices', label: 'Publish Notices & Docs', icon: <Bell className="w-4 h-4" /> },
        { id: 'placements', label: 'Placement & Career Hub', icon: <Briefcase className="w-4 h-4" /> },
      ],
    },
    {
      title: 'Data Ingestion & AI',
      items: [
        { id: 'data-sources', label: 'University Data Crawler', icon: <Globe className="w-4 h-4" /> },
        { id: 'knowledge-base', label: 'Knowledge Base & Vectors', icon: <Database className="w-4 h-4" /> },
        { id: 'ai-assistant', label: 'Admin AI Knowledge Assistant', icon: <Sparkles className="w-4 h-4 text-amber-400" />, isAI: true },
      ],
    },
  ]

  const sections = role === 'admin' ? adminSections : role === 'faculty' ? facultySections : studentSections

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 text-slate-300 border-r border-slate-800 transition-all duration-300 z-30 select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shrink-0 shadow-md shadow-blue-600/30">
            <GraduationCap className="w-6 h-6" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-white text-sm tracking-tight truncate">UNIV-ERP</span>
              <span className="text-[11px] text-blue-400 font-medium tracking-wide capitalize">
                {role} Portal
              </span>
            </div>
          )}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin">
        {sections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                {section.title}
              </h4>
            )}
            <div className="space-y-0.5 mt-1">
              {section.items.map((item) => {
                const isActive =
                  currentPath === item.id ||
                  (item.id === 'ai-assistant' && (currentPath === 'ai-chat' || currentPath === 'ai')) ||
                  (item.id === 'dashboard' && currentPath === 'dashboard') ||
                  (item.id === 'attendance' && currentPath === 'attendance') ||
                  (item.id === 'exams' && currentPath === 'exams') ||
                  (item.id === 'fees' && currentPath === 'fees') ||
                  (item.id === 'placements' && currentPath === 'placements')
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!onNavigate) return
                      if (item.id === 'ai-assistant' || item.id === 'academic-agent' || item.id === 'exam-agent') {
                        onNavigate('ai-chat')
                      } else {
                        onNavigate(item.id)
                      }
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : item.isAI
                        ? 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <>
                        <span className="truncate flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer / System Status */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 shrink-0">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="flex flex-col text-[11px] truncate">
              <span className="text-slate-300 font-medium">ERP v1.0 • Connected</span>
              <span className="text-slate-500 text-[10px]">Academic Year 2026-27</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="System Online" />
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
