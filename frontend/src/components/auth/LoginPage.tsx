import React, { useState, useEffect } from 'react'
import {
  Phone,
  Mail,
  Globe,
  Eye,
  EyeOff,
  Info,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Users,
  ArrowRight,
  X,
  KeyRound,
  Send,
  RefreshCw,
  ChevronRight,
  School
} from 'lucide-react'
import useAuth from '../../context/useAuth'
import useToast from '../../context/useToast'
import { UserRole } from '../../types/auth'
import admissionsService from '../../services/admissionsService'
import { PortalStats, AdmissionsEnquiryPayload } from '../../types/admissions'
import campusBannerImg from '../../assets/dsu_campus_banner.jpg'
import RegisterModal from './RegisterModal'
import { BRANDING } from '../../config/branding'

export const LoginPage: React.FC = () => {
  const { login, demoLogin, error: authError } = useAuth()
  const toast = useToast()

  // Form state
  const [role, setRole] = useState<'staff' | 'student'>('staff')
  const [username, setUsername] = useState('dr.sharma@univ.edu')
  const [password, setPassword] = useState('faculty123')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeDemoRole, setActiveDemoRole] = useState<UserRole>('faculty')

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false)
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false)
  const [isProgramsModalOpen, setIsProgramsModalOpen] = useState(false)

  // OTP state
  const [otpIdentifier, setOtpIdentifier] = useState('alex.kumar@univ.edu')
  const [otpCode, setOtpCode] = useState('')
  const [generatedDemoOtp, setGeneratedDemoOtp] = useState<string | null>(null)
  const [isOtpSending, setIsOtpSending] = useState(false)
  const [isOtpVerifying, setIsOtpVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  // Forgot password state
  const [forgotIdentifier, setForgotIdentifier] = useState('')
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false)

  // Admissions lead application state
  const [applyForm, setApplyForm] = useState<AdmissionsEnquiryPayload>({
    full_name: '',
    email: '',
    phone: '',
    program: 'MBA',
    previous_qualification: '',
    percentage: undefined,
    state: '',
    city: '',
    query_notes: '',
  })
  const [isApplying, setIsApplying] = useState(false)
  const [applicationSubmitted, setApplicationSubmitted] = useState(false)

  // Live portal metadata
  const [portalStats, setPortalStats] = useState<PortalStats | null>(null)

  useEffect(() => {
    let isMounted = true
    admissionsService.getPortalInfo()
      .then((data) => {
        if (isMounted) setPortalStats(data)
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [])

  // Handle role switch
  const handleRoleChange = (newRole: 'staff' | 'student') => {
    setRole(newRole)
    if (newRole === 'student') {
      setUsername('1DT23CS238')
      setPassword('student123')
      setActiveDemoRole('student')
    } else {
      setUsername('dr.sharma@univ.edu')
      setPassword('faculty123')
      setActiveDemoRole('faculty')
    }
  }

  // Handle login submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      toast.warning('Input Required', 'Please enter your username and password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ username: username.trim(), password: password.trim() })
      toast.success('Authentication Successful', `Welcome to ${BRANDING.UNIVERSITY_NAME} ERP`)
    } catch {
      // Handled by AuthContext
    } finally {
      setIsSubmitting(false)
    }
  }

  // Quick 1-click demo login
  const handleQuickDemo = async (demoTarget: UserRole) => {
    setActiveDemoRole(demoTarget)
    if (demoTarget === 'student') {
      setRole('student')
      setUsername('1DT23CS238')
      setPassword('student123')
    } else if (demoTarget === 'faculty') {
      setRole('staff')
      setUsername('dr.sharma@univ.edu')
      setPassword('faculty123')
    } else {
      setRole('staff')
      setUsername('admin@univ.edu')
      setPassword('admin123')
    }

    setIsSubmitting(true)
    try {
      await demoLogin(demoTarget)
      toast.success('Demo Login Active', `Signed in as ${demoTarget.toUpperCase()}`)
    } catch {
      // Handled by context
    } finally {
      setIsSubmitting(false)
    }
  }

  // Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpIdentifier.trim()) {
      toast.warning('Input Required', 'Please enter your registered Email or Mobile number.')
      return
    }
    setIsOtpSending(true)
    try {
      const resp = await admissionsService.requestOtp(otpIdentifier.trim(), role)
      setGeneratedDemoOtp(resp.demo_otp)
      setOtpSent(true)
      toast.success('OTP Dispatched', `Test verification code: ${resp.demo_otp}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send OTP'
      toast.error('OTP Failed', msg)
    } finally {
      setIsOtpSending(false)
    }
  }

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      toast.warning('Input Required', 'Please enter the 6-digit OTP code.')
      return
    }
    setIsOtpVerifying(true)
    try {
      const authResp = await admissionsService.verifyOtp(otpIdentifier.trim(), otpCode.trim())
      localStorage.setItem('univ_erp_access_token', authResp.token.access_token)
      localStorage.setItem('univ_erp_user_data', JSON.stringify(authResp.user))
      window.location.reload()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid OTP entered'
      toast.error('Verification Error', msg)
    } finally {
      setIsOtpVerifying(false)
    }
  }

  // Handle Forgot Password
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotIdentifier.trim()) {
      toast.warning('Input Required', 'Please enter your registered USN or Email.')
      return
    }
    setIsForgotSubmitting(true)
    try {
      const resp = await admissionsService.forgotPassword(forgotIdentifier.trim())
      toast.success('Reset Instructions Sent', resp.message)
      setIsForgotPasswordModalOpen(false)
    } catch {
      toast.error('Reset Failed', 'Unable to initiate password reset at this time.')
    } finally {
      setIsForgotSubmitting(false)
    }
  }

  // Handle Admissions Application Submit
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!applyForm.full_name || !applyForm.email || !applyForm.phone || !applyForm.program) {
      toast.warning('Incomplete Form', 'Please fill all required application fields.')
      return
    }
    setIsApplying(true)
    try {
      await admissionsService.applyAdmission(applyForm)
      setApplicationSubmitted(true)
      toast.success('Application Received!', `Thank you ${applyForm.full_name}. Admissions counselor will contact you.`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed'
      toast.error('Submission Error', msg)
    } finally {
      setIsApplying(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-between font-sans selection:bg-[#26a69a] selection:text-white">
      {/* Main Split Screen Container */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Neoclassical Campus Banner & Admissions Announcement */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 xl:col-span-8 relative flex flex-col justify-between overflow-hidden bg-slate-900 min-h-[640px] lg:min-h-full shadow-inner">
          
          {/* Background Campus Image with authentic photorealistic lighting */}
          <div className="absolute inset-0 z-0">
            <img
              src={campusBannerImg}
              alt={`${BRANDING.UNIVERSITY_NAME} Grand Neoclassical Campus`}
              className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.04]"
            />
            {/* Top ambient gradient for brand text clarity */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/40 via-45% to-slate-950/80" />
          </div>

          {/* Top Admissions & Branding Header */}
          <div className="relative z-10 pt-6 sm:pt-8 md:pt-10 px-4 sm:px-8 flex flex-col items-center text-center">
            
            {/* University Crest & Title */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3">
              {/* Circular SU Shield Logo */}
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-yellow-400 p-1 shadow-xl flex items-center justify-center shrink-0 border-2 border-yellow-300 transform hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-[#004a99] flex flex-col items-center justify-center text-yellow-300 border border-yellow-400 p-0.5">
                  <GraduationCap className="w-6 h-6 text-yellow-300" />
                  <span className="text-[7px] font-black tracking-tighter uppercase text-yellow-200">{BRANDING.UNIVERSITY_INITIALS}</span>
                </div>
              </div>

              {/* Title & Online Header */}
              <div className="text-left leading-none">
                <div className="text-sm sm:text-base md:text-lg font-serif font-black tracking-wider text-[#002f6c]">
                  {BRANDING.UNIVERSITY_NAME_LINE_1}
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-widest text-[#004a99]">
                    {BRANDING.UNIVERSITY_NAME_LINE_2}
                  </span>
                  <span className="text-xl sm:text-2xl font-light text-slate-400">|</span>
                  <span className="text-xl sm:text-2xl md:text-3xl font-serif italic text-slate-800 font-normal">
                    {BRANDING.UNIVERSITY_TAGLINE}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Admission Headline */}
            <div className="mt-3 space-y-1.5 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-extrabold text-slate-900 tracking-tight drop-shadow-xs">
                {BRANDING.ADMISSIONS_HEADLINE}
              </h2>

              {/* Program Offering Badges */}
              <div className="pt-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 md:gap-3 text-sm sm:text-base md:text-lg font-serif font-bold text-slate-900">
                {BRANDING.PROGRAMS.map((prog, idx) => (
                  <React.Fragment key={prog}>
                    <button
                      type="button"
                      onClick={() => {
                        setApplyForm(prev => ({ ...prev, program: prog }))
                        setIsApplyModalOpen(true)
                      }}
                      className="px-2 sm:px-2.5 py-0.5 rounded-md hover:bg-yellow-400 hover:text-slate-950 transition-all font-bold cursor-pointer underline-offset-4 hover:underline whitespace-nowrap"
                      title={`Click to Apply for ${prog}`}
                    >
                      {prog}
                    </button>
                    {idx < BRANDING.PROGRAMS.length - 1 && <span className="text-slate-500 font-normal">|</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Accreditation Badges Row matching screenshot */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              
              {/* Badge 1: UGC Entitled */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-red-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-red-600 flex flex-col items-center justify-center text-white font-black text-[9px] shadow-xs">
                  <School className="w-3.5 h-3.5 mb-0.5 text-white" />
                  <span>UGC</span>
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-black uppercase text-slate-900 tracking-wide">UGC</div>
                  <div className="text-[10px] text-red-600 font-bold">Entitled</div>
                </div>
              </div>

              {/* Badge 2: NAAC A+ Graded */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-amber-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-xs border border-amber-300">
                  A+
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-black uppercase text-slate-900 tracking-wide">NAAC</div>
                  <div className="text-[10px] text-amber-700 font-bold">Graded A+</div>
                </div>
              </div>

              {/* Badge 3: 7 Decades Legacy */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-md border border-yellow-200 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-600 flex items-center justify-center text-white font-black text-xs shadow-xs">
                  7
                </div>
                <div className="text-left leading-tight">
                  <div className="text-[11px] font-black uppercase text-slate-900 tracking-wide">7 Decades</div>
                  <div className="text-[10px] text-slate-600 font-bold">Legacy</div>
                </div>
              </div>
            </div>
          </div>

          {/* Center QR Code Feature Box */}
          <div className="relative z-10 my-4 flex flex-col items-center justify-center p-4">
            
            <div
              onClick={() => setIsApplyModalOpen(true)}
              className="group cursor-pointer bg-white p-3.5 sm:p-4 rounded-xl shadow-2xl border-2 border-slate-200 hover:border-yellow-400 transform hover:scale-105 transition-all duration-300 flex flex-col items-center"
            >
              {/* Detailed High-Fidelity QR Code SVG */}
              <div className="relative bg-white p-1 rounded-sm">
                <svg
                  className="w-28 h-28 sm:w-32 sm:h-32 text-slate-900"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  {/* Outer Position Markers */}
                  <rect x="5" y="5" width="26" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="11" y="11" width="14" height="14" rx="1" fill="currentColor" />

                  <rect x="69" y="5" width="26" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="75" y="11" width="14" height="14" rx="1" fill="currentColor" />

                  <rect x="5" y="69" width="26" height="26" rx="2" fill="none" stroke="currentColor" strokeWidth="4" />
                  <rect x="11" y="75" width="14" height="14" rx="1" fill="currentColor" />

                  {/* QR Matrix Grid */}
                  <rect x="36" y="8" width="5" height="5" />
                  <rect x="46" y="8" width="5" height="5" />
                  <rect x="56" y="8" width="5" height="5" />

                  <rect x="36" y="18" width="5" height="10" />
                  <rect x="46" y="18" width="10" height="5" />
                  <rect x="56" y="23" width="5" height="5" />

                  <rect x="8" y="36" width="10" height="5" />
                  <rect x="23" y="36" width="5" height="10" />
                  <rect x="36" y="36" width="10" height="10" fill="#004a99" />
                  <rect x="51" y="36" width="5" height="5" />
                  <rect x="61" y="36" width="10" height="5" />
                  <rect x="76" y="36" width="5" height="10" />
                  <rect x="86" y="36" width="8" height="5" />

                  <rect x="8" y="46" width="5" height="10" />
                  <rect x="18" y="51" width="10" height="5" />
                  <rect x="36" y="51" width="5" height="10" />
                  <rect x="46" y="46" width="15" height="5" />
                  <rect x="66" y="46" width="5" height="15" />
                  <rect x="76" y="51" width="10" height="5" />

                  <rect x="36" y="66" width="10" height="5" />
                  <rect x="51" y="66" width="5" height="10" />
                  <rect x="61" y="76" width="10" height="5" />
                  <rect x="76" y="66" width="10" height="10" />
                  <rect x="91" y="76" width="4" height="10" />

                  <rect x="36" y="76" width="5" height="10" />
                  <rect x="46" y="86" width="10" height="5" />
                  <rect x="61" y="86" width="15" height="5" />
                  <rect x="81" y="81" width="10" height="10" fill="#004a99" />
                </svg>

                {/* Center Sparkle Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-7 h-7 rounded-full bg-yellow-400 p-0.5 shadow-md flex items-center justify-center border-2 border-white">
                    <Sparkles className="w-3.5 h-3.5 text-[#004a99]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Label below QR */}
            <div className="mt-2 text-center">
              <span className="text-xs sm:text-sm font-serif font-black tracking-widest text-white uppercase drop-shadow-md">
                SCAN HERE TO APPLY
              </span>
            </div>

            {/* View Programs Pill */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setIsProgramsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 text-[11px] font-bold text-white shadow-md transition-all cursor-pointer"
              >
                <span>View Program Details & Fees</span>
                <ChevronRight className="w-3 h-3 text-yellow-300" />
              </button>
            </div>
          </div>

          {/* Bottom Solid Blue Contact Strip */}
          <div className="relative z-10 bg-[#0080c6] text-white px-4 py-3 sm:px-8 sm:py-3.5 flex flex-wrap items-center justify-around gap-3 text-xs sm:text-sm font-semibold shadow-lg">
            {/* Phone */}
            <a
              href="tel:+919880147004"
              className="flex items-center gap-2 hover:text-yellow-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Phone className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="tracking-wide">+91 9880147004</span>
            </a>

            {/* Email */}
            <a
              href="mailto:admissions@dsuonline.com"
              className="flex items-center gap-2 hover:text-yellow-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-white" />
              </div>
              <span>admissions@dsuonline.com</span>
            </a>

            {/* Website */}
            <a
              href="https://www.dsuonline.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-yellow-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-white" />
              </div>
              <span>www.dsuonline.com</span>
            </a>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Authentic Sagar University Login Portal */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-20 border-l border-slate-200">
          
          <div className="w-full max-w-sm mx-auto space-y-5">
            
            {/* Top University Portal Branding Logo */}
            <div className="flex items-center gap-3 pt-2">
              <div className="w-12 h-12 rounded-full bg-yellow-400 p-0.5 shadow-md flex items-center justify-center shrink-0 border border-yellow-500">
                <div className="w-full h-full rounded-full bg-[#004a99] flex flex-col items-center justify-center text-yellow-300">
                  <GraduationCap className="w-5 h-5 text-yellow-300" />
                </div>
              </div>
              <div className="leading-tight">
                <h2 className="text-[11px] font-serif font-black tracking-wider text-slate-800 uppercase">
                  {BRANDING.UNIVERSITY_NAME_LINE_1}
                </h2>
                <h3 className="text-lg font-serif font-extrabold tracking-wider text-[#004a99]">
                  {BRANDING.UNIVERSITY_NAME_LINE_2}
                </h3>
              </div>
            </div>

            {/* Quick 1-Click Demo Accounts Switcher */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <span>Quick 1-Click Demo Access</span>
                <span className="text-[9px] text-teal-700 font-semibold">Ready to Test</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('student')}
                  className={`p-1.5 rounded-md border text-left flex flex-col transition-all cursor-pointer ${
                    activeDemoRole === 'student'
                      ? 'bg-teal-50 border-teal-500 text-teal-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-teal-600" /> Student
                  </span>
                  <span className="text-[9px] text-slate-500 truncate">1DT23CS238</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('faculty')}
                  className={`p-1.5 rounded-md border text-left flex flex-col transition-all cursor-pointer ${
                    activeDemoRole === 'faculty'
                      ? 'bg-purple-50 border-purple-500 text-purple-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    <Users className="w-3 h-3 text-purple-600" /> Staff
                  </span>
                  <span className="text-[9px] text-slate-500 truncate">Dr. Sharma</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className={`p-1.5 rounded-md border text-left flex flex-col transition-all cursor-pointer ${
                    activeDemoRole === 'admin'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-[11px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-600" /> Admin
                  </span>
                  <span className="text-[9px] text-slate-500 truncate">Director</span>
                </button>
              </div>
            </div>

            {/* Auth Error Banner if any */}
            {authError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* Login Form matching screenshot */}
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              
              {/* Role Radio buttons */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-800">
                  <span className="text-red-500 font-bold">*</span>Role
                </label>
                <div className="flex items-center gap-6 pt-0.5">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="loginRole"
                      value="staff"
                      checked={role === 'staff'}
                      onChange={() => handleRoleChange('staff')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Staff</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="loginRole"
                      value="student"
                      checked={role === 'student'}
                      onChange={() => handleRoleChange('student')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Student</span>
                  </label>
                </div>
              </div>

              {/* Username Input */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-800">
                  <span className="text-red-500 font-bold">*</span>Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={role === 'staff' ? 'Mobile No. / Email / Staff Code' : 'USN / Registration No. / Email'}
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all font-sans"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-800">
                  <span className="text-red-500 font-bold">*</span>Password
                  <span
                    title="Enter your institutional account password"
                    className="text-emerald-600 hover:text-emerald-700 cursor-help"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </label>
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xs text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Show Password Checkbox */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="showPasswordToggle"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded-xs border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="showPasswordToggle" className="text-xs text-slate-600 cursor-pointer select-none">
                  Show Password
                </label>
              </div>

              {/* Action Buttons Row matching colors in screenshot */}
              <div className="pt-2 grid grid-cols-3 gap-2">
                {/* 1. Login (Teal #26a69a) */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-2 rounded-xs bg-[#26a69a] hover:bg-[#00897b] text-white text-xs font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer text-center disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isSubmitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Login'}
                </button>

                {/* 2. Forgot Password (Red #e53935) */}
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(true)}
                  className="py-1.5 px-2 rounded-xs bg-[#e53935] hover:bg-[#d32f2f] text-white text-[11px] font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer text-center"
                >
                  Forgot Password
                </button>

                {/* 3. Login with OTP (Blue #1e88e5) */}
                <button
                  type="button"
                  onClick={() => {
                    setOtpIdentifier(username || 'alex.kumar@univ.edu')
                    setIsOtpModalOpen(true)
                  }}
                  className="py-1.5 px-2 rounded-xs bg-[#1e88e5] hover:bg-[#1565c0] text-white text-[11px] font-semibold transition-all shadow-2xs hover:shadow-xs cursor-pointer text-center"
                >
                  Login with ODP
                </button>
              </div>

              {/* Real Create Account / Registration Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(true)}
                  className="w-full py-1.5 px-3 rounded-xs bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-blue-900 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Users className="w-3.5 h-3.5 text-blue-700" />
                  <span>New Student / Faculty? Create Account</span>
                </button>
              </div>
            </form>

            {/* Google Chrome recommendation */}
            <p className="text-[11px] text-slate-500 text-center font-normal pt-1">
              Please use Google Chrome for better experience
            </p>

            {/* System Maintenance Notice Box matching pink/salmon design */}
            <div className="p-3 bg-[#ffebee] border border-[#ffcdd2] rounded-xs text-[#c62828] text-[11px] font-medium text-center leading-snug flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-[#c62828]" />
              <span>System will be under maintenance everyday between <strong>11:55 PM to 12:30 AM</strong>.</span>
            </div>

            {/* Mobile App Download Section */}
            <div className="pt-2 space-y-2 text-center">
              <p className="text-xs font-bold text-slate-800">
                Download {role === 'staff' ? 'Staff' : 'Student'} App
              </p>
              
              <div className="flex items-center justify-center gap-3">
                {/* Google Play Store Badge */}
                <a
                  href="https://play.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-md transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  <div className="text-left leading-none">
                    <div className="text-[7px] uppercase tracking-wider text-slate-300">GET IT ON</div>
                    <div className="text-[10px] font-bold">Google Play</div>
                  </div>
                </a>

                {/* Apple App Store Badge */}
                <a
                  href="https://apple.com/app-store"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-md transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M15.97,5.17C16.6,4.4 17.03,3.33 16.91,2.26C15.97,2.3 14.8,2.89 14.13,3.67C13.54,4.35 13.03,5.45 13.17,6.5C14.22,6.58 15.34,5.94 15.97,5.17Z" />
                  </svg>
                  <div className="text-left leading-none">
                    <div className="text-[7px] uppercase tracking-wider text-slate-300">Download on the</div>
                    <div className="text-[10px] font-bold">App Store</div>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Footer Copyright */}
          <div className="pt-4 text-center text-[10px] text-slate-400">
            {BRANDING.FOOTER_COPYRIGHT}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Admission Application Form (Data Collection for July 2026 Batch) */}
      {/* ========================================================================= */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            
            <div className="bg-[#004a99] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-[#004a99]">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-bold">Apply for July 2026 Batch</h3>
                  <p className="text-xs text-yellow-300">{BRANDING.UNIVERSITY_NAME} Online Programs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsApplyModalOpen(false)
                  setApplicationSubmitted(false)
                }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[80vh] overflow-y-auto">
              {applicationSubmitted ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-900">Application Submitted Successfully!</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Your inquiry for <strong>{applyForm.program}</strong> has been logged in the university admissions registry. A counselor will reach out shortly.
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs space-y-1">
                    <div className="font-semibold text-slate-800">Admissions Helpline:</div>
                    <div className="text-slate-600">📞 +91 9880147004</div>
                    <div className="text-slate-600">✉️ admissions@dsuonline.com</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsApplyModalOpen(false)
                      setApplicationSubmitted(false)
                    }}
                    className="px-5 py-2 bg-[#004a99] hover:bg-[#003366] text-white rounded-lg text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplySubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    
                    {/* Full Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="text-red-500 font-bold">*</span>Full Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rohan Sharma"
                        value={applyForm.full_name}
                        onChange={(e) => setApplyForm({ ...applyForm, full_name: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Program Selection */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="text-red-500 font-bold">*</span>Program
                      </label>
                      <select
                        value={applyForm.program}
                        onChange={(e) => setApplyForm({ ...applyForm, program: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 bg-white"
                      >
                        <option value="MBA">MBA - Master of Business Administration</option>
                        <option value="MCA">MCA - Master of Computer Applications</option>
                        <option value="BBA">BBA - Bachelor of Business Administration</option>
                        <option value="BCA">BCA - Bachelor of Computer Applications</option>
                        <option value="B.Com">B.Com - Bachelor of Commerce (Hons)</option>
                        <option value="B.Tech">B.Tech - Bachelor of Technology (CSE & AI)</option>
                      </select>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="text-red-500 font-bold">*</span>Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="applicant@example.com"
                        value={applyForm.email}
                        onChange={(e) => setApplyForm({ ...applyForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        <span className="text-red-500 font-bold">*</span>Mobile Number
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 9876543210"
                        value={applyForm.phone}
                        onChange={(e) => setApplyForm({ ...applyForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Previous Qualification */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Qualification</label>
                      <input
                        type="text"
                        placeholder="e.g. BCA / B.Sc / 12th"
                        value={applyForm.previous_qualification || ''}
                        onChange={(e) => setApplyForm({ ...applyForm, previous_qualification: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Percentage */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Marks Percentage (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        placeholder="e.g. 80.5"
                        value={applyForm.percentage ?? ''}
                        onChange={(e) => setApplyForm({ ...applyForm, percentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* State */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">State</label>
                      <input
                        type="text"
                        placeholder="e.g. Karnataka"
                        value={applyForm.state || ''}
                        onChange={(e) => setApplyForm({ ...applyForm, state: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">City</label>
                      <input
                        type="text"
                        placeholder="e.g. Bengaluru"
                        value={applyForm.city || ''}
                        onChange={(e) => setApplyForm({ ...applyForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Query / Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Interested in AI specialization"
                      value={applyForm.query_notes || ''}
                      onChange={(e) => setApplyForm({ ...applyForm, query_notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="w-full py-2.5 bg-[#004a99] hover:bg-[#003366] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>Submit Application (July 2026 Batch)</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Login with OTP */}
      {/* ========================================================================= */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            
            <div className="bg-[#1e88e5] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                <h3 className="text-sm font-bold">One Time Password (ODP / OTP) Login</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-3">
                  <p className="text-xs text-slate-600">
                    Enter your registered university email or student USN to receive an OTP code.
                  </p>
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Email or USN</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. alex.kumar@univ.edu or 1DT23CS238"
                      value={otpIdentifier}
                      onChange={(e) => setOtpIdentifier(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isOtpSending}
                    className="w-full py-2 bg-[#1e88e5] hover:bg-[#1565c0] text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isOtpSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send Verification Code</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-800 space-y-1">
                    <div className="font-semibold">Code sent to: {otpIdentifier}</div>
                    {generatedDemoOtp && (
                      <div className="text-[11px] text-blue-700">
                        Demo OTP Code: <strong className="font-mono text-sm">{generatedDemoOtp}</strong>
                        <button
                          type="button"
                          onClick={() => setOtpCode(generatedDemoOtp)}
                          className="ml-2 text-blue-600 underline font-bold"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="••••••"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md text-center font-mono text-base tracking-widest focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="w-1/3 py-2 border border-slate-300 text-slate-700 font-semibold rounded-md text-xs hover:bg-slate-50 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isOtpVerifying}
                      className="w-2/3 py-2 bg-[#26a69a] hover:bg-[#00897b] text-white font-bold rounded-md text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    >
                      {isOtpVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>Verify & Login</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Forgot Password Modal */}
      {/* ========================================================================= */}
      {isForgotPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            
            <div className="bg-[#e53935] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                <h3 className="text-sm font-bold">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordModalOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleForgotPasswordSubmit} className="p-5 space-y-3">
              <p className="text-xs text-slate-600">
                Enter your institutional username, USN, or registered email address to receive reset instructions.
              </p>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Username / USN / Email</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1DT23CS238 or alex.kumar@univ.edu"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-red-500"
                />
              </div>
              
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 space-y-1">
                <div className="font-semibold text-slate-700">Support Helpline:</div>
                <div>📞 +91 9880147004</div>
                <div>✉️ admissions@dsuonline.com</div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordModalOpen(false)}
                  className="w-1/2 py-2 border border-slate-300 text-slate-700 font-semibold rounded-md text-xs hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="w-1/2 py-2 bg-[#e53935] hover:bg-[#d32f2f] text-white font-bold rounded-md text-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  {isForgotSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: Program Details & Fee Structure */}
      {/* ========================================================================= */}
      {isProgramsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            
            <div className="bg-[#004a99] text-white p-4 sm:p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-serif font-bold">{BRANDING.UNIVERSITY_SHORT_NAME} Online Academic Programs • July 2026 Batch</h3>
                <p className="text-xs text-yellow-300">UGC Entitled & NAAC A+ Graded Degrees</p>
              </div>
              <button
                type="button"
                onClick={() => setIsProgramsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(portalStats?.programs_offered || [
                  { code: 'MBA', name: 'Master of Business Administration', duration: '2 Years', eligibility: '50% in Any Graduation', batch: 'July 2026 Batch', mode: 'Online / Hybrid', fee_per_sem: '₹ 45,000 / sem' },
                  { code: 'MCA', name: 'Master of Computer Applications', duration: '2 Years', eligibility: 'BCA / B.Sc / B.Tech', batch: 'July 2026 Batch', mode: 'AI-Integrated Online', fee_per_sem: '₹ 40,000 / sem' },
                  { code: 'BBA', name: 'Bachelor of Business Administration', duration: '3 Years', eligibility: '10+2 Pass', batch: 'July 2026 Batch', mode: 'Interactive LMS', fee_per_sem: '₹ 30,000 / sem' },
                  { code: 'BCA', name: 'Bachelor of Computer Applications', duration: '3 Years', eligibility: '10+2 with Maths / CS', batch: 'July 2026 Batch', mode: 'Cloud & Coding Labs', fee_per_sem: '₹ 32,000 / sem' },
                  { code: 'B.Com', name: 'Bachelor of Commerce (Hons)', duration: '3 Years', eligibility: '10+2 Commerce / Science', batch: 'July 2026 Batch', mode: 'Industry Certifications', fee_per_sem: '₹ 28,000 / sem' },
                  { code: 'B.Tech', name: 'Bachelor of Technology (Computer Science & AI)', duration: '4 Years', eligibility: '10+2 with PCM', batch: 'July 2026 Batch', mode: 'Interactive LMS & Labs', fee_per_sem: '₹ 55,000 / sem' },
                ]).map((prog) => (
                  <div
                    key={prog.code}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-500 hover:shadow-xs transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-xs bg-[#004a99] text-white font-bold text-xs">
                        {prog.code}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">{prog.fee_per_sem}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{prog.name}</h4>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div>⏱ Duration: {prog.duration}</div>
                      <div>🎓 Eligibility: {prog.eligibility}</div>
                      <div>💻 Mode: {prog.mode}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setApplyForm(prev => ({ ...prev, program: prog.code }))
                        setIsProgramsModalOpen(false)
                        setIsApplyModalOpen(true)
                      }}
                      className="w-full mt-2 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold rounded-xs text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Apply For {prog.code}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real Account Registration Modal */}
      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={(registeredEmail) => {
          setUsername(registeredEmail)
          setPassword('')
          toast.success('Account Ready', `Account created for ${registeredEmail}. Please sign in.`)
        }}
      />
    </div>
  )
}

export default LoginPage
