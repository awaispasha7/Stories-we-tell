'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Sparkles, Settings, User, LogOut } from 'lucide-react'
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
    <header className="flex items-center gap-4 px-6 h-16 border-b border-slate-700/50 bg-slate-900/90 backdrop-blur-lg shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3 text-slate-200">
        <div className="p-2 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl shadow-lg shadow-sky-500/30">
          <Film className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-100">Stories We Tell</h1>
          <p className="text-xs text-slate-400 font-medium">AI Story Development</p>
        </div>
      </div>
      <div className="w-px h-8 bg-slate-700 mx-2"></div>
      <div className="hidden md:flex items-center gap-2 text-sm text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
        <Sparkles className="h-4 w-4 text-sky-400" />
        <span className="font-medium">Cinematic intake assistant</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-200">
              {user?.display_name || 'User'}
            </p>
            <p className="text-xs text-slate-400">
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={handleProfileClick}
            className="h-8 w-8 rounded-lg hover:bg-slate-800/50 flex items-center justify-center transition-colors"
          >
            {profile.userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={profile.userImage} 
                alt="Profile" 
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-slate-300" />
            )}
          </button>
        </div>
        
        <button
          onClick={() => setShowProfileSettings(true)}
          className="h-8 w-8 rounded-lg hover:bg-slate-800/50 flex items-center justify-center transition-colors"
        >
          <Settings className="h-4 w-4 text-slate-300" />
        </button>
        
        <button
          onClick={handleLogout}
          className="h-8 w-8 rounded-lg hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
        >
          <LogOut className="h-4 w-4 text-slate-300" />
        </button>
        
        <div className="hidden sm:block text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded-md border border-slate-700/50">
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