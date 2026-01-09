'use client'

import { useState, useEffect } from 'react'
import { X, Film, Sparkles } from 'lucide-react'
import { api, getUserHeaders, projectApi } from '@/lib/api'
import { useTheme, getThemeColors } from '@/lib/theme-context'

interface GenreSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  currentGenre?: string
  onGenreUpdated?: () => void
}

// Primary client-specified genres (featured prominently)
const PRIMARY_GENRES = [
  'Historic Romance',
  'Family Saga',
  'Childhood Adventure',
  'Documentary',
  'Historical Epic'
]

// Secondary genre suggestions (additional options)
const SECONDARY_GENRES = [
  'Romantic',
  'Drama',
  'Comedy',
  'Thriller',
  'Action',
  'Adventure',
  'Fantasy',
  'Sci-Fi',
  'Horror',
  'Mystery',
  'Biographical',
  'Historical',
  'Coming of Age',
  'Family',
  'War',
  'Western',
  'Musical',
  'Animation',
  'Crime',
  'Noir',
  'Supernatural',
  'Epic',
  'Legend'
]

export function GenreSelectionModal({
  isOpen,
  onClose,
  projectId,
  currentGenre,
  onGenreUpdated
}: GenreSelectionModalProps) {
  const [selectedGenre, setSelectedGenre] = useState<string>(currentGenre || '')
  const [customGenre, setCustomGenre] = useState<string>('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  // Fetch current genre when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      setIsLoading(true)
      setError(null)
      
      projectApi.getDossier(projectId)
        .then((dossier) => {
          const genre = dossier.snapshot_json?.genre || currentGenre || ''
          setSelectedGenre(genre)
          setCustomGenre('')
          setIsCustomMode(false)
        })
        .catch((err) => {
          console.error('Failed to fetch dossier:', err)
          // Use prop value as fallback
          setSelectedGenre(currentGenre || '')
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [isOpen, projectId, currentGenre])

  if (!isOpen) return null

  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre)
    setIsCustomMode(false)
    setCustomGenre('')
    setError(null)
  }

  const handleCustomGenre = () => {
    setIsCustomMode(true)
    setSelectedGenre('')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const genreToSave = isCustomMode ? customGenre.trim() : selectedGenre
    
    if (!genreToSave) {
      setError('Please select or enter a genre')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const headers = getUserHeaders()
      
      // Get existing dossier first
      const existingDossier = await projectApi.getDossier(projectId)
      
      // Update only the genre field
      const updatedSnapshot = {
        ...existingDossier.snapshot_json,
        genre: genreToSave
      }
      
      // Update dossier
      await api.put(`api/v1/dossiers/${projectId}`, {
        json: {
          snapshot_json: updatedSnapshot
        },
        headers
      }).json()
      
      console.log('✅ Genre updated successfully')
      
      // Call callback if provided
      if (onGenreUpdated) {
        onGenreUpdated()
      }
      
      // Close modal
      onClose()
    } catch (err) {
      console.error('❌ Failed to update genre:', err)
      setError(err instanceof Error ? err.message : 'Failed to update genre. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    onClose()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      style={{ 
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999',
        padding: 'clamp(0.5rem, 2vw, 1rem)',
        margin: '0',
        boxSizing: 'border-box',
        width: '100vw',
        height: '100vh'
      }}
      onClick={handleClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl relative"
        style={{
          padding: 'clamp(1.5rem, 5vw, 2rem)',
          margin: '0',
          borderRadius: 'clamp(0.75rem, 2vw, 1rem)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: 'clamp(20rem, 90vw, 32rem)',
          width: '100%',
          position: 'relative',
          boxSizing: 'border-box',
          maxHeight: '90vh',
          overflowY: 'auto',
          flexShrink: '0',
          backgroundColor: resolvedTheme === 'dark' ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.5rem',
            margin: '0',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
            color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)'
          }}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div 
          className="text-center mb-6"
          style={{
            textAlign: 'center',
            marginBottom: '1.5rem',
            padding: '0',
            marginTop: '0'
          }}
        >
          <div 
            className="w-16 h-16 bg-linear-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
              padding: '0'
            }}
          >
            <Film className="w-8 h-8 text-white" />
          </div>
          <h2 
            className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
            style={{
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
              fontWeight: '700',
              marginBottom: '0.5rem',
              marginTop: '0',
              padding: '0',
              lineHeight: '1.2',
              color: resolvedTheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(17, 24, 39)'
            }}
          >
            Set Genre for Your Story
          </h2>
          <p 
            className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
            style={{
              fontSize: 'clamp(0.875rem, 2vw, 0.9375rem)',
              lineHeight: '1.5',
              color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(75, 85, 99)',
              padding: '0'
            }}
          >
            Select from our featured genres or choose another option below
          </p>
        </div>

        {/* Form */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p 
                className="text-gray-600 dark:text-gray-400"
                style={{
                  color: resolvedTheme === 'dark' ? 'rgb(148, 163, 184)' : 'rgb(75, 85, 99)'
                }}
              >
                Loading...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Genre Suggestions */}
            {!isCustomMode && (
            <div className="space-y-4">
              {/* Primary Genres - Featured */}
              <div>
                <label 
                  className="block text-sm font-semibold mb-3"
                  style={{
                    color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '600'
                  }}
                >
                  Featured Genres
                </label>
                <div 
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.5rem',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)'
                  }}
                >
                  {PRIMARY_GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreSelect(genre)}
                      className="px-4 py-3 text-sm rounded-lg border-2 transition-all font-medium"
                      style={{
                        padding: '0.75rem 1rem',
                        fontSize: '0.875rem',
                        borderRadius: '0.5rem',
                        borderWidth: '2px',
                        borderColor: selectedGenre === genre
                          ? 'rgb(139, 92, 246)'
                          : resolvedTheme === 'dark' ? 'rgb(71, 85, 105)' : 'rgb(196, 181, 253)',
                        backgroundColor: selectedGenre === genre
                          ? resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.15)'
                          : resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.03)',
                        color: selectedGenre === genre
                          ? 'rgb(139, 92, 246)'
                          : resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                        fontWeight: selectedGenre === genre ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedGenre !== genre) {
                          e.currentTarget.style.borderColor = 'rgb(139, 92, 246)'
                          e.currentTarget.style.backgroundColor = resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedGenre !== genre) {
                          e.currentTarget.style.borderColor = resolvedTheme === 'dark' ? 'rgb(71, 85, 105)' : 'rgb(196, 181, 253)'
                          e.currentTarget.style.backgroundColor = resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.05)' : 'rgba(139, 92, 246, 0.03)'
                        }
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Secondary Genres - Additional Options */}
              <div>
                <label 
                  className="block text-sm font-medium mb-3"
                  style={{
                    color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  Other Genres
                </label>
                <div 
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '0.5rem',
                    maxHeight: '12rem',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    backgroundColor: resolvedTheme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(249, 250, 251)'
                  }}
                >
                  {SECONDARY_GENRES.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreSelect(genre)}
                      className="px-3 py-2 text-sm rounded-lg border transition-all"
                      style={{
                        padding: '0.5rem 0.75rem',
                        fontSize: '0.875rem',
                        borderRadius: '0.5rem',
                        borderWidth: '1px',
                        borderColor: selectedGenre === genre
                          ? 'rgb(139, 92, 246)'
                          : resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)',
                        backgroundColor: selectedGenre === genre
                          ? resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'
                          : 'transparent',
                        color: selectedGenre === genre
                          ? 'rgb(139, 92, 246)'
                          : resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                        fontWeight: selectedGenre === genre ? '600' : '400',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedGenre !== genre) {
                          e.currentTarget.style.borderColor = 'rgb(139, 92, 246)'
                          e.currentTarget.style.backgroundColor = resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedGenre !== genre) {
                          e.currentTarget.style.borderColor = resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)'
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }
                      }}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Custom Genre Button */}
              <button
                type="button"
                onClick={handleCustomGenre}
                className="mt-3 w-full px-4 py-2 text-sm border-2 border-dashed rounded-lg transition-colors flex items-center justify-center gap-2"
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  borderRadius: '0.5rem',
                  borderWidth: '2px',
                  borderStyle: 'dashed',
                  borderColor: resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)',
                  backgroundColor: 'transparent',
                  color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(139, 92, 246)'
                  e.currentTarget.style.backgroundColor = resolvedTheme === 'dark' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(139, 92, 246, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <Sparkles className="w-4 h-4" />
                Enter Custom Genre
              </button>
            </div>
          )}

          {/* Custom Genre Input */}
          {isCustomMode && (
            <div>
              <label 
                htmlFor="custom-genre"
                className="block text-sm font-medium mb-2"
                style={{
                  color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                  marginBottom: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Custom Genre
              </label>
              <input
                id="custom-genre"
                type="text"
                value={customGenre}
                onChange={(e) => {
                  setCustomGenre(e.target.value)
                  setError(null)
                }}
                placeholder="e.g., Psychological Thriller, Romantic Comedy..."
                required
                disabled={isSaving}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderWidth: '1px',
                  borderRadius: '0.5rem',
                  borderColor: error 
                    ? 'rgb(239, 68, 68)' 
                    : resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)',
                  backgroundColor: resolvedTheme === 'dark' ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)',
                  color: resolvedTheme === 'dark' ? 'rgb(255, 255, 255)' : 'rgb(17, 24, 39)',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  opacity: isSaving ? 0.6 : 1,
                  cursor: isSaving ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgb(139, 92, 246)'
                  e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error 
                    ? 'rgb(239, 68, 68)' 
                    : resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setIsCustomMode(false)
                  setCustomGenre('')
                }}
                className="mt-2 text-sm text-gray-600 dark:text-gray-400 hover:underline"
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.875rem',
                  color: resolvedTheme === 'dark' ? 'rgb(148, 163, 184)' : 'rgb(75, 85, 99)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: '0'
                }}
              >
                ← Back to suggestions
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div 
              className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: resolvedTheme === 'dark' ? 'rgba(127, 29, 29, 0.2)' : 'rgb(254, 242, 242)',
                borderWidth: '1px',
                borderColor: resolvedTheme === 'dark' ? 'rgb(127, 29, 29)' : 'rgb(254, 226, 226)',
                borderRadius: '0.5rem',
                color: resolvedTheme === 'dark' ? 'rgb(252, 165, 165)' : 'rgb(185, 28, 28)'
              }}
            >
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 px-4 py-3 border rounded-lg font-medium transition-colors"
              style={{
                padding: '0.75rem 1rem',
                borderWidth: '1px',
                borderRadius: '0.5rem',
                borderColor: resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(209, 213, 219)',
                backgroundColor: 'transparent',
                color: resolvedTheme === 'dark' ? 'rgb(203, 213, 225)' : 'rgb(55, 65, 81)',
                fontWeight: '500',
                fontSize: '0.9375rem',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSaving) {
                  e.currentTarget.style.backgroundColor = resolvedTheme === 'dark' ? 'rgb(51, 65, 85)' : 'rgb(249, 250, 251)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (!isCustomMode && !selectedGenre) || (isCustomMode && !customGenre.trim())}
              className="flex-1 px-4 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                color: 'rgb(255, 255, 255)',
                borderRadius: '0.5rem',
                fontWeight: '500',
                fontSize: '0.9375rem',
                cursor: (isSaving || (!isCustomMode && !selectedGenre) || (isCustomMode && !customGenre.trim())) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || (!isCustomMode && !selectedGenre) || (isCustomMode && !customGenre.trim())) ? 0.5 : 1,
                transition: 'all 0.2s ease',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSaving && ((!isCustomMode && selectedGenre) || (isCustomMode && customGenre.trim()))) {
                  e.currentTarget.style.opacity = '0.9'
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = (isSaving || (!isCustomMode && !selectedGenre) || (isCustomMode && !customGenre.trim())) ? '0.5' : '1'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {isSaving ? 'Saving...' : 'Save Genre'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

