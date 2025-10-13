'use client'

import { useState, useRef } from 'react'
import { Camera, X, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ProfilePictureUploadProps {
  currentImage?: string
  onImageChange: (imageUrl: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ProfilePictureUpload({ 
  currentImage, 
  onImageChange, 
  size = 'md',
  className 
}: ProfilePictureUploadProps) {
  const [isHovered, setIsHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }

      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file)
      onImageChange(imageUrl)
    }
  }

  const handleRemoveImage = () => {
    onImageChange('')
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div 
      className={cn(
        "relative group cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Profile Picture Container */}
      <div 
        className={cn(
          "relative rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center overflow-hidden transition-all duration-200",
          sizeClasses[size],
          isHovered && "scale-105 shadow-lg"
        )}
        onClick={handleClick}
      >
        {currentImage ? (
          <img 
            src={currentImage} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className={cn("text-white", iconSizes[size])} />
        )}

        {/* Overlay on hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Camera className={cn("text-white", iconSizes[size])} />
          </div>
        )}

        {/* Remove button */}
        {currentImage && isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemoveImage()
            }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}
