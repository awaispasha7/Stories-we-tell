'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/Topbar'
import { ChatPanel } from '@/components/ChatPanel'
import { SidebarDossier } from '@/components/SidebarDossier'
import { SessionsSidebar } from '@/components/SessionsSidebar'
import { ResizableSidebar } from '@/components/ResizableSidebar'
import { LoginPromptModal } from '@/components/LoginPromptModal'
import { ProjectCreationModal } from '@/components/ProjectCreationModal'
import { useChatStore } from '@/lib/store'
import { DossierProvider } from '@/lib/dossier-context'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { sessionSyncManager } from '@/lib/session-sync'
import { MessageSquare, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { projectApi } from '@/lib/api'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export default function ChatPage() {
  const init = useChatStore(s => s.init)
  const [activeTab, setActiveTab] = useState<'sessions' | 'dossier'>('sessions')
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [currentProjectId, setCurrentProjectId] = useState<string>('')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginModalTrigger, setLoginModalTrigger] = useState<'new-story' | 'session-start' | 'story-complete'>('session-start')
  const [showSidebarHint, setShowSidebarHint] = useState(false)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [projectModalRequired, setProjectModalRequired] = useState(false)
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Fetch user projects to check availability
  const { data: projectsData, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!isAuthenticated || !user?.user_id) return { projects: [], count: 0 }
      try {
        return await projectApi.getProjects()
      } catch (error) {
        console.error('Failed to fetch projects:', error)
        return { projects: [], count: 0 }
      }
    },
    enabled: isAuthenticated && !!user?.user_id,
    staleTime: 30000, // Cache for 30 seconds
  })

  const projects = projectsData?.projects || []

  useEffect(() => { init() }, [init])

  // Check if current project still exists (was deleted)
  useEffect(() => {
    if (isAuthenticated && user && currentProjectId && projects.length > 0) {
      const projectExists = projects.some(p => p.project_id === currentProjectId)
      if (!projectExists) {
        // Current project was deleted - clear everything
        console.log('🗑️ [PAGE] Current project was deleted, clearing selection')
        setCurrentProjectId('')
        setCurrentSessionId('')
        try {
          localStorage.removeItem('stories_we_tell_session')
        } catch (error) {
          console.error('Failed to clear localStorage:', error)
        }
      }
    }
  }, [isAuthenticated, user, currentProjectId, projects])

  // Auto-select most recent project for authenticated users if none selected
  useEffect(() => {
    if (isAuthenticated && user && projects.length > 0 && !currentProjectId && !currentSessionId) {
      // User has projects but no project/session selected - auto-select most recent
      const mostRecentProject = projects[0] // Already ordered by updated_at DESC
      console.log('🔄 [PAGE] Auto-selecting most recent project:', mostRecentProject.name, mostRecentProject.project_id)
      setCurrentProjectId(mostRecentProject.project_id)
      
      // Update localStorage to persist the selection
      try {
        const stored = localStorage.getItem('stories_we_tell_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          parsed.projectId = mostRecentProject.project_id
          localStorage.setItem('stories_we_tell_session', JSON.stringify(parsed))
        } else {
          localStorage.setItem('stories_we_tell_session', JSON.stringify({
            projectId: mostRecentProject.project_id
          }))
        }
      } catch (error) {
        console.error('Failed to update localStorage with project:', error)
      }
    }
    
    // For authenticated users with no projects, show project creation modal
    // Only show if projects have finished loading (not still loading)
    if (isAuthenticated && user && !isProjectsLoading && projects.length === 0 && !showProjectModal && !currentProjectId) {
      // Show modal immediately (no delay needed when project was deleted)
      console.log('🆕 [PAGE] No projects available - showing project creation modal')
      setProjectModalRequired(true)
      setShowProjectModal(true)
    }
  }, [isAuthenticated, user, projects, currentProjectId, currentSessionId, showProjectModal, isProjectsLoading])

  // Show login modal for anonymous users at session start
  useEffect(() => {
    // Only show modal for anonymous users (not authenticated)
    if (!isAuthenticated && !user) {
      // Check if user has seen the modal before (localStorage)
      const hasSeenModal = localStorage.getItem('stories_we_tell_seen_login_modal')
      // Temporarily comment out for testing - uncomment for production
      if (!hasSeenModal) {
      // if (true) { // Always show for testing
        // Show modal after a short delay to let the page load
        const timer = setTimeout(() => {
          setLoginModalTrigger('session-start')
          setShowLoginModal(true)
        }, 2000) // 2 second delay
        
        return () => clearTimeout(timer)
      }
    }
  }, [isAuthenticated, user])

  // Show sidebar hint for new users on mobile
  useEffect(() => {
    const hasSeenSidebarHint = localStorage.getItem('stories_we_tell_seen_sidebar_hint')
    const isMobile = window.innerWidth < 640
    
    if (!hasSeenSidebarHint && isMobile && isSidebarCollapsed) {
      // Show hint after a delay to let the page load
      const timer = setTimeout(() => {
        setShowSidebarHint(true)
      }, 3000) // 3 second delay
      
      return () => clearTimeout(timer)
    }
  }, [isSidebarCollapsed])

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
    
    // Close sidebar on mobile after selecting a session
    // This provides immediate feedback that the selection worked
    setIsSidebarCollapsed(true)
  }

  const handleSidebarClose = () => {
    setIsSidebarCollapsed(true)
  }

  // Modal handlers
  const handleCloseModal = () => {
    setShowLoginModal(false)
    // Mark that user has seen the modal
    localStorage.setItem('stories_we_tell_seen_login_modal', 'true')
  }

  const handleSignup = () => {
    setShowLoginModal(false)
    router.push('/auth/signup')
  }

  const handleLogin = () => {
    setShowLoginModal(false)
    router.push('/auth/login')
  }

  const handleNewStoryClick = async () => {
    if (!isAuthenticated) {
      setLoginModalTrigger('new-story')
      setShowLoginModal(true)
    } else {
      // For authenticated users, check if they have projects
      if (projects.length === 0) {
        // No projects - require creating one
        console.log('🆕 [PAGE] No projects found, requiring project creation')
        setProjectModalRequired(true)
        setShowProjectModal(true)
        return
      }

      // User has projects - clear session but keep most recent project selected
      // Auto-select the most recent project for convenience
      const mostRecentProject = projects[0] // Projects are ordered by updated_at DESC
      
      try {
        localStorage.removeItem('stories_we_tell_session')
        console.log('🆕 [PAGE] Cleared localStorage for new story')
      } catch (error) {
        console.error('Failed to clear localStorage:', error)
      }
      
      setCurrentSessionId('')
      setCurrentProjectId(mostRecentProject.project_id) // Auto-select most recent project
      
      console.log('🆕 [PAGE] Auto-selected project:', mostRecentProject.name, mostRecentProject.project_id)
      
      // Close sidebar on mobile after creating new story
      setIsSidebarCollapsed(true)
    }
  }

  // Handle project creation success
  const handleProjectCreated = (projectId: string, projectName: string) => {
    console.log('✅ [PAGE] Project created:', projectName, projectId)
    setShowProjectModal(false)
    setProjectModalRequired(false)
    
    // Invalidate and refetch projects query to refresh the sidebar
    queryClient.invalidateQueries({ queryKey: ['projects'] })
    queryClient.refetchQueries({ queryKey: ['projects'] })
    // Also refresh the sidebar-specific cache
    queryClient.invalidateQueries({ queryKey: ['projectsSidebar'] })
    queryClient.refetchQueries({ queryKey: ['projectsSidebar'] })
    
    // Set the new project as current and clear session for fresh start
    setCurrentProjectId(projectId)
    setCurrentSessionId('')
    
    try {
      localStorage.removeItem('stories_we_tell_session')
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
    
    // Close sidebar on mobile
    setIsSidebarCollapsed(true)
  }

  return (
    <DossierProvider>
      {/* Global loader overlay */}
      {(authLoading || (isAuthenticated && isProjectsLoading)) && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-white/70 dark:bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Loading...</span>
          </div>
        </div>
      )}
      <div className={`h-screen w-screen overflow-hidden ${colors.background} flex flex-col`}>
        {/* Topbar - Full width across entire screen */}
        <div className="shrink-0">
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
                  currentProjectId={currentProjectId}
                  onClose={handleSidebarClose}
                  onNewStory={handleNewStoryClick}
                  onNewProject={() => {
                    // Project created callback - can trigger new chat in the new project
                    console.log('✅ New project created, ready for new chat')
                  }}
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

          {/* Chat Area - Only show for anonymous users or authenticated users with a project */}
          {!isAuthenticated || (isAuthenticated && (currentProjectId || isProjectsLoading)) ? (
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
          ) : (
            <div className={`flex-1 min-h-0 p-4 ${isSidebarCollapsed ? 'block' : 'hidden sm:block'}`}>
              <div className={`w-full h-full ${colors.cardBackground} ${colors.cardBorder} border rounded-2xl shadow-lg overflow-hidden flex flex-col`}>
                {/* Intentionally empty: global loader handles this state */}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Login Prompt Modal */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={handleCloseModal}
        onSignup={handleSignup}
        onLogin={handleLogin}
        trigger={loginModalTrigger}
      />

      {/* Project Creation Modal - Required for authenticated users with no projects */}
      {isAuthenticated && !isProjectsLoading && projects.length === 0 ? (
        <ProjectCreationModal
          isOpen={true}
          onClose={() => {
            // Cannot close if required (no projects exist)
            if (!projectModalRequired) {
              setShowProjectModal(false)
            }
          }}
          onProjectCreated={handleProjectCreated}
          isRequired={true}
        />
      ) : (
        <ProjectCreationModal
          isOpen={showProjectModal}
          onClose={() => {
            if (!projectModalRequired) {
              setShowProjectModal(false)
            }
          }}
          onProjectCreated={handleProjectCreated}
          isRequired={projectModalRequired}
        />
      )}

      {/* Sidebar Hint for Mobile Users */}
      {showSidebarHint && (
        <div className="fixed inset-0 z-60 pointer-events-none">
          {/* Background overlay */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          {/* Hint bubble pointing to sidebar toggle */}
          <div className="absolute left-16 top-1/2 transform -translate-y-1/2 pointer-events-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                    Discover More!
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3">
                    Tap the colorful button to access your story dossier and previous chats.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowSidebarHint(false)
                        localStorage.setItem('stories_we_tell_seen_sidebar_hint', 'true')
                      }}
                      className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                    >
                      Got it!
                    </button>
                    <button
                      onClick={() => {
                        setShowSidebarHint(false)
                        setIsSidebarCollapsed(false)
                        localStorage.setItem('stories_we_tell_seen_sidebar_hint', 'true')
                      }}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                    >
                      Show me
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Arrow pointing to sidebar toggle */}
            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
              <div className="w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent border-r-white dark:border-r-gray-800"></div>
            </div>
          </div>
        </div>
      )}
    </DossierProvider>
  )
}

