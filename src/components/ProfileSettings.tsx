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
  const [tempImage, setTempImage] = useState(profile.userImage)

  const handleSave = () => {
    updateUserName(tempName)
    updateUserImage(tempImage)
    onClose()
  }

  const handleCancel = () => {
    setTempName(profile.userName)
    setTempImage(profile.userImage)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Profile Settings
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Profile Picture</h3>
              <p className="text-sm text-gray-600 mb-4">
                Click to upload your own picture
              </p>
            </div>
            
            <ProfilePictureUpload
              currentImage={tempImage}
              onImageChange={setTempImage}
              size="lg"
              className="mb-4"
            />
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Supported: JPG, PNG, GIF (max 5MB)
              </p>
            </div>
          </div>

          {/* Name Section */}
          <div className="space-y-2">
            <label htmlFor="userName" className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Display Name
            </label>
            <input
              id="userName"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Enter your name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-gray-500">
              This will appear in your messages
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
