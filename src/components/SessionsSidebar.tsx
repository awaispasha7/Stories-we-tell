'use client'

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { sessionApi } from '@/lib/api'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { useToastContext } from '@/components/ToastProvider'
import { MessageSquare, Trash2, LogIn, UserPlus, ChevronLeft, Plus } from 'lucide-react'

interface Session {
  session_id: string
  user_id: string
  project_id: string
  title: string
  created_at: string
  updated_at: string
  last_message_at: string
  is_active: boolean
  first_message?: string
  message_count?: number
}

interface ChatMessage {
  message_id: string
  session_id: string
  turn_id?: string
  role: string
  content: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface SessionsSidebarProps {
  onSessionSelect: (sessionId: string, projectId?: string) => void
  currentSessionId?: string
  onClose?: () => void
}

export function SessionsSidebar({ onSessionSelect, currentSessionId, onClose }: SessionsSidebarProps) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const { isAuthenticated, user } = useAuth()
  const toast = useToastContext()

  // Listen for session updates to refresh the sessions list
  useEffect(() => {
    const handleSessionUpdate = () => {
      console.log('🔄 Session updated, refreshing sessions list')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }

    window.addEventListener('sessionUpdated', handleSessionUpdate)
    return () => window.removeEventListener('sessionUpdated', handleSessionUpdate)
  }, [queryClient])

      // Fetch user sessions only if authenticated
      const { data: sessions = [], isLoading, error } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
          try {
            console.log('🔄 Fetching sessions...', { isAuthenticated, user: user?.user_id })
            
            // Try to ensure user exists in backend first
            if (user) {
              try {
                await sessionApi.createUser({
                  user_id: user.user_id, // Pass the Supabase auth user ID
                  email: user.email,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url
                })
                console.log('✅ User synced to backend during session fetch')
              } catch (error) {
                console.warn('⚠️ Failed to sync user during session fetch:', error)
                // Continue anyway - user might already exist
              }
            }
            
            const result = await sessionApi.getSessions(20)
            console.log('✅ Sessions fetched:', result)
            
            // Show info toast if no sessions found
            if (Array.isArray(result) && result.length === 0) {
              toast.info(
                'No Chat History',
                'You don\'t have any previous chat sessions yet.',
                3000
              )
            }
            
            // Fetch first message and message count for each session
            const sessionsWithFirstMessage = await Promise.all(
              (result as Session[]).map(async (session) => {
                try {
                  // Get first message for preview
                  const firstMessages = await sessionApi.getSessionMessages(session.session_id, 1, 0) as ChatMessage[]
                  const firstMessage = firstMessages.length > 0 ? firstMessages[0].content : undefined
                  
                  // Get total message count (fetch a larger number to get accurate count)
                  const allMessages = await sessionApi.getSessionMessages(session.session_id, 100, 0) as ChatMessage[]
                  
                  return {
                    ...session,
                    first_message: firstMessage,
                    message_count: allMessages.length
                  }
                } catch (error) {
                  console.warn(`Failed to fetch messages for session ${session.session_id}:`, error)
                  return {
                    ...session,
                    first_message: undefined,
                    message_count: 0
                  }
                }
              })
            )
            
            return sessionsWithFirstMessage
          } catch (error) {
            console.error('❌ Error fetching sessions:', error)
            toast.error(
              'Load Failed',
              'Failed to load your chat sessions. Please try again.',
              4000
            )
            return []
          }
        },
        refetchInterval: false, // No automatic refresh
        refetchOnWindowFocus: false, // Don't refetch on window focus
        refetchOnMount: true, // Only fetch on component mount
        staleTime: Infinity, // Never consider data stale
        enabled: isAuthenticated, // Only fetch if user is authenticated
        retry: false, // Don't retry on error to avoid repeated calls
      })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
    onError: (error) => {
      console.error('Delete session mutation error:', error)
      toast.error(
        'Delete Failed',
        'An unexpected error occurred while deleting the session.',
        5000
      )
    }
  })

  const handleDeleteSession = async (sessionId: string) => {
    toast.confirm(
      'Attention!',
      'You are about to PERMANENTLY DELETE this chat session!\n\nThis action CANNOT be undone!\nAll messages and story progress will be lost forever!\n\nAre you absolutely sure you want to proceed?',
      async () => {
        try {
          await deleteSessionMutation.mutateAsync(sessionId)
          
          toast.success(
            'Session Deleted',
            'The chat session has been permanently deleted.',
            4000
          )
          
          if (currentSessionId === sessionId) {
            onSessionSelect('')
          }
        } catch (error) {
          console.error('Error deleting session:', error)
          
          toast.error(
            'Delete Failed',
            'Failed to delete the session. Please try again.',
            5000
          )
        }
      },
      () => {
        // Cancel action - no need to do anything
        console.log('Session deletion cancelled')
      },
      'Delete Forever',
      'Cancel'
    )
  }

  // const handleCreateNewSession = () => {
  //   onSessionSelect('') // Clear current session to create new one
  // }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

      if (isLoading) {
        return (
          <div className="h-full flex flex-col">
            <div className={`p-4 border-b ${colors.border}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${colors.text} flex items-center gap-2`}>
                  <MessageSquare className="h-5 w-5" />
                  Previous Chats
                </h2>
              </div>
              <p className={`text-sm ${colors.textSecondary}`}>Loading chats...</p>
            </div>
            <div className="p-4">
              <div className="animate-pulse space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`h-16 ${colors.backgroundTertiary} rounded-lg`}></div>
                ))}
              </div>
            </div>
          </div>
        )
      }

      if (error) {
        return (
          <div className="h-full flex flex-col">
            <div className={`p-4 border-b ${colors.border}`}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${colors.text} flex items-center gap-2`}>
                  <MessageSquare className="h-5 w-5" />
                  Previous Chats
                </h2>
              </div>
            </div>
            <div className="p-4">
              <div className="text-center py-8">
                <h3 className={`text-lg font-medium ${colors.text} mb-2`}>No previous chats found</h3>
                <p className={`${colors.textSecondary} text-sm mb-4`}>
                  Continue to build your story development history
                </p>
              </div>
            </div>
          </div>
        )
      }

  return (
    <div className="h-full flex flex-col gap-8" style={{ padding: '0.2rem 0.8rem' }}>
      {/* Header */}
      <div className={`p-6 border-b ${colors.border}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-semibold ${colors.text} flex items-center gap-2`}>
            <MessageSquare className="h-5 w-5" />
            Previous Chats
          </h2>
          <div className="flex items-center gap-2">
            {/* Add New Chat Button */}
            {isAuthenticated && (
              <button
              onClick={() => {
                console.log('🆕 Create New Chat button clicked')
                onSessionSelect('', '')
              }}
                className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 hover:cursor-pointer"
                title="Start New Chat"
                
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
            
            {/* Back Button for mobile/tablet */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors sm:hidden"
                title="Back to Chat"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
        
        
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {(sessions as Session[]).length === 0 ? (
          <div className="text-center py-8 flex flex-col gap-4 items-center justify-center mt-8">
            {isAuthenticated ? (
              <>
                <h3 className={`text-lg font-medium ${colors.text} mb-2`}>No previous chats</h3>
                <p className={`${colors.textSecondary} text-sm mb-4`}>
                  Start a new conversation to begin your story development journey
                </p>
              </>
            ) : (
              <>
                <h3 className={`text-lg font-medium ${colors.text} mb-2`}>Welcome to Stories We Tell</h3>
                <p className={`${colors.textSecondary} text-sm mb-8`}>
                  Sign up to save your conversations and access your story development history
                </p>
                
                {/* Auth buttons after welcome text */}
                <div className="flex gap-3 w-full mt-8 px-4 justify-center items-center">
                  <button
                    onClick={() => router.push('/auth/login')}
                    className="auth-button-signin px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 mt-8"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In</span>
                  </button>
                  
                  {/* Beautiful Divider */}
                  <div className="flex items-center justify-center px-1">
                    <div className="w-0.5 h-10 bg-gradient-to-b from-transparent via-white/50 to-transparent rounded-full"></div>
                  </div>
                  
                  <button
                    onClick={() => router.push('/auth/signup')}
                    className="auth-button-signup px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 mt-8"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Sign Up</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          (sessions as Session[]).map((session: Session) => (
            <div
              key={session.session_id}
              className={`group cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg border ${
                currentSessionId === session.session_id
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : `${colors.sidebarItem} ${colors.border}`
              }`}
              style={{ 
                padding: '0.5rem 1rem',
                margin: '0.3rem'
              }}
              onClick={() => {
                console.log('📋 Previous chat clicked:', session.session_id, 'Project:', session.project_id)
                onSessionSelect(session.session_id, session.project_id)
              }}
            >
              <div className="flex items-start justify-between" style={{ alignItems: 'center' }}>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${colors.text} truncate mb-1 text-sm`}>
                    {session.title || 'New Chat'}
                  </h3>
                  
                  {/* {session.first_message && (
                    <p className={`text-xs ${colors.textTertiary} line-clamp-2 mb-2 leading-relaxed`}>
                      {session.first_message}
                    </p>
                  )} */}
                  
                  <div className={`flex items-center gap-2 text-xs ${colors.textTertiary}`}>
                    <span>{formatDate(session.last_message_at)}</span>
                    {session.message_count && session.message_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{session.message_count} msg{session.message_count !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteSession(session.session_id)
                  }}
                  className={`
                    relative overflow-hidden
                    ${colors.textMuted} 
                    text-black hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600
                    dark:hover:from-red-600 dark:hover:to-red-700
                    p-2 rounded-lg 
                    opacity-0 group-hover:opacity-100 
                    transition-all duration-300 ease-out
                    hover:scale-110 hover:shadow-lg hover:shadow-red-500/25
                    active:scale-95 active:shadow-inner
                    border border-transparent hover:border-red-300 dark:hover:border-red-600
                    hover:animate-pulse hover:cursor-pointer mr-8
                  `}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                  }}
                  title="⚠️ Delete session permanently"
                >
                  <div className="relative z-10">
                    <Trash2 className="h-3 w-3" />
                  </div>
                  {/* Animated background effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg"></div>
                  {/* Danger sparkle effect */}
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full opacity-0 hover:opacity-100 animate-ping"></div>
                  <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-red-400 rounded-full opacity-0 hover:opacity-100 animate-ping" style={{ animationDelay: '0.5s' }}></div>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
