'use client'

import { useState, useRef, useEffect } from 'react'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { formatDistanceToNow } from 'date-fns'
import { X, CheckCircle2, XCircle, Edit, Save, Clock, Send, Lock, Unlock } from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { useToastContext } from '@/components/ToastProvider'

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

interface SynopsisChecklist {
  emotional_tone: boolean
  accuracy: boolean
  clarity: boolean
  perspective: boolean
  pacing: boolean
  sensitivity: boolean
  [key: string]: boolean
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
  workflow_step?: string
  synopsis?: string
  synopsis_approved?: boolean
  synopsis_review_notes?: string
  synopsis_reviewed_at?: string
  synopsis_reviewed_by?: string
  synopsis_checklist?: SynopsisChecklist
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
  const toast = useToastContext()
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
  
  // Synopsis Review State
  const [synopsis, setSynopsis] = useState<string | undefined>(request.synopsis)
  const [isGeneratingSynopsis, setIsGeneratingSynopsis] = useState(false)
  const [isApprovingSynopsis, setIsApprovingSynopsis] = useState(false)
  const [isRejectingSynopsis, setIsRejectingSynopsis] = useState(false)
  const [synopsisReviewNotes, setSynopsisReviewNotes] = useState(request.synopsis_review_notes || '')
  const [synopsisLLMInstructions, setSynopsisLLMInstructions] = useState('')
  const [synopsisChecklist, setSynopsisChecklist] = useState<SynopsisChecklist>(
    request.synopsis_checklist || {
      emotional_tone: false,
      accuracy: false,
      clarity: false,
      perspective: false,
      pacing: false,
      sensitivity: false
    }
  )
  
  // Track which tabs are unlocked by admin (override locks)
  const [unlockedTabs, setUnlockedTabs] = useState<Set<TabType>>(new Set())
  
  // Determine if a tab should be locked based on workflow progress
  const isTabLocked = (tabKey: TabType): boolean => {
    // If admin manually unlocked it, allow editing
    if (unlockedTabs.has(tabKey)) return false
    
    const workflowStep = request.workflow_step || 'dossier_review'
    const tabOrder: TabType[] = ['conversation', 'dossier', 'synopsis', 'generation', 'final_review', 'delivery']
    
    // Dossier tab is locked when review was sent OR workflow moved past it
    if (tabKey === 'dossier') {
      if (request.reviewed_at) return true
      const dossierIndex = tabOrder.indexOf('dossier')
      const currentIndex = tabOrder.findIndex(t => {
        const stepToTab: Record<string, TabType> = {
          'dossier_review': 'dossier',
          'synopsis_generation': 'synopsis',
          'synopsis_review': 'synopsis',
          'script_generation': 'generation',
          'final_review': 'final_review',
          'completed': 'delivery'
        }
        return stepToTab[workflowStep] === t
      })
      return currentIndex > dossierIndex
    }
    
    // Synopsis tab is locked when synopsis is approved
    if (tabKey === 'synopsis') {
      return request.synopsis_approved === true
    }
    
    return false
  }
  
  const toggleTabLock = (tabKey: TabType, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent tab switch when clicking lock icon
    setUnlockedTabs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tabKey)) {
        // Re-locking: remove from unlocked set, which will make isTabLocked check database status
        newSet.delete(tabKey)
      } else {
        // Unlocking: add to unlocked set to allow editing
        newSet.add(tabKey)
      }
      return newSet
    })
  }

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

  const handleGenerateSynopsis = async () => {
    setIsGeneratingSynopsis(true)
    try {
      const result = await adminApi.generateSynopsis(request.validation_id)
      if (result.success) {
        setSynopsis(result.synopsis)
        toast.success('Synopsis generated', `Generated ${result.word_count} words`)
        // Refresh the request data
        if (onReviewSent) {
          onReviewSent()
        }
      } else {
        toast.error('Failed to generate synopsis', 'Please try again.')
      }
    } catch (error) {
      console.error('Failed to generate synopsis:', error)
      toast.error('Failed to generate synopsis', 'Please try again.')
    } finally {
      setIsGeneratingSynopsis(false)
    }
  }

  const handleApproveSynopsis = async () => {
    setIsApprovingSynopsis(true)
    try {
      const result = await adminApi.approveSynopsis(
        request.validation_id, 
        synopsisReviewNotes,
        synopsisChecklist
      )
      if (result.success) {
        let message = 'Moving to script generation phase.'
        if (result.email_sent !== undefined) {
          if (result.email_sent) {
            message += '\n\n✅ Email notification sent successfully to client.'
          } else {
            message += `\n\n⚠️ Email notification failed: ${result.email_error || 'Unknown error'}`
          }
        }
        toast.success('Synopsis approved', message)
        if (onReviewSent) {
          onReviewSent()
        }
      } else {
        toast.error('Failed to approve synopsis', 'Please try again.')
      }
    } catch (error) {
      console.error('Failed to approve synopsis:', error)
      toast.error('Failed to approve synopsis', 'Please try again.')
    } finally {
      setIsApprovingSynopsis(false)
    }
  }

  const handleRejectSynopsis = async () => {
    if (!synopsisReviewNotes.trim()) {
      toast.error('Review notes required', 'Please provide notes explaining why the synopsis is rejected.')
      return
    }
    setIsRejectingSynopsis(true)
    try {
      const result = await adminApi.rejectSynopsis(
        request.validation_id, 
        synopsisReviewNotes,
        synopsisLLMInstructions.trim() || undefined
      )
      if (result.success) {
        setSynopsis(result.synopsis) // Update with new synopsis
        setSynopsisReviewNotes('') // Clear notes
        setSynopsisLLMInstructions('') // Clear special instructions
        toast.success('Synopsis rejected', 'New synopsis has been generated for review.')
        if (onReviewSent) {
          onReviewSent()
        }
      } else {
        toast.error('Failed to reject synopsis', 'Please try again.')
      }
    } catch (error) {
      console.error('Failed to reject synopsis:', error)
      toast.error('Failed to reject synopsis', 'Please try again.')
    } finally {
      setIsRejectingSynopsis(false)
    }
  }

  const handleSendReview = async () => {
    setIsSendingReview(true)
    console.log('📧 [FRONTEND] Sending review...')
    try {
      // Send review with checklist and issues
      const result = await adminApi.sendReview(
        request.validation_id,
        reviewChecklist,
        reviewIssues,
        reviewNotes
      )
      
      console.log('📧 [FRONTEND] Review response:', result)
      console.log('📧 [FRONTEND] Email sent:', result.email_sent)
      console.log('📧 [FRONTEND] Email error:', result.email_error)
      
      if (result.success) {
        // Build success message with email status
        let successMessage = ''
        if (result.needs_revision) {
          successMessage = `The chat has been reopened for the user to provide missing information.\n\nUnchecked items: ${result.unchecked_items.join(', ')}`
        } else {
          successMessage = 'All checklist items are complete.'
        }
        
        // Add email status to message
        if (result.email_sent !== undefined) {
          if (result.email_sent) {
            successMessage += '\n\n✅ Email notification sent successfully to admins.'
          } else {
            successMessage += `\n\n⚠️ Email notification failed: ${result.email_error || 'Unknown error'}`
          }
        }
        
        toast.success(
          'Review sent successfully!',
          successMessage
        )
        
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
      console.error('❌ [FRONTEND] Failed to send review:', error)
      toast.error('Failed to send review', 'Please try again.')
    } finally {
      setIsSendingReview(false)
    }
  }

  // Sync synopsis state when request changes
  useEffect(() => {
    if (request.synopsis !== undefined) {
      setSynopsis(request.synopsis)
    }
    if (request.synopsis_review_notes !== undefined) {
      setSynopsisReviewNotes(request.synopsis_review_notes || '')
    }
    if (request.synopsis_checklist !== undefined) {
      setSynopsisChecklist(request.synopsis_checklist || {
        emotional_tone: false,
        accuracy: false,
        clarity: false,
        perspective: false,
        pacing: false,
        sensitivity: false
      })
    }
    // Note: synopsis_approved is read directly from request.synopsis_approved
    // No local state needed - always use request.synopsis_approved for conditional rendering
  }, [request.synopsis, request.synopsis_review_notes, request.synopsis_checklist, request.synopsis_approved, request.workflow_step])

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
              {(() => {
                // Determine tab states based on workflow_step
                const workflowStep = request.workflow_step || 'dossier_review'
                const getTabState = (tabKey: TabType): 'pending' | 'active' | 'done' => {
                  // Map workflow steps to their corresponding tabs
                  const stepToTab: Record<string, TabType> = {
                    'dossier_review': 'dossier',
                    'synopsis_generation': 'synopsis',
                    'synopsis_review': 'synopsis',
                    'script_generation': 'generation',
                    'final_review': 'final_review',
                    'completed': 'delivery'
                  }
                  
                  // Determine which tab this workflow step belongs to
                  let currentTab = stepToTab[workflowStep] || 'dossier'
                  
                  // Special handling: if synopsis is approved, synopsis tab is done
                  if (request.synopsis_approved && workflowStep === 'script_generation') {
                    // Synopsis is done, generation is active
                  }
                  
                  // Conversation is always done (it's the first step)
                  if (tabKey === 'conversation') return 'done'
                  
                  // Special case: Dossier tab is done when review was sent (reviewed_at exists)
                  if (tabKey === 'dossier' && request.reviewed_at) {
                    return 'done'
                  }
                  
                  // Determine order of tabs
                  const tabOrder: TabType[] = ['conversation', 'dossier', 'synopsis', 'generation', 'final_review', 'delivery']
                  const currentTabIndex = tabOrder.indexOf(currentTab)
                  const thisTabIndex = tabOrder.indexOf(tabKey)
                  
                  // If this tab is before the current workflow tab, it's done
                  if (thisTabIndex < currentTabIndex) return 'done'
                  
                  // Special case: if synopsis is approved and we're in generation, synopsis is done
                  if (tabKey === 'synopsis' && request.synopsis_approved && currentTab === 'generation') {
                    return 'done'
                  }
                  
                  // If this tab matches the current workflow tab, it's active
                  if (tabKey === currentTab) return 'active'
                  
                  // Otherwise, it's pending
                  return 'pending'
                }
                
                return [
                  { key: 'conversation' as TabType, label: 'Conversation' },
                  { key: 'dossier' as TabType, label: 'Dossier Review' },
                  { key: 'synopsis' as TabType, label: 'Synopsis Review' },
                  { key: 'generation' as TabType, label: 'Generation' },
                  { key: 'final_review' as TabType, label: 'SWT Final Review' },
                  { key: 'delivery' as TabType, label: 'Delivery' }
                ].map((tab) => {
                  const state = getTabState(tab.key)
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        relative! px-4! sm:px-6! md:px-8! py-3! sm:py-4! text-sm! sm:text-base! font-semibold! transition-all! duration-200! whitespace-nowrap! flex! items-center! gap-2!
                        ${activeTab === tab.key
                          ? `${colors.textSecondary}! bg-white! dark:bg-gray-900!`
                          : `${colors.textSecondary}! hover:${colors.text}! hover:bg-gray-100! dark:hover:bg-gray-700!`
                        }
                      `}
                    >
                      {state === 'done' && (
                        <span className="text-green-600! dark:text-green-400! text-base!">✓</span>
                      )}
                      {state === 'active' && (
                        <span className="text-yellow-600! dark:text-yellow-400! text-xs! animate-pulse!">⏳</span>
                      )}
                      {state === 'pending' && (
                        <span className="text-gray-400! dark:text-gray-500! text-xs!">○</span>
                      )}
                      {tab.label}
                      {/* Lock icon for locked tabs */}
                      {isTabLocked(tab.key) && (
                        <div 
                          className="ml-auto! cursor-pointer!"
                          onClick={(e) => toggleTabLock(tab.key, e)}
                          title="Tab is locked. Click to unlock."
                        >
                          <Lock 
                            className="h-4! w-4! text-gray-400! dark:text-gray-500! hover:text-gray-600! dark:hover:text-gray-300!" 
                          />
                        </div>
                      )}
                      {/* Unlock icon for manually unlocked tabs */}
                      {!isTabLocked(tab.key) && unlockedTabs.has(tab.key) && (
                        <div 
                          className="ml-auto! cursor-pointer!"
                          onClick={(e) => toggleTabLock(tab.key, e)}
                          title="Tab is unlocked. Click to lock again."
                        >
                          <Unlock 
                            className="h-4! w-4! text-blue-500! dark:text-blue-400! hover:text-blue-600! dark:hover:text-blue-300!" 
                          />
                        </div>
                      )}
                    </button>
                  )
                })
              })()}
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
              {activeTab === 'dossier' && (() => {
                const dossierLocked = isTabLocked('dossier')
                return (
                  <div className="space-y-4! sm:space-y-6! relative!">
                  {dossierLocked && (
                    <div className={`absolute! inset-0! bg-black/20! dark:bg-black/40! z-10! rounded-xl! flex! items-center! justify-center!`}>
                      <div className={`px-6! py-4! rounded-lg! ${colors.cardBackground}! border-2! ${colors.border}! shadow-xl! flex! items-center! gap-3!`}>
                        <Lock className="h-6! w-6! text-gray-500! dark:text-gray-400!" />
                        <div>
                          <p className={`font-semibold! ${colors.text}!`}>Dossier Review is Locked</p>
                          <p className={`text-sm! ${colors.textSecondary}!`}>Click the lock icon in the tab to unlock and edit</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg! ${dossierLocked ? 'pointer-events-none! opacity-60!' : ''}`}>
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
                              disabled={dossierLocked}
                              className="mt-1! cursor-pointer! w-5! h-5! disabled:cursor-not-allowed! disabled:opacity-50!"
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
                            disabled={dossierLocked}
                            className={`px-3! py-2! rounded! border! ${colors.border}! ${colors.background}! ${colors.text}! text-sm! disabled:opacity-50! disabled:cursor-not-allowed!`}
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
                            disabled={dossierLocked}
                            className={`flex-1! px-3! py-2! rounded! border! ${colors.border}! ${colors.background}! ${colors.text}! text-sm! disabled:opacity-50! disabled:cursor-not-allowed!`}
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
                            disabled={dossierLocked}
                            className="px-4! py-2! bg-blue-600! text-white! rounded! hover:bg-blue-700! text-sm! font-medium! disabled:opacity-50! disabled:cursor-not-allowed!"
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
                          disabled={isSendingReview || dossierLocked}
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
                )
              })()}

              {/* Synopsis Review Tab */}
              {activeTab === 'synopsis' && (() => {
                const synopsisLocked = isTabLocked('synopsis')
                return (
                <div className="space-y-4! sm:space-y-6! relative!">
                  {synopsisLocked && (
                    <div className={`absolute! inset-0! bg-black/20! dark:bg-black/40! z-10! rounded-xl! flex! items-center! justify-center!`}>
                      <div className={`px-6! py-4! rounded-lg! ${colors.cardBackground}! border-2! ${colors.border}! shadow-xl! flex! items-center! gap-3!`}>
                        <Lock className="h-6! w-6! text-gray-500! dark:text-gray-400!" />
                        <div>
                          <p className={`font-semibold! ${colors.text}!`}>Synopsis Review is Locked</p>
                          <p className={`text-sm! ${colors.textSecondary}!`}>Click the lock icon in the tab to unlock and edit</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={`p-4! sm:p-5! rounded-xl! border-2! ${colors.border}! ${colors.cardBackground}! shadow-lg! ${synopsisLocked ? 'pointer-events-none! opacity-60!' : ''}`}>
                    <h3 className={`text-lg! sm:text-xl! font-bold! mb-4! ${colors.text}! border-b-2! ${colors.border}! pb-2!`}>
                      Step 10-11: Synopsis Review
                    </h3>
                    <p className={`text-sm! sm:text-base! ${colors.textSecondary}! mb-6!`}>
                      Review the generated synopsis for emotional tone, accuracy, clarity, perspective, pacing, and sensitivity.
                    </p>

                    {/* Generate Synopsis Button (if not generated) */}
                    {!synopsis && (
                      <div className={`p-4! rounded-lg! border-2! ${colors.border}! bg-yellow-50! dark:bg-yellow-900/20! mb-6!`}>
                        <p className={`text-sm! ${colors.text}! mb-4!`}>
                          Synopsis has not been generated yet. Click the button below to generate it.
                        </p>
                        <button
                          onClick={handleGenerateSynopsis}
                          disabled={isGeneratingSynopsis || synopsisLocked}
                          className={`px-6! py-3! bg-blue-600! text-white! font-bold! rounded-lg! hover:bg-blue-700! disabled:opacity-50! disabled:cursor-not-allowed! transition-all! flex! items-center! justify-center! gap-2!`}
                        >
                          {isGeneratingSynopsis ? (
                            <>
                              <div className="animate-spin! rounded-full! h-5! w-5! border-b-2! border-white!"></div>
                              <span>Generating Synopsis...</span>
                            </>
                          ) : (
                            'Generate Synopsis (Step 10)'
                          )}
                        </button>
                      </div>
                    )}

                    {/* Synopsis Display */}
                    {synopsis && (
                      <div className="space-y-6!">
                        <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-gray-50! dark:bg-gray-800!`}>
                          <div className="flex! justify-between! items-center! mb-4!">
                            <h4 className={`text-base! sm:text-lg! font-semibold! ${colors.text}!`}>
                              Generated Synopsis
                            </h4>
                            {request.synopsis_approved && (
                              <span className={`px-3! py-1! rounded-full! text-sm! font-semibold! bg-green-100! dark:bg-green-900/30! text-green-800! dark:text-green-300!`}>
                                ✅ Approved
                              </span>
                            )}
                          </div>
                          <div className={`p-4! rounded! bg-white! dark:bg-gray-900! border! ${colors.border}! max-h-[600px]! overflow-y-auto!`}>
                            <p className={`text-sm! sm:text-base! ${colors.text}! whitespace-pre-wrap! leading-relaxed!`}>
                              {synopsis}
                            </p>
                          </div>
                          <div className={`mt-3! text-xs! ${colors.textSecondary}!`}>
                            Word count: {synopsis ? synopsis.split(/\s+/).filter(Boolean).length : 0} words
                          </div>
                        </div>

                        {/* Review Checklist - Show if not approved OR if unlocked for editing */}
                        {(!request.synopsis_approved || unlockedTabs.has('synopsis')) && (
                          <div className={`p-4! sm:p-5! rounded-lg! border-2! ${colors.border}! bg-blue-50! dark:bg-blue-900/20!`}>
                            <h4 className={`text-base! sm:text-lg! font-semibold! mb-4! ${colors.text}!`}>
                              Review Checklist
                            </h4>
                            <div className="space-y-3! mb-6!">
                              {[
                                { key: 'emotional_tone' as const, label: 'Emotional Tone', description: 'Does the synopsis capture the intended emotional arc?' },
                                { key: 'accuracy' as const, label: 'Accuracy vs Intake', description: 'Does it accurately reflect the story intake data?' },
                                { key: 'clarity' as const, label: 'Clarity', description: 'Is the story clear and easy to understand?' },
                                { key: 'perspective' as const, label: 'Perspective', description: 'Does it match the chosen perspective?' },
                                { key: 'pacing' as const, label: 'Pacing', description: 'Is the pacing appropriate for the story?' },
                                { key: 'sensitivity' as const, label: 'Sensitivity', description: 'Is it culturally sensitive and appropriate?' }
                              ].map((item) => (
                                <label
                                  key={item.key}
                                  className={`flex! items-start! gap-3! p-3! rounded-lg! border-2! cursor-pointer! transition-all! hover:bg-gray-100! dark:hover:bg-gray-700! ${
                                    synopsisChecklist[item.key]
                                      ? 'border-green-500! bg-green-50! dark:bg-green-900/20!'
                                      : colors.border
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={synopsisChecklist[item.key]}
                                    onChange={(e) => setSynopsisChecklist(prev => ({
                                      ...prev,
                                      [item.key]: e.target.checked
                                    }))}
                                    disabled={synopsisLocked}
                                    className="mt-1! w-5! h-5! rounded! border-2! border-gray-300! dark:border-gray-600! text-green-600! focus:ring-2! focus:ring-green-500! cursor-pointer! disabled:cursor-not-allowed! disabled:opacity-50!"
                                  />
                                  <div className="flex-1!">
                                    <div className={`font-semibold! text-sm! ${colors.text}! mb-1!`}>
                                      {item.label}
                                    </div>
                                    <div className={`text-xs! ${colors.textSecondary}!`}>
                                      {item.description}
                                    </div>
                                  </div>
                                </label>
                              ))}
                            </div>

                            {/* Review Notes */}
                            <div className="mb-6!">
                              <label className={`block! text-sm! font-semibold! mb-2! ${colors.text}!`}>
                                Review Notes <span className="text-red-500!">*</span>
                              </label>
                              <textarea
                                value={synopsisReviewNotes}
                                onChange={(e) => setSynopsisReviewNotes(e.target.value)}
                                placeholder="Add your review notes here (required for rejection)..."
                                disabled={synopsisLocked}
                                className={`w-full! px-4! py-3! rounded-lg! border-2! ${colors.border}! ${colors.background}! ${colors.text}! resize-none! focus:outline-none! focus:ring-2! focus:ring-blue-500! disabled:opacity-50! disabled:cursor-not-allowed!`}
                                rows={4}
                              />
                            </div>

                            {/* Special Instructions for LLM (only when rejecting) */}
                            <div className="mb-6!">
                              <label className={`block! text-sm! font-semibold! mb-2! ${colors.text}!`}>
                                Special Instructions or Guidelines for LLM
                                <span className={`text-xs! font-normal! ml-2! ${colors.textSecondary}!`}>
                                  (Optional - only used when regenerating)
                                </span>
                              </label>
                              <textarea
                                value={synopsisLLMInstructions}
                                onChange={(e) => setSynopsisLLMInstructions(e.target.value)}
                                placeholder="Add any special instructions or guidelines you want the LLM to follow when regenerating the synopsis (e.g., 'Focus more on the emotional journey', 'Emphasize the setting details', etc.)..."
                                disabled={synopsisLocked}
                                className={`w-full! px-4! py-3! rounded-lg! border-2! ${colors.border}! ${colors.background}! ${colors.text}! resize-none! focus:outline-none! focus:ring-2! focus:ring-purple-500! disabled:opacity-50! disabled:cursor-not-allowed!`}
                                rows={3}
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex! flex-col! sm:flex-row! gap-4!">
                              <button
                                onClick={handleApproveSynopsis}
                                disabled={isApprovingSynopsis || isRejectingSynopsis || synopsisLocked}
                                className="flex-1! flex! items-center! justify-center! gap-2! px-6! py-3! bg-green-600! text-white! font-bold! rounded-lg! hover:bg-green-700! disabled:opacity-50! disabled:cursor-not-allowed! transition-all!"
                              >
                                {isApprovingSynopsis ? (
                                  <>
                                    <div className="animate-spin! rounded-full! h-5! w-5! border-b-2! border-white! shrink-0!"></div>
                                    <span>Approving...</span>
                                  </>
                                ) : (
                                  <>
                                    ✅ Approve Synopsis
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleRejectSynopsis}
                                disabled={isApprovingSynopsis || isRejectingSynopsis || synopsisLocked}
                                className="flex-1! flex! items-center! justify-center! gap-2! px-6! py-3! bg-red-600! text-white! font-bold! rounded-lg! hover:bg-red-700! disabled:opacity-50! disabled:cursor-not-allowed! transition-all!"
                              >
                                {isRejectingSynopsis ? (
                                  <>
                                    <div className="animate-spin! rounded-full! h-5! w-5! border-b-2! border-white! shrink-0!"></div>
                                    <span>Regenerating...</span>
                                  </>
                                ) : (
                                  <>
                                    ❌ Reject & Regenerate
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Approved Status - Only show if approved AND locked (not unlocked for editing) */}
                        {request.synopsis_approved && !unlockedTabs.has('synopsis') && (
                          <div className={`p-4! rounded-lg! border-2! border-green-500! bg-green-50! dark:bg-green-900/20!`}>
                            <p className={`text-sm! font-semibold! text-green-800! dark:text-green-300! mb-2!`}>
                              ✅ Synopsis Approved
                            </p>
                            {request.synopsis_review_notes && (
                              <p className={`text-sm! text-green-700! dark:text-green-400!`}>
                                Notes: {request.synopsis_review_notes}
                              </p>
                            )}
                            {request.synopsis_reviewed_at && (
                              <p className={`text-xs! text-green-600! dark:text-green-500! mt-2!`}>
                                Reviewed: {new Date(request.synopsis_reviewed_at).toLocaleString()}
                              </p>
                            )}
                            <p className={`text-sm! mt-4! ${colors.text}!`}>
                              Ready to proceed to script generation (Steps 12-18).
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                )
              })()}

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
