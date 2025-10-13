import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useProfile } from '@/lib/profile-context'
import { ProfileSettings } from './ProfileSettings'
import Image from 'next/image'

export type BubbleProps = { role: 'user'|'assistant'; content: string }

export function MessageBubble({ role, content }: BubbleProps) {
  const isUser = role === 'user'
  const { profile } = useProfile()
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  return (
    <div className={cn(
      'flex w-full gap-3 animate-in slide-in-from-bottom-2 duration-300',
      isUser ? 'justify-end' : 'justify-start'
    )} style={{
      marginTop: '16px',
      marginBottom: '16px'
    }}>
      {!isUser && (
        <Avatar className="h-9 w-9 mt-1 flex-shrink-0 ring-2 ring-green-200" style={{ marginLeft: '16px', marginTop: '16px' }}>
          <AvatarFallback className="bg-gradient-to-br from-green-200 to-green-300 text-green-800 text-xs font-bold shadow-sm">
            <Image 
              src="/swt-logo.svg" 
              alt="SWT Assistant" 
              width={36} 
              height={36}
              className="w-9 h-9"
            />
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        'max-w-[70%] rounded-xl px-8 py-6 text-sm leading-relaxed transform transition-all duration-200 hover:scale-[1.02]',
        isUser
          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white rounded-br-lg shadow-2xl shadow-blue-500/40 border-2 border-blue-400/40'
          : 'bg-gradient-to-br from-white via-green-100/80 to-green-200/60 backdrop-blur-sm border-2 border-green-300/70 rounded-bl-lg shadow-2xl shadow-gray-400/30'
      )}>
        <div className="whitespace-pre-wrap leading-relaxed break-words" style={{ 
          marginLeft: '10px',
          marginRight: isUser ? '10px' : '10px'
        }}>
          {content}
        </div>
        <div className={cn(
          'text-xs mt-2 opacity-70 ',
          isUser ? 'text-white/70' : 'text-gray-500'
        )} style={{ 
          marginLeft: '10px',
          marginRight: isUser ? '10px' : '10px'
        }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      {isUser && (
        <div className="relative group z-20 overflow-visible">
          <Avatar 
            className="h-9 w-9 mt-1 flex-shrink-0 ring-2 ring-blue-200 cursor-pointer transition-all duration-200 hover:ring-blue-400 hover:scale-105" 
            style={{ marginRight: '16px' }}
            onClick={() => setShowProfileSettings(true)}
          >
            <AvatarFallback className="bg-gradient-to-br from-blue-200 to-blue-300 text-blue-800 text-xs font-bold shadow-sm">
              {profile.userImage ? (
                <Image 
                  src={profile.userImage} 
                  alt="User Profile" 
                  width={24} 
                  height={24}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                profile.userName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          {/* Settings icon on hover */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Profile Settings Modal */}
      <ProfileSettings 
        isOpen={showProfileSettings} 
        onClose={() => setShowProfileSettings(false)} 
      />
    </div>
  )
}
