'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { formatDistanceToNow } from 'date-fns'
import { X, CheckCircle2, XCircle, Edit, Save, Clock } from 'lucide-react'

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
  const [activeTab, setActiveTab] = useState<'status' | 'dossier' | 'transcript' | 'script'>('status')
  const [editedScript, setEditedScript] = useState(request.generated_script)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [highlightReviewNotes, setHighlightReviewNotes] = useState(false)
  const [shouldFocusReviewNotes, setShouldFocusReviewNotes] = useState(false)
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

  // Effect to handle focusing and highlighting when tab switches to script
  useEffect(() => {
    if (shouldFocusReviewNotes && activeTab === 'script') {
      // Wait a bit for DOM to update
      setTimeout(() => {
        reviewNotesTextareaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        reviewNotesTextareaRef.current?.focus()
        setHighlightReviewNotes(true)
        setTimeout(() => {
          setHighlightReviewNotes(false)
          setShouldFocusReviewNotes(false)
        }, 2000)
      }, 200)
    }
  }, [activeTab, shouldFocusReviewNotes])

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
    // If review notes are empty, switch to script tab and highlight the textarea
    if (!reviewNotes.trim()) {
      // Switch to script tab if not already there
      if (activeTab !== 'script') {
        setActiveTab('script')
        setShouldFocusReviewNotes(true)
      } else {
        // Already on script tab, scroll, focus and highlight immediately
        reviewNotesTextareaRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        })
        reviewNotesTextareaRef.current?.focus()
        setHighlightReviewNotes(true)
        setTimeout(() => setHighlightReviewNotes(false), 2000)
      }
      return
    }
    onReject(request.validation_id, reviewNotes)
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
        <div className={`sticky! top-0! z-10! px-4! sm:px-6! md:px-8! py-4! sm:py-5! md:py-6! border-b-2! ${colors.border}! ${colors.sidebarBackground}! bg-gradient-to-r! from-gray-50! to-gray-100! dark:from-gray-800! dark:to-gray-900! rounded-t-xl! sm:rounded-t-xl! md:rounded-t-2xl!`}>
          <div className="flex! justify-between! items-start! sm:items-center! gap-3!">
            <div className="flex-1! min-w-0!">
              <h2 className={`text-xl! sm:text-2xl! md:text-3xl! font-bold! mb-2! ${colors.text}! truncate!`}>
                Validation Request
              </h2>
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
              <button
                onClick={() => setActiveTab('status')}
                className={`
                  px-4! sm:px-6! md:px-8! py-3! sm:py-4! text-sm! sm:text-base! font-semibold! border-b-4! transition-all! duration-200! whitespace-nowrap!
                  ${activeTab === 'status'
                    ? `border-blue-600! ${colors.text}! bg-white! dark:bg-gray-900!`
                    : `border-transparent! ${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700!`
                  }
                `}
              >
                Status & Overview
              </button>
              <button
                onClick={() => setActiveTab('dossier')}
                className={`
                  px-4! sm:px-6! md:px-8! py-3! sm:py-4! text-sm! sm:text-base! font-semibold! border-b-4! transition-all! duration-200! whitespace-nowrap!
                  ${activeTab === 'dossier'
                    ? `border-blue-600! ${colors.text}! bg-white! dark:bg-gray-900!`
                    : `border-transparent! ${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700!`
                  }
                `}
              >
                📋 Dossier Review (Step 9)
              </button>
              <button
                onClick={() => setActiveTab('transcript')}
                className={`
                  px-4! sm:px-6! md:px-8! py-3! sm:py-4! text-sm! sm:text-base! font-semibold! border-b-4! transition-all! duration-200! whitespace-nowrap!
                  ${activeTab === 'transcript'
                    ? `border-blue-600! ${colors.text}! bg-white! dark:bg-gray-900!`
                    : `border-transparent! ${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700!`
                  }
                `}
              >
                Conversation Transcript
              </button>
              <button
                onClick={() => setActiveTab('script')}
                className={`
                  px-4! sm:px-6! md:px-8! py-3! sm:py-4! text-sm! sm:text-base! font-semibold! border-b-4! transition-all! duration-200! whitespace-nowrap!
                  ${activeTab === 'script'
                    ? `border-blue-600! ${colors.text}! bg-white! dark:bg-gray-900!`
                    : `border-transparent! ${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700!`
                  }
                `}
              >
                Generated Script
              </button>
            </div>

            {/* Tab Content - No Individual Scroll */}
            <div className="p-4! sm:p-6! md:p-8! bg-white! dark:bg-gray-900!">
              {activeTab === 'status' && (
                <div className="space-y-4! sm:space-y-6!">
                  {/* Status Info */}
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-3! sm:mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2! sm:pb-3!`}>
                      Status Information
                    </h3>
                    <div className="space-y-3!">
                      <div className="flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0!">
                        <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Status:</span>
                        <span className={`
                          text-sm! sm:text-base! md:text-lg! font-bold! px-3! sm:px-4! py-1.5! sm:py-2! rounded-full! border-2!
                          ${statusStyle.bg}! ${statusStyle.text}! ${statusStyle.border}!
                          whitespace-nowrap!
                        `}>
                          {statusStyle.icon} {request.status.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </span>
                      </div>
                      {request.reviewed_by && (
                        <div className="flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! pt-2! border-t! ${colors.border}!">
                          <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Reviewed by:</span>
                          <span className={`text-sm! sm:text-base! font-medium! ${colors.text}! break-words! sm:text-right!`}>{request.reviewed_by}</span>
                        </div>
                      )}
                      {request.reviewed_at && (
                        <div className="flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! pt-2! border-t! ${colors.border}!">
                          <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Reviewed:</span>
                          <span className={`text-sm! sm:text-base! font-medium! ${colors.text}! flex! items-center! gap-1!`}>
                            <Clock className="h-3! w-3! sm:h-4! sm:w-4!" />
                            {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Request Details */}
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h4 className={`text-lg! sm:text-xl! font-bold! mb-3! sm:mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2! sm:pb-3!`}>
                      Request Details
                    </h4>
                    <div className="space-y-2! sm:space-y-3!">
                      <div className={`flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! p-2! sm:p-3! rounded-lg! bg-gray-100! dark:bg-gray-700!`}>
                        <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Validation ID:</span>
                        <span className={`font-mono! text-xs! sm:text-sm! font-medium! ${colors.text}! break-all! sm:break-normal! sm:text-right!`}>
                          {request.validation_id}
                        </span>
                      </div>
                      <div className={`flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! p-2! sm:p-3! rounded-lg! bg-gray-100! dark:bg-gray-700!`}>
                        <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Project ID:</span>
                        <span className={`font-mono! text-xs! sm:text-sm! font-medium! ${colors.text}! break-all! sm:break-normal! sm:text-right!`}>
                          {request.project_id}
                        </span>
                      </div>
                      <div className={`flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! p-2! sm:p-3! rounded-lg! bg-gray-100! dark:bg-gray-700!`}>
                        <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Session ID:</span>
                        <span className={`font-mono! text-xs! sm:text-sm! font-medium! ${colors.text}! break-all! sm:break-normal! sm:text-right!`}>
                          {request.session_id}
                        </span>
                      </div>
                      <div className={`flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! p-2! sm:p-3! rounded-lg! bg-gray-100! dark:bg-gray-700!`}>
                        <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Client:</span>
                        <span className={`text-sm! sm:text-base! font-medium! ${colors.text}! break-all! sm:break-normal! sm:text-right!`}>
                          {request.client_name || request.client_email || 'N/A'}
                        </span>
                      </div>
                      <div className={`flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-2! sm:gap-0! p-2! sm:p-3! rounded-lg! bg-gray-100! dark:bg-gray-700!`}>
                        <span className={`text-sm! sm:text-base! font-semibold! ${colors.textSecondary}!`}>Created:</span>
                        <span className={`text-sm! sm:text-base! font-medium! ${colors.text}! flex! items-center! gap-1! sm:justify-end!`}>
                          <Clock className="h-3! w-3! sm:h-4! sm:w-4!" />
                          {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Previous Review Notes */}
                  {request.review_notes && (
                    <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                      <h4 className={`text-lg! sm:text-xl! font-bold! mb-3! sm:mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2! sm:pb-3!`}>
                        Previous Notes
                      </h4>
                      <div className={`p-3! sm:p-4! rounded-lg! text-sm! sm:text-base! border-2! ${colors.border}! bg-gray-100! dark:bg-gray-700! ${colors.text}! leading-relaxed!`}>
                        {request.review_notes}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'dossier' && (
                <div className="space-y-4! sm:space-y-6!">
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg!`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                      Step 9: SWT Representative Review #1
                    </h3>
                    <p className={`text-sm! sm:text-base! ${colors.textSecondary}! mb-6!`}>
                      Review the following aspects for data clarity before writing. Check each item when reviewed, and flag any issues.
                    </p>

                    {/* Review Checklist */}
                    <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800! mb-6!`}>
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

                    {/* Dossier Data Display */}
                    {request.dossier_data && (
                      <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800! mb-6!`}>
                        <h4 className={`text-base! sm:text-lg! font-semibold! mb-4! ${colors.text}!`}>
                          Story Dossier Data
                        </h4>
                        <div className="space-y-4!">
                          {/* Heroes */}
                          {request.dossier_data.heroes && request.dossier_data.heroes.length > 0 && (
                            <div>
                              <h5 className={`text-sm! font-semibold! mb-2! ${colors.text}!`}>Hero Characters:</h5>
                              {request.dossier_data.heroes.map((hero, idx) => (
                                <div key={idx} className={`p-3! mb-2! rounded! border! ${colors.border}! bg-white! dark:bg-gray-700!`}>
                                  <div className={`text-sm! ${colors.text}!`}>
                                    <strong>Name:</strong> {hero.name || 'N/A'} | 
                                    <strong> Age:</strong> {hero.age_at_story || 'N/A'} | 
                                    <strong> Relationship:</strong> {hero.relationship_to_user || 'N/A'}
                                    {hero.photo_url && <span className="text-green-600! dark:text-green-400!"> 📷 Photo</span>}
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
                                  <div className={`text-sm! ${colors.text}!`}>
                                    <strong>Name:</strong> {char.name || 'N/A'} | 
                                    <strong> Role:</strong> {char.role || 'N/A'}
                                    {char.photo_url && <span className="text-green-600! dark:text-green-400!"> 📷 Photo</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Setting & Time */}
                          {(request.dossier_data.story_location || request.dossier_data.story_timeframe || request.dossier_data.season_time_of_year) && (
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
                                  {request.dossier_data.story_type && <div><strong>Story Type:</strong> {request.dossier_data.story_type.replace('_', ' ')}</div>}
                                  {request.dossier_data.audience?.who_will_see_first && <div><strong>Audience:</strong> {request.dossier_data.audience.who_will_see_first}</div>}
                                  {request.dossier_data.audience?.desired_feeling && <div><strong>Desired Feeling:</strong> {request.dossier_data.audience.desired_feeling}</div>}
                                  {request.dossier_data.perspective && <div><strong>Perspective:</strong> {request.dossier_data.perspective.replace('_', ' ')}</div>}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Issue Flagging */}
                    <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-red-50! dark:bg-red-900/20! mb-6!`}>
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
                    <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-blue-50! dark:bg-blue-900/20!`}>
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
                              Please address all flagged issues before approving. Consider requesting fixes from the user.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'transcript' && (
                <div className={`bg-gray-50! dark:bg-gray-800! p-4! sm:p-6! rounded-xl! border-2! ${colors.border}! shadow-inner!`}>
                  <h3 className={`text-lg! sm:text-xl! md:text-2xl! font-bold! mb-3! sm:mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2! sm:pb-3!`}>
                    Conversation History
                  </h3>
                  <div className={`w-full! overflow-visible!`}>
                    <pre className={`whitespace-pre-wrap! text-sm! sm:text-base! ${colors.text}! font-sans! leading-relaxed! overflow-x-auto! wrap-break-word! block! w-full!`}>
                      {request.conversation_transcript}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'script' && (
                <div className="space-y-4! sm:space-y-6!">
                  <div className="flex! flex-col! sm:flex-row! justify-between! items-start! sm:items-center! gap-3! sm:gap-0! pb-4! border-b-2! ${colors.border}!">
                    <h3 className={`text-lg! sm:text-xl! md:text-2xl! font-bold! ${colors.text}!`}>Video Script</h3>
                    {canTakeAction && (
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`
                          flex! items-center! gap-2! px-4! sm:px-5! py-2! sm:py-2.5! text-sm! sm:text-base! font-medium! rounded-lg! border-2! transition-all! duration-200! w-full! sm:w-auto!
                          ${colors.border}! ${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700! shadow-md! hover:shadow-lg!
                        `}
                      >
                        <Edit className="h-4! w-4! sm:h-5! sm:w-5!" />
                        {isEditing ? 'Cancel Edit' : 'Edit Script'}
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4!">
                      <textarea
                        value={editedScript}
                        onChange={(e) => setEditedScript(e.target.value)}
                        className={`
                          w-full! h-[300px]! sm:h-[400px]! md:h-[500px]! p-4! sm:p-6! border-2! rounded-xl! resize-none! font-mono! text-sm! sm:text-base! leading-relaxed!
                          ${colors.border}! ${colors.background}! ${colors.text}!
                          focus:ring-4! focus:ring-blue-500/50! focus:border-blue-500! transition-all! duration-200!
                        `}
                        placeholder="Edit the generated script..."
                      />
                      <div className={`flex! flex-col! sm:flex-row! justify-end! gap-3! pt-4! border-t-2! ${colors.border}!`}>
                        <button
                          onClick={() => {
                            setEditedScript(request.generated_script)
                            setIsEditing(false)
                          }}
                          className={`px-4! sm:px-6! py-2.5! sm:py-3! border-2! rounded-lg! text-sm! sm:text-base! font-medium! transition-all! duration-200! shadow-md! hover:shadow-lg! w-full! sm:w-auto! ${colors.border}! ${colors.textSecondary}! hover:${colors.text}!`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveScript}
                          disabled={isUpdatingScript}
                          className="flex! items-center! justify-center! gap-2! px-4! sm:px-6! py-2.5! sm:py-3! bg-blue-600! text-white! rounded-lg! hover:bg-blue-700! disabled:opacity-50! disabled:cursor-not-allowed! text-sm! sm:text-base! font-semibold! transition-all! duration-200! shadow-lg! hover:shadow-xl! transform! hover:scale-105! w-full! sm:w-auto!"
                        >
                          {isUpdatingScript ? (
                            <>
                              <div className="animate-spin! rounded-full! h-4! w-4! sm:h-5! sm:w-5! border-b-2! border-white!"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4! w-4! sm:h-5! sm:w-5!" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`bg-gray-50! dark:bg-gray-800! p-4! sm:p-6! rounded-xl! border-2! ${colors.border}! shadow-inner!`}>
                      <pre className={`whitespace-pre-wrap! text-sm! sm:text-base! ${colors.text}! font-sans! leading-relaxed! overflow-x-auto!`}>
                        {editedScript}
                      </pre>
                    </div>
                  )}

                  {/* Review Notes - Only in Script Tab, Below Script Content */}
                  {canTakeAction && (
                    <div className={`p-4! sm:p-5! rounded-xl! border-2! ${highlightReviewNotes ? 'border-red-500! ring-4! ring-red-500/50!' : colors.border}! ${colors.cardBackground}! shadow-lg! transition-all! duration-300!`}>
                      <label className={`block! text-lg! sm:text-xl! font-bold! mb-3! sm:mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2! sm:pb-3!`}>
                        Review Notes
                      </label>
                      <textarea
                        ref={reviewNotesTextareaRef}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className={`
                          w-full! h-32! sm:h-40! p-3! sm:p-4! border-2! rounded-lg! resize-none! text-sm! sm:text-base! leading-relaxed!
                          ${highlightReviewNotes ? 'border-red-500! ring-4! ring-red-500/50! bg-red-50! dark:bg-red-900/20!' : `${colors.border}! ${colors.background}!`} ${colors.text}!
                          focus:ring-4! focus:ring-blue-500/50! focus:border-blue-500! transition-all! duration-300!
                        `}
                        placeholder="Add review comments..."
                      />
                      <p className={`text-xs! sm:text-sm! mt-2! ${colors.textSecondary}!`}>
                        Required for rejection
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - Below Content (Stacked on Mobile, Inline on Tablet/Laptop) */}
          {canTakeAction && (
            <div className={`w-full! border-t-2! ${colors.border}! ${colors.sidebarBackground}! bg-gray-50! dark:bg-gray-800! rounded-b-xl! sm:rounded-b-xl! md:rounded-b-2xl!`}>
              <div className={`p-4! sm:p-5! md:p-6! flex! flex-col! sm:flex-row! gap-3! sm:gap-4!`}>
                <button
                  onClick={handleApprove}
                  disabled={isApproving || isRejecting}
                  className="flex-1! flex! items-center! justify-center! gap-2! sm:gap-3! px-4! sm:px-6! py-3! sm:py-4! bg-gradient-to-r! from-green-600! to-green-700! text-white! font-bold! text-base! sm:text-lg! rounded-xl! shadow-xl! hover:from-green-700! hover:to-green-800! disabled:opacity-50! disabled:cursor-not-allowed! transition-all! duration-200! transform! hover:scale-105! hover:shadow-2xl!"
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
                  className="flex-1! flex! items-center! justify-center! gap-2! sm:gap-3! px-4! sm:px-6! py-3! sm:py-4! bg-gradient-to-r! from-red-600! to-red-700! text-white! font-bold! text-base! sm:text-lg! rounded-xl! shadow-xl! hover:from-red-700! hover:to-red-800! disabled:opacity-50! disabled:cursor-not-allowed! transition-all! duration-200! transform! hover:scale-105! hover:shadow-2xl!"
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
    </div>
  )
}
