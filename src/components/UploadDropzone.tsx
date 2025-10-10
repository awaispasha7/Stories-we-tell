'use client'

import { useCallback } from 'react'
import { Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function UploadDropzone() {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      // Handle file upload logic here
      console.log('Files selected:', files)
    }
  }, [])

  return (
    <div className="flex items-center">
      <input
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
        id="file-upload"
      />
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-[56px] w-[56px] hover:bg-white/80 hover:scale-105 active:scale-95 transition-all duration-200 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400",
          "bg-white/50 backdrop-blur-sm shadow-sm hover:shadow-md"
        )}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <Paperclip className="h-5 w-5 text-gray-600 hover:text-brand-600 transition-colors" />
      </Button>
    </div>
  )
}
