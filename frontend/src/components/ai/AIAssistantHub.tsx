import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Sparkles,
  Bot,
  User as UserIcon,
  BookOpen,
  Calendar,
  Briefcase,
  CreditCard,
  Plus,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  Cpu,
  Search,
  Activity,
  Languages,
  ShieldAlert,
  BarChart3,
  AlertTriangle,
  Flame,
  Lightbulb,
  CheckCircle,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import { aiService } from '../../services/aiService'
import useVoiceAssistant from '../../hooks/useVoiceAssistant'
import {
  ChatSessionItem,
  ChatMessageItem,
  RAGSearchResultItem,
  IntentClassifyResponse,
  WeeklyBriefingResponse,
  RiskRadarResponse,
  SmartStudyScheduleResponse,
} from '../../types/ai'

const INITIAL_GREETING_MSG: ChatMessageItem = {
  id: 1,
  sender: 'ai_agent',
  agent_name: 'Academic Advisor',
  intent: 'general',
  content:
    'Hello Alex! I am your AI University Assistant. Ask me anything regarding your attendance percentages, examination hall tickets, super dream placement drives, or tuition fee deadlines.\n\nನಮಸ್ಕಾರ! ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಮಾಹಿತಿ ಮತ್ತು ಪರೀಕ್ಷಾ ವಿವರಗಳಿಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.\nनमस्ते! मैं आपकी शैक्षणिक और परीक्षा संबंधी सहायता के लिए तैयार हूँ।',
  created_at: 'Just now',
}

export const AIAssistantHub: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  const [activeSessionUuid, setActiveSessionUuid] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessageItem[]>([INITIAL_GREETING_MSG])
  const [inputText, setInputText] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<'general' | 'academic' | 'exam' | 'placement' | 'finance'>('general')
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'kn' | 'hi'>('en')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null)

  // Voice AI Hook
  const {
    isListening,
    isSpeaking,
    voiceError,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceAssistant({
    language: selectedLanguage,
    onResult: (transcript) => {
      if (transcript.trim()) {
        setInputText(transcript)
      }
    },
  })

  // Intent Inspector State (Phase 13 Flagship Feature)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [inspectQuery, setInspectQuery] = useState('Can I attend Microsoft drive if my CS602 attendance is 68% in semester 6 with 8.42 CGPA?')
  const [inspectResult, setInspectResult] = useState<IntentClassifyResponse | null>(null)
  const [isClassifying, setIsClassifying] = useState(false)

  // Proactive AI Analytics State (Phase 20 Flagship Feature)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [activeAnalyticsTab, setActiveAnalyticsTab] = useState<'briefing' | 'risk' | 'schedule'>('briefing')
  const [weeklyBriefing, setWeeklyBriefing] = useState<WeeklyBriefingResponse | null>(null)
  const [riskRadar, setRiskRadar] = useState<RiskRadarResponse | null>(null)
  const [studySchedule, setStudySchedule] = useState<SmartStudyScheduleResponse | null>(null)
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load Sessions
  const fetchSessions = useCallback(() => {
    let isMounted = true
    aiService
      .getSessions()
      .then((data) => {
        if (isMounted) {
          setSessions(data)
          if (data.length > 0 && !activeSessionUuid) {
            setActiveSessionUuid(data[0].session_uuid)
          }
        }
      })
      .catch((err) => console.error('Failed to load chat sessions:', err))
      .finally(() => {
        if (isMounted) setIsLoadingSessions(false)
      })

    return () => {
      isMounted = false
    }
  }, [activeSessionUuid])

  useEffect(() => {
    return fetchSessions()
  }, [fetchSessions])

  // Load Messages for Active Session
  useEffect(() => {
    if (!activeSessionUuid) return

    let isMounted = true
    aiService
      .getSessionMessages(activeSessionUuid)
      .then((msgs) => {
        if (isMounted) {
          if (msgs.length > 0) {
            setMessages(msgs)
          } else {
            setMessages([
              {
                id: 1,
                sender: 'ai_agent',
                agent_name: 'AI Advisor',
                intent: 'general',
                content: 'This session is ready. Ask any academic, examination, or placement question.',
                created_at: 'Just now',
              },
            ])
          }
        }
      })
      .catch((err) => console.error('Failed to load session messages:', err))

    return () => {
      isMounted = false
    }
  }, [activeSessionUuid])

  // Load Proactive Analytics
  const loadProactiveAnalytics = async () => {
    setIsLoadingAnalytics(true)
    try {
      const [briefingRes, riskRes, scheduleRes] = await Promise.all([
        aiService.getWeeklyBriefing(),
        aiService.getRiskRadar(),
        aiService.getSmartStudySchedule(),
      ])
      setWeeklyBriefing(briefingRes)
      setRiskRadar(riskRes)
      setStudySchedule(scheduleRes)
    } catch (err) {
      console.error('Failed to load proactive analytics:', err)
    } finally {
      setIsLoadingAnalytics(false)
    }
  }

  // Run Intent Classification for Inspector
  const handleInspectIntent = async (customQuery?: string) => {
    const q = customQuery || inspectQuery
    if (!q.trim()) return

    setIsClassifying(true)
    try {
      const data = await aiService.classifyIntent(q)
      setInspectResult(data)
    } catch (err) {
      console.error('Failed to classify intent:', err)
    } finally {
      setIsClassifying(false)
    }
  }

  const handleCreateNewSession = async () => {
    try {
      const res = await aiService.createSession('New Advisory Session')
      setActiveSessionUuid(res.session_uuid)
      const updated = await aiService.getSessions()
      setSessions(updated)
    } catch (err) {
      console.error('Failed to create session:', err)
      alert('Failed to initialize session.')
    }
  }

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || isSending) return

    setInputText('')
    setIsSending(true)

    // Optimistic user message
    const tempUserMsg: ChatMessageItem = {
      id: messages.length + 1,
      sender: 'user',
      content: textToSend,
      created_at: 'Just now',
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await aiService.sendMessage({
        session_uuid: activeSessionUuid,
        message: textToSend,
        agent_type: selectedAgent,
        language: selectedLanguage,
      })

      setActiveSessionUuid(res.session_uuid)
      setMessages((prev) => [...prev, res.ai_message])

      // Refresh sessions
      const updated = await aiService.getSessions()
      setSessions(updated)
    } catch (err) {
      console.error('Inference error:', err)
      const errorMsg: ChatMessageItem = {
        id: messages.length + 2,
        sender: 'ai_agent',
        agent_name: 'AI Advisor',
        content: 'Encountered an inference error. Please verify backend connectivity.',
        created_at: 'Just now',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 text-white rounded-2xl p-6 shadow-xl border border-purple-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">AI University Hub & Proactive Insights</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-300 border border-purple-400/30">
                Phases 17 – 21 Active
              </span>
            </div>
            <p className="text-sm text-slate-300 mt-1">
              Deterministic ERP Multi-Agents, Multilingual Engine (Kannada/Hindi), Memory & Proactive Risk Radar.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Trilingual Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-purple-800/60">
            <Languages className="w-3.5 h-3.5 text-purple-400 ml-1.5 mr-0.5" />
            {[
              { code: 'en', label: 'EN' },
              { code: 'kn', label: 'ಕನ್ನಡ' },
              { code: 'hi', label: 'हिन्दी' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 text-xs font-semibold gap-1.5"
            onClick={() => {
              const nextState = !isAnalyticsOpen
              setIsAnalyticsOpen(nextState)
              if (nextState && !weeklyBriefing) {
                loadProactiveAnalytics()
              }
            }}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isAnalyticsOpen ? 'Hide Proactive AI' : 'Proactive AI Radar (Phase 20)'}</span>
          </Button>

          <Button
            variant="outline"
            className="border-purple-400/40 text-purple-200 hover:bg-purple-900/40 text-xs font-semibold gap-1.5"
            onClick={() => {
              setIsInspectorOpen(!isInspectorOpen)
              if (!inspectResult) handleInspectIntent()
            }}
          >
            <Cpu className="w-3.5 h-3.5 text-purple-300" />
            <span>{isInspectorOpen ? 'Hide Intent Inspector' : 'Intent Router (Phase 13)'}</span>
          </Button>

          <Button
            variant="primary"
            className="bg-purple-600 hover:bg-purple-500 text-white border-0 shadow-md text-xs font-semibold gap-1.5"
            onClick={handleCreateNewSession}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Session</span>
          </Button>
        </div>
      </div>

      {/* Phase 20 Proactive AI Analytics Panel */}
      {isAnalyticsOpen && (
        <Card className="border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-xl animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-3 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-white">
                  Proactive AI Academic Analytics & Multi-dimensional Risk Radar
                </CardTitle>
                <p className="text-xs text-slate-400">
                  Pre-emptive telemetry analysis, attendance threshold audits, fee checks, and smart revision synthesis.
                </p>
              </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {[
                { id: 'briefing', label: 'Weekly Briefing', icon: Flame },
                { id: 'risk', label: 'Risk Radar', icon: ShieldAlert },
                { id: 'schedule', label: 'Study Planner', icon: Calendar },
              ].map((tab) => {
                const Icon = tab.icon
                const isSelected = activeAnalyticsTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveAnalyticsTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            {isLoadingAnalytics ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <span>Synthesizing proactive telemetry insights...</span>
              </div>
            ) : activeAnalyticsTab === 'briefing' && weeklyBriefing ? (
              <div className="space-y-4">
                {/* Highlights & Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Student Profile</div>
                    <div className="text-sm font-bold text-white mt-1">{weeklyBriefing.student_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">USN: {weeklyBriefing.usn}</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Cumulative GPA</div>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">{weeklyBriefing.cgpa.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">Tier 1 Standing</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Overall Attendance</div>
                    <div className="text-lg font-bold text-blue-400 mt-0.5">{weeklyBriefing.overall_attendance.toFixed(1)}%</div>
                    <div className="text-[10px] text-slate-500">Across Enrolled Courses</div>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div className="text-[11px] text-slate-400 font-semibold">Fee Balance Dues</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">₹{weeklyBriefing.fee_balance.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500">{weeklyBriefing.fee_balance === 0 ? 'Clear' : 'Action Required'}</div>
                  </div>
                </div>

                {/* Highlights and Urgent Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400 uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4" /> Academic Highlights
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {weeklyBriefing.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" /> Recommended Action Items
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {weeklyBriefing.urgent_actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : activeAnalyticsTab === 'risk' && riskRadar ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl border ${
                      riskRadar.overall_risk_level === 'LOW'
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : riskRadar.overall_risk_level === 'MODERATE'
                        ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                        : 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                    }`}>
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Institutional Risk Score</div>
                      <div className="text-xl font-bold text-white flex items-center gap-2">
                        <span>{riskRadar.risk_score} / 100</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          riskRadar.overall_risk_level === 'LOW'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {riskRadar.overall_risk_level} RISK
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>Critical Shortages: <strong className="text-white">{riskRadar.critical_shortage_count}</strong></div>
                    <div>Active Backlogs: <strong className="text-white">{riskRadar.active_backlogs}</strong></div>
                  </div>
                </div>

                {/* At Risk Courses Table */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Course Attendance & Examination Risk Audit
                  </div>
                  {riskRadar.at_risk_courses.length === 0 ? (
                    <div className="p-3 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" /> All courses satisfy the 80%+ safe attendance buffer.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {riskRadar.at_risk_courses.map((c, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <div>
                            <span className="font-mono font-bold text-white mr-2">{c.course_code}</span>
                            <span className="text-slate-300">{c.course_name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-amber-400">{c.percentage}%</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.risk_level === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : activeAnalyticsTab === 'schedule' && studySchedule ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="text-sm font-bold text-white">AI-Generated Revision Timetable</div>
                      <div className="text-xs text-slate-400">Total Study Windows: {studySchedule.total_study_days} Days</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400">Generated: {studySchedule.generated_at}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {studySchedule.study_sessions.map((sess, i) => (
                    <div key={i} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-400">{sess.date}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {sess.recommended_study_hours} hrs recommended
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">
                        <span className="font-mono mr-1.5">[{sess.course_code}]</span>
                        {sess.course_name}
                      </div>
                      <div className="text-[11px] text-slate-400">{sess.target_focus}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Phase 13 Flagship: Deterministic Intent Router Inspector */}
      {isInspectorOpen && (
        <Card className="border-purple-300 bg-gradient-to-br from-slate-900 via-purple-950/40 to-slate-900 text-white shadow-lg animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="pb-3 border-b border-purple-800/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                <CardTitle className="text-sm font-bold text-white">
                  Deterministic Intent Router & Entity Extractor (Phase 13 Engine)
                </CardTitle>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3" /> Zero-Hallucination
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Query Tester */}
            <div className="flex gap-2">
              <input
                type="text"
                value={inspectQuery}
                onChange={(e) => setInspectQuery(e.target.value)}
                placeholder="Enter query to classify intent and extract entities..."
                className="flex-1 bg-slate-950 border border-purple-800/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleInspectIntent()}
                disabled={isClassifying}
                className="bg-purple-600 hover:bg-purple-500 text-xs px-4"
              >
                <Search className="w-3.5 h-3.5 mr-1" />
                <span>{isClassifying ? 'Classifying...' : 'Classify Query'}</span>
              </Button>
            </div>

            {/* Quick Benchmark Prompts */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-slate-400 shrink-0 mr-1 font-semibold">Benchmarks:</span>
              {[
                'Can I attend Microsoft drive if my CS602 attendance is 68% in sem 6?',
                'Where is my digital hall ticket with QR code for SEE exams?',
                'Super Dream placement eligibility criteria for Google India with CGPA 8.42',
                'Hostel curfew timings, mess rebate rules and late fee fine due dates',
                'ನನ್ನ ಹಾಜರಾತಿ ವಿವರ ತಿಳಿಸಿ (Kannada)',
                'मेरी उपस्थिति की स्थिति क्या है? (Hindi)',
              ].map((b, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInspectQuery(b)
                    handleInspectIntent(b)
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-purple-900/60 text-slate-300 hover:text-white border border-slate-700 whitespace-nowrap text-left transition-all"
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Classification Visualizer Results */}
            {inspectResult && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                {/* 1. Primary Intent & Confidence */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-800/40 space-y-2">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                    Primary Intent & Routing
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-lg font-bold uppercase text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {inspectResult.primary_intent}
                    </span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {(inspectResult.confidence * 100).toFixed(0)}% Confidence
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dispatched Agent: <strong className="text-white">{inspectResult.recommended_agent}</strong>
                  </div>
                </div>

                {/* 2. Secondary Intents */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-800/40 space-y-2">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                    Secondary Intents ({inspectResult.secondary_intents.length})
                  </div>
                  <div className="space-y-1">
                    {inspectResult.secondary_intents.map((sq, i) => (
                      <div key={i} className="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-purple-900/40 text-[11px]">
                        <span className="text-slate-300">{sq.agent}</span>
                        <span className="font-bold text-[10px] text-purple-400 uppercase">[{sq.intent}: {(sq.score * 100).toFixed(0)}%]</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Extracted Domain Entities */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-800/40 space-y-2">
                  <div className="text-[11px] font-bold text-purple-300 uppercase tracking-wider">
                    Extracted Domain Entities
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectResult.extracted_entities.course_codes.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                        Course: {c}
                      </span>
                    ))}
                    {inspectResult.extracted_entities.companies.map((comp) => (
                      <span key={comp} className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                        Company: {comp}
                      </span>
                    ))}
                    {inspectResult.extracted_entities.percentages.map((p) => (
                      <span key={p} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                        Threshold: {p}
                      </span>
                    ))}
                    {inspectResult.extracted_entities.cgpa && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        CGPA: {inspectResult.extracted_entities.cgpa}
                      </span>
                    )}
                    {inspectResult.extracted_entities.semesters.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                        Sem: {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main 2-Column Chat Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sessions & Persona Selector */}
        <div className="lg:col-span-4 space-y-4">
          {/* Agent Persona Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Specialized Domain Agent
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 space-y-2">
              {[
                { id: 'general', title: 'Universal Orchestrator', desc: 'Cross-domain reasoning across ERP', icon: Sparkles },
                { id: 'academic', title: 'Academic Advisor', desc: 'Attendance shortages, credits & syllabus', icon: BookOpen },
                { id: 'exam', title: 'Examination Officer', desc: 'Hall ticket clearance & SEE schedules', icon: Calendar },
                { id: 'placement', title: 'Placement Coordinator', desc: 'Super Dream eligibility & mock interview', icon: Briefcase },
                { id: 'finance', title: 'Financial Counselor', desc: 'Fee fine slabs, receipts & certificates', icon: CreditCard },
              ].map((agent) => {
                const Icon = agent.icon
                const isSelected = selectedAgent === agent.id
                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id as any)}
                    className={`w-full flex items-start gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-purple-50 border-purple-300 text-purple-950 shadow-xs'
                        : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{agent.title}</div>
                      <div className="text-[11px] text-slate-500">{agent.desc}</div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Conversation History Sessions */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Advisory Sessions ({sessions.length})
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleCreateNewSession}>
                <Plus className="w-3 h-3 mr-1" /> New
              </Button>
            </CardHeader>
            <CardContent className="pt-3 p-2 space-y-1 max-h-64 overflow-y-auto">
              {isLoadingSessions ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No active sessions. Start a new one!</div>
              ) : (
                sessions.map((sess) => {
                  const isActive = activeSessionUuid === sess.session_uuid
                  return (
                    <button
                      key={sess.session_uuid}
                      onClick={() => setActiveSessionUuid(sess.session_uuid)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                        isActive
                          ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{sess.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{sess.message_count} msgs</span>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Interactive Chat Stream */}
        <div className="lg:col-span-8">
          <Card className="border-slate-200 shadow-md flex flex-col h-[640px]">
            <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Live Chat Stream & Memory Window
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Language: <span className="text-purple-600 font-bold uppercase">{selectedLanguage}</span> • Grounded with Institutional Regulations
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[11px] text-slate-500 font-medium">Online</span>
              </div>
            </CardHeader>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender !== 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs shadow-md'
                        : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {msg.sender !== 'user' && msg.agent_name && (
                      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                            {msg.agent_name}
                          </span>
                          <span className="text-[10px] text-slate-400">{msg.created_at}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => (isSpeaking ? stopSpeaking() : speakText(msg.content, selectedLanguage))}
                          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-purple-600 transition-colors"
                          title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                        >
                          {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-purple-600" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}

                    <div className="whitespace-pre-line text-slate-800 font-medium">{msg.content}</div>

                    {/* Verified RAG Sources Accordion */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-600">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Verified University Policy References</span>
                        </div>

                        <div className="space-y-1.5">
                          {msg.sources.map((src: RAGSearchResultItem) => {
                            const isExpanded = expandedCitationId === src.chunk_id
                            return (
                              <div
                                key={src.chunk_id}
                                className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-[11px]"
                              >
                                <div
                                  className="flex items-center justify-between cursor-pointer"
                                  onClick={() => setExpandedCitationId(isExpanded ? null : src.chunk_id)}
                                >
                                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                    <FileText className="w-3.5 h-3.5 text-purple-600" />
                                    <span>{src.document_title}</span>
                                    <span className="text-[10px] font-normal text-slate-500">
                                      ({src.section_title})
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-emerald-600 font-mono">
                                      {(src.similarity_score * 100).toFixed(0)}% Match
                                    </span>
                                    {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 text-[11px] italic bg-white p-2 rounded-lg">
                                    "{src.text}"
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.sender === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="flex gap-3 justify-start items-center text-xs text-slate-500 animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]"></span>
                    <span className="ml-1 text-[11px] font-medium text-slate-600">
                      Querying university knowledge base & generating response...
                    </span>
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="p-2.5 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-1.5">
              {(selectedLanguage === 'kn'
                ? [
                    'ನನ್ನ ಹಾಜರಾತಿ ವಿವರ ತಿಳಿಸಿ (Attendance)',
                    'ಪರೀಕ್ಷಾ ಪ್ರವೇಶ ಪತ್ರ ಅರ್ಹತೆ (Hall Ticket)',
                    'ಕ್ಯಾಂಪಸ್ ನೇಮಕಾತಿ ನಿಯಮಗಳು (Placements)',
                    'ಶುಲ್ಕ ಬಾಕಿ ವಿವರ (Fee Dues)',
                  ]
                : selectedLanguage === 'hi'
                ? [
                    'मेरी उपस्थिति की स्थिति क्या है? (Attendance)',
                    'परीक्षा प्रवेश पत्र और हॉल टिकट (Hall Ticket)',
                    'प्लेसमेंट अपग्रेड नीति (Placements)',
                    'बकाया शुल्क की जानकारी (Fee Balance)',
                  ]
                : [
                    'Attendance condonation percentage threshold',
                    'Super Dream placement eligibility criteria',
                    'Digital hall ticket QR verification',
                    'Hostel fee payment deadline and late fines',
                  ]
              ).map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(p)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-800 whitespace-nowrap transition-all border border-slate-200/60"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Voice Error Alert */}
            {voiceError && (
              <div className="mx-4 my-1 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{voiceError}</span>
              </div>
            )}

            {/* Input Box Footer */}
            <div className="p-3 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSendMessage()
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => (isListening ? stopListening() : startListening())}
                  className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title={isListening ? 'Stop listening' : 'Voice input (Speak)'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  placeholder={isListening ? 'Listening to speech...' : 'Ask a question regarding course credits, exams, placements, or regulations...'}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`flex-1 bg-slate-50 border rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium ${
                    isListening ? 'border-rose-400 ring-2 ring-rose-300/30' : 'border-slate-200 focus:border-purple-500'
                  }`}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSending || !inputText.trim()}
                  className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-10 px-4 font-bold"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default AIAssistantHub
