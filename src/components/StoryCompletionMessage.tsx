'use client'

import { Sparkles, BookOpen, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { useRouter } from 'next/navigation'

interface StoryCompletionMessageProps {
  storyTitle?: string
  onNewStory?: () => void
}

export function StoryCompletionMessage({ storyTitle, onNewStory }: StoryCompletionMessageProps) {
  const { isAuthenticated } = useAuth()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const router = useRouter()

  const handleNewProject = () => {
    if (onNewStory) {
      onNewStory()
    }
  }

  const handleSignUp = () => {
    router.push('/auth/signup')
  }

  return (
    <div 
      className="w-full px-4 py-8 sm:px-6 sm:py-12"
      style={{
        background: resolvedTheme === 'dark' 
          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
        borderTop: `1px solid ${resolvedTheme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`
      }}
    >
      <div className="max-w-2xl mx-auto text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div 
            className="relative"
            style={{
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          >
            <div 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.3), 0 10px 10px -5px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 
            className="text-2xl sm:text-3xl font-bold"
            style={{ color: colors.text }}
          >
            Your Story is Complete! 🎉
          </h2>
          {storyTitle && (
            <p 
              className="text-lg sm:text-xl font-medium"
              style={{ color: colors.textMuted }}
            >
              "{storyTitle}"
            </p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-4">
          <p 
            className="text-base sm:text-lg leading-relaxed max-w-xl mx-auto"
            style={{ color: colors.textSecondary }}
          >
            Thank you for sharing your story with us. Your narrative has been captured and is being prepared for the next steps in our creative process.
          </p>
          
          {isAuthenticated ? (
            <div className="space-y-3 pt-4">
              <p 
                className="text-sm sm:text-base font-medium"
                style={{ color: colors.textMuted }}
              >
                Ready to create another story?
              </p>
              <button
                onClick={handleNewProject}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
                  boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.2)'
                }}
              >
                <BookOpen className="w-5 h-5" />
                <span>Create New Story</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-4">
              <p 
                className="text-sm sm:text-base font-medium"
                style={{ color: colors.textMuted }}
              >
                Sign up to create unlimited stories and save your progress
              </p>
              <button
                onClick={handleSignUp}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                  boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3), 0 4px 6px -2px rgba(236, 72, 153, 0.2)'
                }}
              >
                <Sparkles className="w-5 h-5" />
                <span>Sign Up Free</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Decorative Elements */}
        <div className="flex justify-center gap-2 pt-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full opacity-60"
              style={{
                background: resolvedTheme === 'dark' ? '#3b82f6' : '#10b981',
                animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

