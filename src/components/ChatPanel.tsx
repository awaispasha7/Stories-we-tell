'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageBubble, BubbleProps } from './MessageBubble'
import { Composer } from './Composer'
import { useDossierRefresh } from '@/lib/dossier-context'
import { useAuth } from '@/lib/auth-context'
import { useSession } from '@/hooks/useSession'
// import { useChatStore } from '@/lib/store' // Unused for now
// import { Loader2 } from 'lucide-react' // Unused import

interface ChatPanelProps {
  _sessionId?: string
  _projectId?: string
}

export function ChatPanel({ _sessionId, _projectId }: ChatPanelProps) {
  const { user, isAuthenticated } = useAuth()
  const { 
    isSessionExpired, 
    getSessionInfo 
  } = useSession()
  
  const [messages, setMessages] = useState<BubbleProps[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help bring your story to life. What story idea has been on your mind?"
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [typingMessage, setTypingMessage] = useState('')
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  
  // Local state to track current session and project for this chat
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(_sessionId || undefined)
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(_projectId || undefined)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { triggerRefresh } = useDossierRefresh()
  // const _send = useChatStore(s => s.send) // Unused for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load existing messages when session changes
  useEffect(() => {
    const loadSessionMessages = async () => {
      console.log('🔄 ChatPanel loadSessionMessages called:', { 
        _sessionId, 
        isAuthenticated, 
        userId: user?.user_id 
      })
      
      // If _sessionId is empty string, reset to initial state (new chat)
      if (_sessionId === '') {
        console.log('🆕 Resetting to new chat state')
        setMessages([
          {
            role: 'assistant',
            content: "Hi! I'm here to help bring your story to life. What story idea has been on your mind?"
          }
        ])
        // Reset local session tracking for new chat
        setCurrentSessionId(undefined)
        setCurrentProjectId(undefined)
        return
      }
      
      // Update local state when props change (e.g., switching to existing chat)
      setCurrentSessionId(_sessionId || undefined)
      setCurrentProjectId(_projectId || undefined)

      // If no session ID or not authenticated, don't load messages
      if (!_sessionId || !isAuthenticated || !user?.user_id) {
        console.log('❌ Skipping message load:', { 
          hasSessionId: !!_sessionId, 
          isAuthenticated, 
          hasUserId: !!user?.user_id 
        })
        return
      }

      try {
        console.log('📥 Loading messages for session:', _sessionId)
        const { sessionApi } = await import('@/lib/api')
        const messages = await sessionApi.getSessionMessages(_sessionId, 50, 0) as Array<{
          role: string;
          content: string;
          created_at: string;
        }>
        
        console.log('📨 Messages received:', messages)
        
        if (messages && Array.isArray(messages) && messages.length > 0) {
          const formattedMessages = messages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
            timestamp: msg.created_at
          }))
          console.log('✅ Setting formatted messages:', formattedMessages)
          setMessages(formattedMessages)
        } else {
          console.log('⚠️ No messages found for session')
        }
      } catch (error) {
        console.error('❌ Failed to load session messages:', error)
      }
    }

    loadSessionMessages()
  }, [_sessionId, isAuthenticated, user?.user_id])

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
    
    // Use a deterministic approach based on message content to avoid hydration issues
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
    
    // Use message length and first character to create deterministic selection
    const hash = message.length + (message.charCodeAt(0) || 0)
    const index = hash % casualMessages.length
    return casualMessages[index]
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (text: string) => {
    console.log(`[DEBUG] handleSendMessage called with text: "${text}"`)
    console.log(`[DEBUG] isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}, isSessionExpired: ${isSessionExpired}`)
    
    if (!text.trim() || isLoading) {
      console.log(`[DEBUG] Early return - text empty or loading`)
      return
    }

    // Check if session is expired for anonymous users
    if (!isAuthenticated && isSessionExpired) {
      console.log(`[DEBUG] Session expired, showing sign-in prompt`)
      setShowSignInPrompt(true)
      return
    }

    // Add user message
    const userMessage: BubbleProps = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    
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
      
      // For authenticated users, use local state (which tracks session across messages)
      // For anonymous users, use session info from useSession hook
      let sessionId, projectId
      if (isAuthenticated) {
        // For authenticated users, use local state which persists across messages
        sessionId = currentSessionId
        projectId = currentProjectId
      } else {
        // For anonymous users, use session info from useSession hook
        const sessionInfo = getSessionInfo()
        sessionId = sessionInfo.sessionId
        projectId = sessionInfo.projectId
      }
      
      console.log(`[DEBUG] Session logic - isAuthenticated: ${isAuthenticated}`)
      console.log(`[DEBUG] ChatPanel props - _sessionId: ${_sessionId}, _projectId: ${_projectId}`)
      console.log(`[DEBUG] Local state - currentSessionId: ${currentSessionId}, currentProjectId: ${currentProjectId}`)
      console.log(`[DEBUG] Final values - sessionId: ${sessionId}, projectId: ${projectId}`)
      
      console.log(`[DEBUG] Making API call to /api/chat`)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add session headers for anonymous users only
          ...(sessionId && !isAuthenticated && { 'X-Session-ID': sessionId }),
          ...(user?.user_id && { 'X-User-ID': user.user_id })
        },
        body: JSON.stringify({ 
          text,
          session_id: sessionId,
          project_id: projectId,
          user_id: user?.user_id || undefined
        }),
        signal: controller.signal,
      })
      
      console.log(`[DEBUG] API call body:`, {
        text,
        session_id: sessionId,
        project_id: projectId,
        user_id: user?.user_id || undefined
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
      // let chunkCount = 0
      let streamComplete = false

      // console.log('🟢 Starting to read stream...')

      while (!streamComplete) {
        const { done, value } = await reader.read()
        
        if (done) {
          // console.log('🔚 Stream reading completed')
          break
        }

        // chunkCount++
        const chunk = decoder.decode(value)
        // console.log(`📥 Received chunk:`, chunk)
        
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('📦 Parsed data:', data)
              
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
              } else if (data.type === 'metadata') {
                // Handle metadata chunk - store session_id and project_id for next message
                console.log('📋 Received metadata:', data.metadata)
                if (data.metadata?.session_id) {
                  console.log('💾 Storing session_id from metadata:', data.metadata.session_id)
                  setCurrentSessionId(data.metadata.session_id)
                }
                if (data.metadata?.project_id) {
                  console.log('💾 Storing project_id from metadata:', data.metadata.project_id)
                  setCurrentProjectId(data.metadata.project_id)
                }
              }
            } catch (e) {
              console.error('❌ Error parsing streaming data:', e, 'Line:', line)
            }
          }
        }
      }
      
      // console.log(`🎯 Final assistant content: "${assistantContent}"`)
      
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
      
      // Trigger dossier refresh after AI response completes
      // Add a small delay to ensure backend dossier update is finished
      setTimeout(() => {
        triggerRefresh()
      }, 2000) // 2 second delay to ensure backend processing is complete
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

          {/* Sign-in Prompt for Anonymous Users */}
          {showSignInPrompt && (
            <div className="flex items-start gap-3 mb-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="h-9 w-9 flex items-center justify-center flex-shrink-0 mt-1 ml-4">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-300 flex items-center justify-center">
                  <span className="text-xs font-bold text-amber-800">⏰</span>
                </div>
              </div>
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4 max-w-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-semibold text-amber-700">Session Expired</span>
                </div>
                <p className="text-sm text-amber-800 mb-3">
                  Your anonymous session has expired. Sign in to save your chats and continue your story development.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSignInPrompt(false)}
                    className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors"
                  >
                    Continue Anonymously
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Navigate to sign-in page
                      console.log('Navigate to sign-in')
                    }}
                    className="px-3 py-1 text-xs bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
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
