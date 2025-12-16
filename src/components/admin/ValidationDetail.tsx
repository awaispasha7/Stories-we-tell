'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { formatDistanceToNow } from 'date-fns'
import { X, CheckCircle2, XCircle, Edit, Save, Clock, Send } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { useToast } from '@/components/Toast'

interface DossierData {
  title?: string
  heroes?: Array<{
    name?: string
    age_at_story?: number | string
    relationship_to_user?: string
    physical_descriptors?: string
    personality_traits?: string
    photo_url?: string
  }>
  supporting_characters?: Array<{
    name?: string
    role?: string
    description?: string
    photo_url?: string
  }>
  story_location?: string
  story_timeframe?: string
  season_time_of_year?: string
  environmental_details?: string
  story_type?: string
  audience?: {
    who_will_see_first?: string
    desired_feeling?: string
  }
  perspective?: string
  [key: string]: any
}

interface ReviewChecklist {
  character_logic: boolean
  photos: boolean
  timeline: boolean
  setting: boolean
  tone: boolean
  perspective: boolean
  [key: string]: boolean  // Index signature for Record<string, boolean> compatibility
}

interface ReviewIssues {
  missing_info: string[]
  conflicts: string[]
  factual_gaps: string[]
}

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
  dossier_data?: DossierData
  review_checklist?: ReviewChecklist
  review_issues?: ReviewIssues
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
  onReviewSent?: () => void  // Optional callback when review is sent
}

const statusConfig = {
  pending: {
    bg: 'bg-yellow-100! dark:bg-yellow-900/40!',
    text: 'text-yellow-800! dark:text-yellow-200!',
    border: 'border-yellow-300! dark:border-yellow-700!',
    icon: '⏳'
  },
  approved: {
    bg: 'bg-green-100! dark:bg-green-900/40!',
    text: 'text-green-800! dark:text-green-200!',
    border: 'border-green-300! dark:border-green-700!',
    icon: '✅'
  },
  rejected: {
    bg: 'bg-red-100! dark:bg-red-900/40!',
    text: 'text-red-800! dark:text-red-200!',
    border: 'border-red-300! dark:border-red-700!',
    icon: '❌'
  },
  sent_to_client: {
    bg: 'bg-purple-100! dark:bg-purple-900/40!',
    text: 'text-purple-800! dark:text-purple-200!',
    border: 'border-purple-300! dark:border-purple-700!',
    icon: '📧'
  }
}

type TabType = 'conversation' | 'dossier' | 'synopsis' | 'generation' | 'final_review' | 'delivery'

export default function ValidationDetail({ 
  request, 
  onClose, 
  onApprove, 
  onReject, 
  onUpdateScript,
  isApproving,
  isRejecting,
  isUpdatingScript,
  onReviewSent
}: Props) {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<TabType>('conversation')
  const [editedScript, setEditedScript] = useState(request.generated_script)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isSendingReview, setIsSendingReview] = useState(false)
  const reviewNotesTextareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Step 9: Review Checklist State
  const [reviewChecklist, setReviewChecklist] = useState<ReviewChecklist>({
    character_logic: false,
    photos: false,
    timeline: false,
    setting: false,
    tone: false,
    perspective: false
  })
  
  // Review Issues State
  const [reviewIssues, setReviewIssues] = useState<ReviewIssues>({
    missing_info: [],
    conflicts: [],
    factual_gaps: []
  })
  
  const [newIssueText, setNewIssueText] = useState('')
  const [newIssueType, setNewIssueType] = useState<'missing_info' | 'conflicts' | 'factual_gaps'>('missing_info')

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
      reviewNotesTextareaRef.current?.focus()
      return
    }
    onReject(request.validation_id, reviewNotes)
  }

  const handleSendReview = async () => {
    setIsSendingReview(true)
    try {
      // Send review with checklist and issues
      const result = await adminApi.sendReview(
        request.validation_id,
        reviewChecklist,
        reviewIssues,
        reviewNotes
      )
      
      if (result.success) {
        if (result.needs_revision) {
          toast.success(
            'Review sent successfully!',
            `The chat has been reopened for the user to provide missing information.\n\nUnchecked items: ${result.unchecked_items.join(', ')}`
          )
        } else {
          toast.success(
            'Review sent successfully!',
            'All checklist items are complete.'
          )
        }
        // Trigger callback if provided (to refresh validation list)
        if (onReviewSent) {
          onReviewSent()
        }
        // Close the modal after successful review
        onClose()
      } else {
        toast.error('Failed to send review', 'Please try again.')
      }
    } catch (error) {
      console.error('Failed to send review:', error)
      toast.error('Failed to send review', 'Please try again.')
    } finally {
      setIsSendingReview(false)
    }
  }

  const canTakeAction = request.status === 'pending'
  const statusStyle = statusConfig[request.status] || statusConfig.pending

  return (
    <div className="fixed! inset-0! bg-black/70! dark:bg-black/80! z-50! backdrop-blur-sm! overflow-y-auto!">
      <div className={`
        min-h-full! w-full! max-w-[95vw]! xl:max-w-7xl! mx-auto! rounded-none! sm:rounded-xl! md:rounded-2xl! shadow-2xl!
        ${colors.background}! border-0! sm:border-2! ${colors.border}!
        my-0! sm:my-4!
      `}>
        {/* Header - Fixed */}
        <div className={`sticky! top-0! z-10! px-4! sm:px-6! md:px-8! py-4! sm:py-5! md:py-6! border-b-2! ${colors.border}! ${colors.sidebarBackground}! bg-linear-to-r! from-gray-50! to-gray-100! dark:from-gray-800! dark:to-gray-900! rounded-t-xl! sm:rounded-t-xl! md:rounded-t-2xl!`}>
          <div className="flex! justify-between! items-start! sm:items-center! gap-3!">
            <div className="flex-1! min-w-0!">
              <div className="flex! items-center! gap-3! mb-2!">
                <h2 className={`text-xl! sm:text-2xl! md:text-3xl! font-bold! ${colors.text}! truncate!`}>
                  Validation Request
                </h2>
                {/* Status Icon in Header */}
                <span className={`
                  text-lg! sm:text-xl! md:text-2xl! px-3! sm:px-4! py-1! sm:py-1.5! rounded-full! border-2!
                  ${statusStyle.bg}! ${statusStyle.text}! ${statusStyle.border}!
                  whitespace-nowrap! shrink-0!
                `}>
                  {statusStyle.icon} {request.status.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </span>
              </div>
              <div className="flex! flex-wrap! items-center! gap-2! sm:gap-4! text-sm! sm:text-base!">
                <span className={`font-semibold! ${colors.text}! truncate!`}>
                  {request.client_name || 'Anonymous'}
                </span>
                <span className={`${colors.textSecondary}! hidden! sm:inline!`}>•</span>
                <span className={`${colors.textSecondary}! truncate! text-xs! sm:text-base!`}>
                  {request.client_email || 'No email'}
                </span>
                <span className={`${colors.textSecondary}! hidden! sm:inline!`}>•</span>
                <span className={`${colors.textSecondary}! flex! items-center! gap-1! text-xs! sm:text-base!`}>
                  <Clock className="h-3! w-3! sm:h-4! sm:w-4!" />
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`shrink-0! p-2! sm:p-3! rounded-full! hover:bg-gray-200! dark:hover:bg-gray-700! ${colors.textSecondary}! hover:${colors.text}! transition-all! duration-200! shadow-md! hover:shadow-lg!`}
            >
              <X className="h-5! w-5! sm:h-6! sm:w-6!" />
            </button>
          </div>
        </div>

        {/* Content - Single Scroll Container */}
        <div className="flex! flex-col!">
          {/* Main Content */}
          <div className={`flex-1! flex! flex-col! ${colors.background}! min-w-0!`}>
            {/* Tabs */}
            <div className={`flex! border-b-2! ${colors.border}! bg-gray-50! dark:bg-gray-800! overflow-x-auto!`}>
              {[
                { key: 'conversation' as TabType, label: 'Conversation' },
                { key: 'dossier' as TabType, label: 'Dossier Review' },
                { key: 'synopsis' as TabType, label: 'Synopsis Review' },
                { key: 'generation' as TabType, label: 'Generation' },
                { key: 'final_review' as TabType, label: 'SWT Final Review' },
                { key: 'delivery' as TabType, label: 'Delivery' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    px-4! sm:px-6! md:px-8! py-3! sm:py-4! text-sm! sm:text-base! font-semibold! border-b-4! transition-all! duration-200! whitespace-nowrap!
                    ${activeTab === tab.key
                      ? `border-blue-600! ${colors.text}! bg-white! dark:bg-gray-900!`
                      : `border-transparent! ${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700!`
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4! sm:p-6! md:p-8! bg-white! dark:bg-gray-900!">
              {/* Conversation Tab */}
              {activeTab === 'conversation' && (
                <div className="space-y-4! sm:space-y-6!">
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                      Full Conversation Transcript
                    </h3>
                    <p className={`text-sm! sm:text-base! ${colors.textSecondary}! mb-6!`}>
                      Complete conversation history between the user and the chatbot.
                    </p>
                    <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800! max-h-[70vh]! overflow-y-auto!`}>
                      <pre className={`whitespace-pre-wrap! text-sm! sm:text-base! ${colors.text}! font-mono! leading-relaxed!`}>
                        {request.conversation_transcript || 'No conversation transcript available.'}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Dossier Review Tab */}
              {activeTab === 'dossier' && (
                <div className="space-y-4! sm:space-y-6!">
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                      Step 9: SWT Representative (Review #1)
                    </h3>
                    <p className={`text-sm! sm:text-base! ${colors.textSecondary}! mb-6!`}>
                      Review the following aspects for data clarity before writing. Check each item when reviewed, and flag any issues.
                    </p>

                    {/* Side-by-side Layout: Dossier (Left) and Review Checklist (Right) */}
                    <div className="flex! flex-col! lg:flex-row! gap-4! sm:gap-6!">
                      {/* Left Side: Dossier Data */}
                      <div className="flex-1! lg:w-1/2!">
                        <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800! sticky! top-4! max-h-[80vh]! overflow-y-auto!`}>
                          <h4 className={`text-base! sm:text-lg! font-semibold! mb-4! ${colors.text}!`}>
                            📋 Story Dossier
                          </h4>
                          {request.dossier_data ? (
                            <div className="space-y-4!">
                              {/* Heroes */}
                              {request.dossier_data.heroes && request.dossier_data.heroes.length > 0 && (
                                <div>
                                  <h5 className={`text-sm! font-semibold! mb-2! ${colors.text}!`}>Hero Characters:</h5>
                                  {request.dossier_data.heroes.map((hero, idx) => (
                                    <div key={idx} className={`p-3! mb-2! rounded! border! ${colors.border}! bg-white! dark:bg-gray-700!`}>
                                      <div className={`text-sm! ${colors.text}! space-y-1!`}>
                                        {hero.name && <div><strong>Name:</strong> {hero.name}</div>}
                                        {hero.age_at_story && <div><strong>Age:</strong> {hero.age_at_story}</div>}
                                        {hero.relationship_to_user && <div><strong>Relationship:</strong> {hero.relationship_to_user}</div>}
                                        {hero.physical_descriptors && <div><strong>Physical:</strong> {hero.physical_descriptors}</div>}
                                        {hero.personality_traits && <div><strong>Personality:</strong> {hero.personality_traits}</div>}
                                        {hero.photo_url && <div className="text-green-600! dark:text-green-400!">📷 Photo attached</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Supporting Characters */}
                              {request.dossier_data.supporting_characters && request.dossier_data.supporting_characters.length > 0 && (
                                <div>
                                  <h5 className={`text-sm! font-semibold! mb-2! ${colors.text}!`}>Supporting Characters:</h5>
                                  {request.dossier_data.supporting_characters.map((char, idx) => (
                                    <div key={idx} className={`p-3! mb-2! rounded! border! ${colors.border}! bg-white! dark:bg-gray-700!`}>
                                      <div className={`text-sm! ${colors.text}! space-y-1!`}>
                                        {char.name && <div><strong>Name:</strong> {char.name}</div>}
                                        {char.role && <div><strong>Role:</strong> {char.role}</div>}
                                        {char.description && <div><strong>Description:</strong> {char.description}</div>}
                                        {char.photo_url && <div className="text-green-600! dark:text-green-400!">📷 Photo attached</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Setting & Time */}
                              {(request.dossier_data.story_location || request.dossier_data.story_timeframe || request.dossier_data.season_time_of_year || request.dossier_data.environmental_details) && (
                                <div>
                                  <h5 className={`text-sm! font-semibold! mb-2! ${colors.text}!`}>Setting & Time:</h5>
                                  <div className={`p-3! rounded! border! ${colors.border}! bg-white! dark:bg-gray-700!`}>
                                    <div className={`text-sm! ${colors.text}! space-y-1!`}>
                                      {request.dossier_data.story_location && <div><strong>Location:</strong> {request.dossier_data.story_location}</div>}
                                      {request.dossier_data.story_timeframe && <div><strong>Timeframe:</strong> {request.dossier_data.story_timeframe}</div>}
                                      {request.dossier_data.season_time_of_year && <div><strong>Season:</strong> {request.dossier_data.season_time_of_year}</div>}
                                      {request.dossier_data.environmental_details && <div><strong>Environmental:</strong> {request.dossier_data.environmental_details}</div>}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Story Type & Perspective */}
                              {(request.dossier_data.story_type || request.dossier_data.perspective || request.dossier_data.audience) && (
                                <div>
                                  <h5 className={`text-sm! font-semibold! mb-2! ${colors.text}!`}>Story Type & Perspective:</h5>
                                  <div className={`p-3! rounded! border! ${colors.border}! bg-white! dark:bg-gray-700!`}>
                                    <div className={`text-sm! ${colors.text}! space-y-1!`}>
                                      {request.dossier_data.story_type && <div><strong>Story Type:</strong> {request.dossier_data.story_type.replace(/_/g, ' ')}</div>}
                                      {request.dossier_data.audience?.who_will_see_first && <div><strong>Audience:</strong> {request.dossier_data.audience.who_will_see_first}</div>}
                                      {request.dossier_data.audience?.desired_feeling && <div><strong>Desired Feeling:</strong> {request.dossier_data.audience.desired_feeling}</div>}
                                      {request.dossier_data.perspective && <div><strong>Perspective:</strong> {request.dossier_data.perspective.replace(/_/g, ' ')}</div>}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className={`text-sm! ${colors.textSecondary}! italic!`}>
                              No dossier data available
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Review Checklist */}
                      <div className="flex-1! lg:w-1/2!">
                        <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800!`}>
                      <h4 className={`text-base! sm:text-lg! font-semibold! mb-4! ${colors.text}!`}>
                        Review Checklist
                      </h4>
                      <div className="space-y-3!">
                        {[
                          { key: 'character_logic' as const, label: 'Character Logic', description: 'Review hero and supporting character details for consistency' },
                          { key: 'photos' as const, label: 'Photos', description: 'Verify character photos are attached and correct' },
                          { key: 'timeline' as const, label: 'Timeline', description: 'Check time period and timeframe consistency' },
                          { key: 'setting' as const, label: 'Setting', description: 'Review location, season, and environmental details' },
                          { key: 'tone' as const, label: 'Tone', description: 'Verify story type matches the narrative tone' },
                          { key: 'perspective' as const, label: 'Perspective', description: 'Check audience and perspective alignment' }
                        ].map((item) => (
                          <label
                            key={item.key}
                            className={`flex! items-start! gap-3! p-3! rounded-lg! border-2! cursor-pointer! transition-all! hover:bg-gray-100! dark:hover:bg-gray-700! ${
                              reviewChecklist[item.key]
                                ? 'border-green-500! bg-green-50! dark:bg-green-900/20!'
                                : colors.border
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={reviewChecklist[item.key]}
                              onChange={(e) => setReviewChecklist(prev => ({
                                ...prev,
                                [item.key]: e.target.checked
                              }))}
                              className="mt-1! cursor-pointer! w-5! h-5!"
                            />
                            <div className="flex-1!">
                              <div className={`font-semibold! text-sm! sm:text-base! ${colors.text}!`}>
                                {item.label}
                              </div>
                              <div className={`text-xs! sm:text-sm! ${colors.textSecondary}! mt-0.5!`}>
                                {item.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                        </div>
                      </div>
                    </div>

                    {/* Issue Flagging */}
                    <div className={`mt-6! p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-red-50! dark:bg-red-900/20! mb-6!`}>
                      <h4 className={`text-base! sm:text-lg! font-semibold! mb-4! ${colors.text}!`}>
                        Flag Issues
                      </h4>
                      
                      {/* Add New Issue */}
                      <div className={`mb-4! p-3! rounded! border! ${colors.border}! bg-white! dark:bg-gray-800!`}>
                        <div className="flex! flex-col! sm:flex-row! gap-2! mb-2!">
                          <select
                            value={newIssueType}
                            onChange={(e) => setNewIssueType(e.target.value as 'missing_info' | 'conflicts' | 'factual_gaps')}
                            className={`px-3! py-2! rounded! border! ${colors.border}! ${colors.background}! ${colors.text}! text-sm!`}
                          >
                            <option value="missing_info">Missing Info</option>
                            <option value="conflicts">Conflicts</option>
                            <option value="factual_gaps">Factual Gaps</option>
                          </select>
                          <input
                            type="text"
                            value={newIssueText}
                            onChange={(e) => setNewIssueText(e.target.value)}
                            placeholder="Describe the issue..."
                            className={`flex-1! px-3! py-2! rounded! border! ${colors.border}! ${colors.background}! ${colors.text}! text-sm!`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newIssueText.trim()) {
                                setReviewIssues(prev => ({
                                  ...prev,
                                  [newIssueType]: [...prev[newIssueType], newIssueText.trim()]
                                }))
                                setNewIssueText('')
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newIssueText.trim()) {
                                setReviewIssues(prev => ({
                                  ...prev,
                                  [newIssueType]: [...prev[newIssueType], newIssueText.trim()]
                                }))
                                setNewIssueText('')
                              }
                            }}
                            className="px-4! py-2! bg-blue-600! text-white! rounded! hover:bg-blue-700! text-sm! font-medium!"
                          >
                            Add Issue
                          </button>
                        </div>
                      </div>

                      {/* Display Issues */}
                      <div className="space-y-3!">
                        {reviewIssues.missing_info.length > 0 && (
                          <div>
                            <h5 className={`text-sm! font-semibold! mb-2! text-red-700! dark:text-red-400!`}>Missing Info:</h5>
                            <ul className="list-disc! list-inside! space-y-1!">
                              {reviewIssues.missing_info.map((issue, idx) => (
                                <li key={idx} className={`text-sm! ${colors.text}! flex! items-center! justify-between!`}>
                                  <span>{issue}</span>
                                  <button
                                    onClick={() => setReviewIssues(prev => ({
                                      ...prev,
                                      missing_info: prev.missing_info.filter((_, i) => i !== idx)
                                    }))}
                                    className="text-red-600! hover:text-red-800! ml-2!"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {reviewIssues.conflicts.length > 0 && (
                          <div>
                            <h5 className={`text-sm! font-semibold! mb-2! text-orange-700! dark:text-orange-400!`}>Conflicts:</h5>
                            <ul className="list-disc! list-inside! space-y-1!">
                              {reviewIssues.conflicts.map((issue, idx) => (
                                <li key={idx} className={`text-sm! ${colors.text}! flex! items-center! justify-between!`}>
                                  <span>{issue}</span>
                                  <button
                                    onClick={() => setReviewIssues(prev => ({
                                      ...prev,
                                      conflicts: prev.conflicts.filter((_, i) => i !== idx)
                                    }))}
                                    className="text-red-600! hover:text-red-800! ml-2!"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {reviewIssues.factual_gaps.length > 0 && (
                          <div>
                            <h5 className={`text-sm! font-semibold! mb-2! text-yellow-700! dark:text-yellow-400!`}>Factual Gaps:</h5>
                            <ul className="list-disc! list-inside! space-y-1!">
                              {reviewIssues.factual_gaps.map((issue, idx) => (
                                <li key={idx} className={`text-sm! ${colors.text}! flex! items-center! justify-between!`}>
                                  <span>{issue}</span>
                                  <button
                                    onClick={() => setReviewIssues(prev => ({
                                      ...prev,
                                      factual_gaps: prev.factual_gaps.filter((_, i) => i !== idx)
                                    }))}
                                    className="text-red-600! hover:text-red-800! ml-2!"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Review Summary */}
                    <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-blue-50! dark:bg-blue-900/20! mb-6!`}>
                      <h4 className={`text-base! sm:text-lg! font-semibold! mb-3! ${colors.text}!`}>
                        Review Summary
                      </h4>
                      <div className={`text-sm! ${colors.text}! space-y-2!`}>
                        <div>
                          <strong>Items Reviewed:</strong> {
                            Object.values(reviewChecklist).filter(Boolean).length
                          } / {Object.keys(reviewChecklist).length}
                        </div>
                        <div>
                          <strong>Total Issues Flagged:</strong> {
                            reviewIssues.missing_info.length + reviewIssues.conflicts.length + reviewIssues.factual_gaps.length
                          }
                        </div>
                        {(reviewIssues.missing_info.length > 0 || reviewIssues.conflicts.length > 0 || reviewIssues.factual_gaps.length > 0) && (
                          <div className={`mt-3! p-3! rounded! bg-yellow-100! dark:bg-yellow-900/30! border! border-yellow-400!`}>
                            <strong className="text-yellow-800! dark:text-yellow-200!">⚠️ Issues Found:</strong>
                            <p className={`text-sm! mt-1! text-yellow-700! dark:text-yellow-300!`}>
                              Please address all flagged issues before sending review.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Send Review Button */}
                    {canTakeAction && (
                      <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800!`}>
                        <button
                          onClick={handleSendReview}
                          disabled={isSendingReview}
                          className="w-full! flex! items-center! justify-center! gap-2! sm:gap-3! px-4! sm:px-6! py-3! sm:py-4! bg-linear-to-r! from-blue-600! to-blue-700! text-white! font-bold! text-base! sm:text-lg! rounded-xl! shadow-xl! hover:from-blue-700! hover:to-blue-800! disabled:opacity-50! disabled:cursor-not-allowed! transition-all! duration-200! transform! hover:scale-105! hover:shadow-2xl!"
                        >
                          {isSendingReview ? (
                            <>
                              <div className="animate-spin! rounded-full! h-5! w-5! sm:h-6! sm:w-6! border-b-2! border-white!"></div>
                              Sending Review...
                            </>
                          ) : (
                            <>
                              <Send className="h-5! w-5! sm:h-6! sm:w-6!" />
                              Send Review
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Synopsis Review Tab */}
              {activeTab === 'synopsis' && (
                <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                  <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                    Step 10-11: Synopsis Review
                  </h3>
                  <p className={`text-sm! sm:text-base! ${colors.textSecondary}!`}>
                    Synopsis review will be available after Step 9 is completed and synopsis is generated.
                  </p>
                </div>
              )}

              {/* Generation Tab */}
              {activeTab === 'generation' && (
                <div className="space-y-4! sm:space-y-6!">
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                      Script Generation & Production
                    </h3>
                    <p className={`text-sm! sm:text-base! ${colors.textSecondary}! mb-6!`}>
                      This section contains all LLM-generated content for the video production pipeline.
                    </p>

                    {/* Generation Steps */}
                    <div className="space-y-4!">
                      {[
                        { step: 12, title: 'Full Script Draft', description: '500-800 word script with narrative, dialogue, voice-over, scene structure, emotional beats' },
                        { step: 13, title: 'Shot List Creation', description: 'Scene breakdown, shot sequences, character presence, transitions, atmosphere' },
                        { step: 14, title: 'Dialogue Export', description: 'Dialogue lines, timing per line, emotional indicators' },
                        { step: 15, title: 'Voice-Over Script', description: 'Narrator text, duration logic, VO placement, tone markings' },
                        { step: 16, title: 'Camera Logic', description: 'Camera angles, movement, lens style, framing, proximity, rhythm of cut' },
                        { step: 17, title: 'Scene Math', description: 'Shot duration, beat frequency, transition time, dialogue timing, visual rhythm' },
                        { step: 18, title: 'Prompt Micro-Details', description: 'Micro-prompt instructions for each shot: framing, tone, lighting, texture, motion' },
                        { step: 20, title: 'LLM → VLM', description: 'Visual generation preparation and execution' }
                      ].map((item) => (
                        <div key={item.step} className={`p-4! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800!`}>
                          <h4 className={`text-base! font-semibold! mb-2! ${colors.text}!`}>
                            Step {item.step}: LLM — {item.title}
                          </h4>
                          <p className={`text-sm! ${colors.textSecondary}!`}>
                            {item.description}
                          </p>
                          <div className={`mt-3! p-3! rounded! bg-gray-100! dark:bg-gray-700! ${colors.textSecondary}! text-sm!`}>
                            Content will be generated after synopsis approval.
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SWT Final Review Tab */}
              {activeTab === 'final_review' && (
                <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                  <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                    Step 19: Human Review #3
                  </h3>
                  <p className={`text-sm! sm:text-base! ${colors.textSecondary}!`}>
                    Final review of all text exports (script, dialogue, VO, shot list, camera logic, micro-details) will be available after generation is complete.
                  </p>
                </div>
              )}

              {/* Delivery Tab */}
              {activeTab === 'delivery' && (
                <div className="space-y-4! sm:space-y-6!">
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                      Step 22-23: Final Assembly & Delivery
                    </h3>
                    <p className={`text-sm! sm:text-base! ${colors.textSecondary}! mb-6!`}>
                      Final video assembly and delivery to client.
                    </p>

                    {/* Review Notes for Approval/Rejection */}
                    {canTakeAction && (
                      <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800! mb-6!`}>
                        <label className={`block! text-base! sm:text-lg! font-semibold! mb-3! ${colors.text}!`}>
                          Review Notes
                        </label>
                        <textarea
                          ref={reviewNotesTextareaRef}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className={`
                            w-full! h-32! sm:h-40! p-3! sm:p-4! border-2! rounded-lg! resize-none! text-sm! sm:text-base! leading-relaxed!
                            ${colors.border}! ${colors.background}! ${colors.text}!
                            focus:ring-4! focus:ring-blue-500/50! focus:border-blue-500! transition-all! duration-300!
                          `}
                          placeholder="Add review comments (required for rejection)..."
                        />
                        <p className={`text-xs! sm:text-sm! mt-2! ${colors.textSecondary}!`}>
                          Required for rejection
                        </p>
                      </div>
                    )}

                    {/* Action Buttons - Only in Delivery Tab */}
                    {canTakeAction && (
                      <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800!`}>
                        <div className={`flex! flex-col! sm:flex-row! gap-3! sm:gap-4!`}>
                          <button
                            onClick={handleApprove}
                            disabled={isApproving || isRejecting}
                            className="flex-1! flex! items-center! justify-center! gap-2! sm:gap-3! px-4! sm:px-6! py-3! sm:py-4! bg-linear-to-r! from-green-600! to-green-700! text-white! font-bold! text-base! sm:text-lg! rounded-xl! shadow-xl! hover:from-green-700! hover:to-green-800! disabled:opacity-50! disabled:cursor-not-allowed! transition-all! duration-200! transform! hover:scale-105! hover:shadow-2xl!"
                          >
                            {isApproving ? (
                              <>
                                <div className="animate-spin! rounded-full! h-5! w-5! sm:h-6! sm:w-6! border-b-2! border-white!"></div>
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-5! w-5! sm:h-6! sm:w-6!" />
                                <span className="whitespace-nowrap!">Approve & Send to Client</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={isApproving || isRejecting}
                            className="flex-1! flex! items-center! justify-center! gap-2! sm:gap-3! px-4! sm:px-6! py-3! sm:py-4! bg-linear-to-r! from-red-600! to-red-700! text-white! font-bold! text-base! sm:text-lg! rounded-xl! shadow-xl! hover:from-red-700! hover:to-red-800! disabled:opacity-50! disabled:cursor-not-allowed! transition-all! duration-200! transform! hover:scale-105! hover:shadow-2xl!"
                          >
                            {isRejecting ? (
                              <>
                                <div className="animate-spin! rounded-full! h-5! w-5! sm:h-6! sm:w-6! border-b-2! border-white!"></div>
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-5! w-5! sm:h-6! sm:w-6!" />
                                Reject
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
