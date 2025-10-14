'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// import { Separator } from '@/components/ui/separator' // Unused import
import { api } from '@/lib/api'
import { useDossierRefresh } from '@/lib/dossier-context'

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
  
  const { data, error, isLoading } = useQuery({ 
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Backend Connection Error</h3>
          <p className="text-red-600 text-sm">
            Unable to connect to the backend server. Please check if the backend is running.
          </p>
          <p className="text-red-500 text-xs mt-2">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden flex flex-col gap-4 sm:gap-6 pt-16 sm:pt-20 pb-8 sm:pb-12 px-4 sm:px-8 lg:px-12 custom-scrollbar" style={{ padding: '2rem' }}>
      {/* Header */}
      <div className="text-center pb-4 border-b-2 border-red-300">
        <h2 className="text-xl font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent">
          Story Dossier
        </h2>
        <p className="text-sm text-gray-600 mt-1">Your story development hub</p>
      </div>

      {/* Story Overview Card */}
      <div>
        <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Story Overview
            </CardTitle>
        </CardHeader>
        <Card className="bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 border-2 border-blue-300 shadow-lg mt-8 sm:mt-12 lg:mt-16" style={{ padding: '0.75rem' }}>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Title</div>
              <div className="font-bold bg-gradient-to-r from-red-500 to-blue-500 bg-clip-text text-transparent text-sm">
                {d.title || 'Untitled Story'}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Logline</div>
              <div className="text-sm leading-relaxed max-w-[70%]">
                {d.logline || 'A compelling story waiting to be told...'}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {d.genre && (
                <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm">
                  {d.genre}
                </Badge>
              )}
              {d.tone && (
                <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50/50">
                  {d.tone}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenes Card */}
      <div>
        <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Scene Structure
            </CardTitle>
          </CardHeader>
        <Card className="bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 border-2 border-blue-300 shadow-lg mt-8 sm:mt-12 lg:mt-16">  
          <CardContent className="space-y-4">
            {(d.scenes ?? []).slice(0, 4).map((s: SceneData, index: number) => (
              <div key={s.scene_id} className="bg-white/70 p-3 rounded-lg border border-blue-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800 text-sm mb-1">
                      {s.one_liner || s.description || 'Scene ' + (index + 1)}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex gap-2">
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">
                          {s.time_of_day || 'Day'}
                        </span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
                          {s.interior_exterior || 'INT'}
                        </span>
                      </div>
                      {s.tone && (
                        <div className="text-gray-500 italic">Tone: {s.tone}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(d.scenes ?? []).length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <div className="text-2xl mb-2">🎬</div>
                <div className="text-sm">Start chatting to build your scenes</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Characters Card */}
      <div>
        <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Characters
            </CardTitle>
        </CardHeader>
        <Card className="bg-gradient-to-br from-white via-red-50/50 to-pink-50/30 border-2 border-red-300 shadow-lg mt-8 sm:mt-12 lg:mt-16" style={{ padding: '0.75rem' }}>
          <CardContent>
            {(d.characters ?? []).length > 0 ? (
              <div className="space-y-3">
                {d.characters.slice(0, 3).map((char: CharacterData) => (
                  <div key={char.character_id} className="bg-white/70 p-3 rounded-lg border border-green-200">
                    <div className="font-semibold text-gray-800">{char.name}</div>
                    <div className="text-xs text-gray-600 mt-1">{char.description}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white/70 p-3 rounded-lg border border-green-200">
                <div className="font-semibold text-gray-800">Protagonist</div>
                <div className="text-xs text-gray-600 mt-1">Main character with a clear goal</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
