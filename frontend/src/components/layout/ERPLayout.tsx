import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import Breadcrumbs from '../ui/Breadcrumbs'
import Modal from '../ui/Modal'
import { Sparkles, Search, BookOpen, Clock, Calendar, FileText, ArrowRight } from 'lucide-react'

export interface ERPLayoutProps {
  children: React.ReactNode
  currentPath?: string
  onNavigate?: (path: string) => void
  breadcrumbs?: string[]
  isBackendHealthy?: boolean
  onOpenAI?: () => void
}

export const ERPLayout: React.FC<ERPLayoutProps> = ({
  children,
  currentPath = 'dashboard',
  onNavigate,
  breadcrumbs = ['Academics', 'Overview'],
  isBackendHealthy = true,
  onOpenAI,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const quickNavLinks = [
    { id: 'dashboard', label: 'Student Dashboard', icon: <BookOpen className="w-4 h-4 text-blue-500" />, desc: 'Vitals, CGPA & attendance overview' },
    { id: 'attendance', label: 'Attendance Breakdown', icon: <Clock className="w-4 h-4 text-emerald-500" />, desc: 'Subject-wise class percentage' },
    { id: 'exams', label: 'Examination Schedule', icon: <Calendar className="w-4 h-4 text-amber-500" />, desc: 'Hall ticket & room allocations' },
    { id: 'ai-assistant', label: 'AI Student Assistant', icon: <Sparkles className="w-4 h-4 text-purple-500" />, desc: 'Ask university rules & policy queries' },
    { id: 'notices', label: 'University Circulars', icon: <FileText className="w-4 h-4 text-rose-500" />, desc: 'Official academic bulletins' },
  ]

  const filteredLinks = quickNavLinks.filter((link) =>
    link.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectNav = (id: string) => {
    setIsSearchOpen(false)
    setSearchQuery('')
    if (onNavigate) onNavigate(id)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar
          currentPath={currentPath}
          onNavigate={onNavigate}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-slate-900 z-50 animate-in slide-in-from-left duration-200">
            <Sidebar
              currentPath={currentPath}
              onNavigate={(path) => {
                setIsMobileSidebarOpen(false)
                if (onNavigate) onNavigate(path)
              }}
              isCollapsed={false}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isBackendHealthy={isBackendHealthy}
          onOpenAI={onOpenAI}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {/* Dynamic Breadcrumbs Bar */}
        <div className="bg-white border-b border-slate-200/60 px-4 md:px-6 py-2.5 flex items-center justify-between shrink-0">
          <Breadcrumbs
            items={breadcrumbs}
            onHomeClick={() => onNavigate && onNavigate('dashboard')}
          />

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
            <span>AI-Integrated University ERP</span>
            <span className="text-slate-300">•</span>
            <span className="text-blue-600 font-semibold">Phase 2 Design System</span>
          </div>
        </div>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-slate-50/50">
          {children}
        </main>
      </div>

      {/* Floating AI Quick-Action Button */}
      {onOpenAI && (
        <button
          onClick={onOpenAI}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105 transition-all group"
          aria-label="Open AI Student Assistant"
        >
          <Sparkles className="w-5 h-5 text-amber-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-xs tracking-wide">Ask AI Assistant</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Global Quick Search Modal (⌘K) */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => {
          setIsSearchOpen(false)
          setSearchQuery('')
        }}
        title="Quick ERP Navigation"
        size="md"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search modules, attendance, timetables, circulars..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1 max-h-64 overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Navigation Links</p>
            {filteredLinks.length > 0 ? (
              filteredLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => handleSelectNav(link.id)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/60 hover:border-blue-200 border border-transparent text-left transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white">
                      {link.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">{link.label}</p>
                      <p className="text-[11px] text-slate-500">{link.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No matching ERP destinations found.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ERPLayout
