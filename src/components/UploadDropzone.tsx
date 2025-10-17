'use client'

import { useCallback, useState } from 'react'
import { Paperclip, CheckCircle, XCircle, Loader2 } from 'lucide-react'
// import { Button } from '@/components/ui/button' // Removed - using custom styling
import { useTheme } from '@/lib/theme-context'
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
  const { resolvedTheme } = useTheme()

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
        <button
          className={cn(
            "h-10 w-10 sm:h-[56px] sm:w-[56px] hover:scale-105 active:scale-95 transition-all duration-200 rounded-lg sm:rounded-xl border-2 border-dashed shadow-sm hover:shadow-md flex items-center justify-center backdrop-blur-sm",
            isDragging 
              ? "border-blue-500 bg-blue-50/80 dark:bg-blue-900/20" 
              : resolvedTheme === 'light'
                ? "border-gray-300 bg-white/50 hover:border-blue-400 hover:bg-white/80"
                : "border-slate-500 bg-slate-700/50 hover:border-sky-400 hover:bg-slate-600/80",
            uploading && "opacity-50 cursor-not-allowed"
          )}
          onClick={() => !uploading && document.getElementById('file-upload')?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-sky-400 animate-spin" />
          ) : (
            <Paperclip className={cn(
              "h-4 w-4 sm:h-5 sm:w-5 transition-colors",
              resolvedTheme === 'light'
                ? "text-gray-600 hover:text-blue-600"
                : "text-slate-300 hover:text-sky-400"
            )} />
          )}
        </button>
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
