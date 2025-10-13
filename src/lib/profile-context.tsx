'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

interface ProfileData {
  userImage: string
  userName: string
}

interface ProfileContextType {
  profile: ProfileData
  updateUserImage: (imageUrl: string) => void
  updateUserName: (name: string) => void
}

const defaultProfile: ProfileData = {
  userImage: '',
  userName: 'You'
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile)

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('user-profile')
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile)
        setProfile(parsed)
      } catch (error) {
        console.error('Error parsing saved profile:', error)
      }
    }
  }, [])

  const updateUserImage = useCallback((imageUrl: string) => {
    setProfile(prev => {
      const updated = { ...prev, userImage: imageUrl }
      localStorage.setItem('user-profile', JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateUserName = useCallback((name: string) => {
    setProfile(prev => {
      const updated = { ...prev, userName: name }
      localStorage.setItem('user-profile', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, updateUserImage, updateUserName }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}
