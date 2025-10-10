'use client'

import { useCallback, useState } from 'react'
import { Paperclip, Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadedFile {
  name: string
  size: number
  url: string
  type: string
}

export function UploadDropzone() {
  const [uploading, setUploading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      
      // Add all files to FormData
      Array.from(files).forEach(file => {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Max size is 10MB.`)
        }
        formData.append('files', file)
      })

      console.log('📤 Uploading files:', Array.from(files).map(f => f.name))

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      console.log('✅ Upload successful:', data)

      setUploadedFiles(prev => [...prev, ...data.files])
    } catch (err) {
      console.error('❌ Upload error:', err)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const onFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files)
  }, [handleFileUpload])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    handleFileUpload(event.dataTransfer.files)
  }, [handleFileUpload])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }, [])

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt,.mp4,.mov,.avi"
        onChange={onFileChange}
        className="hidden"
        id="file-upload"
        disabled={uploading}
      />
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-[56px] w-[56px] hover:bg-white/80 hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl border-2 border-dashed shadow-sm hover:shadow-md",
            isDragging 
              ? "border-blue-500 bg-blue-50/80" 
              : "border-gray-300 bg-white/50 hover:border-blue-400",
            "backdrop-blur-sm",
            uploading && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !uploading && document.getElementById('file-upload')?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5 text-gray-600 hover:text-blue-600 transition-colors" />
          )}
        </Button>
      </div>

      {/* Upload status indicators */}
      {error && (
        <div className="flex items-center gap-1 text-red-500 text-xs">
          <XCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
      
      {uploadedFiles.length > 0 && !error && (
        <div className="flex items-center gap-1 text-green-600 text-xs">
          <CheckCircle className="h-3 w-3" />
          <span>{uploadedFiles.length} file(s) uploaded</span>
        </div>
      )}
    </div>
  )
}
