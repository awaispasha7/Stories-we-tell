'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sessionApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Session {
  session_id: string
  project_id: string
  title: string
  created_at: string
  updated_at: string
  last_message_at: string
  message_count: number
  last_message_preview?: string
  project_title?: string
  project_logline?: string
}

interface SessionManagerProps {
  onSessionSelect: (sessionId: string) => void
  currentSessionId?: string
}

export function SessionManager({ onSessionSelect, currentSessionId }: SessionManagerProps) {
  const queryClient = useQueryClient()

  // Fetch user sessions
  const { data: sessions = [], isLoading, error } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const result = await sessionApi.getSessions(20)
      return result as Session[]
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    }
  })

  // Update session title mutation (commented out for now)
  // const updateTitleMutation = useMutation({
  //   mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
  //     sessionApi.updateSessionTitle(sessionId, title),
  //   onSuccess: () => {
  //     queryClient.invalidateQueries({ queryKey: ['sessions'] })
  //   }
  // })

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
        // setIsCreatingNew(true)
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
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">
            Failed to load sessions. Please try again.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Chat Sessions</h2>
          <Button
            onClick={handleCreateNewSession}
            size="sm"
            className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
          >
            New Chat
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          {(sessions as Session[]).length} session{(sessions as Session[]).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {(sessions as Session[]).length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-2">No sessions yet</h3>
            <p className="text-gray-600 text-sm mb-4">
              Start a new conversation to begin your story development journey
            </p>
            <Button
              onClick={handleCreateNewSession}
              className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white"
            >
              Start Your First Chat
            </Button>
          </div>
        ) : (
          (sessions as Session[]).map((session: Session) => (
            <Card
              key={session.session_id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                currentSessionId === session.session_id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onSessionSelect(session.session_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-800 truncate mb-1">
                      {session.title || 'Untitled Session'}
                    </h3>
                    
                    {session.project_title && (
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {session.project_title}
                      </p>
                    )}
                    
                    {session.last_message_preview && (
                      <p className="text-sm text-gray-500 truncate mb-2">
                        {session.last_message_preview}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{formatDate(session.last_message_at)}</span>
                      <span>•</span>
                      <span>{session.message_count} message{session.message_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteSession(session.session_id)
                      }}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
