'use client'

import { useQuery } from '@tanstack/react-query'
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

interface DossierData {
  title: string
  logline: string
  genre: string
  tone: string
  scenes: SceneData[]
  characters: CharacterData[]
  locations: string[]
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
  character_id: string
  name: string
  description: string
}

interface SidebarDossierProps {
  sessionId?: string
  projectId?: string
  onClose?: () => void
}

export function SidebarDossier({ sessionId, projectId, onClose }: SidebarDossierProps) {
  const { refreshTrigger } = useDossierRefresh()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  
  const { data, isLoading } = useQuery({ 
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
        const result = await api.get(`api/v1/dossiers/${projectId}`).json<DossierData>()
        console.log('✅ Dossier fetched successfully:', result)
        return result
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
    refetchInterval: false, // Disable automatic polling
    refetchOnWindowFocus: false, // Disable refetch on window focus
    refetchOnMount: true, // Allow initial fetch on mount
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    enabled: !!(sessionId && projectId), // Only fetch if we have both IDs
    retry: 1, // Only retry once on failure
    retryDelay: 2000 // Wait 2 seconds before retry
  })
  const d = data ?? { title: '', logline: '', genre: '', tone: '', scenes: [], characters: [], locations: [] }

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
        {onClose && (
          <div className="sm:hidden mb-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  // Show empty state if no session/project ID
  if (!sessionId || !projectId) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
        {onClose && (
          <div className="sm:hidden mb-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="text-center py-8">
          <h3 className="text-gray-600 dark:text-gray-400 font-medium mb-2">No Active Session</h3>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Start a conversation to see your story dossier
          </p>
        </div>
      </div>
    )
  }

  // Show empty state if no dossier data
  if (!data) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
        {onClose && (
          <div className="sm:hidden mb-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Back"
              title="Back"
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
          </div>
        )}
        <div className="text-center py-8">
          <h3 className="text-gray-600 dark:text-gray-400 font-medium mb-2">No Dossier Yet</h3>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Your story dossier will appear here as you develop your story
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
      {onClose && (
        <div className="sm:hidden mb-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Back"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
        </div>
      )}
      {/* Header */}
      <div className={`text-center pb-4 border-b-2 ${resolvedTheme === 'light' ? 'border-red-300' : 'border-red-600'}`}>
        <h2 className="text-xl font-bold bg-linear-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
          Story Dossier
        </h2>
        <p className={`text-sm ${colors.textSecondary} mt-1`}>Your story development hub</p>
      </div>

      {/* Story Overview Card */}
      <div>
        <div className="pb-3">
            <h3 className={`text-lg flex items-center gap-2 font-semibold ${colors.text}`}>
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Story Overview
            </h3>
        </div>
        <div className={`${colors.cardBackground} border-2 ${colors.borderSecondary} shadow-lg mt-8 sm:mt-12 lg:mt-16 rounded-lg`} style={{ padding: '0.75rem' }}>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className={`text-xs font-semibold ${resolvedTheme === 'light' ? 'text-red-600' : 'text-red-400'} uppercase tracking-wide`}>Title</div>
              <div className="font-bold bg-linear-to-r from-red-500 to-blue-500 bg-clip-text text-transparent text-sm">
                {d.title || 'Untitled Story'}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className={`text-xs font-semibold ${resolvedTheme === 'light' ? 'text-red-600' : 'text-red-400'} uppercase tracking-wide`}>Logline</div>
              <div className={`text-sm leading-relaxed max-w-[70%] ${colors.textSecondary}`}>
                {d.logline || 'A compelling story waiting to be told...'}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {d.genre && (
                <span className="bg-linear-to-r from-red-500 to-red-600 text-white border-0 shadow-sm px-2 py-1 rounded-full text-xs">
                  {d.genre}
                </span>
              )}
              {d.tone && (
                <span className={`border ${resolvedTheme === 'light' ? 'border-red-300 text-red-700 bg-red-50/50' : 'border-red-600 text-red-300 bg-red-900/30'} px-2 py-1 rounded-full text-xs`}>
                  {d.tone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scenes Card */}
      <div>
        <div className="pb-3">
            <h3 className={`text-lg flex items-center gap-2 font-semibold ${colors.text}`}>
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Scene Structure
            </h3>
          </div>
        <div className={`${colors.cardBackground} border-2 ${colors.borderSecondary} shadow-lg mt-8 sm:mt-12 lg:mt-16 rounded-lg`}>  
          <div className="space-y-4 p-4">
            {(d.scenes ?? []).slice(0, 4).map((s: SceneData, index: number) => (
              <div key={s.scene_id} className={`${colors.backgroundTertiary} p-3 rounded-lg border ${colors.border} shadow-sm`}>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className={`font-semibold ${colors.text} text-sm mb-1`}>
                      {s.one_liner || s.description || 'Scene ' + (index + 1)}
                    </div>
                    <div className={`text-xs ${colors.textSecondary} space-y-1`}>
                      <div className="flex gap-2">
                        <span className={`${resolvedTheme === 'light' ? 'bg-green-100 text-green-700' : 'bg-green-900/30 text-green-300'} px-2 py-0.5 rounded-full text-xs`}>
                          {s.time_of_day || 'Day'}
                        </span>
                        <span className={`${resolvedTheme === 'light' ? 'bg-blue-100 text-blue-700' : 'bg-blue-900/30 text-blue-300'} px-2 py-0.5 rounded-full text-xs`}>
                          {s.interior_exterior || 'INT'}
                        </span>
                      </div>
                      {s.tone && (
                        <div className={`${colors.textTertiary} italic`}>Tone: {s.tone}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(d.scenes ?? []).length === 0 && (
              <div className={`text-center py-6 ${colors.textTertiary}`}>
                <div className="text-2xl mb-2">🎬</div>
                <div className="text-sm">Start chatting to build your scenes</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Characters Card */}
      <div>
        <div className="pb-3">
            <h3 className={`text-lg flex items-center gap-2 font-semibold ${colors.text}`}>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Characters
            </h3>
        </div>
        <div className={`${colors.cardBackground} border-2 ${colors.borderSecondary} shadow-lg mt-8 sm:mt-12 lg:mt-16 rounded-lg`} style={{ padding: '0.75rem' }}>
          <div>
            {(d.characters ?? []).length > 0 ? (
              <div className="space-y-3">
                {d.characters.slice(0, 3).map((char: CharacterData) => (
                  <div key={char.character_id} className={`${colors.backgroundTertiary} p-3 rounded-lg border ${colors.border}`}>
                    <div className={`font-semibold ${colors.text}`}>{char.name}</div>
                    <div className={`text-xs ${colors.textSecondary} mt-1`}>{char.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${colors.backgroundTertiary} p-3 rounded-lg border ${colors.border}`}>
                <div className={`font-semibold ${colors.text}`}>Protagonist</div>
                <div className={`text-xs ${colors.textSecondary} mt-1`}>Main character with a clear goal</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
