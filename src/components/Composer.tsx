'use client'

import { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { UploadDropzone } from './UploadDropzone'
import { cn } from '@/lib/utils'

interface ComposerProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [text])

  return (
    <div className="p-3">
        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm rounded-2xl p-3 border border-gray-200/50 shadow-lg overflow-visible pr-2">
          <UploadDropzone />
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Take me to the moment your story begins…"
            className={cn(
              "composer-textarea flex-1 min-h-[56px] max-h-32 resize-none border-0 bg-white/70 backdrop-blur-sm focus:bg-white rounded-xl transition-all duration-200 text-sm sm:text-base",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
              className={cn(
                "send-button-shine h-10 w-10 rounded-full transition-all duration-300 shadow-xl flex items-center justify-center flex-shrink-0 relative overflow-visible",
                !text.trim() || disabled
                  ? "bg-white cursor-not-allowed shadow-sky-200/50"
                  : "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 hover:scale-110 active:scale-95 hover:shadow-2xl cursor-pointer shadow-blue-500/50"
              )}
              style={{ 
                marginRight: '10px',
                border: !text.trim() || disabled ? '2px solid #0ea5e9' : '2px solid #60a5fa',
                borderRadius: '30%',
                boxShadow: !text.trim() || disabled 
                  ? '0 4px 14px 0 rgba(14, 165, 233, 0.3)' 
                  : '0 4px 14px 0 rgba(96, 165, 250, 0.4)'
              }}
          >
            {disabled ? (
              <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
            ) : !text.trim() ? (
              <Send className="h-5 w-5 text-sky-500 drop-shadow-xl" />
            ) : (
              <Send className="h-5 w-5 text-white drop-shadow-xl" />
            )}
          </button>
        </div>
    </div>
  )
}
