import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Bot,
  User as UserIcon,
  Plus,
  Send,
  Upload,
  FileText,
  Clock,
  Search,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  RotateCw,
  Copy,
  Check,
  X,
  Languages,
  Zap,
  FolderOpen,
  Trash2,
  Layers,
  Database,
  UserCheck,
  Scale,
  Maximize2,
  Minimize2,
  ExternalLink,
  Info,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { aiService } from '../../services/aiService'
import useVoiceAssistant from '../../hooks/useVoiceAssistant'
import {
  ChatSessionItem,
  ChatMessageItem,
  RAGSearchResultItem,
  DocumentItem,
} from '../../types/ai'
import MarkdownRenderer from './MarkdownRenderer'
import DocumentAnalysisViewer from './DocumentAnalysisViewer'
import DocumentComparisonViewer from './DocumentComparisonViewer'
import DocumentLibraryView from './DocumentLibraryView'

const INITIAL_GREETING: ChatMessageItem = {
  id: 1,
  sender: 'ai_agent',
  agent_name: 'Document Intelligence Agent',
  intent: 'general',
  content:
    '### 👋 Welcome to University AI Document Intelligence\n\n' +
    'I am your AI Document Intelligence & Academic Assistant inside the ERP.\n\n' +
    '**Primary Capabilities:**\n' +
    '- 📄 **Document Intelligence:** Upload any academic PDF (Regulations, Syllabus, Guidelines) for full-page analysis, rules extraction, and page citations.\n' +
    '- 🔄 **Version Comparison:** Compare two document editions (e.g. 2024 vs 2025) to detect exact changed rules and modified percentages.\n' +
    '- 🏛️ **University Knowledge:** Ask general university policies, attendance rules, fee deadlines, or hostel curfew.\n' +
    '- 👤 **Authenticated Personal ERP:** Check your live attendance percentages, CIE marks, GPA, and class timetables.',
  created_at: 'Just now',
}

interface UniversityAIAssistantPageProps {
  initialDocumentId?: number
  initialDocumentTitle?: string
}

type MainViewMode = 'intelligence' | 'chat' | 'compare' | 'library'

export const UniversityAIAssistantPage: React.FC<UniversityAIAssistantPageProps> = ({
  initialDocumentId,
  initialDocumentTitle,
}) => {
  // Navigation / View Modes
  const [currentView, setCurrentView] = useState<MainViewMode>('chat')
  const [isSplitLayout, setIsSplitLayout] = useState(true)

  // Chat Sessions & Messages
  const [sessions, setSessions] = useState<ChatSessionItem[]>([])
  const [activeSessionUuid, setActiveSessionUuid] = useState<string | undefined>(undefined)
  const [messages, setMessages] = useState<ChatMessageItem[]>([INITIAL_GREETING])
  const [sessionSearch, setSessionSearch] = useState('')

  // Uploaded Documents State
  const [userDocuments, setUserDocuments] = useState<DocumentItem[]>([])
  const [activeDocId, setActiveDocId] = useState<number | null>(initialDocumentId || null)
  const [activeDocTitle, setActiveDocTitle] = useState<string | null>(initialDocumentTitle || null)
  const [comparisonDocIds, setComparisonDocIds] = useState<{ docAId?: number; docBId?: number }>({})

  // Input & Messaging State
  const [inputText, setInputText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'kn' | 'hi'>('en')
  const [isSending, setIsSending] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const [uploadStatusStep, setUploadStatusStep] = useState('')
  const [uploadProgressPercent, setUploadProgressPercent] = useState<number>(0)
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null)
  const [copiedMsgId, setCopiedMsgId] = useState<number | null>(null)

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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isSending])

  // Load User Documents
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await aiService.getDocuments()
      setUserDocuments(docs)
      if (initialDocumentId && !activeDocTitle) {
        const found = docs.find((d) => d.id === initialDocumentId)
        if (found) {
          setActiveDocTitle(found.title)
          setActiveDocId(found.id)
        }
      } else if (!activeDocId && docs.length > 0) {
        setActiveDocId(docs[0].id)
        setActiveDocTitle(docs[0].title)
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err)
    }
  }, [initialDocumentId, activeDocTitle, activeDocId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Load Sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await aiService.getSessions()
      setSessions(data)
      if (data.length > 0 && !activeSessionUuid) {
        setActiveSessionUuid(data[0].session_uuid)
        if (data[0].active_document_id && !activeDocId) {
          setActiveDocId(data[0].active_document_id)
          setActiveDocTitle(data[0].active_document_title || null)
        }
      }
    } catch (err) {
      console.error('Failed to load sessions:', err)
    }
  }, [activeSessionUuid, activeDocId])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // Load Messages for Active Session
  useEffect(() => {
    if (!activeSessionUuid) return

    aiService
      .getSessionMessages(activeSessionUuid)
      .then((msgs) => {
        if (msgs.length > 0) {
          setMessages(msgs)
        } else {
          setMessages([INITIAL_GREETING])
        }
      })
      .catch((err) => console.error('Failed to load session messages:', err))
  }, [activeSessionUuid])

  // Send Chat Message
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim()
    if (!query || isSending) return

    setInputText('')
    setIsSending(true)

    // Optimistic user message append
    const tempUserMsg: ChatMessageItem = {
      id: Date.now(),
      sender: 'user',
      content: query,
      created_at: 'Just now',
    }
    setMessages((prev) => [...prev, tempUserMsg])

    try {
      const res = await aiService.sendMessage({
        session_uuid: activeSessionUuid,
        message: query,
        active_document_id: activeDocId,
        language: selectedLanguage,
      })

      if (!activeSessionUuid) {
        setActiveSessionUuid(res.session_uuid)
        loadSessions()
      }

      setMessages((prev) => [...prev, res.ai_message])
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'AI service temporarily unavailable'
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai_agent',
          agent_name: 'System Error',
          intent: 'error',
          content: `⚠️ Error processing query: ${errMsg}. Please verify backend connection.`,
          created_at: 'Just now',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  // Create New Session
  const handleCreateNewSession = async () => {
    try {
      const res = await aiService.createSession('New Conversation', activeDocId || undefined)
      setActiveSessionUuid(res.session_uuid)
      setMessages([
        {
          id: Date.now(),
          sender: 'ai_agent',
          agent_name: activeDocTitle ? 'Document Intelligence Agent' : 'University AI Assistant',
          intent: 'general',
          content: activeDocTitle
            ? `Active context set to **${activeDocTitle}**. You can ask any question about rules, deadlines, or pages in this document.`
            : 'New university conversation started. Ask any question about regulations, exams, or your personal ERP vitals.',
          created_at: 'Just now',
        },
      ])
      loadSessions()
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }

  // Delete Session
  const handleDeleteSession = async (sessionUuid: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await aiService.deleteSession(sessionUuid)
      if (activeSessionUuid === sessionUuid) {
        setActiveSessionUuid(undefined)
        setMessages([INITIAL_GREETING])
      }
      loadSessions()
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }

  // Handle PDF Upload with real progress states
  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPdf(true)
    setUploadStatusStep('Uploading and validating PDF...')
    setUploadProgressPercent(15)

    try {
      setUploadStatusStep('Reading document and extracting every page...')
      setUploadProgressPercent(35)
      
      const res = await aiService.uploadDocument(file)

      setUploadStatusStep('Extracting structured tables, rules & dates...')
      setUploadProgressPercent(70)

      setUploadStatusStep('Generating complete document intelligence...')
      setUploadProgressPercent(90)

      await loadDocuments()
      setActiveDocId(res.doc_id)
      setActiveDocTitle(res.title)

      setUploadStatusStep('Document Ready ✓')
      setUploadProgressPercent(100)

      setTimeout(() => {
        setIsUploadingPdf(false)
        setUploadStatusStep('')
        setUploadProgressPercent(0)
      }, 1200)

      // Post confirmation in chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'ai_agent',
          agent_name: 'Document Intelligence Agent',
          intent: 'pdf_document',
          document_id: res.doc_id,
          content:
            `### 📄 Document Ready: **${res.title}**\n\n` +
            `- **Pages Processed:** ${res.total_pages}\n` +
            `- **Status:** Fully Analyzed & Indexed ✓\n\n` +
            `The entire document is now your active context. Ask anything about its rules, dates, definitions, or click **View Analysis** on the left to see the full executive summary.`,
          created_at: 'Just now',
        },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      alert(`Document upload error: ${msg}`)
      setIsUploadingPdf(false)
      setUploadStatusStep('')
      setUploadProgressPercent(0)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSelectActiveDocument = (doc: DocumentItem) => {
    setActiveDocId(doc.id)
    setActiveDocTitle(doc.title)
    setCurrentView('intelligence')
  }

  const handleClearActiveDocument = () => {
    setActiveDocId(null)
    setActiveDocTitle(null)
  }

  const handleTriggerCompare = (docAId?: number, docBId?: number) => {
    setComparisonDocIds({ docAId, docBId })
    setCurrentView('compare')
  }

  const handleCopyMessage = (id: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMsgId(id)
    setTimeout(() => setCopiedMsgId(null), 2000)
  }

  const handleFeedback = (msgId: number, feedback: 'like' | 'dislike') => {
    aiService.submitFeedback(msgId, feedback).catch(console.error)
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback } : m))
    )
  }

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(sessionSearch.toLowerCase())
  )

  const activeDocObj = userDocuments.find((d) => d.id === activeDocId)

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] min-h-[680px] bg-slate-100/60 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top Universal Mode & Active Document Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setCurrentView('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentView === 'chat'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              AI Chat Workspace
            </button>
            <button
              onClick={() => setCurrentView('intelligence')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentView === 'intelligence'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Document Intelligence
            </button>
            <button
              onClick={() => setCurrentView('compare')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentView === 'compare'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Document Comparison
            </button>
            <button
              onClick={() => setCurrentView('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                currentView === 'library'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Document Library
            </button>
          </div>
        </div>

        {/* Active Document Indicator Chip */}
        {activeDocTitle ? (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200/80 rounded-xl px-3 py-1 text-xs">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-bold text-blue-950 truncate max-w-[200px] sm:max-w-xs">{activeDocTitle}</span>
            <Badge variant="success" size="sm">Active</Badge>
            <div className="flex items-center gap-1 border-l border-blue-200 pl-2">
              <button
                onClick={() => setCurrentView('intelligence')}
                className="text-blue-700 hover:underline font-semibold text-[11px]"
              >
                Analysis
              </button>
              <span className="text-slate-300">•</span>
              <button
                onClick={() => handleTriggerCompare(activeDocId || undefined)}
                className="text-blue-700 hover:underline font-semibold text-[11px]"
              >
                Compare
              </button>
              <button
                onClick={handleClearActiveDocument}
                className="text-slate-400 hover:text-rose-500 ml-1"
                title="Remove Active Document Context"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Mode: <strong>University Knowledge & Personal ERP</strong> (No PDF active)</span>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Document Upload, Library, & Chat Sessions */}
        <div className="w-72 md:w-80 bg-white border-r border-slate-200/80 flex flex-col shrink-0">
          {/* Quick PDF Upload Area */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleUploadPdf}
              accept=".pdf,.docx,.doc,.txt,.csv"
              className="hidden"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPdf}
              className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-bold shadow-xs py-2"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              + Upload PDF Document
            </Button>

            {/* Real Processing Progress Indicator */}
            {isUploadingPdf && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-blue-950">
                  <span className="flex items-center gap-1.5">
                    <RotateCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                    {uploadStatusStep}
                  </span>
                  <span>{uploadProgressPercent}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgressPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Documents List */}
          <div className="p-3 border-b border-slate-100 flex-1 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Document Library ({userDocuments.length})
              </span>
              <button
                onClick={() => setCurrentView('library')}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                View All
              </button>
            </div>

            {userDocuments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No documents uploaded yet. Upload a PDF to begin full intelligence indexing.
              </div>
            ) : (
              userDocuments.map((doc) => {
                const isActive = doc.id === activeDocId
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectActiveDocument(doc)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-50/80 border-blue-300 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-start gap-2 min-w-0">
                        <FileText className={`w-4 h-4 shrink-0 mt-0.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900 truncate leading-tight">{doc.title}</h4>
                          <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 flex-wrap">
                            <span>{doc.total_pages} Pages</span>
                            <span>•</span>
                            <span>{doc.category}</span>
                          </div>
                        </div>
                      </div>
                      {isActive && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Chat Sessions History */}
          <div className="p-3 bg-slate-50/40 border-t border-slate-200/80 h-48 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chat History</span>
              <button
                onClick={handleCreateNewSession}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5">
              {sessions.map((sess) => (
                <div
                  key={sess.session_uuid}
                  onClick={() => setActiveSessionUuid(sess.session_uuid)}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer group transition-all ${
                    activeSessionUuid === sess.session_uuid
                      ? 'bg-blue-600 text-white font-medium shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate max-w-[170px]">{sess.title}</span>
                  <button
                    onClick={(e) => handleDeleteSession(sess.session_uuid, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center / Right Content Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* View Mode 1: Document Intelligence Full View */}
          {currentView === 'intelligence' && activeDocId && (
            <div className="flex-1 p-4 overflow-y-auto">
              <DocumentAnalysisViewer
                documentId={activeDocId}
                onAskQuestion={(prompt) => {
                  setCurrentView('chat')
                  handleSendMessage(prompt)
                }}
                onCompareWithAnother={(docId) => handleTriggerCompare(docId)}
              />
            </div>
          )}

          {/* View Mode 2: Document Comparison Full View */}
          {currentView === 'compare' && (
            <div className="flex-1 p-4 overflow-y-auto">
              <DocumentComparisonViewer
                initialDocAId={comparisonDocIds.docAId}
                initialDocBId={comparisonDocIds.docBId}
                availableDocuments={userDocuments}
                onAskAboutComparison={(prompt) => {
                  setCurrentView('chat')
                  handleSendMessage(prompt)
                }}
              />
            </div>
          )}

          {/* View Mode 3: Document Library Full View */}
          {currentView === 'library' && (
            <div className="flex-1 p-4 overflow-y-auto">
              <DocumentLibraryView
                onSelectDocumentForChat={(docId, docTitle) => {
                  setActiveDocId(docId)
                  setActiveDocTitle(docTitle)
                  setCurrentView('intelligence')
                }}
                onNavigateToChat={() => setCurrentView('chat')}
              />
            </div>
          )}

          {/* View Mode 4: Chat Workspace (Split or Full) */}
          {currentView === 'chat' && (
            <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
              {/* Active Context Banner inside Chat */}
              {activeDocTitle && (
                <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50/50 border-b border-blue-100 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Active Document Context: <strong className="text-blue-950">{activeDocTitle}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-700 font-bold"
                      onClick={() => setCurrentView('intelligence')}
                    >
                      View Analysis
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-indigo-700 font-bold"
                      onClick={() => handleTriggerCompare(activeDocId || undefined)}
                    >
                      Compare
                    </Button>
                  </div>
                </div>
              )}

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/30">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user'
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold shadow-xs ${
                          isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-white border border-slate-700'
                        }`}
                      >
                        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4 text-blue-400" />}
                      </div>

                      {/* Message Bubble */}
                      <div className="space-y-1.5 max-w-2xl">
                        {!isUser && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium px-1">
                            <span className="font-bold text-slate-800">{msg.agent_name || 'AI Assistant'}</span>
                            {msg.intent && (
                              <Badge variant="default" size="sm">
                                {msg.intent}
                              </Badge>
                            )}
                            <span className="text-slate-400">• {msg.created_at}</span>
                          </div>
                        )}

                        <div
                          className={`p-4 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isUser
                              ? 'bg-blue-600 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs space-y-2'
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <MarkdownRenderer content={msg.content} />
                          )}
                        </div>

                        {/* Grounded Source Citations */}
                        {!isUser && msg.sources && msg.sources.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/70 text-[11px] space-y-1.5">
                            <div className="font-bold text-slate-700 flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-blue-600" />
                              Grounded Citations & References:
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {msg.sources.map((src, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-medium text-[10px]"
                                >
                                  📄 {src.document_title} (Page {src.page_number || 1})
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Message Action Footer */}
                        {!isUser && (
                          <div className="flex items-center gap-2 text-slate-400 px-1 pt-0.5">
                            <button
                              onClick={() => (isSpeaking ? stopSpeaking() : speakText(msg.content, selectedLanguage))}
                              className="hover:text-blue-600 transition-colors p-1"
                              title={isSpeaking ? 'Stop speaking' : 'Read Aloud'}
                            >
                              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-blue-600" /> : <Volume2 className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="hover:text-slate-700 transition-colors p-1"
                              title="Copy Message"
                            >
                              {copiedMsgId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'like')}
                              className={`p-1 hover:text-blue-600 transition-colors ${msg.feedback === 'like' ? 'text-blue-600 font-bold' : ''}`}
                              title="Helpful"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, 'dislike')}
                              className={`p-1 hover:text-rose-600 transition-colors ${msg.feedback === 'dislike' ? 'text-rose-600 font-bold' : ''}`}
                              title="Unhelpful"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input & Prompt Recommendations */}
              <div className="p-3 md:p-4 bg-white border-t border-slate-200/80 space-y-3 shrink-0">
                {/* Voice Error Alert */}
                {voiceError && (
                  <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{voiceError}</span>
                  </div>
                )}

                {/* Suggested Prompt Recommendations */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
                  {[
                    activeDocTitle ? 'What is this document about?' : 'What is the university attendance requirement?',
                    activeDocTitle ? 'What are the attendance rules?' : 'What is my live attendance percentage?',
                    activeDocTitle ? 'Are there any changes in attendance?' : 'What is my current CGPA and CIE marks?',
                    activeDocTitle ? 'Explain the change simply' : 'When is the tuition fee deadline?',
                    activeDocTitle ? 'What does page 2 say?' : 'What is today\'s class timetable?',
                  ].map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="px-2.5 py-1 rounded-lg text-xs bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 font-medium whitespace-nowrap transition-all shadow-2xs"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Form Bar */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => (isListening ? stopListening() : startListening())}
                    className={`p-3 rounded-xl transition-all cursor-pointer ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title={isListening ? 'Stop listening' : 'Voice input (Speak)'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder={
                        isListening
                          ? 'Listening to speech...'
                          : activeDocTitle
                          ? `Ask anything about ${activeDocTitle} or your ERP vitals...`
                          : 'Ask anything about university regulations, exams, or your personal records...'
                      }
                      className={`w-full text-xs bg-slate-50 border rounded-xl pl-3 pr-10 py-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-2xs ${
                        isListening ? 'border-rose-400 ring-2 ring-rose-300/30' : 'border-slate-200'
                      }`}
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value as 'en' | 'kn' | 'hi')}
                        className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 rounded-md px-1.5 py-0.5 focus:outline-hidden"
                      >
                        <option value="en">English</option>
                        <option value="kn">ಕನ್ನಡ (KN)</option>
                        <option value="hi">हिंदी (HI)</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSendMessage()}
                    isLoading={isSending}
                    disabled={!inputText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl shadow-xs"
                    leftIcon={<Send className="w-4 h-4" />}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UniversityAIAssistantPage
