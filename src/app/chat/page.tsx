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
import { sessionSyncManager } from '@/lib/session-sync'
import { MessageSquare, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ChatPage() {
  const init = useChatStore(s => s.init)
  const [activeTab, setActiveTab] = useState<'sessions' | 'dossier'>('sessions')
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [currentProjectId, setCurrentProjectId] = useState<string>('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  useEffect(() => { init() }, [init])

  // Initialize session sync and restore session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // First, restore session from localStorage synchronously
        const stored = localStorage.getItem('stories_we_tell_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.sessionId) {
            console.log('🔄 [PAGE] Restoring session from localStorage:', parsed.sessionId)
            setCurrentSessionId(parsed.sessionId)
            if (parsed.projectId) {
              setCurrentProjectId(parsed.projectId)
            }
          }
        }
        
        // Then initialize the session sync manager asynchronously
        await sessionSyncManager.initialize()
      } catch (error) {
        console.error('Failed to initialize session:', error)
      }
    }

    initializeSession()
  }, [])

  // Listen for session cleared and updated events
  useEffect(() => {
    const handleSessionCleared = (event: CustomEvent) => {
      console.log('🔄 Session cleared event received:', event.detail.reason)
      setCurrentSessionId('')
      setCurrentProjectId('')
    }

    const handleSessionUpdated = (event: CustomEvent) => {
      console.log('🔄 Session updated event received:', event.detail)
      const { sessionId: newSessionId, projectId: newProjectId } = event.detail || {}
      
      if (newSessionId && newSessionId !== currentSessionId) {
        console.log('🔄 Updating current session from event:', newSessionId)
        setCurrentSessionId(newSessionId)
        if (newProjectId) {
          setCurrentProjectId(newProjectId)
        }
      }
    }

    window.addEventListener('sessionCleared', handleSessionCleared as EventListener)
    window.addEventListener('sessionUpdated', handleSessionUpdated as EventListener)
    
    return () => {
      window.removeEventListener('sessionCleared', handleSessionCleared as EventListener)
      window.removeEventListener('sessionUpdated', handleSessionUpdated as EventListener)
    }
  }, [currentSessionId])


  const handleSessionSelect = (sessionId: string, projectId?: string) => {
    setCurrentSessionId(sessionId)
    setCurrentProjectId(projectId || '')
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
                <SidebarDossier 
                  sessionId={currentSessionId}
                  projectId={currentProjectId}
                  onClose={handleSidebarClose}
                />
              )}
            </div>
          </ResizableSidebar>

          {/* Chat Area */}
          <div className={`flex-1 min-h-0 p-4 ${isSidebarCollapsed ? 'block' : 'hidden sm:block'}`}>
            <div className={`w-full h-full ${colors.cardBackground} ${colors.cardBorder} border rounded-2xl shadow-lg overflow-hidden flex flex-col`}>
              <ChatPanel 
                _sessionId={currentSessionId} 
                _projectId={currentProjectId} 
                onSessionUpdate={(sessionId, projectId) => {
                  console.log('🔄 [PAGE] Session updated from ChatPanel:', sessionId)
                  setCurrentSessionId(sessionId)
                  if (projectId) {
                    setCurrentProjectId(projectId)
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </DossierProvider>
  )
}

