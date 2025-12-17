'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { isAdminEmail } from '@/lib/admin-utils'
import { adminApi } from '@/lib/admin-api'
import ValidationDetail from '@/components/admin/ValidationDetail'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useToastContext } from '@/components/ToastProvider'

interface ValidationRequest {
  validation_id: string
  project_id: string
  user_id: string
  session_id: string
  conversation_transcript: string
  generated_script: string
  client_email: string | null
  client_name: string | null
  status: 'pending' | 'approved' | 'rejected' | 'sent_to_client'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
  updated_at: string
  dossier_data?: any
  review_checklist?: any
  review_issues?: any
}

export default function ValidatePage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const toast = useToastContext()
  const queryClient = useQueryClient()
  const validationId = params.id as string

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  // Check authorization
  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push(`/auth/login?redirect=/admin/validate/${validationId}`)
      return
    }

    const hasAccess = isAdminEmail(user.email)
    setIsAuthorized(hasAccess)

    if (!hasAccess) {
      router.push('/chat')
    }
  }, [user, isLoading, router, validationId])

  // Fetch validation request - refetch periodically to sync with database changes
  const { data: request, isLoading: isLoadingRequest, error } = useQuery<ValidationRequest>({
    queryKey: ['validation-request', validationId],
    queryFn: async () => {
      return await adminApi.getValidationRequest(validationId)
    },
    enabled: !!validationId && isAuthorized === true,
    retry: 1,
    refetchInterval: 10000 // Refetch every 10 seconds to sync with database changes
  })

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      return await adminApi.approveRequest(id, notes)
    },
    onSuccess: () => {
      toast.success('Request approved', 'The story has been sent to the client.')
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['validation-request', validationId] })
      router.push('/admin')
    },
    onError: (error) => {
      toast.error('Failed to approve request', 'Please try again.')
      console.error('Approve error:', error)
    }
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      return await adminApi.rejectRequest(id, notes)
    },
    onSuccess: () => {
      toast.success('Request rejected', 'The validation request has been rejected.')
      queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['validation-request', validationId] })
      router.push('/admin')
    },
    onError: (error) => {
      toast.error('Failed to reject request', 'Please try again.')
      console.error('Reject error:', error)
    }
  })

  // Update script mutation
  const updateScriptMutation = useMutation({
    mutationFn: async ({ id, script }: { id: string; script: string }) => {
      return await adminApi.updateScript(id, script)
    },
    onSuccess: () => {
      toast.success('Script updated', 'The script has been updated successfully.')
      queryClient.invalidateQueries({ queryKey: ['validation-request', validationId] })
    },
    onError: (error) => {
      toast.error('Failed to update script', 'Please try again.')
      console.error('Update script error:', error)
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

  const handleClose = () => {
    router.push('/admin')
  }

  if (isLoading || isAuthorized === null || isLoadingRequest) {
    return (
      <div className={`min-h-screen! flex! items-center! justify-center! ${colors.background}`}>
        <div className="animate-spin! rounded-full! h-12! w-12! border-b-2! border-blue-600!"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className={`min-h-screen! flex! items-center! justify-center! ${colors.background}`}>
        <div className={`text-center! p-8! rounded-lg! border! ${colors.border}`}>
          <h1 className={`text-2xl! font-bold! mb-4! ${colors.text}`}>Access Denied</h1>
          <p className={colors.textSecondary}>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className={`min-h-screen! flex! items-center! justify-center! ${colors.background}`}>
        <div className={`text-center! p-8! rounded-lg! border! ${colors.border}`}>
          <h1 className={`text-2xl! font-bold! mb-4! ${colors.text}`}>Validation Request Not Found</h1>
          <p className={`${colors.textSecondary} mb-4`}>
            The validation request you're looking for doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => router.push('/admin')}
            className={`px-4! py-2! rounded-lg! border! ${colors.border} ${colors.text} hover:bg-gray-100! dark:hover:bg-gray-800!`}
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen! ${colors.background}`}>
      <ValidationDetail
        request={request}
        onClose={handleClose}
        onApprove={handleApprove}
        onReject={handleReject}
        onUpdateScript={handleUpdateScript}
        isApproving={approveMutation.isPending}
        isRejecting={rejectMutation.isPending}
        isUpdatingScript={updateScriptMutation.isPending}
        onReviewSent={() => {
          // Refresh validation list when review is sent
          queryClient.invalidateQueries({ queryKey: ['validation-requests'] })
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
          queryClient.invalidateQueries({ queryKey: ['validation-request', validationId] })
        }}
      />
    </div>
  )
}

