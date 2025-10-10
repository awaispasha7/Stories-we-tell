'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageBubble, BubbleProps } from './MessageBubble'
import { Composer } from './Composer'
// import { useChatStore } from '@/lib/store' // Unused for now
// import { Loader2 } from 'lucide-react' // Unused import

export function ChatPanel() {
  const [messages, setMessages] = useState<BubbleProps[]>([
    {
      role: 'assistant',
      content: "Welcome to Stories We Tell! I'm your cinematic intake assistant. I can help you develop characters, create scenes, write scripts, and structure your story. What's the story you'd like to tell today?"
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // const _send = useChatStore(s => s.send) // Unused for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    // Add user message
    const userMessage: BubbleProps = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    // Add empty assistant message that we'll stream into
    const assistantMessage: BubbleProps = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // Make streaming API call to backend with extended timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to get response from server')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      let chunkCount = 0

      console.log('🟢 Starting to read stream...')

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('🔚 Stream reading completed')
          break
        }

        chunkCount++
        const chunk = decoder.decode(value)
        console.log(`📥 Received chunk ${chunkCount}:`, chunk)
        
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('📦 Parsed data:', data)
              
              if (data.type === 'content') {
                assistantContent += data.content
                console.log(`📝 Content so far: "${assistantContent}"`)
                
                // Update the last message (assistant message) with new content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent
                  }
                  return newMessages
                })
              }
            } catch (e) {
              console.error('❌ Error parsing streaming data:', e, 'Line:', line)
            }
          }
        }
      }
      
      console.log(`🎯 Final assistant content: "${assistantContent}"`)
      
      // Check if we received any content - if not, show error message
      if (assistantContent.trim() === '') {
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: "I'm sorry, I didn't receive a proper response. Please try again."
          }
          return newMessages
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: BubbleProps = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please make sure the backend server is running and try again."
      }
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = errorMessage
        return newMessages
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white via-green-50/60 to-blue-50/40 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-70 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-56 h-56 bg-gradient-to-br from-green-400/80 to-green-500/60 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 -right-10 w-48 h-48 bg-gradient-to-br from-blue-400/70 to-blue-500/60 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 left-1/3 w-24 h-24 bg-gradient-to-br from-red-400/70 to-red-500/60 rounded-full blur-2xl animate-pulse delay-500"></div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
        <div className="w-full px-6 py-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl">🎬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to Stories We Tell</h2>
              <p className="text-gray-600 max-w-md leading-relaxed">
                I'm your cinematic intake assistant. I can help you develop characters, create scenes, write scripts, and structure your story.
              </p>
              <div className="mt-6 text-sm text-gray-500">
                Start by sharing your story idea or asking for help with character development
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              role={message.role}
              content={message.content}
            />
          ))}

          {/* Enhanced Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 mb-6 animate-in slide-in-from-bottom-2 duration-300 ml-8" style={{ marginTop: '2px', marginLeft: '16px' }}>
              <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 mt-1 ml-4">
                {/* <span className="text-xs font-bold text-green-800">SW</span> */}
              </div>
              <div className="flex items-center pt-2">
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '0ms' }}>C</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '100ms' }}>r</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '200ms' }}>a</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '300ms' }}>f</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '400ms' }}>t</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '500ms' }}>i</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '600ms' }}>n</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '700ms' }}>g</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '800ms' }}>&nbsp;</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '900ms' }}>y</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1000ms' }}>o</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1100ms' }}>u</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1200ms' }}>r</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1300ms' }}>&nbsp;</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1400ms' }}>s</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1500ms' }}>t</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1600ms' }}>o</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1700ms' }}>r</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1800ms' }}>y</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '1900ms' }}>.</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '2000ms' }}>.</span>
                  <span className="inline-block animate-pulse-wave" style={{ animationDelay: '2100ms' }}>.</span>
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

              {/* Enhanced Composer - Fixed at bottom */}
              <div className="border-t border-gray-200/50 bg-white/90 backdrop-blur-sm relative z-10 mt-auto">
                <div className="w-full overflow-hidden">
                  <Composer onSend={handleSendMessage} disabled={isLoading} />
                </div>
              </div>
    </div>
  )
}
