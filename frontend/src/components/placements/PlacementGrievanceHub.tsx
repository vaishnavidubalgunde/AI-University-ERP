import React, { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  LifeBuoy,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Plus,
  FileText,
  Brain,
  Send,
  User,
  Bot,
  Award,
  TrendingUp,
  Volume2,
  Mic,
  MicOff,
  ArrowRight,
  Target,
  FileSearch,
  Check,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { placementService } from '../../services/placementService'
import { grievanceService } from '../../services/grievanceService'
import { aiService } from '../../services/aiService'
import {
  PlacementDriveItem,
  PlacementApplicationItem,
} from '../../types/placement'
import { GrievanceItem } from '../../types/grievance'
import {
  PlacementAdvisoryResponse,
  ResumeAnalysisResponse,
  MockInterviewStartResponse,
  MockInterviewEvaluateResponse,
  MockInterviewFinishResponse,
  PlacementReadinessResponse,
} from '../../types/ai'
import useVoiceAssistant from '../../hooks/useVoiceAssistant'

interface PlacementGrievanceHubProps {
  initialTab?:
    | 'drives'
    | 'my-apps'
    | 'grievances'
    | 'ai-placement'
    | 'resume-ai'
    | 'mock-interview'
    | 'readiness'
  onOpenAI?: (prompt?: string) => void
}

export const PlacementGrievanceHub: React.FC<PlacementGrievanceHubProps> = ({
  initialTab = 'drives',
  onOpenAI,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'drives'
    | 'my-apps'
    | 'grievances'
    | 'ai-placement'
    | 'resume-ai'
    | 'mock-interview'
    | 'readiness'
  >(initialTab)

  // Placement State
  const [drives, setDrives] = useState<PlacementDriveItem[]>([])
  const [myApplications, setMyApplications] = useState<PlacementApplicationItem[]>([])
  const [applyingDriveId, setApplyingDriveId] = useState<number | null>(null)
  const [advisoryReport, setAdvisoryReport] = useState<PlacementAdvisoryResponse | null>(null)

  // Grievance State
  const [grievances, setGrievances] = useState<GrievanceItem[]>([])
  const [isGrievanceModalOpen, setIsGrievanceModalOpen] = useState(false)
  const [gSubject, setGSubject] = useState('')
  const [gDescription, setGDescription] = useState('')
  const [gCategory, setGCategory] = useState('academic')
  const [gPriority, setGPriority] = useState('normal')
  const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false)
  const [grievanceSuccessMsg, setGrievanceSuccessMsg] = useState<string | null>(null)

  // Phase 4: Resume Analyzer State
  const [resumeText, setResumeText] = useState(
    'Alex Rivera\nComputer Science Engineering (CGPA 8.7)\nSkills: Python, FastAPI, React, PostgreSQL, Docker, Machine Learning\nProjects: AI University ERP system with FAISS RAG, Automated CI/CD deployment pipeline.'
  )
  const [targetRole, setTargetRole] = useState('Software Development Engineer (SDE)')
  const [targetCompanyType, setTargetCompanyType] = useState('Product / Tech Giant')
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisResponse | null>(null)
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false)

  // Phase 4: Mock Interview Simulator State
  const [mockRole, setMockRole] = useState('Software Development Engineer')
  const [mockCompanyType, setMockCompanyType] = useState('Product (FAANG/Tier-1)')
  const [mockTechDomain, setMockTechDomain] = useState('Python, FastAPI, System Design')
  const [mockDifficulty, setMockDifficulty] = useState('Intermediate')
  const [activeInterview, setActiveInterview] = useState<MockInterviewStartResponse | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [interviewHistory, setInterviewHistory] = useState<
    Array<{
      question: string
      studentAnswer: string
      evaluation: MockInterviewEvaluateResponse
    }>
  >([])
  const [isEvaluatingAnswer, setIsEvaluatingAnswer] = useState(false)
  const [interviewFinishResult, setInterviewFinishResult] = useState<MockInterviewFinishResponse | null>(null)

  // Phase 4: Placement Readiness Scorecard State
  const [readinessData, setReadinessData] = useState<PlacementReadinessResponse | null>(null)
  const [isLoadingReadiness, setIsLoadingReadiness] = useState(false)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Voice AI Hook for Mock Interviews
  const {
    isListening,
    isSpeaking,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceAssistant({
    language: 'en',
    onResult: (transcript) => {
      if (transcript.trim()) {
        setCurrentAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript))
      }
    },
  })

  const fetchAllData = useCallback(() => {
    let isMounted = true

    Promise.all([
      placementService.getDrives(),
      placementService.getMyApplications(),
      grievanceService.getGrievances(),
      aiService.getPlacementAdvisory().catch(() => null),
    ])
      .then(([drivesData, appsData, grvData, advData]) => {
        if (isMounted) {
          setDrives(drivesData)
          setMyApplications(appsData)
          setGrievances(grvData)
          if (advData) setAdvisoryReport(advData)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.response?.data?.detail || 'Failed to load placement and grievance records.')
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    return fetchAllData()
  }, [fetchAllData])

  // Load Readiness Scorecard
  const fetchReadiness = async () => {
    setIsLoadingReadiness(true)
    try {
      const res = await aiService.getPlacementReadiness()
      setReadinessData(res)
    } catch {
      // quiet fail
    } finally {
      setIsLoadingReadiness(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'readiness' && !readinessData) {
      fetchReadiness()
    }
  }, [activeTab, readinessData])

  const handleApply = async (driveId: number) => {
    setApplyingDriveId(driveId)
    try {
      const res = await placementService.applyToDrive({ drive_id: driveId })
      alert(res.message)
      const [updatedDrives, updatedApps] = await Promise.all([
        placementService.getDrives(),
        placementService.getMyApplications(),
      ])
      setDrives(updatedDrives)
      setMyApplications(updatedApps)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Application submission failed.')
    } finally {
      setApplyingDriveId(null)
    }
  }

  const handleCreateGrievance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gSubject || !gDescription) {
      alert('Please fill in both the subject and description.')
      return
    }

    setIsSubmittingGrievance(true)
    setGrievanceSuccessMsg(null)

    try {
      const res = await grievanceService.submitGrievance({
        subject: gSubject,
        description: gDescription,
        category: gCategory,
        priority: gPriority,
      })
      setGrievanceSuccessMsg(`Ticket ${res.ticket_number} created successfully!`)
      setGSubject('')
      setGDescription('')
      const updatedGrv = await grievanceService.getGrievances()
      setGrievances(updatedGrv)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to file grievance ticket.')
    } finally {
      setIsSubmittingGrievance(false)
    }
  }

  // Resume Analyzer Trigger
  const handleAnalyzeResume = async () => {
    if (!resumeText.trim()) return
    setIsAnalyzingResume(true)
    try {
      const res = await aiService.analyzeResume({
        resume_text: resumeText,
        target_role: targetRole,
        target_company_type: targetCompanyType,
      })
      setResumeAnalysis(res)
    } catch {
      alert('Resume analysis failed. Check backend connectivity.')
    } finally {
      setIsAnalyzingResume(false)
    }
  }

  // Mock Interview Start
  const handleStartInterview = async () => {
    try {
      const res = await aiService.startMockInterview({
        target_role: mockRole,
        company_type: mockCompanyType,
        domain_tech: mockTechDomain,
        difficulty: mockDifficulty,
      })
      setActiveInterview(res)
      setInterviewHistory([])
      setInterviewFinishResult(null)
      setCurrentAnswer('')
      speakText(res.first_question)
    } catch {
      alert('Failed to launch AI Mock Interview.')
    }
  }

  // Mock Interview Evaluate Answer
  const handleEvaluateAnswer = async () => {
    if (!activeInterview || !currentAnswer.trim()) return
    setIsEvaluatingAnswer(true)
    try {
      const qText =
        interviewHistory.length === 0
          ? activeInterview.first_question
          : interviewHistory[interviewHistory.length - 1].evaluation.next_question_text || ''

      const evalRes = await aiService.evaluateMockInterview({
        interview_id: activeInterview.interview_id,
        question_index: activeInterview.current_question_index,
        question_text: qText,
        student_answer: currentAnswer,
      })

      setInterviewHistory((prev) => [
        ...prev,
        {
          question: qText,
          studentAnswer: currentAnswer,
          evaluation: evalRes,
        },
      ])

      setCurrentAnswer('')

      if (evalRes.is_completed || !evalRes.next_question_text) {
        // Finish interview
        const finishRes = await aiService.finishMockInterview(activeInterview.interview_id)
        setInterviewFinishResult(finishRes)
      } else {
        setActiveInterview({
          ...activeInterview,
          current_question_index: evalRes.next_question_index || activeInterview.current_question_index + 1,
        })
        speakText(evalRes.next_question_text)
      }
    } catch {
      alert('Failed to evaluate answer.')
    } finally {
      setIsEvaluatingAnswer(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-rose-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Placements & Career Intelligence</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-400/30 uppercase tracking-wider">
                Career Center
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Campus recruitment drives, AI resume audit, interactive mock interviews, placement readiness scoring, and grievance support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => fetchAllData()}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="secondary"
            className="bg-rose-600 hover:bg-rose-500 text-white border-0 shadow-md text-xs font-bold gap-1.5"
            onClick={() =>
              onOpenAI?.(
                'Evaluate my profile and resume against Google and Microsoft eligibility cutoffs, and recommend preparation topics.'
              )
            }
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Placement Matcher</span>
          </Button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        {[
          { id: 'drives', label: `Recruitment Drives (${drives.length})`, icon: Briefcase },
          { id: 'my-apps', label: `My Applications (${myApplications.length})`, icon: FileText },
          { id: 'resume-ai', label: 'AI Resume Analyzer', icon: FileSearch },
          { id: 'mock-interview', label: 'AI Mock Interview', icon: Brain },
          { id: 'readiness', label: 'Readiness Scorecard', icon: Award },
          { id: 'ai-placement', label: 'Eligibility Audit', icon: Sparkles },
          { id: 'grievances', label: `Grievances (${grievances.length})`, icon: LifeBuoy },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: ACTIVE RECRUITMENT DRIVES */}
      {/* ========================================================================= */}
      {activeTab === 'drives' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {drives.map((drive) => (
            <Card key={drive.id} className="border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    {drive.ctc_package}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      drive.is_eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {drive.is_eligible ? 'Eligible' : 'Ineligible'}
                  </span>
                </div>

                <CardTitle className="text-base font-bold text-slate-900 mt-2">{drive.company_name}</CardTitle>
                <CardDescription className="text-xs text-slate-600 font-semibold">{drive.job_role}</CardDescription>
              </CardHeader>

              <CardContent className="pt-3 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Min CGPA:</span>
                    <span className="font-bold text-slate-800">{drive.min_cgpa}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-medium text-slate-800">{drive.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Branches:</span>
                    <span className="font-medium text-slate-800">{drive.eligible_departments}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Apply Deadline:</span>
                    <span className="font-semibold text-rose-700">{drive.deadline}</span>
                  </div>

                  {drive.eligibility_reason && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      {drive.eligibility_reason}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs"
                    onClick={() =>
                      onOpenAI?.(
                        `Give me interview preparation tips and coding question patterns for ${drive.company_name} (${drive.job_role})`
                      )
                    }
                  >
                    <Sparkles className="w-3 h-3 text-purple-600" />
                  </Button>

                  {drive.has_applied ? (
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Applied ({drive.application_status?.toUpperCase()})</span>
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!drive.is_eligible || applyingDriveId === drive.id}
                      className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                      onClick={() => handleApply(drive.id)}
                    >
                      {applyingDriveId === drive.id ? 'Submitting...' : '1-Click Apply'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: MY APPLICATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'my-apps' && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900">Active Placement Application Status Track</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Live interview rounds, selection statuses, and placement cell updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Package</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4">Current Stage</th>
                    <th className="py-3 px-4">Interview Schedule</th>
                    <th className="py-3 px-4">Feedback / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myApplications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-bold text-slate-900">{app.company_name}</td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">{app.job_role}</td>
                      <td className="py-3.5 px-4 font-bold text-rose-700">{app.ctc_package}</td>
                      <td className="py-3.5 px-4 text-slate-500">{app.applied_date}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            app.status === 'selected'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'interview'
                              ? 'bg-purple-100 text-purple-800'
                              : app.status === 'shortlisted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{app.interview_date || 'Pending Announcement'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{app.remarks || 'Application under screening by HR committee.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: PHASE 4 AI RESUME ANALYZER */}
      {/* ========================================================================= */}
      {activeTab === 'resume-ai' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Resume Intelligence & ATS Optimizer</h2>
              <p className="text-xs text-slate-500">
                Extract skills, detect missing competencies, optimize ATS keywords, and rewrite impact bullet points.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Target Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="Software Development Engineer (SDE)">Software Development Engineer (SDE)</option>
                  <option value="Full Stack Web Developer">Full Stack Web Developer</option>
                  <option value="AI / Machine Learning Engineer">AI / Machine Learning Engineer</option>
                  <option value="Data Analyst / Engineer">Data Analyst / Engineer</option>
                  <option value="Cloud & DevOps Engineer">Cloud & DevOps Engineer</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Company Tier</label>
                <select
                  value={targetCompanyType}
                  onChange={(e) => setTargetCompanyType(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="Product / Tech Giant">Product / Tech Giant (FAANG / Tier 1)</option>
                  <option value="High Growth Startup">High Growth Startup (Series A/B)</option>
                  <option value="IT Services & Consulting">IT Services & Consulting (Tier 2)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Paste Resume Text / Document Content</label>
              <textarea
                rows={6}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume sections (Skills, Projects, Education, Work Experience)..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAnalyzeResume}
                disabled={isAnalyzingResume || !resumeText.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-2"
              >
                {isAnalyzingResume ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isAnalyzingResume ? 'Auditing Resume...' : 'Analyze Resume with AI'}</span>
              </Button>
            </div>
          </div>

          {/* Analysis Results Display */}
          {resumeAnalysis && (
            <div className="space-y-6">
              {/* Scorecard Header */}
              <div className="bg-gradient-to-r from-slate-900 to-rose-950 text-white p-6 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">ATS Role Match</span>
                  <div className="text-3xl font-black text-white">{resumeAnalysis.role_relevance_score} / 100</div>
                  <div className="text-xs text-slate-300 mt-1">Targeting: {targetRole}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-400">
                    {resumeAnalysis.extracted_skills.length} Extracted Skills
                  </span>
                  <div className="text-xs text-amber-300 font-semibold">
                    {resumeAnalysis.missing_skills.length} Missing Keywords
                  </div>
                </div>
              </div>

              {/* Skills Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Extracted & Validated Skills</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeAnalysis.extracted_skills.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    <span>Recommended Missing Skills</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeAnalysis.missing_skills.map((s, i) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold">
                        + {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bullet Point Rewrites (Before vs After) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>Action-Oriented Bullet Point Improvements (STAR Methodology)</span>
                </h3>
                <div className="space-y-3">
                  {resumeAnalysis.bullet_point_improvements.map((b, i) => (
                    <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                      <div>
                        <span className="font-bold text-rose-700 uppercase text-[10px]">Original: </span>
                        <span className="text-slate-600 line-through">{b.original}</span>
                      </div>
                      <div>
                        <span className="font-bold text-emerald-700 uppercase text-[10px]">AI Enhanced: </span>
                        <span className="text-slate-900 font-bold">{b.improved}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ATS Tips */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900">ATS Parsing & Formatting Tips</h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {resumeAnalysis.ats_compatibility_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: PHASE 4 AI INTERACTIVE MOCK INTERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'mock-interview' && (
        <div className="space-y-6">
          {!activeInterview ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Interactive AI Mock Interview Simulator</h2>
                <p className="text-xs text-slate-500">
                  Real-time turn-by-turn simulation with speech recognition, question evaluation, and personalized debrief reports.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Role</label>
                  <select
                    value={mockRole}
                    onChange={(e) => setMockRole(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Software Development Engineer">Software Development Engineer</option>
                    <option value="Full Stack Web Developer">Full Stack Web Developer</option>
                    <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                    <option value="Data Analyst">Data Analyst</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Company Type</label>
                  <select
                    value={mockCompanyType}
                    onChange={(e) => setMockCompanyType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Product (FAANG/Tier-1)">Product (FAANG / Tier 1)</option>
                    <option value="High Growth Startup">High Growth Startup</option>
                    <option value="Enterprise Services">Enterprise Services</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Tech Stack / Domain</label>
                  <input
                    type="text"
                    value={mockTechDomain}
                    onChange={(e) => setMockTechDomain(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-medium"
                    placeholder="e.g. Python, FastAPI, React, SQL"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Difficulty Level</label>
                  <select
                    value={mockDifficulty}
                    onChange={(e) => setMockDifficulty(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Junior">Junior / Entry Level (Fresher)</option>
                    <option value="Intermediate">Intermediate Level</option>
                    <option value="Senior">Senior Level</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartInterview}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2"
                >
                  <Brain className="w-4 h-4" />
                  <span>Start AI Mock Interview</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Active Interview Progress Header */}
              <div className="bg-gradient-to-r from-slate-900 to-purple-950 text-white p-5 rounded-2xl flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-purple-300">
                    Mock Interview: {mockRole} ({mockDifficulty})
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Question {activeInterview.current_question_index} of {activeInterview.total_questions}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveInterview(null)}
                  className="border-white/20 text-white text-xs"
                >
                  End Interview
                </Button>
              </div>

              {/* Q&A History Stream */}
              <div className="space-y-4">
                {interviewHistory.map((item, idx) => (
                  <div key={idx} className="space-y-3">
                    {/* Question */}
                    <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-purple-900">Interviewer Question #{idx + 1}:</div>
                      <p className="text-slate-800 font-medium">{item.question}</p>
                    </div>

                    {/* Student Answer */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
                      <div className="font-bold text-slate-600">Your Response:</div>
                      <p className="text-slate-900">{item.studentAnswer}</p>
                    </div>

                    {/* AI Feedback & Score */}
                    <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-2">
                      <div className="flex items-center justify-between font-bold text-emerald-900">
                        <span>AI Evaluation & Feedback</span>
                        <span className="text-sm text-emerald-700">{item.evaluation.score_out_of_10} / 10 Marks</span>
                      </div>
                      <p className="text-slate-700">{item.evaluation.feedback}</p>
                      <div className="text-slate-500 italic text-[11px]">
                        <strong>Model Answer: </strong>
                        {item.evaluation.model_answer}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Current Question & Answer Input Box */}
              {!interviewFinishResult && (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                        Current Interview Question #{activeInterview.current_question_index}
                      </span>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {interviewHistory.length === 0
                          ? activeInterview.first_question
                          : interviewHistory[interviewHistory.length - 1].evaluation.next_question_text}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speakText(
                          interviewHistory.length === 0
                            ? activeInterview.first_question
                            : interviewHistory[interviewHistory.length - 1].evaluation.next_question_text || ''
                        )
                      }
                      className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shrink-0"
                      title="Read Question Aloud"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Speak or Type Your Answer</label>
                    <textarea
                      rows={4}
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      placeholder="Answer the technical or behavioral question..."
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <button
                      type="button"
                      onClick={() => (isListening ? stopListening() : startListening())}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isListening
                          ? 'bg-rose-600 text-white animate-pulse shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      <span>{isListening ? 'Stop Recording' : 'Voice Input (Speak Answer)'}</span>
                    </button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleEvaluateAnswer}
                      disabled={isEvaluatingAnswer || !currentAnswer.trim()}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2"
                    >
                      {isEvaluatingAnswer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{isEvaluatingAnswer ? 'Evaluating Answer...' : 'Submit Answer for Evaluation'}</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Final Interview Debrief Report */}
              {interviewFinishResult && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Mock Interview Complete — Performance Debrief</h3>
                      <p className="text-xs text-slate-500">Overall Score: {interviewFinishResult.overall_score}%</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                      {interviewFinishResult.performance_tier}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                      <div className="font-bold text-emerald-900 text-xs">Demonstrated Strengths</div>
                      <ul className="text-xs text-emerald-800 space-y-1">
                        {interviewFinishResult.strengths.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                      <div className="font-bold text-amber-900 text-xs">Areas to Strengthen</div>
                      <ul className="text-xs text-amber-800 space-y-1">
                        {interviewFinishResult.weaknesses.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                    {interviewFinishResult.preparation_plan_markdown}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 5: PHASE 4 PLACEMENT READINESS SCORECARD */}
      {/* ========================================================================= */}
      {activeTab === 'readiness' && (
        <div className="space-y-6">
          {isLoadingReadiness ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
            </div>
          ) : readinessData ? (
            <div className="space-y-6">
              {/* Score Header */}
              <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                    Institutional Placement Readiness Score
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-white mt-1">
                    {readinessData.readiness_score} / 100
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Candidate: {readinessData.student_name} • CGPA {readinessData.cgpa}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-bold uppercase">
                    {readinessData.readiness_tier}
                  </span>
                </div>
              </div>

              {/* Factors Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {readinessData.factors.map((f, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{f.factor_name}</span>
                      <span className="font-bold text-indigo-700 text-sm">{f.score}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${f.score}%` }} />
                    </div>
                    <div className="text-[11px] text-slate-500">{f.detail}</div>
                  </div>
                ))}
              </div>

              {/* Strengths and Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Key Profile Strengths</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {readinessData.key_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 text-rose-700">
                    <Target className="w-4 h-4" />
                    <span>Targeted Improvement Actions</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {readinessData.improvement_actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">Readiness scorecard unavailable.</div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 6: AI PLACEMENT OFFICER ADVISORY (EXISTING) */}
      {/* ========================================================================= */}
      {activeTab === 'ai-placement' && advisoryReport && (
        <div className="space-y-6">
          <Card className="border-purple-200 bg-purple-50/20 shadow-xs">
            <CardHeader className="border-b border-purple-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <CardTitle className="text-sm font-bold text-purple-950">AI Placement Officer Synthesis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-purple-100 text-xs leading-relaxed text-slate-700 whitespace-pre-line shadow-xs">
                {advisoryReport.advisory_markdown}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 7: GRIEVANCE SUPPORT TICKETS */}
      {/* ========================================================================= */}
      {activeTab === 'grievances' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Student Grievance Redressal & Support</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Transparent ticketing system monitored by the Dean of Student Affairs.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold gap-1.5"
              onClick={() => {
                setGrievanceSuccessMsg(null)
                setIsGrievanceModalOpen(true)
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>File New Grievance Ticket</span>
            </Button>
          </div>

          <div className="space-y-3">
            {grievances.map((g) => (
              <Card key={g.id} className="border-slate-200 shadow-xs hover:shadow-sm transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        {g.ticket_number}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md">
                        {g.category}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        g.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : g.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>

                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">{g.subject}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">{g.description}</p>

                  {g.admin_response && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Official Resolution Notes ({g.resolved_at || 'Resolved'})
                      </span>
                      <p className="text-xs text-emerald-900">{g.admin_response}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Submitted: {g.submitted_at}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: File New Grievance */}
      {isGrievanceModalOpen && (
        <Modal
          isOpen={isGrievanceModalOpen}
          onClose={() => setIsGrievanceModalOpen(false)}
          title="File a Support Ticket / Grievance"
          size="md"
        >
          <form onSubmit={handleCreateGrievance} className="space-y-4 text-xs">
            {grievanceSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h4 className="font-bold text-sm">Grievance Ticket Created!</h4>
                <p className="text-xs font-mono">{grievanceSuccessMsg}</p>
                <Button variant="primary" size="sm" className="mt-2" onClick={() => setIsGrievanceModalOpen(false)}>
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={gCategory}
                    onChange={(e) => setGCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="academic">Academic & Curriculum</option>
                    <option value="examination">Examinations & Hall Ticket</option>
                    <option value="hostel_mess">Hostel & Mess Amenities</option>
                    <option value="infrastructure">Infrastructure & Wi-Fi Facilities</option>
                    <option value="finance">Finance & Fee Accounts</option>
                    <option value="other">General Grievance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Priority Level</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['low', 'normal', 'high', 'urgent'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setGPriority(p)}
                        className={`p-2 rounded-xl text-[11px] font-bold uppercase border transition-all ${
                          gPriority === p
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Subject / Issue Summary</label>
                  <input
                    type="text"
                    placeholder="Brief summary of the issue..."
                    value={gSubject}
                    onChange={(e) => setGSubject(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Detailed Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe the problem, room/hall numbers, dates, or relevant context..."
                    value={gDescription}
                    onChange={(e) => setGDescription(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setIsGrievanceModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold"
                    disabled={isSubmittingGrievance}
                  >
                    {isSubmittingGrievance ? 'Submitting...' : 'Submit Ticket'}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}
    </div>
  )
}

export default PlacementGrievanceHub
