'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { auth, supabase } from './supabase'
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface User {
  user_id: string
  email?: string
  display_name?: string
  avatar_url?: string
  created_at?: string
  updated_at?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Convert Supabase user to our User interface
  const convertSupabaseUser = useCallback((supabaseUser: SupabaseUser | null): User | null => {
    if (!supabaseUser) return null
    
    return {
      user_id: supabaseUser.id,
      email: supabaseUser.email,
      display_name: supabaseUser.user_metadata?.display_name || supabaseUser.email?.split('@')[0],
      avatar_url: supabaseUser.user_metadata?.avatar_url,
      created_at: supabaseUser.created_at,
      updated_at: supabaseUser.updated_at
    }
  }, [])

  // Check for existing user on mount and listen to auth changes
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get current session
        const { session } = await auth.getCurrentSession()
        if (session?.user) {
          setUser(convertSupabaseUser(session.user))
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    // Listen to auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      const typedSession = session as Session | null
      console.log('Auth state changed:', event, typedSession?.user?.email)
      
      if (event === 'SIGNED_IN' && typedSession?.user) {
        setUser(convertSupabaseUser(typedSession.user))
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [convertSupabaseUser])

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await auth.signIn(email, password)
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (data.user) {
        setUser(convertSupabaseUser(data.user))
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [convertSupabaseUser])

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    try {
      setIsLoading(true)
      const { data, error } = await auth.signUp(email, password, displayName)
      
      if (error) {
        throw new Error(error.message)
      }
      
      if (data.user) {
        setUser(convertSupabaseUser(data.user))
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [convertSupabaseUser])

  const logout = useCallback(async () => {
    try {
      setIsLoading(true)
      const { error } = await auth.signOut()
      
      if (error) {
        throw new Error(error.message)
      }
      
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return

    try {
      // Update user metadata in Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: data.display_name,
          avatar_url: data.avatar_url
        }
      })
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Update local state
      const updatedUser = { ...user, ...data }
      setUser(updatedUser)
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }, [user])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
