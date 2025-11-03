'use client'

import { useState } from 'react'
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
  onClose: () => void
  onApprove: (id: string, notes?: string) => void
  onReject: (id: string, notes: string) => void
  onUpdateScript: (id: string, script: string) => void
  isApproving: boolean
  isRejecting: boolean
  isUpdatingScript: boolean
}

export default function ValidationDetail({ 
  request, 
  onClose, 
  onApprove, 
  onReject, 
  onUpdateScript,
  isApproving,
  isRejecting,
  isUpdatingScript
}: Props) {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const [activeTab, setActiveTab] = useState<'transcript' | 'script'>('transcript')
  const [editedScript, setEditedScript] = useState(request.generated_script)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const handleSaveScript = () => {
    if (editedScript !== request.generated_script) {
      onUpdateScript(request.validation_id, editedScript)
    }
    setIsEditing(false)
  }

  const handleApprove = () => {
    onApprove(request.validation_id, reviewNotes || undefined)
  }

  const handleReject = () => {
    if (!reviewNotes.trim()) {
      alert('Please provide rejection notes')
      return
    }
    onReject(request.validation_id, reviewNotes)
  }

  const canTakeAction = request.status === 'pending' || request.status === 'in_review'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`
        w-full max-w-6xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden
        ${colors.background} border ${colors.border}
      `}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${colors.border} ${colors.sidebarBackground}`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-xl font-semibold ${colors.text}`}>
                Validation Request - {request.client_name || 'Anonymous'}
              </h2>
              <p className={`text-sm ${colors.textSecondary}`}>
                {request.client_email} • Created {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-md hover:bg-gray-100 ${colors.textSecondary} hover:${colors.text}`}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {/* Tabs */}
            <div className={`flex border-b ${colors.border}`}>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`
                  px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'transcript'
                    ? `border-blue-500 ${colors.text}`
                    : `border-transparent ${colors.textSecondary} hover:${colors.text}`
                  }
                `}
              >
                Conversation Transcript
              </button>
              <button
                onClick={() => setActiveTab('script')}
                className={`
                  px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === 'script'
                    ? `border-blue-500 ${colors.text}`
                    : `border-transparent ${colors.textSecondary} hover:${colors.text}`
                  }
                `}
              >
                Generated Script
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto h-full">
              {activeTab === 'transcript' && (
                <div className="prose max-w-none">
                  <pre className={`whitespace-pre-wrap text-sm ${colors.text} font-sans leading-relaxed`}>
                    {request.conversation_transcript}
                  </pre>
                </div>
              )}

              {activeTab === 'script' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className={`font-semibold ${colors.text}`}>Video Script</h3>
                    {canTakeAction && (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`
                          px-3 py-1 text-sm rounded-md border transition-colors
                          ${colors.border} ${colors.textSecondary} hover:${colors.text}
                        `}
                      >
                        {isEditing ? 'Cancel Edit' : 'Edit Script'}
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        className={`
                          w-full h-96 p-4 border rounded-lg resize-none font-mono text-sm
                          ${colors.border} ${colors.background} ${colors.text}
                        `}
                        placeholder="Edit the generated script..."
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveScript}
                          disabled={isUpdatingScript}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          {isUpdatingScript ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => {
                            setEditedScript(request.generated_script)
                            setIsEditing(false)
                          }}
                          className={`px-4 py-2 border rounded-md text-sm ${colors.border} ${colors.textSecondary} hover:${colors.text}`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose max-w-none">
                      <pre className={`whitespace-pre-wrap text-sm ${colors.text} font-sans leading-relaxed`}>
                        {editedScript}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className={`w-80 border-l ${colors.border} ${colors.sidebarBackground} flex flex-col`}>
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Status Info */}
              <div className="mb-6">
                <h3 className={`font-semibold mb-3 ${colors.text}`}>Status Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={colors.textSecondary}>Status:</span>
                    <span className={`font-medium ${colors.text}`}>
                      {request.status.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </span>
                  </div>
                  {request.reviewed_by && (
                    <div className="flex justify-between">
                      <span className={colors.textSecondary}>Reviewed by:</span>
                      <span className={colors.text}>{request.reviewed_by}</span>
                    </div>
                  )}
                  {request.reviewed_at && (
                    <div className="flex justify-between">
                      <span className={colors.textSecondary}>Reviewed:</span>
                      <span className={colors.text}>
                        {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Notes */}
              {canTakeAction && (
                <div className="mb-6">
                  <label className={`block font-semibold mb-2 ${colors.text}`}>
                    Review Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className={`
                      w-full h-24 p-3 border rounded-md resize-none text-sm
                      ${colors.border} ${colors.background} ${colors.text}
                    `}
                    placeholder="Add review comments..."
                  />
                </div>
              )}

              {/* Previous Review Notes */}
              {request.review_notes && (
                <div className="mb-6">
                  <h4 className={`font-semibold mb-2 ${colors.text}`}>Previous Notes</h4>
                  <div className={`p-3 rounded-md text-sm ${colors.border} border bg-gray-50 ${colors.textSecondary}`}>
                    {request.review_notes}
                  </div>
                </div>
              )}

              {/* Request Details */}
              <div className="mb-6">
                <h4 className={`font-semibold mb-2 ${colors.text}`}>Request Details</h4>
                <div className="space-y-1 text-xs">
                  <div className={`flex justify-between ${colors.textSecondary}`}>
                    <span>Validation ID:</span>
                    <span className="font-mono">{request.validation_id.slice(0, 8)}...</span>
                  </div>
                  <div className={`flex justify-between ${colors.textSecondary}`}>
                    <span>Project ID:</span>
                    <span className="font-mono">{request.project_id.slice(0, 8)}...</span>
                  </div>
                  <div className={`flex justify-between ${colors.textSecondary}`}>
                    <span>Session ID:</span>
                    <span className="font-mono">{request.session_id.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {canTakeAction && (
              <div className={`p-6 border-t ${colors.border}`}>
                <div className="space-y-3">
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {isApproving ? 'Approving...' : 'Approve & Send to Client'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={isApproving || isRejecting || !reviewNotes.trim()}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isRejecting ? 'Rejecting...' : 'Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
