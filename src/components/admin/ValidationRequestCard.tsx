'use client'

import { useTheme, getThemeColors } from '@/lib/theme-context'
import { formatDistanceToNow } from 'date-fns'

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
}

interface Props {
  request: ValidationRequest
  onSelect: () => void
  isSelected: boolean
}

const statusColors = {
  pending: 'bg-yellow-100! dark:bg-yellow-900/30! text-yellow-800! dark:text-yellow-300! border-yellow-300! dark:border-yellow-700!',
  approved: 'bg-green-100! dark:bg-green-900/30! text-green-800! dark:text-green-300! border-green-300! dark:border-green-700!',
  rejected: 'bg-red-100! dark:bg-red-900/30! text-red-800! dark:text-red-300! border-red-300! dark:border-red-700!',
  sent_to_client: 'bg-purple-100! dark:bg-purple-900/30! text-purple-800! dark:text-purple-300! border-purple-300! dark:border-purple-700!',
  // Legacy support for existing records
  in_review: 'bg-yellow-100! dark:bg-yellow-900/30! text-yellow-800! dark:text-yellow-300! border-yellow-300! dark:border-yellow-700!'
}

export default function ValidationRequestCard({ request, onSelect, isSelected }: Props) {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  const getStatusDisplay = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const parseConversationMessages = (transcript: string): Array<{ role: string; content: string }> => {
    if (!transcript) return []
    
    const messages: Array<{ role: string; content: string }> = []
    
    // Format: ## Client\n*timestamp*\n\ncontent\n\n---\n\n## Stories We Tell AI\n...
    // Split by "---" separator
    const sections = transcript.split('---').map(s => s.trim()).filter(s => s)
    
    for (const section of sections) {
      const lines = section.split('\n').map(l => l.trim())
      let currentRole: string | null = null
      let currentContent: string[] = []
      let inContent = false
      
      for (const line of lines) {
        // Skip header
        if (line.includes('Conversation Transcript')) continue
        
        // Check for role header (## Client or ## Stories We Tell AI)
        const roleMatch = line.match(/^##\s+(.+)$/)
        if (roleMatch) {
          // Save previous message if exists
          if (currentRole && currentContent.length > 0) {
            const content = currentContent.join(' ').trim()
            if (content) {
              messages.push({
                role: currentRole,
                content: content
              })
            }
          }
          
          // Set new role
          const roleName = roleMatch[1].trim()
          if (roleName.toLowerCase().includes('client') || roleName.toLowerCase().includes('user')) {
            currentRole = 'user'
          } else {
            currentRole = 'assistant'
          }
          currentContent = []
          inContent = false
          continue
        }
        
        // Skip timestamp lines (marked with *)
        if (line.startsWith('*') && line.endsWith('*')) continue
        
        // Skip empty lines at start
        if (!inContent && !line) continue
        
        // Collect content
        if (currentRole && line) {
          inContent = true
          currentContent.push(line)
        }
      }
      
      // Save last message
      if (currentRole && currentContent.length > 0) {
        const content = currentContent.join(' ').trim()
        if (content) {
          messages.push({
            role: currentRole,
            content: content
          })
        }
      }
    }
    
    // Fallback: if parsing failed, show cleaned transcript
    if (messages.length === 0) {
      const cleaned = transcript
        .replace(/#+ Conversation Transcript/gi, '')
        .replace(/##\s+/g, '')
        .replace(/\*[^*]+\*/g, '') // Remove timestamps
        .replace(/---/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      
      if (cleaned) {
        return [{
          role: 'user',
          content: truncateText(cleaned, 200)
        }]
      }
    }
    
    return messages.slice(0, 3) // Show first 3 messages max
  }

  return (
    <div
      onClick={onSelect}
      className={`
        p-6! cursor-pointer! transition-all! duration-300! shadow-md! hover:shadow-xl!
        ${isSelected 
          ? `shadow-xl! ${colors.sidebarBackground} ring-2! ring-blue-500/50!` 
          : `${colors.background}`
        }
      `}
    >
      <div className="flex! justify-between! items-start! mb-4!">
        <div className="flex-1!">
          <div className="flex! items-center! space-x-3! mb-3!">
            <h3 className={`font-bold! text-lg! ${colors.text}`}>
              {request.client_name || 'Anonymous User'}
            </h3>
            <span 
              className={`
                px-3! py-1! text-xs! font-bold! rounded-full! border-2!
                ${statusColors[request.status]}
              `}
            >
              {getStatusDisplay(request.status)}
            </span>
          </div>
          
          <div className={`text-sm! ${colors.textSecondary} space-y-1! font-medium!`}>
            <p>📧 Email: {request.client_email || 'N/A'}</p>
            <p>🕐 Created: {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>
            {request.reviewed_at && (
              <p>✅ Reviewed: {formatDistanceToNow(new Date(request.reviewed_at), { addSuffix: true })}</p>
            )}
          </div>
        </div>

        <div className="ml-4!">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            className={`
              px-4! py-2! text-sm! rounded-lg! border-2! transition-all! font-semibold! shadow-md! hover:shadow-lg!
              ${colors.border} ${colors.textSecondary} hover:${colors.text} hover:border-blue-500! hover:bg-blue-500/10!
            `}
          >
            View Details
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="space-y-4!">
        <div className="p-3! rounded-lg! bg-gray-50! dark:bg-gray-900/50!">
          <h4 className={`text-sm! font-bold! ${colors.text} mb-3!`}>💬 Conversation</h4>
          <div className="space-y-2!">
            {parseConversationMessages(request.conversation_transcript).map((msg, idx) => (
              <div
                key={idx}
                className={`p-2! rounded! text-sm! ${
                  msg.role === 'user'
                    ? 'bg-blue-50! dark:bg-blue-900/20! text-blue-900! dark:text-blue-200!'
                    : 'bg-gray-100! dark:bg-gray-800! text-gray-900! dark:text-gray-200!'
                }`}
              >
                <span className="font-semibold! mr-2!">
                  {msg.role === 'user' ? '👤 User:' : '🤖 AI:'}
                </span>
                <span className={colors.textSecondary}>
                  {truncateText(msg.content, 100)}
                </span>
              </div>
            ))}
            {parseConversationMessages(request.conversation_transcript).length === 0 && (
              <p className={`text-sm! ${colors.textSecondary} italic!`}>
                No conversation messages available
              </p>
            )}
          </div>
        </div>

        {request.review_notes && (
          <div className="p-3! rounded-lg! bg-yellow-50! dark:bg-yellow-900/20! border! border-yellow-200! dark:border-yellow-800!">
            <h4 className={`text-sm! font-bold! text-yellow-800! dark:text-yellow-300! mb-2!`}>📋 Review Notes</h4>
            <p className={`text-sm! text-yellow-700! dark:text-yellow-400! leading-relaxed!`}>
              {truncateText(request.review_notes, 100)}
            </p>
          </div>
        )}
      </div>

      <div className={`mt-5! pt-4! border-t-2! ${colors.border} flex! justify-between! items-center! text-xs! font-mono! ${colors.textSecondary}`}>
        <span>🔑 ID: {request.validation_id.slice(0, 8)}...</span>
        <span>📁 Project: {request.project_id.slice(0, 8)}...</span>
      </div>
    </div>
  )
}
