'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageBubble, BubbleProps } from './MessageBubble'
import { Composer } from './Composer'
import { useDossierRefresh } from '@/lib/dossier-context'
// import { useChatStore } from '@/lib/store' // Unused for now
// import { Loader2 } from 'lucide-react' // Unused import

export function ChatPanel() {
  const [messages, setMessages] = useState<BubbleProps[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help bring your story to life. What story idea has been on your mind?"
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [typingMessage, setTypingMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { triggerRefresh } = useDossierRefresh()
  // const _send = useChatStore(s => s.send) // Unused for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const getDynamicTypingMessage = (userMessage: string) => {
    const message = userMessage.toLowerCase()
    
    // Story development keywords
    const storyKeywords = [
      'character', 'plot', 'scene', 'setting', 'theme', 'conflict', 'resolution',
      'protagonist', 'antagonist', 'dialogue', 'script', 'story', 'narrative',
      'beginning', 'middle', 'end', 'climax', 'tension', 'drama', 'comedy',
      'thriller', 'romance', 'action', 'adventure', 'mystery', 'horror'
    ]
    
    // Check if user is talking about story development
    const isStoryDevelopment = storyKeywords.some(keyword => message.includes(keyword))
    
    if (isStoryDevelopment) {
      return "Crafting your story..."
    }
    
    // Casual conversation responses
    const casualMessages = [
      "Thinking...",
      "Cooking a response...",
      "Building blocks...",
      "Connecting dots...",
      "Processing...",
      "Weaving thoughts...",
      "Gathering ideas...",
      "Shaping words...",
      "Finding the right words...",
      "Putting pieces together...",
      "Brewing ideas...",
      "Spinning thoughts...",
      "Crafting a reply...",
      "Mixing concepts...",
      "Stirring creativity...",
      "Blending insights...",
      "Forming thoughts...",
      "Assembling ideas...",
      "Polishing words...",
      "Refining thoughts..."
    ]
    
    return casualMessages[Math.floor(Math.random() * casualMessages.length)]
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    // Add user message
    const userMessage: BubbleProps = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    
    // Trigger dossier refresh immediately after user message
    triggerRefresh()
    
    setIsLoading(true)
    
    // Set dynamic typing message
    const dynamicMessage = getDynamicTypingMessage(text)
    // console.log(`🎭 Selected typing message: "${dynamicMessage}"`)
    setTypingMessage(dynamicMessage)

    // Add empty assistant message that we'll stream into
    const assistantMessage: BubbleProps = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // Make streaming API call to backend with extended timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      // console.log('🔍 Response status:', response.status)
      // console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        throw new Error(`Failed to get response from server: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      let chunkCount = 0
      let streamComplete = false

      // console.log('🟢 Starting to read stream...')

      while (!streamComplete) {
        const { done, value } = await reader.read()
        
        if (done) {
          // console.log('🔚 Stream reading completed')
          break
        }

        chunkCount++
        const chunk = decoder.decode(value)
        // console.log(`📥 Received chunk ${chunkCount}:`, chunk)
        
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              // console.log('📦 Parsed data:', data)
              
              if (data.type === 'content') {
                assistantContent += data.content
                // console.log(`📝 Content so far: "${assistantContent}"`)
                
                // Update the last message (assistant message) with new content
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantContent
                  }
                  return newMessages
                })
                
                // Check if this is the final chunk
                if (data.done) {
                  // console.log('✅ Stream completed with done flag')
                  streamComplete = true
                  break
                }
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
      
      // Ensure loading state is cleared
      setIsLoading(false)
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
      setTypingMessage('')
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
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10 custom-scrollbar">
        <div className="w-full px-6 py-4">
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <span className="text-2xl">🎬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">Welcome to Stories We Tell</h2>
              <p className="text-gray-600 max-w-md leading-relaxed">
                Let's bring your story to life, one step at a time.
              </p>
              <div className="mt-6 text-sm text-gray-500">
                Share your story idea to get started
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

          {/* Dynamic Typing Indicator */}
          {isLoading && (
            <div className="flex items-start gap-3 mb-6 animate-in slide-in-from-bottom-2 duration-300 ml-8" style={{ marginTop: '2px', marginLeft: '16px' }}>
              <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 mt-1 ml-4">
                {/* <span className="text-xs font-bold text-green-800">SW</span> */}
              </div>
              <div className="flex items-center pt-2">
                <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
                  {typingMessage.split('').map((char, index) => (
                    <span 
                      key={index}
                      className="inline-block animate-pulse-wave" 
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  ))}
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
