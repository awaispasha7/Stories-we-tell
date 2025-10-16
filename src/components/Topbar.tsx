'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Sparkles, Settings, User, LogOut } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { ProfileSettings } from './ProfileSettings'
import { useAuth } from '@/lib/auth-context'
import { useProfile } from '@/lib/profile-context'

export function Topbar() {
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const { user, logout } = useAuth()
  const { profile } = useProfile()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  return (
    <>
    <header className="flex items-center gap-4 px-6 h-16 border-b border-gray-200/50 bg-white/90 backdrop-blur-lg shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3 text-brand-700">
        <div className="p-2 bg-gradient-to-br from-brand-100 to-brand-200 rounded-xl shadow-sm">
          <Film className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg">Stories We Tell</h1>
          <p className="text-xs text-gray-600 font-medium">AI Story Development</p>
        </div>
      </div>
      <Separator orientation="vertical" className="mx-2 h-8" />
      <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 bg-gray-50/80 px-3 py-1.5 rounded-full">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <span className="font-medium">Cinematic intake assistant</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-800">
              {user?.display_name || 'User'}
            </p>
            <p className="text-xs text-gray-500">
              {user?.email || ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleProfileClick}
            className="h-8 w-8 hover:bg-gray-100"
          >
            {profile.userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={profile.userImage} 
                alt="Profile" 
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowProfileSettings(true)}
          className="h-8 w-8 hover:bg-gray-100"
        >
          <Settings className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        
        <div className="hidden sm:block text-xs text-gray-500 bg-gray-100/80 px-2 py-1 rounded-md">
          v0.1
        </div>
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>
    </header>
    
    <ProfileSettings 
      isOpen={showProfileSettings} 
      onClose={() => setShowProfileSettings(false)} 
    />
    </>
  )
}
