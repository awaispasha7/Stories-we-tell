'use client'

import { useTheme, getThemeColors } from '@/lib/theme-context'
import { formatDistanceToNow } from 'date-fns'

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

interface Props {
  request: ValidationRequest
  onSelect: () => void
  isSelected: boolean
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  in_review: 'bg-blue-100 text-blue-800 border-blue-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
  sent_to_client: 'bg-purple-100 text-purple-800 border-purple-300'
}

export default function ValidationRequestCard({ request, onSelect, isSelected }: Props) {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  return (
    <div
      onClick={onSelect}
      className={`
        p-6 rounded-lg border cursor-pointer transition-all duration-200
        ${isSelected 
          ? `border-blue-500 shadow-lg ${colors.sidebarBackground}` 
          : `${colors.border} hover:shadow-md ${colors.background}`
        }
      `}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className={`font-semibold ${colors.text}`}>
              {request.client_name || 'Anonymous User'}
            </h3>
            <span 
              className={`
                px-2 py-1 text-xs font-medium rounded-full border
                ${statusColors[request.status]}
              `}
            >
              {getStatusDisplay(request.status)}
            </span>
          </div>
          
          <div className={`text-sm ${colors.textSecondary} space-y-1`}>
            <p>Email: {request.client_email || 'N/A'}</p>
            <p>Created: {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>
            {request.reviewed_at && (
              <p>Reviewed: {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}</p>
            )}
          </div>
        </div>

        <div className="ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className={`
              px-3 py-1 text-xs rounded-md border transition-colors
              ${colors.border} ${colors.textSecondary} hover:${colors.text}
            `}
          >
            View Details
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="space-y-3">
        <div>
          <h4 className={`text-sm font-medium ${colors.text} mb-1`}>Conversation Preview</h4>
          <p className={`text-sm ${colors.textSecondary}`}>
            {truncateText(request.conversation_transcript.replace(/[#*]/g, ''), 150)}
          </p>
        </div>

        <div>
          <h4 className={`text-sm font-medium ${colors.text} mb-1`}>Script Preview</h4>
          <p className={`text-sm ${colors.textSecondary}`}>
            {truncateText(request.generated_script, 120)}
          </p>
        </div>

        {request.review_notes && (
          <div>
            <h4 className={`text-sm font-medium ${colors.text} mb-1`}>Review Notes</h4>
            <p className={`text-sm ${colors.textSecondary}`}>
              {truncateText(request.review_notes, 100)}
            </p>
          </div>
        )}
      </div>

      <div className={`mt-4 pt-3 border-t ${colors.border} flex justify-between items-center text-xs ${colors.textSecondary}`}>
        <span>ID: {request.validation_id.slice(0, 8)}...</span>
        <span>Project: {request.project_id.slice(0, 8)}...</span>
      </div>
    </div>
  )
}
