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
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  useEffect(() => { init() }, [init])


  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId)
  }

  return (
    <DossierProvider>
        <div className={`h-screen w-screen overflow-hidden ${colors.background} flex`}>
          {/* Left Sidebar - Always visible with sessions */}
          <ResizableSidebar 
            minWidth={250} 
            maxWidth={400} 
            defaultWidth={300}
            className={`${colors.sidebarBackground} border-r ${colors.border}`}
          >
            {/* Sidebar Tabs */}
            <div className={`flex border-b ${colors.border} ${colors.backgroundSecondary}`}>
              <button
                onClick={() => setActiveTab('sessions')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors",
                  activeTab === 'sessions'
                    ? `${colors.text} ${colors.sidebarItemActive} border-b-2 border-blue-500`
                    : `${colors.textSecondary} ${colors.sidebarItem}`
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Chats
              </button>
              <button
                onClick={() => setActiveTab('dossier')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors",
                  activeTab === 'dossier'
                    ? `${colors.text} ${colors.sidebarItemActive} border-b-2 border-blue-500`
                    : `${colors.textSecondary} ${colors.sidebarItem}`
                )}
              >
                <FileText className="w-4 h-4" />
                Dossier
              </button>
            </div>
            
            {/* Sidebar Content */}
            <div className="h-[calc(100%-60px)]">
              {activeTab === 'sessions' ? (
                <SessionsSidebar 
                  onSessionSelect={handleSessionSelect}
                  currentSessionId={currentSessionId}
                />
              ) : (
                <SidebarDossier />
              )}
            </div>
          </ResizableSidebar>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="flex-shrink-0">
              <Topbar />
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 min-h-0 p-4">
              <div className={`w-full h-full ${colors.cardBackground} ${colors.cardBorder} border rounded-2xl shadow-lg overflow-hidden flex flex-col`}>
                    <ChatPanel _sessionId={currentSessionId} />
              </div>
            </div>
          </div>
        </div>
      </DossierProvider>
  )
}
