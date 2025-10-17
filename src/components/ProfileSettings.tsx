'use client'

import { useState } from 'react'
import { Settings, User, Save, X } from 'lucide-react'
// import { Button } from '@/components/ui/button' // Removed - using custom styling
// import { Input } from '@/components/ui/input' // Removed - using custom styling
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card' // Removed - using custom styling
import { ProfilePictureUpload } from './ProfilePictureUpload'
import { useProfile } from '@/lib/profile-context'

interface ProfileSettingsProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSettings({ isOpen, onClose }: ProfileSettingsProps) {
  const { profile, updateUserImage, updateUserName } = useProfile()
  const [tempName, setTempName] = useState(profile.userName)
  const [tempImage, setTempImage] = useState<string | null>(profile.userImage)

  const handleSave = () => {
    updateUserName(tempName)
    updateUserImage(tempImage || '')
    onClose()
  }

  const handleCancel = () => {
    setTempName(profile.userName)
    setTempImage(profile.userImage)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl shadow-2xl border border-white/20 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-500 via-purple-600 to-emerald-500 p-6">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
                <p className="text-blue-100 text-sm">Customize your experience</p>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="h-10 w-10 hover:bg-white/20 transition-all duration-200 rounded-xl flex items-center justify-center group"
            >
              <X className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
        
        <div className="space-y-8 p-8">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2 text-gray-800">Profile Picture</h3>
              <p className="text-sm text-gray-600 mb-6">
                Upload a photo to personalize your account
              </p>
            </div>
            
            <div className="relative">
              <ProfilePictureUpload
                currentImage={tempImage}
                onImageChange={setTempImage}
                size="lg"
                className="mb-4"
              />
            </div>
            
            <div className="text-center space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-600 font-medium">
                  📸 Supported: JPG, PNG, GIF (max 5MB)
                </p>
              </div>
              {tempImage && (
                <button
                  onClick={() => setTempImage(null)}
                  className="text-red-600 border-2 border-red-200 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-all duration-200 cursor-pointer rounded-xl px-6 py-3 flex items-center justify-center gap-2 font-medium"
                >
                  <X className="w-4 h-4" />
                  Remove Picture
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

          {/* Name Section */}
          <div className="space-y-4">
            <label htmlFor="userName" className="text-sm font-bold flex items-center gap-3 text-gray-800">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                <User className="w-4 h-4 text-white" />
              </div>
              Display Name
            </label>
            <input
              id="userName"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your display name"
              className="flex h-14 w-full rounded-2xl border-2 border-gray-200 bg-white/90 backdrop-blur-sm px-6 py-4 text-base ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500 hover:border-gray-300 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:shadow-md"
            />
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-600 font-medium">
                💬 This name will appear in your chat messages
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-500 via-purple-600 to-emerald-500 hover:from-blue-600 hover:via-purple-700 hover:to-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105 flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 rounded-2xl transition-all duration-200 cursor-pointer transform hover:scale-105"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
