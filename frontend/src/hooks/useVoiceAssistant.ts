import { useState, useEffect, useRef, useCallback } from 'react'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error'

export interface VoiceAssistantOptions {
  language?: 'en' | 'kn' | 'hi'
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
  onAutoSubmit?: (transcript: string) => void
}

export function useVoiceAssistant({
  language = 'en',
  onResult,
  onError,
  onAutoSubmit,
}: VoiceAssistantOptions = {}) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)
  const onAutoSubmitRef = useRef(onAutoSubmit)
  const langRef = useRef(language)

  // Keep callback refs updated without re-triggering effect
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
    onAutoSubmitRef.current = onAutoSubmit
    langRef.current = language
  }, [onResult, onError, onAutoSubmit, language])

  // Map app languages to BCP-47 language tags
  const getLangCode = (lang: 'en' | 'kn' | 'hi') => {
    switch (lang) {
      case 'kn':
        return 'kn-IN'
      case 'hi':
        return 'hi-IN'
      case 'en':
      default:
        return 'en-US'
    }
  }

  // Initialize SpeechRecognition once
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = getLangCode(langRef.current)

      recognition.onstart = () => {
        setIsListening(true)
        setVoiceError(null)
      }

      recognition.onresult = (event: any) => {
        let currentTranscript = ''
        let isFinal = false

        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript
          if (event.results[i].isFinal) {
            isFinal = true
          }
        }

        setTranscript(currentTranscript)
        onResultRef.current?.(currentTranscript)

        if (isFinal && currentTranscript.trim()) {
          onAutoSubmitRef.current?.(currentTranscript.trim())
        }
      }

      recognition.onerror = (event: any) => {
        setIsListening(false)
        let errMsg = 'Speech recognition encountered an issue.'
        if (event.error === 'not-allowed') {
          errMsg = 'Microphone permission denied. Please allow microphone access in browser settings.'
        } else if (event.error === 'no-speech') {
          errMsg = 'No speech detected. Please speak clearly into the microphone.'
        } else if (event.error === 'audio-capture') {
          errMsg = 'No microphone device was found.'
        } else if (event.error === 'network') {
          errMsg = 'Network connection required for speech recognition.'
        }
        setVoiceError(errMsg)
        onErrorRef.current?.(errMsg)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
    } catch {
      setIsSupported(false)
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      const msg = 'Speech recognition is not supported in this browser. Please use Chrome/Edge or type your message.'
      setVoiceError(msg)
      onErrorRef.current?.(msg)
      return
    }

    setTranscript('')
    setVoiceError(null)

    try {
      recognitionRef.current.lang = getLangCode(langRef.current)
      recognitionRef.current.start()
    } catch (e: any) {
      try {
        recognitionRef.current.stop()
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.lang = getLangCode(langRef.current)
            recognitionRef.current.start()
          }
        }, 150)
      } catch {
        setVoiceError('Failed to initialize microphone. Please try again.')
      }
    }
  }, [])

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
    setIsListening(false)
  }, [])

  // Text-to-Speech (TTS)
  const speakText = useCallback(
    (text: string, langOverride?: 'en' | 'kn' | 'hi') => {
      if (!('speechSynthesis' in window)) {
        return
      }

      window.speechSynthesis.cancel()

      // Strip markdown formatting for cleaner speech output
      const cleanText = text
        .replace(/[*_#`~[\]]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\n+/g, '. ')
        .slice(0, 500)

      const utterance = new SpeechSynthesisUtterance(cleanText)
      utterance.lang = getLangCode(langOverride || langRef.current)
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      window.speechSynthesis.speak(utterance)
    },
    []
  )

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
  }, [])

  return {
    isListening,
    isSpeaking,
    transcript,
    voiceError,
    isSupported,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  }
}

export default useVoiceAssistant

