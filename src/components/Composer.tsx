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
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
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
    setText(transcript)
    setShowAudioRecorder(false)
    // Auto-send the transcribed text
    if (transcript.trim()) {
      onSend(transcript)
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
        {/* Audio Recorder */}
        {showAudioRecorder && (
          <div className="mb-2 sm:mb-3">
            <AudioRecorder 
              onAudioData={handleAudioData}
              disabled={disabled}
            />
          </div>
        )}
        
        <div className={`flex items-center gap-1 sm:gap-2 md:gap-3 ${colors.glassBackground} backdrop-blur-sm rounded-t-none rounded-b-2xl p-1.5 sm:p-2 md:p-3 border ${colors.glassBorder} shadow-lg overflow-visible`}>
          <UploadDropzone />
          <button
            type="button"
            onClick={() => setShowAudioRecorder(!showAudioRecorder)}
            disabled={disabled}
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 md:h-[56px] md:w-[56px] rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0",
              showAudioRecorder 
                ? "bg-blue-500 text-white shadow-lg" 
                : resolvedTheme === 'light'
                  ? "bg-white/70 hover:bg-blue-50 border-2 border-dashed border-gray-300 hover:border-blue-400"
                  : "bg-slate-700/70 hover:bg-slate-600 border-2 border-dashed border-slate-500 hover:border-sky-400"
            )}
          >
            <Mic className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 ${showAudioRecorder ? 'text-white' : resolvedTheme === 'light' ? 'text-gray-600' : 'text-slate-300'}`} />
          </button>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isSmallScreen ? "Take me to the mo…" : "Take me to the moment your story begins…"}
            className={cn(
              `composer-textarea flex-1 min-w-0 max-h-32 resize-none border-0 ${colors.inputBackground} backdrop-blur-sm focus:${colors.inputBackground} rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${colors.text} px-2 sm:px-3 py-2 sm:py-3`,
              resolvedTheme === 'light' 
                ? 'placeholder-gray-500 placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base' 
                : 'placeholder-slate-300 placeholder:text-xs sm:placeholder:text-sm md:placeholder:text-base',
              disabled && "opacity-50 cursor-not-allowed"
            )}
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
