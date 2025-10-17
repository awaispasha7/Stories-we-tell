'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '@/lib/api'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'

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
  onSessionSelect: (sessionId: string) => void
  currentSessionId?: string
}

export function SessionsSidebar({ onSessionSelect, currentSessionId }: SessionsSidebarProps) {
  const queryClient = useQueryClient()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const { isAuthenticated } = useAuth()

      // Fetch user sessions only if authenticated
      const { data: sessions = [], isLoading, error } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
          console.log('🔄 Fetching sessions...')
          const result = await sessionApi.getSessions(20)
          console.log('✅ Sessions fetched:', result)
          
          // Fetch first message for each session to show as preview
          const sessionsWithFirstMessage = await Promise.all(
            (result as Session[]).map(async (session) => {
              try {
                const messages = await sessionApi.getSessionMessages(session.session_id, 1, 0) as ChatMessage[]
                const firstMessage = messages.length > 0 ? messages[0].content : undefined
                return {
                  ...session,
                  first_message: firstMessage,
                  message_count: messages.length
                }
              } catch (error) {
                console.warn(`Failed to fetch first message for session ${session.session_id}:`, error)
                return {
                  ...session,
                  first_message: undefined,
                  message_count: 0
                }
              }
            })
          )
          
          return sessionsWithFirstMessage
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
    }
  })

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await deleteSessionMutation.mutateAsync(sessionId)
        if (currentSessionId === sessionId) {
          onSessionSelect('')
        }
      } catch (error) {
        console.error('Error deleting session:', error)
      }
    }
  }

  const handleCreateNewSession = () => {
    onSessionSelect('') // Clear current session to create new one
  }

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
                <div className={`w-16 h-16 ${colors.backgroundTertiary} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <MessageSquare className={`h-8 w-8 ${colors.textTertiary}`} />
                </div>
                <h3 className={`text-lg font-medium ${colors.text} mb-2`}>No previous chats found</h3>
                <p className={`${colors.textSecondary} text-sm mb-4`}>
                  Continue to build your story development history
                </p>
                <button
                  onClick={handleCreateNewSession}
                  className={`${colors.buttonPrimary} px-4 py-2 rounded-lg text-sm font-medium`}
                >
                  Start Your First Chat
                </button>
              </div>
            </div>
          </div>
        )
      }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className={`p-4 border-b ${colors.border}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-semibold ${colors.text} flex items-center gap-2`}>
            <MessageSquare className="h-5 w-5" />
            Previous Chats
          </h2>
          <button
            onClick={handleCreateNewSession}
            className={`p-2 rounded-lg ${colors.buttonSecondary} hover:${colors.buttonPrimary} transition-colors bg-gradient-to-r from-sky-500 to-emerald-500`}
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className={`text-sm ${colors.textSecondary}`}>
          {(sessions as Session[]).length} chat{(sessions as Session[]).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {(sessions as Session[]).length === 0 ? (
          <div className="text-center py-8">
            {isAuthenticated ? (
              <>
                <h3 className={`text-lg font-medium ${colors.text} mb-2`}>No previous chats</h3>
                <p className={`${colors.textSecondary} text-sm mb-4`}>
                  Start a new conversation to begin your story development journey
                </p>
                <button
                  onClick={handleCreateNewSession}
                  className={`${colors.buttonPrimary} px-4 py-2 rounded-lg text-sm font-medium`}
                >
                  Start Your First Chat
                </button>
              </>
            ) : (
              <>
                <h3 className={`text-lg font-medium ${colors.text} mb-2`}>Welcome to Stories We Tell</h3>
                <p className={`${colors.textSecondary} text-sm mb-6`}>
                  Sign up to save your conversations and access your story development history
                </p>
              </>
            )}
          </div>
        ) : (
          (sessions as Session[]).map((session: Session) => (
            <div
              key={session.session_id}
              className={`group cursor-pointer transition-all duration-200 hover:shadow-md rounded-lg border p-3 ${
                currentSessionId === session.session_id
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : `${colors.sidebarItem} ${colors.border}`
              }`}
              onClick={() => onSessionSelect(session.session_id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium ${colors.text} truncate mb-1 text-sm`}>
                    {session.title || 'New Chat'}
                  </h3>
                  
                  {session.first_message && (
                    <p className={`text-xs ${colors.textTertiary} line-clamp-2 mb-2 leading-relaxed`}>
                      {session.first_message}
                    </p>
                  )}
                  
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
                  className={`${colors.textMuted} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity`}
                  title="Delete session"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
