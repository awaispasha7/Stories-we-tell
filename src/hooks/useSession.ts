import { useState, useEffect, useCallback, useRef } from 'react'
import { sessionApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

// Global session creation guard to prevent multiple simultaneous creations
let globalSessionCreationInProgress = false

// Session persistence key
const SESSION_STORAGE_KEY = 'stories_we_tell_session'

interface SessionState {
  sessionId: string | null
  projectId: string | null
  isAuthenticated: boolean
  expiresAt: number | null
  isLoading: boolean
}

// Simple session hook that works with props from parent components
export function useSession(sessionId?: string, projectId?: string) {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  
  // Try to restore session from localStorage if no sessionId provided
  const getInitialSession = () => {
    if (sessionId && sessionId.trim()) {
      return {
        sessionId: sessionId,
        projectId: projectId && projectId.trim() ? projectId : null,
        isAuthenticated,
        expiresAt: null,
        isLoading: false
      }
    }
    
    // Try to restore from localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          // Sessions don't expire in the new system, so just restore if we have a sessionId
          if (parsed.sessionId) {
            // Check if the session belongs to the current user
            const currentUser = localStorage.getItem('user')
            if (currentUser) {
              const userData = JSON.parse(currentUser)
              const currentUserId = userData.user_id
              const sessionUserId = parsed.userId
              
              // If user IDs don't match, clear the invalid session
              if (sessionUserId && sessionUserId !== currentUserId) {
                console.log('🚨 Session belongs to different user, clearing invalid session')
                localStorage.removeItem(SESSION_STORAGE_KEY)
                return {
                  sessionId: '',
                  projectId: '',
                  isAuthenticated: false,
                  expiresAt: null,
                  isLoading: false
                }
              }
            }
            
            console.log('Restored session from localStorage:', parsed.sessionId)
            return {
              sessionId: parsed.sessionId,
              projectId: parsed.projectId,
              isAuthenticated: parsed.isAuthenticated || false,
              expiresAt: null,
              isLoading: false
            }
          }
        }
      } catch (error) {
        console.error('Error restoring session from localStorage:', error)
        localStorage.removeItem(SESSION_STORAGE_KEY)
      }
    }
    
    return {
      sessionId: null,
      projectId: null,
      isAuthenticated,
      expiresAt: null,
      isLoading: true // Only loading if no sessionId provided and no stored session
    }
  }
  
  const [sessionState, setSessionState] = useState<SessionState>(getInitialSession)
  
  // Prevent multiple session creations
  const sessionCreationInProgress = useRef(false)

  // Update state when props change
  useEffect(() => {
    setSessionState(prev => ({
      ...prev,
      sessionId: sessionId && sessionId.trim() ? sessionId : null,
      projectId: projectId && projectId.trim() ? projectId : null,
      isAuthenticated,
      isLoading: (!sessionId || !sessionId.trim()) && authLoading
    }))
  }, [sessionId, projectId, isAuthenticated, authLoading])

  // Create a new session (only when no sessionId is provided or sessionId is empty)
  const createSession = useCallback(async () => {
    if (sessionId && sessionId.trim()) {
      return
    }

    // Prevent multiple concurrent session creations (both local and global)
    if (sessionCreationInProgress.current || globalSessionCreationInProgress) {
      console.log('Session creation already in progress, skipping...')
      return
    }

    sessionCreationInProgress.current = true
    globalSessionCreationInProgress = true
    setSessionState(prev => ({ ...prev, isLoading: true }))

    try {
      console.log('Creating session...')
      const response = await sessionApi.getOrCreateSession() as any
      
      // The backend returns the session data in a success wrapper
      if (response && response.success && response.session_id) {
        console.log('Session created successfully:', response.session_id)
        const newSessionState = {
          sessionId: response.session_id,
          projectId: response.project_id,
          isAuthenticated: response.is_authenticated,
          expiresAt: null, // Sessions don't expire in the new system
          isLoading: false
        }
        setSessionState(newSessionState)
        
        // Persist session to localStorage
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
              sessionId: response.session_id,
              projectId: response.project_id,
              userId: response.user_id,
              isAuthenticated: response.is_authenticated
            }))
            console.log('Session persisted to localStorage')
          } catch (error) {
            console.error('Failed to persist session to localStorage:', error)
          }
        }
      } else {
        console.error('Invalid response from session creation:', response)
        setSessionState(prev => ({ ...prev, isLoading: false }))
      }
    } catch (error) {
      console.error('Failed to create session:', error)
      setSessionState(prev => ({ ...prev, isLoading: false }))
    } finally {
      sessionCreationInProgress.current = false
      globalSessionCreationInProgress = false
    }
  }, [sessionId, isAuthenticated])

  // Auto-create session if none provided and auth is ready
  useEffect(() => {
    const shouldCreateSession = (
      (!sessionId || !sessionId.trim()) && 
      !authLoading && 
      !sessionState.isLoading && 
      !sessionCreationInProgress.current &&
      !globalSessionCreationInProgress &&
      !sessionState.sessionId // Don't create if we already have a session
    )
    
    if (shouldCreateSession) {
      console.log('Auto-creating session...')
      createSession()
    }
  }, [sessionId, authLoading, sessionState.isLoading, sessionState.sessionId, createSession, isAuthenticated])

  // Check if session is expired
  const isSessionExpired = useCallback(() => {
    if (!sessionState.expiresAt) return false
    return Date.now() > sessionState.expiresAt * 1000
  }, [sessionState.expiresAt])

  // Clear session
  const clearSession = useCallback(() => {
    setSessionState({
      sessionId: null,
      projectId: null,
      isAuthenticated: false,
      expiresAt: null,
      isLoading: true
    })
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      console.log('Session cleared from localStorage')
    }
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
    createSession,
    clearSession,
    getSessionInfo
  }
}