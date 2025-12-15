"use client"

import { useEffect, useState } from 'react'

interface CompletionModalProps {
  open: boolean
  title?: string
  existingTitle?: string
  extractedTitle?: string
  projectId?: string
  onClose: () => void
  onNewStory: () => void
  onViewDossier?: () => void
  onTitleConfirmed?: (selectedTitle: string) => void
}

export function CompletionModal({ 
  open, 
  title, 
  existingTitle,
  extractedTitle,
  projectId,
  onClose, 
  onNewStory, 
  onViewDossier,
  onTitleConfirmed
}: CompletionModalProps) {
  const [selectedTitle, setSelectedTitle] = useState<string>('')
  const [customTitle, setCustomTitle] = useState<string>('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, isSubmitting])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      // Determine which title to show by default
      if (extractedTitle && extractedTitle !== 'Untitled Story' && extractedTitle.toLowerCase() !== 'unknown') {
        setSelectedTitle('extracted')
      } else if (existingTitle && existingTitle !== 'Untitled Story' && existingTitle.toLowerCase() !== 'unknown') {
        setSelectedTitle('existing')
      } else {
        setSelectedTitle('extracted') // Default to extracted if available
      }
      setCustomTitle('')
      setShowCustomInput(false)
    }
  }, [open, existingTitle, extractedTitle])

  const handleConfirmTitle = async () => {
    if (isSubmitting) return
    
    let finalTitle = ''
    
    if (selectedTitle === 'existing' && existingTitle) {
      finalTitle = existingTitle
    } else if (selectedTitle === 'extracted' && extractedTitle) {
      finalTitle = extractedTitle
    } else if (selectedTitle === 'custom' && customTitle.trim()) {
      finalTitle = customTitle.trim()
    } else {
      // Fallback to extracted or existing
      finalTitle = extractedTitle || existingTitle || 'Untitled Story'
    }

    if (!finalTitle || finalTitle === 'Untitled Story' || finalTitle.toLowerCase() === 'unknown') {
      return // Don't proceed without a valid title
    }

    setIsSubmitting(true)

    try {
      // Update title in backend if projectId is available
      if (projectId && onTitleConfirmed) {
        await onTitleConfirmed(finalTitle)
      }

      // Close modal and proceed
      onClose()
    } catch (error) {
      console.error('Failed to update title:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  const needsTitleConfirmation = extractedTitle && 
    extractedTitle !== 'Untitled Story' && 
    extractedTitle.toLowerCase() !== 'unknown' &&
    extractedTitle !== existingTitle

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed! inset-0! z-2000! flex! items-center! justify-center! bg-black/60! backdrop-blur-sm!"
      onClick={onClose}
    >
      <div
        className="w-[90vw]! max-w-lg! bg-white! dark:bg-gray-800! rounded-2xl! shadow-2xl! border! border-gray-200! dark:border-gray-700! p-6!"
        onClick={(e) => e.stopPropagation()}
        style={{ borderRadius: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.35)' }}
      >
        <div className="flex! items-center! gap-3! mb-4!">
          <div
            className="w-10! h-10! rounded-full! text-white! flex! items-center! justify-center! font-bold!"
            style={{ background: 'linear-gradient(135deg, #34d399, #3b82f6)' }}
          >
            SW
          </div>
          <h3 className="text-lg! font-semibold! text-gray-900! dark:text-gray-100!">Story Completed</h3>
        </div>

        {/* Title Selection Section */}
        {needsTitleConfirmation && (
          <div className="mb-6!">
            <p className="text-sm! font-medium! text-gray-700! dark:text-gray-300! mb-3!">
              Choose a title for your story:
            </p>
            
            <div className="space-y-2! mb-4!">
              {/* Existing Title Option */}
              {existingTitle && existingTitle !== 'Untitled Story' && existingTitle.toLowerCase() !== 'unknown' && (
                <label className="flex! items-start! gap-3! p-3! rounded-lg! border-2! cursor-pointer! transition-all! hover:bg-gray-50! dark:hover:bg-gray-700/50!"
                  style={{
                    borderColor: selectedTitle === 'existing' 
                      ? 'rgb(59, 130, 246)' 
                      : 'rgb(229, 231, 235)',
                    backgroundColor: selectedTitle === 'existing' 
                      ? 'rgba(59, 130, 246, 0.05)' 
                      : 'transparent'
                  }}
                >
                  <input
                    type="radio"
                    name="title-option"
                    value="existing"
                    checked={selectedTitle === 'existing'}
                    onChange={() => {
                      setSelectedTitle('existing')
                      setShowCustomInput(false)
                    }}
                    className="mt-1! cursor-pointer!"
                  />
                  <div className="flex-1!">
                    <div className="font-semibold! text-sm! text-gray-900! dark:text-gray-100!">Keep Existing Title</div>
                    <div className="text-xs! text-gray-600! dark:text-gray-400! mt-0.5!">"{existingTitle}"</div>
                  </div>
                </label>
              )}

              {/* Extracted Title Option */}
              {extractedTitle && extractedTitle !== 'Untitled Story' && extractedTitle.toLowerCase() !== 'unknown' && (
                <label className="flex! items-start! gap-3! p-3! rounded-lg! border-2! cursor-pointer! transition-all! hover:bg-gray-50! dark:hover:bg-gray-700/50!"
                  style={{
                    borderColor: selectedTitle === 'extracted' 
                      ? 'rgb(59, 130, 246)' 
                      : 'rgb(229, 231, 235)',
                    backgroundColor: selectedTitle === 'extracted' 
                      ? 'rgba(59, 130, 246, 0.05)' 
                      : 'transparent'
                  }}
                >
                  <input
                    type="radio"
                    name="title-option"
                    value="extracted"
                    checked={selectedTitle === 'extracted'}
                    onChange={() => {
                      setSelectedTitle('extracted')
                      setShowCustomInput(false)
                    }}
                    className="mt-1! cursor-pointer!"
                  />
                  <div className="flex-1!">
                    <div className="font-semibold! text-sm! text-gray-900! dark:text-gray-100!">Use Suggested Title</div>
                    <div className="text-xs! text-gray-600! dark:text-gray-400! mt-0.5!">"{extractedTitle}"</div>
                  </div>
                </label>
              )}

              {/* Custom Title Option */}
              <label className="flex! items-start! gap-3! p-3! rounded-lg! border-2! cursor-pointer! transition-all! hover:bg-gray-50! dark:hover:bg-gray-700/50!"
                style={{
                  borderColor: selectedTitle === 'custom' 
                    ? 'rgb(59, 130, 246)' 
                    : 'rgb(229, 231, 235)',
                  backgroundColor: selectedTitle === 'custom' 
                    ? 'rgba(59, 130, 246, 0.05)' 
                    : 'transparent'
                }}
              >
                <input
                  type="radio"
                  name="title-option"
                  value="custom"
                  checked={selectedTitle === 'custom'}
                  onChange={() => {
                    setSelectedTitle('custom')
                    setShowCustomInput(true)
                  }}
                  className="mt-1! cursor-pointer!"
                />
                <div className="flex-1!">
                  <div className="font-semibold! text-sm! text-gray-900! dark:text-gray-100!">Enter Custom Title</div>
                </div>
              </label>
            </div>

            {/* Custom Title Input */}
            {showCustomInput && (
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter your story title..."
                className="w-full! px-3! py-2! rounded-lg! border! border-gray-300! dark:border-gray-600! bg-white! dark:bg-gray-700! text-gray-900! dark:text-gray-100! focus:outline-none! focus:ring-2! focus:ring-blue-500! focus:border-transparent!"
                autoFocus
                maxLength={100}
              />
            )}
          </div>
        )}

        {/* Completion Message */}
        {!needsTitleConfirmation && (
          <p className="text-sm! leading-6! text-gray-600! dark:text-gray-300! mb-4!">
            {title ? `"${title}" has been captured.` : 'Your story has been captured.'} A confirmation email will be sent if email is configured.
          </p>
        )}

        <div className="flex! items-center! gap-3! mt-4!">
          {needsTitleConfirmation ? (
            <>
              <button
                onClick={handleConfirmTitle}
                disabled={isSubmitting || (selectedTitle === 'custom' && !customTitle.trim())}
                className="px-4! py-2! rounded-lg! text-white! bg-blue-600! hover:bg-blue-700! disabled:bg-gray-400! disabled:cursor-not-allowed! shadow-md! hover:shadow-lg! transition-all! cursor-pointer!"
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Title'}
              </button>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="ml-auto! px-4! py-2! rounded-lg! text-gray-700! dark:text-gray-200! bg-gray-100! dark:bg-gray-700! hover:bg-gray-200! dark:hover:bg-gray-600! disabled:opacity-50! border! border-gray-200! dark:border-gray-600! transition-all! cursor-pointer!"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onNewStory}
                className="px-4! py-2! rounded-lg! text-white! bg-blue-600! hover:bg-blue-700! shadow-md! hover:shadow-lg! transition-all! cursor-pointer!"
              >
                Start New Story
              </button>
              {onViewDossier && (
                <button
                  onClick={onViewDossier}
                  className="px-4! py-2! rounded-lg! text-blue-700! dark:text-blue-300! bg-blue-50! dark:bg-blue-900/20! hover:bg-blue-100! dark:hover:bg-blue-900/30! border! border-blue-200! dark:border-blue-800! transition-all! cursor-pointer!"
                >
                  View Dossier
                </button>
              )}
              <button
                onClick={onClose}
                className="ml-auto! px-4! py-2! rounded-lg! text-gray-700! dark:text-gray-200! bg-gray-100! dark:bg-gray-700! hover:bg-gray-200! dark:hover:bg-gray-600! border! border-gray-200! dark:border-gray-600! transition-all! cursor-pointer!"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}


