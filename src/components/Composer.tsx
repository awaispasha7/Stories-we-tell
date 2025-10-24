'use client'

import { useState, useRef, useEffect } from 'react'
// import { Textarea } from '@/components/ui/textarea' // Removed - using custom styling
import { Send, Loader2, Mic } from 'lucide-react'
import { UploadDropzone } from './UploadDropzone'
import { AudioRecorder } from './AudioRecorder'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { cn } from '@/lib/utils'

interface ComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
  sessionId?: string
  projectId?: string
}

export function Composer({ onSend, disabled = false, sessionId, projectId }: ComposerProps) {
  const [text, setText] = useState('')
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  // Check screen size for responsive placeholder
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 320)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Auto-focus textarea when component becomes enabled
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleSend = () => {
    if (!text.trim() || disabled) return
    onSend(text)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAudioData = (audioBlob: Blob, transcript: string) => {
    console.log('🎤 [COMPOSER] handleAudioData called with transcript:', transcript.substring(0, 50) + '...')
    console.log('🎤 [COMPOSER] Current sessionId:', sessionId, 'projectId:', projectId)
    setShowAudioRecorder(false)
    // Auto-send the transcribed text and clear the input
    if (transcript.trim()) {
      console.log('🎤 [COMPOSER] Calling onSend with transcript - ensuring session context is maintained')
      // Add a small delay to ensure session state is stable
      setTimeout(() => {
        onSend(transcript)
        setText('') // Clear the text area after sending
      }, 100)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text])

  return (
    <div className="p-2 sm:p-3">
        <div className={`flex items-center ${colors.glassBackground} backdrop-blur-sm rounded-t-none rounded-b-2xl p-1.5 sm:p-2 md:p-3 border ${colors.glassBorder} shadow-lg overflow-visible`}>
          <UploadDropzone sessionId={sessionId} projectId={projectId} />
          <div className="relative">
            {!showAudioRecorder ? (
              // Initial state - just the mic button
              <button
                type="button"
                onClick={() => {
                  setShowAudioRecorder(true)
                }}
                disabled={disabled}
                className={cn(
                  "h-10 w-10 sm:h-[56px] sm:w-[56px] hover:scale-105 active:scale-95 transition-all duration-200 rounded-lg sm:rounded-xl border-2 border-dashed shadow-sm hover:shadow-md flex items-center justify-center backdrop-blur-sm flex-shrink-0 border-gray-400 bg-white hover:border-blue-500 hover:bg-gray-50",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  backgroundColor: 'white',
                  borderColor: '#9ca3af',
                  minWidth: '40px',
                  minHeight: '40px'
                }}
              >
                <Mic 
                  className="h-4 w-4 sm:h-5 sm:w-5 transition-colors"
                  style={{
                    color: '#374151',
                    strokeWidth: 2
                  }}
                />
              </button>
            ) : (
              // Recording state - show the full AudioRecorder inline
              <AudioRecorder
                onAudioData={handleAudioData}
                onClose={() => setShowAudioRecorder(false)}
                sessionId={sessionId}
                projectId={projectId}
              />
            )}
          </div>
            <div className="w-2"></div>
            <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSmallScreen ? "Take me to the mo…" : "Take me to the moment your story begins…"}
            className={cn(
              `composer-textarea flex-1 min-w-0 h-10 resize-none border-0 ${colors.inputBackground} backdrop-blur-sm focus:${colors.inputBackground} rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${colors.text} px-2 sm:px-3 py-2 sm:py-3`,
              resolvedTheme === 'light' 
                ? 'placeholder-gray-500 placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base' 
                : 'placeholder-slate-300 placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base',
              disabled && "opacity-50 cursor-not-allowed"
            )}
            style={{
              caretColor: '#3b82f6',
              cursor: 'text',
              outline: 'none',
              textAlign: 'left',
              lineHeight: '1.4',
              paddingTop: '0.875rem',
              height: '100%',
            }}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
              className={cn(
                "send-button-shine h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-full transition-all duration-300 shadow-xl flex items-center justify-center flex-shrink-0 relative overflow-visible",
                !text.trim() || disabled
                  ? "bg-white cursor-not-allowed shadow-sky-200/50"
                  : "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 hover:scale-110 active:scale-95 hover:shadow-2xl cursor-pointer shadow-blue-500/50"
              )}
              style={{ 
                marginRight: '4px',
                border: !text.trim() || disabled ? '2px solid #0ea5e9' : '2px solid #60a5fa',
                borderRadius: '30%',
                boxShadow: !text.trim() || disabled 
                  ? '0 4px 14px 0 rgba(14, 165, 233, 0.3)' 
                  : '0 4px 14px 0 rgba(96, 165, 250, 0.4)'
              }}
          >
            {disabled ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin text-sky-500" />
            ) : !text.trim() ? (
              <Send className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-sky-500 drop-shadow-xl" />
            ) : (
              <Send className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-white drop-shadow-xl" />
            )}
          </button>
        </div>
    </div>
  )
}
