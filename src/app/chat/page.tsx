'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { ChatPanel } from '@/components/ChatPanel'
import { SidebarDossier } from '@/components/SidebarDossier'
import { useChatStore } from '@/lib/store'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const init = useChatStore(s => s.init)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => { init() }, [init])

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024) // lg breakpoint
      if (window.innerWidth < 1024) {
        setSidebarOpen(false) // Hide sidebar on mobile by default
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-green-100 via-blue-100 to-red-100 relative">
      {/* Main Content Area */}
      <div className={cn(
        "flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out",
        sidebarOpen && !isMobile ? "sm:mr-96 lg:mr-[420px]" : "mr-0"
      )}>
        {/* Header - Fixed height */}
        <div className="flex-shrink-0">
          <Topbar />
        </div>
        
        {/* Chat Area - Centered with gaps on all sides */}
        <div className="flex-1 min-h-0 px-3 py-6 flex justify-center items-center">
          <div className="w-full max-w-6xl h-[calc(100%-2rem)] bg-gradient-to-br from-white via-green-50 to-blue-50 backdrop-blur rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.4)] border-2 border-gray-300 overflow-hidden flex flex-col">
            <ChatPanel />
          </div>
        </div>
      </div>

      {/* Sidebar Toggle Button - Hidden on mobile when sidebar is open */}
      {!(isMobile && sidebarOpen) && (
        <button
          onClick={toggleSidebar}
          className={cn(
            "sidebar-toggle-btn fixed top-1/2 z-50 w-16 h-20 bg-white border-2 shadow-2xl flex items-center justify-center hover:bg-white hover:shadow-2xl transition-all duration-200 cursor-pointer",
            sidebarOpen 
              ? "right-full sm:right-96 lg:right-[420px]" 
              : "right-0"
            )}
          style={{
            transform: 'translateY(-50%)',
            borderColor: '#8b5cf6',
            borderRadius: '20px 0 0 20px', // Only left borders rounded
            boxShadow: '0 10px 25px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.1)',
            display: 'flex',
            visibility: 'visible',
            opacity: '1'
          }}
        >
          {sidebarOpen ? (
            <ChevronRight className="w-8 h-8 text-red-500 font-bold" />
          ) : (
            <ChevronLeft className="w-8 h-8 text-blue-500 font-bold" />
          )}
        </button>
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 h-screen border-l-2 border-red-300 bg-gradient-to-br from-white via-red-50 to-pink-50 overflow-hidden transition-all duration-300 ease-in-out z-40",
        // Responsive width: full width on mobile, 420px on larger screens
        "w-full sm:w-96 lg:w-[420px]",
        sidebarOpen 
          ? "translate-x-0" 
          : "translate-x-full",
        isMobile && sidebarOpen && "shadow-2xl"
      )}>
        {/* Mobile/Tablet Close Button */}
        {isMobile && (
          <div className="absolute top-4 right-4 z-50">
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm border-2 border-red-300 rounded-full flex items-center justify-center shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200"
            >
              <X className="w-5 h-5 text-red-500" />
            </button>
          </div>
        )}
        <SidebarDossier />
      </aside>

      {/* Desktop Backdrop */}
      {!isMobile && sidebarOpen && (
        <div 
          className="sidebar-backdrop fixed inset-0 bg-black/20 z-30 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="sidebar-backdrop fixed inset-0 bg-black/50 z-30 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
