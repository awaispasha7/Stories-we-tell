import ky from 'ky'

// Get user ID from localStorage for API calls
const getUserHeaders = () => {
  if (typeof window === 'undefined') return {}
  
  try {
    const user = localStorage.getItem('user')
    
    const headers: Record<string, string> = {}
    
    if (user) {
      const userData = JSON.parse(user)
      headers['X-User-ID'] = userData.user_id
    }
    
    return headers
  } catch (error) {
    console.error('Error getting user headers:', error)
  }
  
  return {}
}

export const api = ky.create({
  prefixUrl: process.env.NEXT_PUBLIC_API_URL || 'https://stories-we-tell-backend.vercel.app',
  timeout: 30000,
  retry: 2,
  hooks: {
    beforeRequest: [
      (request) => {
        // Add user ID header to all requests
        const headers = getUserHeaders()
        Object.entries(headers).forEach(([key, value]) => {
          request.headers.set(key, value)
        })
        
        // Add Authorization header if token is available
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('access_token')
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`)
          }
        }
      }
    ]
  }
})

// API endpoints for the new session-based system
export const sessionApi = {
  // Chat with session support
  chat: (text: string, sessionId?: string, projectId?: string) => 
    api.post('api/v1/chat', { json: { text, session_id: sessionId, project_id: projectId } }),
  
  // Get user sessions
  getSessions: async (limit = 10) => {
    try {
      const headers = getUserHeaders()
      return await api.get('api/v1/sessions', { 
        searchParams: { limit },
        headers 
      }).json()
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'response' in error && 
              error.response && typeof error.response === 'object' && 'status' in error.response &&
              error.response.status === 404) {
            console.warn('Sessions API not available, returning empty array')
            return []
          }
          throw error
        }
  },
  
  // Get session messages
  getSessionMessages: async (sessionId: string, limit = 50, offset = 0) => {
    try {
      const headers = getUserHeaders()
      return await api.get(`api/v1/sessions/${sessionId}/messages`, { 
        searchParams: { limit, offset },
        headers
      }).json()
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'response' in error && 
              error.response && typeof error.response === 'object' && 'status' in error.response &&
              error.response.status === 404) {
            console.warn('Session messages API not available, returning empty array')
            return []
          }
          throw error
        }
  },
  
  // Update session title
  updateSessionTitle: (sessionId: string, title: string) => 
    api.put(`api/v1/sessions/${sessionId}/title`, { json: { title } }).json(),
  
  // Delete session
  deleteSession: async (sessionId: string) => {
    try {
      return await api.delete(`api/v1/sessions/${sessionId}`).json()
        } catch (error: unknown) {
          if (error && typeof error === 'object' && 'response' in error && 
              error.response && typeof error.response === 'object' && 'status' in error.response &&
              error.response.status === 404) {
            console.warn('Delete session API not available')
            return { success: false, message: 'API not available' }
          }
          throw error
        }
  },
  
  // Create user
  createUser: async (userData: { user_id?: string; email?: string; display_name?: string; avatar_url?: string }) => {
    try {
      return await api.post('api/v1/users', { json: userData }).json()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error && 
          error.response && typeof error.response === 'object' && 'status' in error.response &&
          error.response.status === 409) {
        // User already exists, that's fine
        console.log('User already exists in backend')
        return { message: 'User already exists', user: userData }
      }
      throw error
    }
  },
  
  // Get current user
  getCurrentUser: () => {
    const headers = getUserHeaders()
    return api.get('api/v1/users/me', { headers }).json()
  },
  
  // Anonymous session management
  createAnonymousSession: () => 
    api.post('api/v1/anonymous-session').json(),
  
  getAnonymousSession: (sessionId: string) => 
    api.get(`api/v1/anonymous-session/${sessionId}`).json(),
  
  // Migrate anonymous session to authenticated user
  migrateAnonymousSession: (anonymousSessionId: string, userId: string) =>
    api.post('api/v1/migrate-anonymous-session', {
      json: { 
        anonymous_session_id: anonymousSessionId,
        user_id: userId 
      }
    }).json()
}

// Authentication API
export const authApi = {
  // Login with email and password
  login: (email: string, password: string) =>
    api.post('api/v1/auth/login', { 
      json: { email, password } 
    }).json(),
  
  // Signup with email, display name, and password
  signup: (email: string, displayName: string, password: string) =>
    api.post('api/v1/auth/signup', { 
      json: { email, display_name: displayName, password } 
    }).json(),
  
  // Google OAuth authentication
  googleAuth: (token: string, email: string, name: string, picture?: string) =>
    api.post('api/v1/auth/google', { 
      json: { token, email, name, picture } 
    }).json(),
  
  // Get current user info
  getCurrentUser: () =>
    api.get('api/v1/auth/me').json(),
  
  // Refresh access token
  refreshToken: () =>
    api.post('api/v1/auth/refresh').json(),
  
  // Logout
  logout: () =>
    api.post('api/v1/auth/logout').json()
}
