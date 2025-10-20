'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Film, Settings, User, LogOut, ChevronDown } from 'lucide-react'
import { ProfileSettings } from './ProfileSettings'
import { ThemeSelector } from './ThemeSelector'
import { useAuth } from '@/lib/auth-context'
import { useProfile } from '@/lib/profile-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'

export function Topbar() {
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const { user, logout } = useAuth()
  const { profile } = useProfile()
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const colors = getThemeColors(resolvedTheme)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/auth/login')
    setShowProfileDropdown(false)
  }

  const [settingsInitialTab, setSettingsInitialTab] = useState<'chat' | 'account'>('chat')
  const handleProfileClick = () => {
    setSettingsInitialTab('account')
    setShowProfileSettings(true)
    setShowProfileDropdown(false)
  }

  const handleSettingsClick = () => {
    setSettingsInitialTab('chat')
    setShowProfileSettings(true)
    setShowProfileDropdown(false)
  }

  return (
    <>
        <header className={`flex items-center justify-evenly sm:px-6 h-16 border-b ${colors.border} ${colors.backgroundSecondary} backdrop-blur-lg shadow-sm flex-shrink-0 relative z-50`}>
          {/* Left side - Logo and Text */}
          <div className={`flex items-center gap-2 sm:gap-3 ${colors.textSecondary}`}>
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-sky-500 to-emerald-500 rounded-lg sm:rounded-xl shadow-lg shadow-sky-500/30">
              <Film className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div>
                <h1 className={`font-bold text-sm sm:text-lg ${colors.text}`}>Stories We Tell</h1>
                <p className={`text-xs ${colors.textTertiary} font-medium hidden sm:block`}>AI Story Development</p>
              </div>
              <div className={`hidden lg:flex items-center gap-2 text-sm ${colors.textSecondary} ${colors.backgroundTertiary} px-3 py-1.5 rounded-full border ${colors.border}`}>
                <span className="font-medium">Cinematic intake assistant</span>
              </div>
            </div>
          </div>

          {/* Right side - Auth buttons and Theme */}
          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <ThemeSelector />
            
            {user ? (
              /* Authenticated User - Merged Profile & Settings */
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-lg sm:rounded-xl ${colors.sidebarItem} hover:bg-opacity-80 transition-all duration-200 group`}
                >
                  {/* Profile Picture */}
                  <div className="relative">
                    {profile.userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={profile.userImage} 
                        alt="Profile" 
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ring-2 ring-white/20 group-hover:ring-white/40 transition-all"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                      </div>
                    )}
                    <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full border border-white"></div>
                  </div>
                  
                  {/* User Info */}
                  <div className="hidden md:block text-left">
                    <p className={`text-sm font-medium ${colors.text} group-hover:opacity-80`}>
                      {user?.display_name || 'User'}
                    </p>
                    <p className={`text-xs ${colors.textTertiary}`}>
                      {user?.email || ''}
                    </p>
                  </div>
                  
                  {/* Dropdown Arrow */}
                  <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 ${colors.textSecondary} transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileDropdown && (
                  <div className={`absolute right-0 top-full mt-2 w-64 ${colors.backgroundSecondary} border ${colors.border} rounded-xl shadow-xl backdrop-blur-xl z-50 overflow-hidden`}>
                    {/* Header */}
                    {/* <div className={`px-4 py-3 border-b ${colors.border} ${colors.backgroundTertiary}`}>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {profile.userImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img 
                              src={profile.userImage} 
                              alt="Profile" 
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                              <User className="h-5 w-5 text-white" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold ${colors.text}`}>
                            {user?.display_name || 'User'}
                          </p>
                          <p className={`text-xs ${colors.textTertiary}`}>
                            {user?.email || ''}
                          </p>
                        </div>
                      </div>
                    </div> */}

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={handleProfileClick}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${colors.textSecondary} hover:${colors.backgroundTertiary} transition-colors group`}
                      >
                        <div className={`p-1.5 rounded-lg ${colors.backgroundTertiary} group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors`}>
                          <User className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">View Profile</p>
                          <p className="text-xs opacity-70">Manage your account</p>
                        </div>
                      </button>

                      <button
                        onClick={handleSettingsClick}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${colors.textSecondary} hover:${colors.backgroundTertiary} transition-colors group`}
                      >
                        <div className={`p-1.5 rounded-lg ${colors.backgroundTertiary} group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors`}>
                          <Settings className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Settings</p>
                          <p className="text-xs opacity-70">Customize your experience</p>
                        </div>
                      </button>

                      <div className={`mx-4 my-2 h-px ${colors.border}`}></div>

                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors group`}
                      >
                        <div className="p-1.5 rounded-lg bg-red-50 group-hover:bg-red-100 transition-colors">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium">Sign Out</p>
                          <p className="text-xs opacity-70">End your session</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            
            <div className={`hidden lg:block text-xs ${colors.textTertiary} ${colors.backgroundTertiary} px-2 py-1 rounded-md border ${colors.border}`}>
              v0.1
            </div>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
    </header>
    
    <ProfileSettings 
      isOpen={showProfileSettings} 
      onClose={() => setShowProfileSettings(false)} 
      initialTab={settingsInitialTab}
    />
    </>
  )
}