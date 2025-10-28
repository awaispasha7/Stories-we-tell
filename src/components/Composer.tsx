'use client'

import { useState, useRef, useEffect } from 'react'
// import { Textarea } from '@/components/ui/textarea' // Removed - using custom styling
import { Send, Loader2, Mic } from 'lucide-react'
import { UploadDropzone } from './UploadDropzone'
import { AudioRecorder } from './AudioRecorder'
import { SimpleAttachmentPreview } from './SimpleAttachmentPreview'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { cn } from '@/lib/utils'

interface AttachedFile {
  name: string
  size: number
  url: string
  type: string
  asset_id: string
}

interface ComposerProps {
  onSend: (message: string, attachedFiles?: AttachedFile[]) => void
  disabled?: boolean
  sessionId?: string
  projectId?: string
  editContent?: string
  isEditing?: boolean
  onEditComplete?: () => void
  editAttachedFiles?: AttachedFile[]
}

export function Composer({ onSend, disabled = false, sessionId, projectId, editContent, isEditing, onEditComplete, editAttachedFiles }: ComposerProps) {
  const [text, setText] = useState('')
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [isSmallScreen, setIsSmallScreen] = useState(false)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  // Check screen size for responsive placeholder and height
  useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 320)
      setIsLargeScreen(window.innerWidth >= 640) // sm breakpoint
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

  // Handle edit content and attached files
  useEffect(() => {
    if (isEditing && editContent) {
      setText(editContent)
      // Set attached files if provided
      if (editAttachedFiles && editAttachedFiles.length > 0) {
        setAttachedFiles(editAttachedFiles)
      }
      // Focus the textarea after setting content
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isEditing, editContent, editAttachedFiles])

  // Auto-focus textarea when files are attached
  useEffect(() => {
    if (attachedFiles.length > 0 && textareaRef.current) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [attachedFiles.length])

  const handleSend = () => {
    if ((!text.trim() && attachedFiles.length === 0) || disabled) return
    onSend(text.trim(), attachedFiles.length > 0 ? attachedFiles : undefined)
    setText('')
    setAttachedFiles([])
    // Clear edit state when message is sent
    if (isEditing && onEditComplete) {
      onEditComplete()
    }
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

  // Handle file attachments
  const handleFileAttached = (file: AttachedFile) => {
    setAttachedFiles(prev => [...prev, file])
  }

  const handleRemoveFile = (assetId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.asset_id !== assetId))
  }

  // Auto-resize textarea - DISABLED to maintain fixed height
  // useEffect(() => {
  //   if (textareaRef.current) {
  //     textareaRef.current.style.height = 'auto'
  //     textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
  //   }
  // }, [text])

  return (
    <div className="p-2 sm:p-3">
      {/* Attachment Preview - Above the composer */}
      {attachedFiles.length > 0 && (
        <div className="mb-3">
          <SimpleAttachmentPreview files={attachedFiles} onRemove={handleRemoveFile} />
        </div>
      )}
      
      <div className={`relative flex items-center backdrop-blur-sm rounded-t-none rounded-b-2xl p-1.5 sm:p-2 md:p-3 border ${colors.glassBorder} shadow-lg overflow-visible`} style={{ backgroundColor: resolvedTheme === 'light' ? 'rgba(255, 255, 255, 0.8)' : 'rgb(83, 93, 108)' }}>
        <UploadDropzone sessionId={sessionId} projectId={projectId} onFileAttached={handleFileAttached} />
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
                  "h-10 w-10 sm:h-[56px] sm:w-[56px] hover:scale-105 active:scale-95 transition-all duration-200 rounded-lg sm:rounded-xl border-2 border-dashed shadow-sm hover:shadow-md flex items-center justify-center backdrop-blur-sm flex-shrink-0",
                  resolvedTheme === 'light' 
                    ? "border-gray-400 bg-white hover:border-blue-500 hover:bg-gray-50" 
                    : "border-slate-500 bg-slate-800 hover:border-sky-400 hover:bg-slate-700",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                style={{
                  backgroundColor: resolvedTheme === 'light' ? 'white' : 'rgb(83, 93, 108)',
                  borderColor: resolvedTheme === 'light' ? '#9ca3af' : '#64748b',
                  width: isLargeScreen ? '56px' : '40px',
                  height: isLargeScreen ? '56px' : '40px',
                  minWidth: isLargeScreen ? '56px' : '40px',
                  minHeight: isLargeScreen ? '56px' : '40px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (resolvedTheme === 'dark') {
                    e.currentTarget.style.borderColor = '#0ea5e9' // sky-400
                  } else {
                    e.currentTarget.style.borderColor = '#3b82f6' // blue-500
                  }
                }}
                onMouseLeave={(e) => {
                  if (resolvedTheme === 'dark') {
                    e.currentTarget.style.borderColor = '#64748b' // slate-500
                  } else {
                    e.currentTarget.style.borderColor = '#9ca3af' // gray-400
                  }
                }}
              >
                <Mic 
                  className="h-4 w-4 sm:h-5 sm:w-5 transition-colors"
                  style={{
                    color: resolvedTheme === 'light' ? '#374151' : '#e2e8f0',
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
          <div className="w-1"></div>
            <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onClick={() => textareaRef.current?.focus()}
            placeholder={isSmallScreen ? "Take me to the mo…" : "Take me to the moment your story begins…"}
            className={cn(
              `composer-textarea flex-1 min-w-0 resize-none border-0 ${colors.inputBackground} backdrop-blur-sm focus:${colors.inputBackground} rounded-lg sm:rounded-xl transition-all duration-200 text-xs sm:text-sm md:text-base ${colors.text} px-2 sm:px-3 py-2 sm:py-3`,
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
              height: isLargeScreen ? '56px' : '40px', // sm:h-[56px] equivalent
              minHeight: isLargeScreen ? '56px' : '40px',
              maxHeight: isLargeScreen ? '56px' : '40px',
              paddingTop: isLargeScreen ? '16px' : '12px',
              paddingBottom: isLargeScreen ? '16px' : '12px',
              boxSizing: 'border-box',
              overflow: 'hidden',
              resize: 'none',
            }}
            disabled={disabled}
          />
          
          {/* Cancel button - only show when editing */}
          {isEditing && (
            <button
              type="button"
              onClick={onEditComplete}
              className={cn(
                "rounded-full transition-all duration-300 shadow-xl flex items-center justify-center flex-shrink-0 mr-2",
                "bg-gray-500 hover:bg-gray-600 hover:scale-110 active:scale-95 hover:shadow-2xl cursor-pointer shadow-gray-500/50"
              )}
              style={{ 
                width: isLargeScreen ? '56px' : '40px',
                height: isLargeScreen ? '56px' : '40px',
                borderRadius: '30%',
                boxShadow: '0 4px 14px 0 rgba(107, 114, 128, 0.3)',
                border: 'none',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: 'white',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease-in-out',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                boxSizing: 'border-box',
              }}
              title="Cancel edit"
            >
              <svg 
                className="h-4 w-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          
          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && attachedFiles.length === 0) || disabled}
              className={cn(
                "rounded-full transition-all duration-300 shadow-xl flex items-center justify-center flex-shrink-0 relative",
                (!text.trim() && attachedFiles.length === 0) || disabled
                  ? resolvedTheme === 'light' 
                    ? "bg-white cursor-not-allowed shadow-sky-200/50"
                    : "bg-[rgb(83,93,108)] cursor-not-allowed shadow-slate-500/50"
                  : "bg-linear-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 hover:scale-110 active:scale-95 hover:shadow-2xl cursor-pointer shadow-blue-500/50"
              )}
              style={{ 
                width: isLargeScreen ? '56px' : '40px',
                height: isLargeScreen ? '56px' : '40px',
                border: !text.trim() || disabled 
                  ? resolvedTheme === 'light' 
                    ? '2px solid #0ea5e9' 
                    : '2px solid #64748b'
                  : 'none',
                borderRadius: '30%',
                boxShadow: !text.trim() || disabled 
                  ? resolvedTheme === 'light'
                    ? '0 4px 14px 0 rgba(14, 165, 233, 0.3)'
                    : '0 4px 14px 0 rgba(100, 116, 139, 0.3)'
                  : '0 4px 14px 0 rgba(96, 165, 250, 0.4)'
              }}
          >
            {disabled ? (
              <Loader2 className={cn(
                "h-6 w-6 sm:h-7 sm:w-7 animate-spin drop-shadow-xl",
                resolvedTheme === 'light' ? "text-sky-500" : "text-slate-400"
              )} style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                margin: '0',
                padding: '0'
              }} />
            ) : !text.trim() ? (
              <Send className={cn(
                "h-4 w-4 sm:h-5 sm:w-5 drop-shadow-xl",
                resolvedTheme === 'light' ? "text-sky-500" : "text-slate-400"
              )} />
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-xl" />
            )}
          </button>
        </div>
    </div>
  )
}
