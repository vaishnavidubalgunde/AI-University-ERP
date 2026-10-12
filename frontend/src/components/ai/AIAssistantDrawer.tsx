import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  BookOpen,
  Calendar,
  Briefcase,
  CreditCard,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Languages,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  AlertCircle,
} from 'lucide-react'
import Button from '../ui/Button'
import { aiService } from '../../services/aiService'
import { ChatMessageItem, RAGSearchResultItem } from '../../types/ai'
import useVoiceAssistant from '../../hooks/useVoiceAssistant'
import useAuth from '../../context/useAuth'

interface AIAssistantDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialPrompt?: string
  onClearInitialPrompt?: () => void
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const { user } = useAuth()
  const userName = user?.full_name || 'there'
  const userRole = (user?.role || 'student').toLowerCase()

  const defaultGreeting = userRole === 'faculty'
    ? `Hello Prof. ${userName}! I am your Faculty AI Assistant. I can help you analyze assigned student attendance, calculate CIE averages, track at-risk students, view today's timetable, or look up university academic regulations.`
    : userRole === 'admin'
    ? `Greetings ${userName}! I am your University Admin Executive AI Assistant. I can provide real-time institutional summaries across departments, attendance health, examination statistics, placement metrics, and pending grievances.`
    : `Hello ${userName}! I am your AI University Assistant powered by the live ERP database and institutional RAG knowledge base. How can I help you with your attendance, CIE marks, examination timetable, placements, or university regulations today?`

  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: 1,
      sender: 'ai_agent',
      agent_name: userRole === 'faculty' ? 'Faculty Academic Advisor' : userRole === 'admin' ? 'Institutional AI Executive' : 'Academic Advisor',
      intent: 'general',
      content: `${defaultGreeting}\n\nನಮಸ್ಕಾರ! ನಿಮ್ಮ ಶೈಕ್ಷಣಿಕ ಮಾಹಿತಿ ಮತ್ತು ವಿವರಗಳಿಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.\nनमस्ते! मैं आपकी शैक्षणिक सहायता के लिए तैयार हूँ।`,
      created_at: 'Just now',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<'general' | 'academic' | 'exam' | 'placement' | 'finance'>('general')
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'kn' | 'hi'>('en')
  const [currentSessionUuid, setCurrentSessionUuid] = useState<string | undefined>(undefined)
  const [isSending, setIsSending] = useState(false)
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null)


  // Voice AI Integration (Phase 3)
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSendMessage = useCallback(async (customMessage?: string) => {
    const textToSend = customMessage || inputText
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
        session_uuid: currentSessionUuid,
        message: textToSend,
        agent_type: selectedAgent,
        language: selectedLanguage,
      })

      setCurrentSessionUuid(res.session_uuid)
      setMessages((prev) => [...prev, res.ai_message])
    } catch {
      const errorMsg: ChatMessageItem = {
        id: messages.length + 2,
        sender: 'ai_agent',
        agent_name: 'AI Advisor',
        content: 'I encountered an error connecting to the AI inference engine. Please ensure your session is active.',
        created_at: 'Just now',
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsSending(false)
    }
  }, [inputText, isSending, currentSessionUuid, selectedAgent, selectedLanguage, messages.length])

  // Handle incoming initial prompt from other pages
  useEffect(() => {
    if (isOpen && initialPrompt && initialPrompt.trim() !== '') {
      const timer = setTimeout(() => {
        handleSendMessage(initialPrompt)
        if (onClearInitialPrompt) {
          onClearInitialPrompt()
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen, initialPrompt, handleSendMessage, onClearInitialPrompt])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-slate-900 text-slate-100 h-full shadow-2xl flex flex-col z-10 border-l border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">UniBot AI Assistant</h3>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Deterministic ERP Agents & Multilingual RAG</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trilingual Switcher Bar */}
        <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Languages className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-medium">Language:</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {[
              { code: 'en', label: 'English' },
              { code: 'kn', label: 'ಕನ್ನಡ' },
              { code: 'hi', label: 'हिन्दी' },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code as any)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Persona Selector Chips */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-500 font-semibold shrink-0 mr-1">Agent:</span>
          {[
            { id: 'general', label: 'All-Domain', icon: Sparkles },
            { id: 'academic', label: 'Academic', icon: BookOpen },
            { id: 'exam', label: 'Exams', icon: Calendar },
            { id: 'placement', label: 'Placements', icon: Briefcase },
            { id: 'finance', label: 'Finance', icon: CreditCard },
          ].map((item) => {
            const Icon = item.icon
            const isSelected = selectedAgent === item.id
            return (
              <button
                key={item.id}
                onClick={() => setSelectedAgent(item.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender !== 'user' && (
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-xs shadow-md'
                    : 'bg-slate-800/90 border border-slate-700/60 text-slate-200 rounded-bl-xs shadow-sm'
                }`}
              >
                {msg.sender !== 'user' && msg.agent_name && (
                  <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-700/60">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {msg.agent_name}
                      </span>
                      <span className="text-[10px] text-slate-400">{msg.created_at}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => (isSpeaking ? stopSpeaking() : speakText(msg.content, selectedLanguage))}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-purple-300 transition-colors"
                      title={isSpeaking ? 'Stop speech' : 'Read aloud'}
                    >
                      {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-purple-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                <div className="whitespace-pre-line text-slate-100">{msg.content}</div>

                {/* Verified RAG Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Verified Policy Citations</span>
                    </div>

                    <div className="space-y-1">
                      {msg.sources.map((src: RAGSearchResultItem) => {
                        const isExpanded = expandedCitationId === src.chunk_id
                        return (
                          <div
                            key={src.chunk_id}
                            className="bg-slate-900/80 rounded-lg p-2 border border-slate-800 text-[11px]"
                          >
                            <button
                              onClick={() => setExpandedCitationId(isExpanded ? null : src.chunk_id)}
                              className="w-full flex items-center justify-between text-left text-slate-300 font-semibold hover:text-purple-300"
                            >
                              <span className="truncate flex items-center gap-1">
                                <FileText className="w-3 h-3 text-purple-400 shrink-0" />
                                {src.citation}
                              </span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            {isExpanded && (
                              <p className="mt-1.5 text-slate-400 text-[10px] italic bg-black/30 p-1.5 rounded border border-slate-800 leading-relaxed font-mono">
                                "{src.text}"
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isSending && (
            <div className="flex gap-3 justify-start items-center text-xs text-slate-400 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <span className="bg-slate-800 p-2.5 rounded-xl border border-slate-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-1 text-[11px]">Searching university knowledge base...</span>
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            {(selectedLanguage === 'kn'
              ? [
                  'ನನ್ನ ಹಾಜರಾತಿ ವಿವರ ತಿಳಿಸಿ (Attendance Status)',
                  'ಪರೀಕ್ಷಾ ಪ್ರವೇಶ ಪತ್ರ ಅರ್ಹತೆ (Hall Ticket)',
                  'ಕ್ಯಾಂಪಸ್ ನೇಮಕಾತಿ ನಿಯಮಗಳು (Placement Policy)',
                  'ಶುಲ್ಕ ಬಾಕಿ ವಿವರ (Fee Dues)',
                ]
              : selectedLanguage === 'hi'
              ? [
                  'मेरी उपस्थिति की स्थिति क्या है? (Attendance)',
                  'परीक्षा प्रवेश पत्र और हॉल टिकट (Hall Ticket)',
                  'प्लेसमेंट अपग्रेड नीति (Placement Policy)',
                  'बकाया शुल्क की जानकारी (Fee Balance)',
                ]
              : userRole === 'faculty'
              ? [
                  'Which students have attendance below 75%?',
                  'What is my class average marks?',
                  'What classes do I have today?',
                  'Which students are academically at risk?',
                  'What is attendance condonation rule?',
                ]
              : userRole === 'admin'
              ? [
                  'Institutional attendance overview',
                  'Which department has lowest attendance?',
                  'How many grievances are pending?',
                  'What is the placement status?',
                  'How many students are below 75%?',
                ]
              : [
                  'What is my attendance?',
                  'Which subject has my lowest attendance?',
                  'What are my marks?',
                  'When is my next exam?',
                  'What is attendance condonation rule?',
                ]
            ).map((prompt, i) => (

              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg whitespace-nowrap border border-slate-700 transition-all text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Error Alert */}
        {voiceError && (
          <div className="mx-3 my-1 p-2 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-[11px] flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{voiceError}</span>
          </div>
        )}

        {/* Input Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
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
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={isListening ? 'Stop listening' : 'Voice input (Speak)'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              placeholder={isListening ? 'Listening to your voice...' : 'Ask UniBot about attendance, exams, placements, fees...'}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className={`flex-1 bg-slate-900 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 ${
                isListening ? 'border-rose-500/60 ring-2 ring-rose-500/20' : 'border-slate-800 focus:border-purple-500'
              }`}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSending || !inputText.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl h-9 px-3.5"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AIAssistantDrawer
