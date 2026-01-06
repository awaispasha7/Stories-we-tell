'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // Removed - using custom styling
// import { Badge } from '@/components/ui/badge' // Removed - using custom styling
// import { Separator } from '@/components/ui/separator' // Unused import
import { api } from '@/lib/api'

// Import getUserHeaders for debugging
const getUserHeaders = () => {
  if (typeof window === 'undefined') return {}
  
  try {
    const user = localStorage.getItem('user')
    
    const headers: Record<string, string> = {}
    
    if (user) {
      const userData = JSON.parse(user)
      headers['X-User-ID'] = userData.user_id
    }
    
    return headers
  } catch (error) {
    console.error('Error getting user headers:', error)
  }
  
  return {}
}
import { useDossierRefresh } from '@/lib/dossier-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'

interface HeroData {
  name?: string
  age_at_story?: number | string
  relationship_to_user?: string
  physical_descriptors?: string
  personality_traits?: string
  photo_url?: string
  [key: string]: any
}

interface SupportingCharacterData {
  name?: string
  role?: string
  description?: string
  photo_url?: string
  [key: string]: any
}

interface AudienceData {
  who_will_see_first?: string
  desired_feeling?: string
  [key: string]: any
}

interface DossierData {
  title: string
  logline: string
  genre: string
  tone: string
  scenes: SceneData[]
  characters: CharacterData[]  // Legacy format
  heroes?: HeroData[]  // New: Primary characters
  supporting_characters?: SupportingCharacterData[]  // New: Secondary characters
  locations: string[]
  project_id?: string  // Include project_id for visibility
  // Extended optional fields mirrored from snapshot_json
  outcome?: string
  runtime?: string
  actions_taken?: string
  likes_in_story?: string
  story_location?: string
  story_timeframe?: string
  story_world_type?: string
  season_time_of_year?: string
  environmental_details?: string
  problem_statement?: string
  subject_full_name?: string
  subject_brief_description?: string
  subject_exists_real_world?: boolean
  writer_connection_place_time?: string
  subject_relationship_to_writer?: string
  story_type?: string  // New: romantic, childhood_drama, fantasy, etc.
  audience?: AudienceData  // New: who_will_see_first, desired_feeling
  perspective?: string  // New: first_person, narrator_voice, etc.
  synopsis?: string  // New: 500-800 word synopsis
  full_script?: string  // New: Full script with dialogue, VO
  dialogue?: any[]  // New: Dialogue lines
  voiceover_script?: any  // New: VO script
  shot_list?: any  // New: Shot list
  camera_logic?: any  // New: Camera logic
  scene_math?: any  // New: Scene math
  micro_prompts?: any[]  // New: Micro-prompts
  [key: string]: any
}

interface SceneData {
  scene_id: string
  one_liner?: string
  description?: string
  setting_time?: string
  setting_location?: string
  time_of_day?: string
  interior_exterior?: string
  tone?: string
}

interface CharacterData {
  character_id?: string
  name?: string
  description?: string
  role?: string
  [key: string]: any
}

interface SidebarDossierProps {
  sessionId?: string
  projectId?: string
  onClose?: () => void
}

export function SidebarDossier({ sessionId, projectId, onClose }: SidebarDossierProps) {
  const { refreshTrigger, refreshDossier } = useDossierRefresh()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const queryClient = useQueryClient()
  
  // Listen for dossier_updated events
  useEffect(() => {
    const handleDossierUpdated = (event: CustomEvent) => {
      const { project_id } = event.detail || {}
      if (project_id === projectId) {
        console.log('🔄 [DOSSIER] Dossier updated event received, refreshing...')
        // Invalidate and refetch
        queryClient.invalidateQueries({ 
          queryKey: ['dossier', project_id],
          exact: false
        })
        queryClient.refetchQueries({ 
          queryKey: ['dossier', project_id],
          exact: false
        })
        refreshDossier(project_id)
      }
    }
    
    window.addEventListener('dossierUpdated', handleDossierUpdated as EventListener)
    return () => {
      window.removeEventListener('dossierUpdated', handleDossierUpdated as EventListener)
    }
  }, [projectId, queryClient, refreshDossier])
  
  const { data, isLoading, isFetching } = useQuery({ 
    queryKey: ['dossier', sessionId, projectId, refreshTrigger], // Include session and project IDs
    queryFn: async () => {
      // Don't fetch if we don't have a session or project ID
      if (!sessionId || !projectId) {
        console.log('⚠️ Skipping dossier fetch - no session or project ID')
        return null
      }
      
      console.log('🔄 Fetching dossier for session:', sessionId, 'project:', projectId)
      console.log('🔍 API URL will be:', `api/v1/dossiers/${projectId}`)
      console.log('🔍 Headers being sent:', getUserHeaders())
      try {
        const raw = await api.get(`api/v1/dossiers/${projectId}`).json<any>()
        console.log('✅ Dossier fetched successfully:', raw)
        // The API returns a row with snapshot_json; unwrap it into the shape the UI expects
        const snapshot = raw?.snapshot_json || raw || {}
        const mapped: DossierData = {
          ...snapshot, // Spread all snapshot fields first
          title: snapshot.title || '',
          logline: snapshot.logline || '',
          genre: snapshot.genre || '',
          tone: snapshot.tone || '',
          scenes: snapshot.scenes || [],
          characters: snapshot.characters || [],
          locations: snapshot.locations || [],
          project_id: projectId,
          // Extended fields from snapshot_json
          problem_statement: snapshot.problem_statement,
          outcome: snapshot.outcome,
          runtime: snapshot.runtime,
          actions_taken: snapshot.actions_taken,
          likes_in_story: snapshot.likes_in_story,
          story_location: snapshot.story_location,
          story_timeframe: snapshot.story_timeframe,
          story_world_type: snapshot.story_world_type,
          subject_full_name: snapshot.subject_full_name,
          subject_brief_description: snapshot.subject_brief_description,
          subject_exists_real_world: snapshot.subject_exists_real_world,
          writer_connection_place_time: snapshot.writer_connection_place_time,
          subject_relationship_to_writer: snapshot.subject_relationship_to_writer,
          // New fields
          heroes: snapshot.heroes || [],
          supporting_characters: snapshot.supporting_characters || [],
          story_type: snapshot.story_type,
          audience: snapshot.audience || {},
          perspective: snapshot.perspective,
          season_time_of_year: snapshot.season_time_of_year,
          environmental_details: snapshot.environmental_details,
        }
        console.log('📋 Mapped dossier data:', mapped)
        console.log('📋 Characters count:', mapped.characters?.length || 0)
        console.log('📋 Heroes count:', mapped.heroes?.length || 0)
        console.log('📋 Supporting Characters count:', mapped.supporting_characters?.length || 0)
        console.log('📋 Scenes count:', mapped.scenes?.length || 0)
        // Don't cache dossier in localStorage - database is source of truth
        return mapped
      } catch (err) {
        console.error('❌ Error fetching dossier:', err)
        console.error('❌ Full error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          status: (err as { response?: { status?: number } })?.response?.status,
          url: (err as { response?: { url?: string } })?.response?.url
        })
        // Don't throw error - return null to show empty state
        return null
      }
    },
    refetchInterval: false,
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid flash
    refetchOnMount: false, // Only refetch when query key changes (refreshTrigger)
    staleTime: 0,
    placeholderData: (previousData) => previousData, // Keep previous data during refetch to prevent flash
    enabled: !!(sessionId && projectId), // Only fetch if we have both IDs
    retry: 1, // Only retry once on failure
    retryDelay: 2000 // Wait 2 seconds before retry
  })
  const d = data ?? { 
    title: '', logline: '', genre: '', tone: '', scenes: [], characters: [], locations: [],
    heroes: [], supporting_characters: [], audience: {}
  }

  // Show loading state ONLY on initial load (when there's no data yet)
  // This prevents flash during background refetches
  if (isLoading && !data) {
    return (
      <div className="h-full! overflow-y-auto! overflow-x-hidden! flex! flex-col! gap-4! sm:gap-6! pt-16! sm:pt-20! pb-8! sm:pb-12! px-4! sm:px-8! lg:px-12! custom-scrollbar" style={{ padding: '2rem' }}>
        {onClose && (
          <div className="sm:hidden! mb-2!">
            <button
              onClick={onClose}
              className="inline-flex! items-center! gap-2! px-3! py-2! rounded-lg! bg-gray-100! dark:bg-gray-700! hover:bg-gray-200! dark:hover:bg-gray-600! transition-colors!"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5! w-5!" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="animate-pulse! space-y-4!">
          <div className="h-4! bg-gray-200! dark:bg-gray-700! rounded! w-3/4!"></div>
          <div className="h-4! bg-gray-200! dark:bg-gray-700! rounded! w-1/2!"></div>
          <div className="h-4! bg-gray-200! dark:bg-gray-700! rounded! w-2/3!"></div>
        </div>
      </div>
    )
  }

  // Show empty state if no session/project ID
  if (!sessionId || !projectId) {
    return (
      <div className="h-full! overflow-y-auto! overflow-x-hidden! flex! flex-col! gap-4! sm:gap-6! pt-16! sm:pt-20! pb-8! sm:pb-12! px-4! sm:px-8! lg:px-12! custom-scrollbar" style={{ padding: '2rem' }}>
        {onClose && (
          <div className="sm:hidden! mb-2!">
            <button
              onClick={onClose}
              className="inline-flex! items-center! gap-2! px-3! py-2! rounded-lg! bg-gray-100! dark:bg-gray-700! hover:bg-gray-200! dark:hover:bg-gray-600! transition-colors!"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5! w-5!" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="text-center! py-8!">
          <h3 className="text-gray-600! dark:text-gray-400! font-medium! mb-2!">No Active Session</h3>
          <p className="text-gray-500! dark:text-gray-500! text-sm!">
            Start a conversation to see your story dossier
          </p>
        </div>
      </div>
    )
  }

  // Show empty state if no dossier data
  if (!data) {
    return (
      <div className="h-full! overflow-y-auto! overflow-x-hidden! flex! flex-col! gap-4! sm:gap-6! pt-16! sm:pt-20! pb-8! sm:pb-12! px-4! sm:px-8! lg:px-12! custom-scrollbar" style={{ padding: '2rem' }}>
        {onClose && (
          <div className="sm:hidden! mb-2!">
            <button
              onClick={onClose}
              className="inline-flex! items-center! gap-2! px-3! py-2! rounded-lg! bg-gray-100! dark:bg-gray-700! hover:bg-gray-200! dark:hover:bg-gray-600! transition-colors!"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5! w-5!" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="text-center! py-8!">
          <h3 className="text-gray-600! dark:text-gray-400! font-medium! mb-2!">No Dossier Yet</h3>
          <p className="text-gray-500! dark:text-gray-500! text-sm!">
            Your story dossier will appear here as you develop your story
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full! overflow-y-auto! overflow-x-hidden! flex! flex-col! gap-4! sm:gap-6! pt-6! sm:pt-8! pb-8! sm:pb-12! px-4! sm:px-6! lg:px-8! custom-scrollbar">
      <div className="max-w-4xl! mx-auto! w-full! px-4! sm:px-6!">
      {onClose && (
        <div className="sm:hidden! mb-2!">
          <button
            onClick={onClose}
            className="inline-flex! items-center! gap-2! px-3! py-2! rounded-lg! bg-gray-100! dark:bg-gray-700! hover:bg-gray-200! dark:hover:bg-gray-600! transition-colors!"
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft className="h-5! w-5!" />
            <span>Back</span>
          </button>
        </div>
      )}
      
      {/* Loading Indicator - Shows at top when dossier is being updated */}
      {isFetching && data && (
        <div className="sticky! top-0! z-10! mb-4! -mt-4! -mx-4! sm:-mx-8! lg:-mx-12! px-4! sm:px-8! lg:px-12! pt-4! pb-2! bg-linear-to-b! from-white/95! via-white/90! to-transparent! dark:from-gray-900/95! dark:via-gray-900/90! backdrop-blur-sm! transition-all! duration-300!">
          <div className="flex! items-center! gap-2! text-sm!">
            <div className="relative! flex! items-center! justify-center!">
              <div className="h-2! w-2! bg-blue-500! rounded-full! animate-pulse!"></div>
              <div className="absolute! inset-0! h-2! w-2! bg-blue-500! rounded-full! animate-ping! opacity-75!"></div>
            </div>
            <span className={`${colors.textSecondary}! font-medium! text-xs!`}>
              Updating dossier...
            </span>
          </div>
          <div className="h-0.5! bg-gray-200! dark:bg-gray-700! mt-2! rounded-full! overflow-hidden!">
            <div 
              className="h-full! rounded-full!"
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className={`text-center! pb-4! mb-4!`}>
        <h2 className="text-2xl! sm:text-3xl! font-bold! bg-linear-to-r! from-red-500! via-purple-500! to-blue-500! bg-clip-text! text-transparent! mb-2!">
          Story Dossier
        </h2>
        <p className={`text-sm! ${colors.textSecondary}! font-medium!`}>Your story development hub</p>
      </div>

      {/* Project Information */}
      {projectId && (
        <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! rounded-lg! p-4! mb-4! shadow-sm!`}>
          <div className="flex! items-center! gap-3!">
            <div className="w-3! h-3! bg-linear-to-br! from-blue-500! to-purple-500! rounded-full!"></div>
            <div className="flex-1!">
              <div className={`text-xs! font-semibold! ${colors.textSecondary}! uppercase! tracking-wide! mb-1!`}>Project</div>
              <div className={`text-sm! font-mono! ${colors.text}! break-all!`} style={{ 
                fontFamily: 'monospace'
              }}>
                {projectId}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Story Overview Card */}
      <div>
        <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-red-500! rounded-full!"></div>
              Story Overview
            </h3>
        </div>
        <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! p-4! backdrop-blur-sm!`} style={{
          background: resolvedTheme === 'light' 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
        }}>
          <div className="space-y-4!">
            {/* Title Section */}
            <div className="flex! items-center! justify-between! gap-4! pb-4! border-b!" style={{
              borderColor: resolvedTheme === 'light' 
                ? 'rgba(229, 231, 235, 0.6)' 
                : 'rgba(75, 85, 99, 0.4)'
            }}>
              <div className={`text-xs! font-semibold! ${resolvedTheme === 'light' ? 'text-red-600!' : 'text-red-400!'} uppercase! tracking-wide! shrink-0!`}>Title</div>
              <div className="font-bold! bg-linear-to-r! from-red-500! to-blue-500! bg-clip-text! text-transparent! text-sm! text-right!">
                {d.title || 'Untitled Story'}
              </div>
            </div>
            
            {/* Logline Section - Inline with heading */}
            <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
              borderColor: resolvedTheme === 'light' 
                ? 'rgba(229, 231, 235, 0.6)' 
                : 'rgba(75, 85, 99, 0.4)'
            }}>
              <div className={`text-xs! font-semibold! ${resolvedTheme === 'light' ? 'text-red-600!' : 'text-red-400!'} uppercase! tracking-wide! shrink-0! pt-0.5!`}>Logline</div>
              <div className={`text-sm! leading-relaxed! flex-1! ${colors.textSecondary}! text-right!`}>
                {d.logline || 'A compelling story waiting to be told...'}
              </div>
            </div>
            
            {/* Genre & Tone Tags */}
            <div className="flex! items-center! gap-3! flex-wrap! pt-1!">
              {d.genre && (
                <>
                  <div className={`text-xs! font-semibold! ${resolvedTheme === 'light' ? 'text-red-600!' : 'text-red-400!'} uppercase! tracking-wide! shrink-0!`}>Genre</div>
                  <span className="bg-linear-to-r! from-red-500! to-red-600! text-white! border-0! shadow-md! shadow-red-500/30! px-3! py-1.5! rounded-full! text-xs! font-semibold!">
                    {d.genre}
                  </span>
                </>
              )}
              {d.tone && (
                <>
                  {d.genre && <div className="w-px! h-4! bg-gray-300! dark:bg-gray-600!"></div>}
                  <div className={`text-xs! font-semibold! ${resolvedTheme === 'light' ? 'text-red-600!' : 'text-red-400!'} uppercase! tracking-wide! shrink-0!`}>Tone</div>
                  <span className={`border-2! ${resolvedTheme === 'light' ? 'border-red-300! text-red-700! bg-red-50/70!' : 'border-red-600! text-red-300! bg-red-900/40!'} px-3! py-1.5! rounded-full! text-xs! font-semibold! shadow-sm!`}>
                    {d.tone}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Key Details Card - COMMENTED OUT: Client finds this overwhelming, only showing Setting which is part of intake requirements */}
      {/* 
      <div className="mt-4!">
        <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-purple-500! rounded-full!"></div>
              Key Details
            </h3>
        </div>
        <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! p-4! backdrop-blur-sm!`} style={{
          background: resolvedTheme === 'light' 
            ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
            : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
        }}>
          <div className="space-y-4!">
            {d.subject_full_name && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Subject Name</div>
                <div className={`text-sm! ${colors.text}! flex-1! text-right!`}>{d.subject_full_name}</div>
              </div>
            )}
            {d.subject_brief_description && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Subject Description</div>
                <div className={`text-sm! ${colors.text}! flex-1! text-right! leading-relaxed!`}>{d.subject_brief_description}</div>
              </div>
            )}
            {d.subject_relationship_to_writer && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Relationship to Writer</div>
                <div className={`text-sm! ${colors.text}! flex-1! text-right!`}>{d.subject_relationship_to_writer}</div>
              </div>
            )}
            {d.writer_connection_place_time && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Writer Connection</div>
                <div className={`text-sm! ${colors.text}! flex-1! text-right!`}>{d.writer_connection_place_time}</div>
              </div>
            )}
            {d.problem_statement && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Problem</div>
                <div className={`text-sm! ${colors.text}! flex-1! text-right! leading-relaxed!`}>{d.problem_statement}</div>
              </div>
            )}
            {d.outcome && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Outcome</div>
                <div className={`text-sm! ${colors.text}! flex-1! text-right! leading-relaxed!`}>{d.outcome}</div>
              </div>
            )}
            {d.runtime && (
              <div className="flex! items-center! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide!`}>Runtime</div>
                <div className={`text-sm! ${colors.textSecondary}!`}>{d.runtime}</div>
              </div>
            )}
            {(d.story_location || d.story_timeframe || d.story_world_type) && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Setting</div>
                <div className={`text-xs! ${colors.textSecondary}! flex-1! text-right! space-y-1!`}>
                  {d.story_location && <div>Location: {d.story_location}</div>}
                  {d.story_timeframe && <div>Timeframe: {d.story_timeframe}</div>}
                  {d.story_world_type && <div>World: {d.story_world_type}</div>}
                </div>
              </div>
            )}
            {d.actions_taken && (
              <div className="flex! items-start! justify-between! gap-4! pb-4! border-b!" style={{
                borderColor: resolvedTheme === 'light' 
                  ? 'rgba(229, 231, 235, 0.6)' 
                  : 'rgba(75, 85, 99, 0.4)'
              }}>
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Actions Taken</div>
                <div className={`text-sm! ${colors.textSecondary}! flex-1! text-right! leading-relaxed! whitespace-pre-wrap!`}>{d.actions_taken}</div>
              </div>
            )}
            {d.likes_in_story && (
              <div className="flex! items-start! justify-between! gap-4!">
                <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>What We Love</div>
                <div className={`text-sm! ${colors.textSecondary}! flex-1! text-right! leading-relaxed! whitespace-pre-wrap!`}>{d.likes_in_story}</div>
              </div>
            )}
          </div>
        </div>
      </div>
      */}

      {/* Scenes Card - COMMENTED OUT: Client finds this overwhelming, not part of intake requirements */}
      {/* 
      {(d.scenes ?? []).length > 0 && (
        <div className="mt-4!">
          <div className="pb-3! mb-2!">
              <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
                <div className="w-2! h-2! bg-blue-500! rounded-full!"></div>
                Scene Structure
              </h3>
            </div>
          <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! overflow-hidden! backdrop-blur-sm!`} style={{
            background: resolvedTheme === 'light' 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
          }}>  
            <div className="space-y-6! p-4!">
              {(d.scenes ?? []).map((s: SceneData, index: number) => (
                <div 
                  key={s.scene_id || `scene-${index}`} 
                  className={`${colors.backgroundTertiary}! p-3! rounded-lg! border! ${colors.border}! ${resolvedTheme === 'light' ? 'shadow-sm!' : 'shadow-md! shadow-blue-500/20!'}`}
                  style={resolvedTheme === 'dark' ? {
                    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)'
                  } : undefined}
                >
                  <div className="flex! items-start! gap-3!">
                    <div className="w-6! h-6! bg-linear-to-br! from-blue-500! to-green-500! rounded-full! flex! items-center! justify-center! text-white! text-xs! font-bold! shrink-0!">
                      {index + 1}
                    </div>
                    <div className="flex-1! min-w-0!">
                      <div className={`font-semibold! ${colors.text}! text-sm! mb-1!`}>
                        {s.one_liner || s.description || 'Scene ' + (index + 1)}
                      </div>
                      <div className={`text-xs! ${colors.textSecondary}! space-y-1!`}>
                        <div className="flex! gap-2! flex-wrap!">
                          {s.time_of_day && (
                            <span className={`${resolvedTheme === 'light' ? 'bg-green-100! text-green-700!' : 'bg-green-900/30! text-green-300!'} px-2! py-0.5! rounded-full! text-xs!`}>
                              {s.time_of_day}
                            </span>
                          )}
                          {s.interior_exterior && (
                            <span className={`${resolvedTheme === 'light' ? 'bg-blue-100! text-blue-700!' : 'bg-blue-900/30! text-blue-300!'} px-2! py-0.5! rounded-full! text-xs!`}>
                              {s.interior_exterior}
                            </span>
                          )}
                        </div>
                        {s.tone && (
                          <div className={`${colors.textTertiary}! italic!`}>Tone: {s.tone}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      */}
      
      {/* Heroes Card (Primary Characters) */}
      {(d.heroes && d.heroes.length > 0) && (
        <div className="mt-4!">
          <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-blue-500! rounded-full!"></div>
              Hero Characters
            </h3>
          </div>
          <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! overflow-hidden! backdrop-blur-sm!`} style={{
            background: resolvedTheme === 'light' 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
          }}>
            <div>
              {d.heroes.map((hero: HeroData, idx: number) => (
                <div 
                  key={idx} 
                  className={`${colors.backgroundTertiary}! p-4! ${idx !== (d.heroes?.length || 0) - 1 ? 'pb-5!' : ''}`}
                  style={{
                    borderBottomWidth: idx !== (d.heroes?.length || 0) - 1 ? '1px' : '0px',
                    borderBottomStyle: 'solid',
                    borderBottomColor: resolvedTheme === 'light' 
                      ? 'rgba(156, 163, 175, 0.4)' // gray-400 with opacity
                      : 'rgba(75, 85, 99, 0.6)' // gray-600 with opacity
                  }}
                >
                  <div className="flex! items-start! gap-4!">
                    {hero.photo_url && (
                      <img 
                        src={hero.photo_url} 
                        alt={hero.name || 'Hero'} 
                        className="w-16! h-16! rounded-lg! object-cover! border-2! border-blue-300! dark:border-blue-600! shrink-0!"
                      />
                    )}
                    <div className="flex-1! min-w-0!">
                      <div className={`font-semibold! text-base! ${colors.text}! mb-1.5!`}>{hero.name || 'Unnamed Hero'}</div>
                      <div className="space-y-1!">
                        {hero.age_at_story && (
                          <div className={`text-xs! ${colors.textTertiary}!`}>Age: {hero.age_at_story}</div>
                        )}
                        {hero.relationship_to_user && (
                          <div className={`text-xs! ${colors.textTertiary}!`}>Relationship: {hero.relationship_to_user}</div>
                        )}
                      </div>
                      {hero.physical_descriptors && (
                        <div className={`text-xs! ${colors.textSecondary}! mt-2.5!`}>
                          <span className={`font-semibold! ${colors.text}!`}>Physical:</span> {hero.physical_descriptors}
                        </div>
                      )}
                      {hero.personality_traits && (
                        <div className={`text-xs! ${colors.textSecondary}! mt-1.5!`}>
                          <span className={`font-semibold! ${colors.text}!`}>Personality:</span> {hero.personality_traits}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Supporting Characters Card */}
      {(d.supporting_characters && d.supporting_characters.length > 0) && (
        <div className="mt-4!">
          <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-purple-500! rounded-full!"></div>
              Supporting Characters
            </h3>
          </div>
          <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! overflow-hidden! backdrop-blur-sm!`} style={{
            background: resolvedTheme === 'light' 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
          }}>
            <div>
              {d.supporting_characters.map((char: SupportingCharacterData, idx: number) => (
                <div 
                  key={idx} 
                  className={`${colors.backgroundTertiary}! p-4! ${idx !== (d.supporting_characters?.length || 0) - 1 ? 'pb-5!' : ''}`}
                  style={{
                    borderBottomWidth: idx !== (d.supporting_characters?.length || 0) - 1 ? '1px' : '0px',
                    borderBottomStyle: 'solid',
                    borderBottomColor: resolvedTheme === 'light' 
                      ? 'rgba(156, 163, 175, 0.4)' // gray-400 with opacity
                      : 'rgba(75, 85, 99, 0.6)' // gray-600 with opacity
                  }}
                >
                  <div className="flex! items-start! gap-4!">
                    {char.photo_url && (
                      <img 
                        src={char.photo_url} 
                        alt={char.name || 'Character'} 
                        className="w-12! h-12! rounded-lg! object-cover! border-2! border-purple-300! dark:border-purple-600! shrink-0!"
                      />
                    )}
                    <div className="flex-1! min-w-0!">
                      <div className={`font-semibold! ${colors.text}! mb-1!`}>{char.name || 'Unnamed Character'}</div>
                      {char.role && (
                        <div className={`text-xs! ${colors.textTertiary}! mb-1.5!`}>{char.role}</div>
                      )}
                      {char.description && (
                        <div className={`text-xs! ${colors.textSecondary}! mt-1! whitespace-pre-wrap!`}>{char.description}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Characters Card (Legacy - for backward compatibility) */}
      {(!d.heroes || d.heroes.length === 0) && (!d.supporting_characters || d.supporting_characters.length === 0) && (
        <div className="mt-4!">
          <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-green-500! rounded-full!"></div>
              Characters
            </h3>
          </div>
          <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! p-4! backdrop-blur-sm!`} style={{
            background: resolvedTheme === 'light' 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
          }}>
            <div>
              {(d.characters ?? []).length > 0 ? (
                <div className="space-y-3!">
                  {d.characters.map((char: CharacterData, idx: number) => (
                    <div 
                      key={char.character_id || `${idx}`} 
                      className={`${colors.backgroundTertiary}! p-3! rounded-lg! border! ${colors.border}! shadow-sm!`}
                    >
                      <div className={`font-semibold! ${colors.text}!`}>{char.name || 'Unnamed Character'}</div>
                      {char.role && (
                        <div className={`text-xs! ${colors.textTertiary}! mt-0.5!`}>{char.role}</div>
                      )}
                      {char.description && (
                        <div className={`text-xs! ${colors.textSecondary}! mt-1! whitespace-pre-wrap!`}>{char.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${colors.backgroundTertiary}! p-3! rounded-lg! border! ${colors.border}!`}>
                  <div className={`font-semibold! ${colors.text}!`}>No characters yet</div>
                  <div className={`text-xs! ${colors.textSecondary}! mt-1!`}>Share character details to populate this section</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Story Type & Perspective Card */}
      {(d.story_type || d.perspective || d.audience) && (
        <div className="mt-4!">
          <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-orange-500! rounded-full!"></div>
              Story Style & Perspective
            </h3>
          </div>
          <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! p-4! backdrop-blur-sm!`} style={{
            background: resolvedTheme === 'light' 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
          }}>
            <div className="space-y-3!">
              {d.story_type && (
                <div className="flex! items-center! justify-between! gap-4! pb-3! border-b!" style={{
                  borderColor: resolvedTheme === 'light' 
                    ? 'rgba(229, 231, 235, 0.6)' 
                    : 'rgba(75, 85, 99, 0.4)'
                }}>
                  <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide!`}>Story Type</div>
                  <div className={`text-sm! font-semibold! ${colors.text}!`}>
                    <span className="bg-linear-to-r! from-orange-500! to-orange-600! text-white! px-2! py-1! rounded-full! text-xs! shadow-sm!">
                      {d.story_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>
              )}
              {d.perspective && (
                <div className="flex! items-center! justify-between! gap-4! pb-3! border-b!" style={{
                  borderColor: resolvedTheme === 'light' 
                    ? 'rgba(229, 231, 235, 0.6)' 
                    : 'rgba(75, 85, 99, 0.4)'
                }}>
                  <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide!`}>Perspective</div>
                  <div className={`text-sm! ${colors.text}!`}>
                    {d.perspective.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                </div>
              )}
              {d.audience && typeof d.audience === 'object' && (
                <>
                  {d.audience.who_will_see_first && (
                    <div className="flex! items-start! justify-between! gap-4! pb-3! border-b!" style={{
                      borderColor: resolvedTheme === 'light' 
                        ? 'rgba(229, 231, 235, 0.6)' 
                        : 'rgba(75, 85, 99, 0.4)'
                    }}>
                      <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Audience</div>
                      <div className={`text-sm! ${colors.text}! flex-1! text-right! leading-relaxed!`}>{d.audience.who_will_see_first}</div>
                    </div>
                  )}
                  {d.audience.desired_feeling && (
                    <div className="flex! items-start! justify-between! gap-4!">
                      <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Desired Feeling</div>
                      <div className={`text-sm! ${colors.text}! flex-1! text-right! leading-relaxed!`}>{d.audience.desired_feeling}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Setting & Time (Step 5) - Client intake requirement */}
      {(d.story_location || d.story_timeframe || d.season_time_of_year || d.environmental_details) && (
        <div className="mt-4!">
          <div className="pb-3! mb-2!">
            <h3 className={`text-lg! flex! items-center! gap-2! font-semibold! ${colors.text}`}>
              <div className="w-2! h-2! bg-green-500! rounded-full!"></div>
              Setting & Time
            </h3>
          </div>
          <div className={`${colors.cardBackground}! border-2! ${colors.borderSecondary}! shadow-lg! rounded-lg! p-4! backdrop-blur-sm!`} style={{
            background: resolvedTheme === 'light' 
              ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(249, 250, 251, 0.98) 100%)'
              : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
          }}>
            <div className="space-y-3!">
              {d.story_location && (
                <div className="flex! items-center! justify-between! gap-4! pb-3! border-b!" style={{
                  borderColor: resolvedTheme === 'light' 
                    ? 'rgba(229, 231, 235, 0.6)' 
                    : 'rgba(75, 85, 99, 0.4)'
                }}>
                  <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide!`}>Location</div>
                  <div className={`text-sm! ${colors.text}! flex-1! text-right!`}>{d.story_location}</div>
                </div>
              )}
              {d.story_timeframe && (
                <div className="flex! items-center! justify-between! gap-4! pb-3! border-b!" style={{
                  borderColor: resolvedTheme === 'light' 
                    ? 'rgba(229, 231, 235, 0.6)' 
                    : 'rgba(75, 85, 99, 0.4)'
                }}>
                  <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide!`}>Time Period</div>
                  <div className={`text-sm! ${colors.text}! flex-1! text-right!`}>{d.story_timeframe}</div>
                </div>
              )}
              {d.season_time_of_year && (
                <div className="flex! items-center! justify-between! gap-4! pb-3! border-b!" style={{
                  borderColor: resolvedTheme === 'light' 
                    ? 'rgba(229, 231, 235, 0.6)' 
                    : 'rgba(75, 85, 99, 0.4)'
                }}>
                  <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide!`}>Season/Time of Year</div>
                  <div className={`text-sm! ${colors.text}! flex-1! text-right!`}>{d.season_time_of_year}</div>
                </div>
              )}
              {d.environmental_details && (
                <div className="flex! items-start! justify-between! gap-4!">
                  <div className={`text-xs! font-semibold! ${colors.textTertiary}! uppercase! tracking-wide! shrink-0! pt-0.5!`}>Environmental Details</div>
                  <div className={`text-sm! ${colors.textSecondary}! flex-1! text-right! leading-relaxed! whitespace-pre-wrap!`}>{d.environmental_details}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
