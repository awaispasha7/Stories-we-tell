'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { ChatPanel } from '@/components/ChatPanel'
import { SidebarDossier } from '@/components/SidebarDossier'
import { SessionsSidebar } from '@/components/SessionsSidebar'
import { ResizableSidebar } from '@/components/ResizableSidebar'
import { useChatStore } from '@/lib/store'
import { DossierProvider } from '@/lib/dossier-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { MessageSquare, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const init = useChatStore(s => s.init)
  const [activeTab, setActiveTab] = useState<'sessions' | 'dossier'>('sessions')
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  useEffect(() => { init() }, [init])


  const handleSessionSelect = (sessionId: string) => {
    console.log('🔄 Session selected:', sessionId)
    setCurrentSessionId(sessionId)
  }

  const handleSidebarClose = () => {
    setIsSidebarCollapsed(true)
  }

  return (
    <DossierProvider>
      <div className={`h-screen w-screen overflow-hidden ${colors.background} flex flex-col`}>
        {/* Topbar - Full width across entire screen */}
        <div className="flex-shrink-0">
          <Topbar />
        </div>
        
        {/* Main Content Area - Below Topbar */}
        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar - Always visible with sessions */}
          <ResizableSidebar 
            minWidth={250} 
            maxWidth={400} 
            defaultWidth={300}
            className={`${colors.sidebarBackground} border-r ${colors.border}`}
            isCollapsed={isSidebarCollapsed}
            onCollapseChange={setIsSidebarCollapsed}
          >
            {/* Enhanced Sidebar Switch */}
            <div className="sidebar-switch-container">
              <button
                onClick={() => setActiveTab('sessions')}
                className={cn(
                  "sidebar-switch-button",
                  activeTab === 'sessions' && "active"
                )}
              >
                <MessageSquare className="sidebar-switch-icon" />
                Chats
              </button>
              <button
                onClick={() => setActiveTab('dossier')}
                className={cn(
                  "sidebar-switch-button",
                  activeTab === 'dossier' && "active"
                )}
              >
                <FileText className="sidebar-switch-icon" />
                Dossier
              </button>
            </div>
            
            {/* Sidebar Content */}
            <div className="h-[calc(100%-60px)]">
              {activeTab === 'sessions' ? (
                <SessionsSidebar 
                  onSessionSelect={handleSessionSelect}
                  currentSessionId={currentSessionId}
                  onClose={handleSidebarClose}
                />
              ) : (
                <SidebarDossier />
              )}
            </div>
          </ResizableSidebar>

          {/* Chat Area */}
          <div className={`flex-1 min-h-0 p-4 ${isSidebarCollapsed ? 'block' : 'hidden sm:block'}`}>
            <div className={`w-full h-full ${colors.cardBackground} ${colors.cardBorder} border rounded-2xl shadow-lg overflow-hidden flex flex-col`}>
              <ChatPanel _sessionId={currentSessionId} />
            </div>
          </div>
        </div>
      </div>
    </DossierProvider>
  )
}
