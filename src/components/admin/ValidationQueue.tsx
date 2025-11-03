'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import ValidationRequestCard from '@/components/admin/ValidationRequestCard'
import ValidationDetail from '@/components/admin/ValidationDetail'
import { adminApi } from '@/lib/admin-api'

interface ValidationRequest {
  validation_id: string
  project_id: string
  user_id: string
  session_id: string
  conversation_transcript: string
  generated_script: string
  client_email: string | null
  client_name: string | null
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'sent_to_client'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  updated_at: string
}

export default function ValidationQueue() {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedRequest, setSelectedRequest] = useState<ValidationRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: requests, isLoading, error } = useQuery({
    queryKey: ['validation-requests', statusFilter],
    queryFn: () => adminApi.getValidationRequests(statusFilter === 'all' ? undefined : statusFilter),
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => 
      adminApi.approveRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setSelectedRequest(null)
    }
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => 
      adminApi.rejectRequest(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      setSelectedRequest(null)
    }
  })

  const updateScriptMutation = useMutation({
    mutationFn: ({ id, script }: { id: string; script: string }) => 
      adminApi.updateScript(id, script),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
    }
  })

  const handleApprove = (id: string, notes?: string) => {
    approveMutation.mutate({ id, notes })
  }

  const handleReject = (id: string, notes: string) => {
    rejectMutation.mutate({ id, notes })
  }

  const handleUpdateScript = (id: string, script: string) => {
    updateScriptMutation.mutate({ id, script })
  }

  if (error) {
    return (
      <div className={`p-4 rounded-lg border border-red-300 bg-red-50 ${colors.text}`}>
        <p>Error loading validation requests: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex justify-between items-center">
        <h2 className={`text-xl font-semibold ${colors.text}`}>Validation Queue</h2>
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`px-3 py-2 border rounded-md text-sm ${colors.border} ${colors.background} ${colors.text}`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="sent_to_client">Sent to Client</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!requests || requests.length === 0) && (
        <div className={`text-center py-12 ${colors.textSecondary}`}>
          <p>No validation requests found.</p>
        </div>
      )}

      {/* Request List */}
      {!isLoading && requests && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => (
            <ValidationRequestCard
              key={request.validation_id}
              request={request}
              onSelect={() => setSelectedRequest(request)}
              isSelected={selectedRequest?.validation_id === request.validation_id}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedRequest && (
        <ValidationDetail
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onUpdateScript={handleUpdateScript}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
          isUpdatingScript={updateScriptMutation.isPending}
        />
      )}
    </div>
  )
}
