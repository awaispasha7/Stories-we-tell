'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageBubble, BubbleProps } from './MessageBubble'
import { Composer } from './Composer'
import { useDossierRefresh } from '@/lib/dossier-context'
import { useAuth } from '@/lib/auth-context'
import { useSession } from '@/hooks/useSession'
import { sessionSyncManager } from '@/lib/session-sync'
// import { useChatStore } from '@/lib/store' // Unused for now
// import { Loader2 } from 'lucide-react' // Unused import

interface ChatPanelProps {
  _sessionId?: string
  _projectId?: string
  onSessionUpdate?: (sessionId: string, projectId?: string) => void
}

export function ChatPanel({ _sessionId, _projectId, onSessionUpdate }: ChatPanelProps) {
  const { user, isAuthenticated } = useAuth()
  const { 
    sessionId: hookSessionId, 
    projectId: hookProjectId,
    isSessionExpired, 
    getSessionInfo 
  } = useSession(_sessionId, _projectId)
  
  
  const [messages, setMessages] = useState<BubbleProps[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help bring your story to life. What story idea has been on your mind?"
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [typingMessage, setTypingMessage] = useState('')
  const [showSignInPrompt, setShowSignInPrompt] = useState(false)
  const [isProcessingMessage, setIsProcessingMessage] = useState(false)
  
  // Local state to track current session and project for this chat
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(_sessionId || undefined)
  const [currentProjectId, setCurrentProjectId] = useState<string | undefined>(_projectId || undefined)
  
  // Track previous session ID to detect changes
  const prevSessionIdRef = useRef<string | undefined>(_sessionId || undefined)
  
  // Use ref to store session ID for immediate access (bypasses React state async updates)
  const sessionIdRef = useRef<string | undefined>(_sessionId || undefined)
  
  // Sync local state with props when they change
  useEffect(() => {
    if (_sessionId !== currentSessionId) {
      console.log('🔄 [CHAT] Syncing sessionId from props:', _sessionId)
      setCurrentSessionId(_sessionId)
      sessionIdRef.current = _sessionId
    }
    if (_projectId !== currentProjectId) {
      console.log('🔄 [CHAT] Syncing projectId from props:', _projectId)
      setCurrentProjectId(_projectId)
    }
  }, [_sessionId, _projectId, currentSessionId, currentProjectId])

  // Sync local state with localStorage session changes
  useEffect(() => {
    const checkLocalStorageSession = () => {
      try {
        const stored = localStorage.getItem('stories_we_tell_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.sessionId) {
            console.log('🔄 [CHAT] Found session in localStorage:', parsed.sessionId)
            
            // Only use localStorage session if no specific session was provided via props
            // This prevents overriding when user clicks on a previous chat
            if (!_sessionId || _sessionId.trim() === '') {
              setCurrentSessionId(parsed.sessionId)
              sessionIdRef.current = parsed.sessionId
              if (parsed.projectId) {
                setCurrentProjectId(parsed.projectId)
              }
              
              // Notify parent component about the restored session
              if (onSessionUpdate) {
                console.log('🔄 [CHAT] Notifying parent about restored session:', parsed.sessionId)
                onSessionUpdate(parsed.sessionId, parsed.projectId)
              }
            } else {
              console.log('🔄 [CHAT] Skipping localStorage session because specific session provided via props:', _sessionId)
            }
          }
        }
      } catch (error) {
        console.error('Failed to check localStorage session:', error)
      }
    }

    // Check localStorage on mount
    checkLocalStorageSession()

    // Listen for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stories_we_tell_session') {
        // Only respond to storage changes if no specific session is provided via props
        if (!_sessionId || _sessionId.trim() === '') {
          checkLocalStorageSession()
        }
      }
    }

    // Listen for custom session update events
    const handleSessionUpdate = (event: CustomEvent) => {
      console.log('🔄 [CHAT] Received session update event:', event.detail)
      const { sessionId: newSessionId, projectId: newProjectId } = event.detail || {}
      if (newSessionId) {
        console.log('🔄 [CHAT] Updating session from event:', newSessionId)
        setCurrentSessionId(newSessionId)
        sessionIdRef.current = newSessionId
        if (newProjectId) {
          setCurrentProjectId(newProjectId)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('sessionUpdated', handleSessionUpdate as EventListener)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('sessionUpdated', handleSessionUpdate as EventListener)
    }
  }, []) // Empty dependency array to run only on mount
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { triggerRefresh } = useDossierRefresh()
  // const _send = useChatStore(s => s.send) // Unused for now

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }


  // Load existing messages when session changes
  useEffect(() => {
    const loadSessionMessages = async () => {
      // Only process if _sessionId prop has actually changed
      const currentPropSessionId = _sessionId || undefined
      if (currentPropSessionId === prevSessionIdRef.current) {
        // Session ID hasn't changed, don't reset anything
        return
      }
      
      // Session ID has changed, update the ref
      prevSessionIdRef.current = currentPropSessionId
      
      // If _sessionId is empty string, reset to initial state (new chat)
      if (_sessionId === '') {
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
      
      // For authenticated users with no session ID, create one immediately
      if (isAuthenticated && user && !_sessionId) {
        const newSessionId = crypto.randomUUID()
        setCurrentSessionId(newSessionId)
        sessionIdRef.current = newSessionId
      }

      // If no session ID, don't load messages
      if (!_sessionId) {
        return
      }

      try {
        const { sessionApi } = await import('@/lib/api')
        const messagesResponse = await sessionApi.getSessionMessages(_sessionId, 50, 0)
        console.log('📋 ChatPanel messages response:', messagesResponse)
        
        // Handle backend response structure: { success: true, messages: [...] }
        const messages = (messagesResponse as { messages?: unknown[] })?.messages || []
        
        if (messages && Array.isArray(messages) && messages.length > 0) {
          const formattedMessages = messages.map((msg: unknown) => {
            const message = msg as { role?: string; content?: string; created_at?: string }
            return {
              role: message.role as 'user' | 'assistant',
              content: message.content || '',
              timestamp: message.created_at
            }
          })
          setMessages(formattedMessages)
        }
      } catch (error) {
        console.error('Failed to load session messages:', error)
        
        // Use session sync manager to handle invalid sessions
        if (error && typeof error === 'object' && 'response' in error && 
            error.response && typeof error.response === 'object' && 'status' in error.response) {
          
          const status = error.response.status
          
          if (status === 403 || status === 404) {
            // Session is invalid, let the sync manager handle it
            console.log(`🚨 Session validation failed (${status}) - triggering sync cleanup`)
            console.log(`🚨 Invalid session ID: ${currentSessionId}`)
            
            // Clear the invalid session from localStorage immediately
            try {
              localStorage.removeItem('stories_we_tell_session')
              console.log('🧹 Cleared invalid session from localStorage')
            } catch (e) {
              console.error('Failed to clear session from localStorage:', e)
            }
            
            // Reset local state to reflect invalid session
            setMessages([
              {
                role: 'assistant',
                content: "Hi! I'm here to help bring your story to life. What story idea has been on your mind?"
              }
            ])
            setCurrentSessionId('')
            setCurrentProjectId('')
            sessionIdRef.current = ''
            
            // Trigger sync manager to clean up and find a valid session
            sessionSyncManager.forceSync()
          }
        }
      }
    }

    loadSessionMessages()
  }, [_sessionId, _projectId, isAuthenticated, user?.user_id, currentSessionId, user])

  // Sync hook session values with local state
  useEffect(() => {
    if (hookSessionId && hookProjectId) {
      console.log('🔄 [CHAT] Syncing hook session values:', hookSessionId, hookProjectId)
      setCurrentSessionId(hookSessionId)
      setCurrentProjectId(hookProjectId)
      sessionIdRef.current = hookSessionId
    }
  }, [hookSessionId, hookProjectId])

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
    if (!text.trim() || isLoading) {
      return
    }
    
    console.log('💬 [CHAT] handleSendMessage called with text:', text.substring(0, 50) + '...')
    console.log('💬 [CHAT] isAuthenticated:', isAuthenticated, 'hookSessionId:', hookSessionId, 'hookProjectId:', hookProjectId)
    console.log('💬 [CHAT] _sessionId prop:', _sessionId, '_projectId prop:', _projectId)
    console.log('💬 [CHAT] currentSessionId state:', currentSessionId, 'currentProjectId state:', currentProjectId)
    
    setIsProcessingMessage(true)

    // Check if session is expired for anonymous users
    if (!isAuthenticated && isSessionExpired) {
      setShowSignInPrompt(true)
      return
    }

    // Add user message
    const userMessage: BubbleProps = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    
    setIsLoading(true)
    
    // Set dynamic typing message
    const dynamicMessage = getDynamicTypingMessage(text)
    setTypingMessage(dynamicMessage)

    // Add empty assistant message that we'll stream into
    const assistantMessage: BubbleProps = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMessage])

    try {
      // Make streaming API call to backend with extended timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
      
      // Use session info from useSession hook for both authenticated and anonymous users
      let sessionId, projectId
      if (isAuthenticated) {
        // For authenticated users, prioritize currentSessionId (from selected chat) over hook values
        // This ensures that when a user clicks on a previous chat, messages are sent to that chat
        sessionId = currentSessionId || hookSessionId || sessionIdRef.current || localStorage.getItem('anonymous_session_id')
        projectId = currentProjectId || hookProjectId || localStorage.getItem('anonymous_project_id')
      } else {
        // For anonymous users, use session info from useSession hook
        const sessionInfo = getSessionInfo()
        sessionId = sessionInfo.sessionId
        projectId = sessionInfo.projectId
      }
      
      console.log('💬 [CHAT] Using sessionId:', sessionId, 'projectId:', projectId)
      
      // CRITICAL: Ensure we have a valid session before proceeding
      if (!sessionId) {
        console.error('💬 [CHAT] ERROR: No session ID available! This will create a new session.')
        console.error('💬 [CHAT] Available session sources:', {
          hookSessionId,
          sessionIdRef: sessionIdRef.current,
          currentSessionId,
          localStorageSession: localStorage.getItem('anonymous_session_id')
        })
        // Don't proceed without a session - this prevents creating new sessions
        throw new Error('No session ID available - cannot send message')
      }
      
      // Get headers for the request
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add session headers
      if (sessionId) {
        headers['X-Session-ID'] = sessionId
      }
      if (projectId) {
        headers['X-Project-ID'] = projectId
      }
      if (user?.user_id) {
        headers['X-User-ID'] = user.user_id
      }
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          text,
          session_id: sessionId,
          project_id: projectId
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to get response from server: ${response.status} - ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let assistantContent = ''
      let streamComplete = false

      while (!streamComplete) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        const chunk = decoder.decode(value)
        
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'content') {
                assistantContent += data.content
                
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
                  streamComplete = true
                  break
                }
              } else if (data.type === 'metadata') {
                // Handle metadata chunk - store session_id and project_id for next message
                if (data.metadata?.session_id) {
                  // Update both state and ref immediately
                  setCurrentSessionId(data.metadata.session_id)
                  sessionIdRef.current = data.metadata.session_id
                  
                  // Persist session to localStorage and ensure it completes before dispatching event
                  try {
                    const sessionData = {
                      sessionId: data.metadata.session_id,
                      projectId: data.metadata?.project_id,
                      isAuthenticated: isAuthenticated
                    }
                    
                    localStorage.setItem('stories_we_tell_session', JSON.stringify(sessionData))
                    console.log('💾 Session persisted to localStorage:', data.metadata.session_id)
                    
                    // Verify the localStorage write was successful
                    const stored = localStorage.getItem('stories_we_tell_session')
                    if (stored) {
                      const parsed = JSON.parse(stored)
                      if (parsed.sessionId === data.metadata.session_id) {
                        console.log('✅ localStorage verification successful')
                        
                        // Only dispatch event after localStorage is confirmed updated
                        setTimeout(() => {
                          window.dispatchEvent(new CustomEvent('sessionUpdated', { 
                            detail: { 
                              sessionId: data.metadata.session_id,
                              projectId: data.metadata?.project_id 
                            } 
                          }))
                          console.log('📡 Session update event dispatched:', data.metadata.session_id)
                          
                          // Also notify parent component if callback is provided
                          if (onSessionUpdate) {
                            onSessionUpdate(data.metadata.session_id, data.metadata?.project_id)
                          }
                        }, 50) // Small delay to ensure localStorage is fully written
                      } else {
                        console.error('❌ localStorage verification failed - session ID mismatch')
                      }
                    } else {
                      console.error('❌ localStorage verification failed - no stored data')
                    }
                  } catch (error) {
                    console.error('Failed to persist session:', error)
                  }
                }
                if (data.metadata?.project_id) {
                  setCurrentProjectId(data.metadata.project_id)
                }
              }
            } catch {
              // Error parsing streaming data
            }
          }
        }
      }
      
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
      console.error('Error sending message:', error)
      
      // Show specific error message for session issues
      let errorContent = "I'm sorry, I encountered an error. Please make sure the backend server is running and try again."
      
      if (error instanceof Error && error.message.includes('No session ID available')) {
        errorContent = 'Session error: Please refresh the page and try again. Your conversation will be preserved.'
      }
      
      const errorMessage: BubbleProps = {
        role: 'assistant',
        content: errorContent
      }
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = errorMessage
        return newMessages
      })
    } finally {
      setIsLoading(false)
      setIsProcessingMessage(false)
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
                  <Composer onSend={handleSendMessage} disabled={isLoading || isProcessingMessage} sessionId={hookSessionId || undefined} projectId={hookProjectId || undefined} />
                </div>
              </div>
    </div>
  )
}
