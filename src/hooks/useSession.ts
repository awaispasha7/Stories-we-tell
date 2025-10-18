import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionApi } from '@/lib/api'

interface AnonymousSession {
  session_id: string
  project_id: string
  expires_at: number
  message: string
}

interface SessionState {
  isAuthenticated: boolean
  sessionId: string | null
  projectId: string | null
  expiresAt: number | null
  isLoading: boolean
}

export function useSession() {
  const [sessionState, setSessionState] = useState<SessionState>({
    isAuthenticated: false,
    sessionId: null,
    projectId: null,
    expiresAt: null,
    isLoading: true
  })
  
  const [isInitializing, setIsInitializing] = useState(false)
  const hasInitialized = useRef(false)

  // Check if user is authenticated
  const checkAuthentication = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    try {
      const user = localStorage.getItem('user')
      const token = localStorage.getItem('access_token')
      return !!(user && token)
    } catch (error) {
      console.error('Error checking authentication:', error)
      return false
    }
  }, [])

  // Create anonymous session
  const createAnonymousSession = useCallback(async () => {
    try {
      const session = await sessionApi.createAnonymousSession() as AnonymousSession
      
      // Store anonymous session ID in localStorage for potential migration
      // This will be cleared on page refresh or when user signs up
      localStorage.setItem('anonymous_session_id', session.session_id)
      localStorage.setItem('anonymous_project_id', session.project_id)
      localStorage.setItem('anonymous_session_expires_at', session.expires_at.toString())
      
      setSessionState(prev => ({
        ...prev,
        isAuthenticated: false,
        sessionId: session.session_id,
        projectId: session.project_id,
        expiresAt: session.expires_at,
        isLoading: false
      }))
      
      console.log('✅ Anonymous session created:', session.session_id)
      return session
    } catch (error) {
      console.error('❌ Error creating anonymous session:', error)
      setSessionState(prev => ({ ...prev, isLoading: false }))
      throw error
    }
  }, [])

  // Check if anonymous session is expired
  const isSessionExpired = useCallback(() => {
    if (!sessionState.expiresAt) return false
    return Date.now() > sessionState.expiresAt * 1000
  }, [sessionState.expiresAt])

  // Initialize session on mount
  useEffect(() => {
    const initializeSession = async () => {
      // Prevent multiple initializations using ref
      if (hasInitialized.current) {
        return
      }
      
      // Prevent multiple initializations using state
      if (isInitializing) {
        return
      }
      
      // Check if we already have a valid session state
      if (sessionState.sessionId && !sessionState.isLoading) {
        return
      }
      
      // Mark as initializing
      hasInitialized.current = true
      setIsInitializing(true)
      
      // Clear any old anonymous session data from localStorage on page load
      // This ensures anonymous sessions are truly ephemeral
      localStorage.removeItem('anonymous_session_id')
      localStorage.removeItem('anonymous_project_id')
      localStorage.removeItem('anonymous_expires_at')
      
      try {
        const isAuth = checkAuthentication()
        
        if (isAuth) {
          // User is authenticated
          setSessionState(prev => ({
            ...prev,
            isAuthenticated: true,
            isLoading: false
          }))
        } else {
          // For anonymous users, always create a new session on page load
          // Anonymous sessions should not persist across page refreshes
          console.log('🆕 Creating new anonymous session...')
          await createAnonymousSession()
        }
      } finally {
        setIsInitializing(false)
      }
    }

    initializeSession()
  }, [checkAuthentication, createAnonymousSession, isInitializing, sessionState.sessionId, sessionState.isLoading])

  // Clear session (for logout)
  const clearSession = useCallback(() => {
    // Clear any existing anonymous session data from localStorage
    localStorage.removeItem('anonymous_session_id')
    localStorage.removeItem('anonymous_project_id')
    localStorage.removeItem('anonymous_expires_at')
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    
    // Reset initialization flag
    hasInitialized.current = false
    
    setSessionState({
      isAuthenticated: false,
      sessionId: null,
      projectId: null,
      expiresAt: null,
      isLoading: false
    })
  }, [])

  // Get session info for API calls
  const getSessionInfo = useCallback(() => {
    return {
      sessionId: sessionState.sessionId,
      projectId: sessionState.projectId,
      isAuthenticated: sessionState.isAuthenticated
    }
  }, [sessionState])

  return {
    ...sessionState,
    isSessionExpired: isSessionExpired(),
    createAnonymousSession,
    clearSession,
    getSessionInfo,
    checkAuthentication
  }
}

