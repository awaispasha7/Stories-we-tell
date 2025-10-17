'use client'

import { useQuery } from '@tanstack/react-query'
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // Removed - using custom styling
// import { Badge } from '@/components/ui/badge' // Removed - using custom styling
// import { Separator } from '@/components/ui/separator' // Unused import
import { api } from '@/lib/api'
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

export function SidebarDossier() {
  const { refreshTrigger } = useDossierRefresh()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  
  const { data, error } = useQuery({ 
    queryKey: ['dossier', refreshTrigger], // Include refreshTrigger in query key
    queryFn: async () => {
      console.log('🔄 Fetching dossier from backend...')
      try {
        const result = await api.get('dossier').json<DossierData>()
        console.log('✅ Dossier fetched successfully:', result)
        return result
      } catch (err) {
        console.error('❌ Error fetching dossier:', err)
        throw err
      }
    },
    refetchInterval: false, // Disable automatic polling
    refetchOnWindowFocus: false, // Disable refetch on window focus to prevent stale fetches
    refetchOnMount: true, // Allow initial fetch on mount
    staleTime: Infinity, // Never consider data stale - only fetch when explicitly triggered
    enabled: true // Allow initial fetch and triggered fetches
  })
  const d = data ?? { title: '', logline: '', genre: '', tone: '', scenes: [], characters: [], locations: [] }

  // Show error state if backend is not accessible
  if (error) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">Backend Connection Error</h3>
          <p className="text-red-600 dark:text-red-300 text-sm">
            Unable to connect to the backend server. Please check if the backend is running.
          </p>
          <p className="text-red-500 dark:text-red-400 text-xs mt-2">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
      {/* Header */}
      <div className={`text-center pb-4 border-b-2 ${resolvedTheme === 'light' ? 'border-red-300' : 'border-red-600'}`}>
        <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
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
              <div className="font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent text-sm">
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
                <span className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm px-2 py-1 rounded-full text-xs">
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
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
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
