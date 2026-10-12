import React, { useState, useRef, useEffect } from 'react'
import {
  Bell,
  Search,
  Menu,
  Sparkles,
  ChevronDown,
  Calendar,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  BookOpen,
  CheckCircle2,
  ExternalLink
} from 'lucide-react'
import Badge from '../ui/Badge'
import useAuth from '../../context/useAuth'
import notificationService, { NotificationItem } from '../../services/notificationService'

export interface TopbarProps {
  onToggleMobileSidebar?: () => void
  studentName?: string
  studentId?: string
  department?: string
  semester?: number
  isBackendHealthy?: boolean
  onOpenAI?: () => void
  onOpenSearch?: () => void
  onSelectTerm?: (term: string) => void
  onSignOut?: () => void
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileSidebar,
  studentName,
  studentId,
  department,
  semester,
  isBackendHealthy = true,
  onOpenAI,
  onOpenSearch,
  onSelectTerm,
  onSignOut,
}) => {
  const { user, logout } = useAuth()

  const displayName = studentName || user?.full_name || 'Alex Kumar'
  const displayId = studentId || user?.student_id || user?.email || '1DT23CS238'
  const displayDept = department || user?.department || 'Computer Science & Engineering'
  const displaySem = semester || user?.semester || 6
  const displayRole = user?.role ? user.role.toUpperCase() : 'STUDENT'

  const [selectedTerm, setSelectedTerm] = useState('Spring 2026')
  const [isTermOpen, setIsTermOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [liveNotifications, setLiveNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const termRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const terms = ['Spring 2026 (Current)', 'Fall 2025', 'Spring 2025', 'Fall 2024']

  useEffect(() => {
    notificationService.getNotifications().then((res) => {
      setLiveNotifications(res.notifications)
      setUnreadCount(res.unread_count)
    }).catch(() => {})
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setUnreadCount(0)
      setLiveNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (termRef.current && !termRef.current.contains(event.target as Node)) {
        setIsTermOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTermSelect = (term: string) => {
    setSelectedTerm(term)
    setIsTermOpen(false)
    if (onSelectTerm) onSelectTerm(term)
  }

  const handleLogout = () => {
    setIsProfileOpen(false)
    if (onSignOut) {
      onSignOut()
    } else {
      logout()
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 md:px-6 flex items-center justify-between z-20 shrink-0 select-none">
      {/* Left: Mobile Toggle & Context */}
      <div className="flex items-center gap-3">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="hidden sm:flex items-center gap-2.5">
          <Badge variant="info" size="sm" className="font-semibold">
            {displayDept.split(' ')[0]} • Sem {displaySem}
          </Badge>
          <span className="text-slate-300">|</span>

          {/* Term Selector Dropdown */}
          <div className="relative" ref={termRef}>
            <button
              onClick={() => setIsTermOpen(!isTermOpen)}
              className="flex items-center gap-1.5 text-xs text-slate-600 font-medium px-2 py-1 rounded-md hover:bg-slate-100 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedTerm}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isTermOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Academic Term
                </div>
                {terms.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTermSelect(t)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      selectedTerm === t ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700 font-medium'
                    }`}
                  >
                    <span>{t}</span>
                    {selectedTerm === t && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center: Quick Search Trigger */}
      <div className="hidden lg:flex items-center w-80 relative">
        <button
          onClick={onOpenSearch}
          className="w-full pl-9 pr-12 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-left text-slate-500 rounded-lg border border-slate-200 transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search subjects, exams, circulars...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Ask AI Button, Backend Health, Notifications, Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Ask AI Trigger Button */}
        {onOpenAI && (
          <button
            onClick={onOpenAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
            <span className="hidden sm:inline">Ask AI Assistant</span>
            <span className="sm:hidden">AI</span>
          </button>
        )}

        {/* Backend Status Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] font-medium text-slate-600">
          <span className={`w-2 h-2 rounded-full ${isBackendHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span>API: {isBackendHealthy ? 'Online' : 'Offline'}</span>
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h6 className="text-xs font-bold text-slate-900">Institutional Alerts</h6>
                {unreadCount > 0 ? (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full cursor-pointer"
                  >
                    Mark {unreadCount} as Read
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    All Caught Up
                  </span>
                )}
              </div>
              <div className="divide-y divide-slate-100 mt-1 max-h-60 overflow-y-auto">
                {liveNotifications.map((n) => (
                  <div key={n.id} className="py-2.5 px-1 flex items-start gap-2.5 hover:bg-slate-50 rounded-lg transition-colors">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-snug">{n.title}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-blue-600 uppercase">{n.category}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative pl-2 border-l border-slate-200" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs ring-1 ring-blue-200 shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">{displayName}</span>
              <span className="text-[10px] font-mono text-slate-400">{displayId}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                <p className="text-[11px] text-slate-500 font-mono">{displayId}</p>
                <Badge variant={displayRole === 'ADMIN' ? 'danger' : displayRole === 'FACULTY' ? 'purple' : 'info'} size="sm" className="mt-1">
                  {displayRole} Account
                </Badge>
              </div>
              <div className="py-1 space-y-0.5">
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>My Profile</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>Registered Courses</span>
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg">
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account Settings</span>
                </button>
              </div>
              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
