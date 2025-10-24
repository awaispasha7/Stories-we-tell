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
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
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
    console.log('🔄 [SESSION] createSession called')
    
    // Double-check that we don't have a sessionId prop
    if (sessionId && sessionId.trim()) {
      console.log('🔄 [SESSION] Session ID provided, skipping creation')
      return
    }
    
    // Double-check that we don't already have a session in state
    if (sessionState.sessionId && sessionState.sessionId.trim()) {
      console.log('🔄 [SESSION] Session already exists in state, skipping creation')
      return
    }

    // Prevent multiple concurrent session creations (both local and global)
    if (sessionCreationInProgress.current || globalSessionCreationInProgress) {
      console.log('🔄 [SESSION] Session creation already in progress, skipping...')
      return
    }

    console.log('🔄 [SESSION] Starting session creation')
    sessionCreationInProgress.current = true
    globalSessionCreationInProgress = true
    setSessionState(prev => ({ ...prev, isLoading: true }))

    try {
      console.log('🔄 [SESSION] Calling sessionApi.getOrCreateSession()')
      const response = await sessionApi.getOrCreateSession() as { 
        success?: boolean; 
        session_id?: string; 
        project_id?: string;
        is_authenticated?: boolean;
        user_id?: string;
      }
      
      // The backend returns the session data in a success wrapper
      if (response && response.success && response.session_id) {
        const newSessionState = {
          sessionId: response.session_id,
          projectId: response.project_id || null,
          isAuthenticated: response.is_authenticated || false,
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
  }, [sessionId, sessionState.sessionId])

  // Listen for session updates from other components
  useEffect(() => {
    const handleSessionUpdate = (event: CustomEvent) => {
      console.log('🔄 [SESSION] Received session update event:', event.detail)
      const { sessionId: newSessionId, projectId: newProjectId } = event.detail || {}
      
      if (newSessionId && newSessionId !== sessionState.sessionId) {
        console.log('🔄 [SESSION] Updating session state from event:', newSessionId)
        setSessionState(prev => ({
          ...prev,
          sessionId: newSessionId,
          projectId: newProjectId || prev.projectId,
          isLoading: false
        }))
        
        // Also verify localStorage has the correct session
        setTimeout(() => {
          try {
            const stored = localStorage.getItem(SESSION_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored)
              if (parsed.sessionId !== newSessionId) {
                console.warn('⚠️ [SESSION] localStorage session mismatch after update event')
                // Force localStorage update
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                  sessionId: newSessionId,
                  projectId: newProjectId,
                  isAuthenticated: sessionState.isAuthenticated
                }))
                console.log('🔧 [SESSION] Forced localStorage update to match event')
              }
            }
          } catch (error) {
            console.error('Failed to verify localStorage after session update:', error)
          }
        }, 100)
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.sessionId && parsed.sessionId !== sessionState.sessionId) {
            console.log('🔄 [SESSION] Session updated in localStorage:', parsed.sessionId)
            setSessionState(prev => ({
              ...prev,
              sessionId: parsed.sessionId,
              projectId: parsed.projectId || prev.projectId,
              isAuthenticated: parsed.isAuthenticated || prev.isAuthenticated,
              isLoading: false
            }))
          }
        } catch (error) {
          console.error('Failed to parse session from storage event:', error)
        }
      }
    }


    // Also check localStorage on mount to catch any missed session updates
    const checkInitialSession = () => {
      try {
        const stored = localStorage.getItem(SESSION_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.sessionId && parsed.sessionId !== sessionState.sessionId) {
            console.log('🔄 [SESSION] Found updated session in localStorage on mount:', parsed.sessionId)
            setSessionState(prev => ({
              ...prev,
              sessionId: parsed.sessionId,
              projectId: parsed.projectId || prev.projectId,
              isAuthenticated: parsed.isAuthenticated || prev.isAuthenticated,
              isLoading: false
            }))
          }
        }
      } catch (error) {
        console.error('Failed to check initial session from localStorage:', error)
      }
    }

    // Check on mount
    checkInitialSession()

    window.addEventListener('sessionUpdated', handleSessionUpdate as EventListener)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('sessionUpdated', handleSessionUpdate as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [sessionState.sessionId, sessionState.isAuthenticated]) // Include dependencies used in the effect

  // Auto-create session if none provided and auth is ready
  useEffect(() => {
    // Don't create session if we have a valid sessionId prop
    if (sessionId && sessionId.trim()) {
      console.log('🔄 [SESSION] useEffect check: Session ID provided, skipping creation check')
      return
    }
    
    const shouldCreateSession = (
      !authLoading && 
      !sessionState.isLoading && 
      !sessionCreationInProgress.current &&
      !globalSessionCreationInProgress &&
      !sessionState.sessionId // Don't create if we already have a session
    )
    
    console.log('🔄 [SESSION] useEffect check:', {
      sessionId,
      authLoading,
      sessionStateIsLoading: sessionState.isLoading,
      sessionCreationInProgress: sessionCreationInProgress.current,
      globalSessionCreationInProgress,
      sessionStateSessionId: sessionState.sessionId,
      shouldCreateSession
    })
    
    if (shouldCreateSession) {
      console.log('🔄 [SESSION] Triggering session creation from useEffect')
      createSession()
    }
  }, [sessionId, authLoading, sessionState.isLoading, sessionState.sessionId, sessionState.isAuthenticated, createSession, isAuthenticated])

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