'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
// import { useTheme } from '@/lib/theme-context' // Unused for now

interface ResizableSidebarProps {
  children: React.ReactNode
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
  className?: string
}

export function ResizableSidebar({ 
  children, 
  minWidth = 250, 
  maxWidth = 500, 
  defaultWidth = 300,
  className = ''
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  // const { resolvedTheme } = useTheme() // Unused for now

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !sidebarRef.current) return

    const newWidth = e.clientX
    const clampedWidth = Math.min(Math.max(newWidth, minWidth), maxWidth)
    setWidth(clampedWidth)
  }, [isResizing, minWidth, maxWidth])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  return (
    <>
      <div
        ref={sidebarRef}
        className={`${className} flex-shrink-0 relative`}
        style={{ width: `${width}px` }}
      >
        {children}
        
        {/* Resize Handle */}
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:w-2 transition-all duration-200 ${
            isResizing ? 'w-2 bg-blue-500' : 'bg-transparent hover:bg-gray-300 dark:hover:bg-slate-600'
          }`}
          onMouseDown={handleMouseDown}
        />
      </div>
    </>
  )
}
