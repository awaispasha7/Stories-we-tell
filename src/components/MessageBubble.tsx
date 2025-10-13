import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useProfile } from '@/lib/profile-context'
import Image from 'next/image'

export type BubbleProps = { role: 'user'|'assistant'; content: string }

export function MessageBubble({ role, content }: BubbleProps) {
  const isUser = role === 'user'
  const { profile } = useProfile()
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
        <Avatar className="h-9 w-9 mt-1 flex-shrink-0 ring-2 ring-blue-200" style={{ marginRight: '16px' }}>
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
      )}
    </div>
  )
}
