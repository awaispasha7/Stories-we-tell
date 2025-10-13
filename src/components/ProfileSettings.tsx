'use client'

import { useState } from 'react'
import { Settings, User, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200/50 rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200/50">
          <CardTitle className="text-xl font-bold flex items-center gap-3 text-gray-800">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            Profile Settings
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-9 w-9 hover:bg-red-100 hover:text-red-600 transition-all duration-200 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-8 p-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">Profile Picture</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click to upload your own picture
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
            
            <div className="text-center space-y-3">
              <p className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                Supported: JPG, PNG, GIF (max 5MB)
              </p>
              {tempImage && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTempImage(null)}
                  className="text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 hover:text-red-700 transition-all duration-200 cursor-pointer rounded-full px-4 py-2"
                >
                  <X className="w-3 h-3 mr-2" />
                  Remove Picture
                </Button>
              )}
            </div>
          </div>

          {/* Name Section */}
          <div className="space-y-3">
            <label htmlFor="userName" className="text-sm font-medium flex items-center gap-2 text-gray-700">
              <div className="p-1.5 bg-blue-100 rounded-md">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              Display Name
            </label>
            <input
              id="userName"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your name"
              className="flex h-12 w-full rounded-xl border-2 border-gray-200 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:border-blue-500 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 bg-blue-50 px-3 py-1 rounded-full inline-block">
              This will appear in your messages
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer transform hover:scale-105"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200 cursor-pointer transform hover:scale-105"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
