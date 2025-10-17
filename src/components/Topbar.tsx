'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Settings, User, LogOut, LogIn, UserPlus } from 'lucide-react'
import { ProfileSettings } from './ProfileSettings'
import { ThemeSelector } from './ThemeSelector'
import { useAuth } from '@/lib/auth-context'
import { useProfile } from '@/lib/profile-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'

export function Topbar() {
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const { user, logout } = useAuth()
  const { profile } = useProfile()
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  
  const colors = getThemeColors(resolvedTheme)

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
  }

  const handleProfileClick = () => {
    router.push('/profile')
  }

  return (
    <>
        <header className={`flex items-center justify-between px-6 h-16 border-b ${colors.border} ${colors.backgroundSecondary} backdrop-blur-lg shadow-sm flex-shrink-0 relative z-50`}>
          {/* Left side - Logo and Text */}
          <div className={`flex items-center gap-3 ${colors.textSecondary}`}>
            <div className="p-2 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-xl shadow-lg shadow-sky-500/30">
              <Film className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <h1 className={`font-bold text-lg ${colors.text}`}>Stories We Tell</h1>
                <p className={`text-xs ${colors.textTertiary} font-medium`}>AI Story Development</p>
              </div>
              <div className={`hidden md:flex items-center gap-2 text-sm ${colors.textSecondary} ${colors.backgroundTertiary} px-3 py-1.5 rounded-full border ${colors.border}`}>
                <span className="font-medium">Cinematic intake assistant</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth buttons and Theme */}
          <div className="flex items-center gap-2">
            {/* Theme Selector */}
            <ThemeSelector />
            
            {user ? (
              /* Authenticated User */
              <>
                {/* User Profile */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:block text-right">
                    <p className={`text-sm font-medium ${colors.textSecondary}`}>
                      {user?.display_name || 'User'}
                    </p>
                    <p className={`text-xs ${colors.textTertiary}`}>
                      {user?.email || ''}
                    </p>
                  </div>
                  <button
                    onClick={handleProfileClick}
                    className={`h-8 w-8 rounded-lg ${colors.sidebarItem} flex items-center justify-center transition-colors`}
                  >
                    {profile.userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={profile.userImage} 
                        alt="Profile" 
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <User className={`h-4 w-4 ${colors.textSecondary}`} />
                    )}
                  </button>
                </div>
                
                <button
                  onClick={() => setShowProfileSettings(true)}
                  className={`h-8 w-8 rounded-lg ${colors.sidebarItem} flex items-center justify-center transition-colors`}
                >
                  <Settings className={`h-4 w-4 ${colors.textSecondary}`} />
                </button>
                
                <button
                  onClick={handleLogout}
                  className="h-8 w-8 rounded-lg hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                >
                  <LogOut className={`h-4 w-4 ${colors.textSecondary}`} />
                </button>
              </>
            ) : (
          /* Unauthenticated User */
          <>
            <button
              onClick={() => router.push('/auth/login')}
              className="auth-button-signin"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </button>
            <button
              onClick={() => router.push('/auth/signup')}
              className="auth-button-signup"
            >
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </button>
          </>
            )}
            
            <div className={`hidden sm:block text-xs ${colors.textTertiary} ${colors.backgroundTertiary} px-2 py-1 rounded-md border ${colors.border}`}>
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