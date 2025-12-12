'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

interface DossierContextType {
  refreshTrigger: number
  triggerRefresh: () => void
  refreshDossier: (projectId: string) => void
}

const DossierContext = createContext<DossierContextType | undefined>(undefined)

export function DossierProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const queryClient = useQueryClient()

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1)
  }, [])

  const refreshDossier = useCallback((projectId: string) => {
    // Invalidate and refetch dossier queries
    queryClient.invalidateQueries({ 
      queryKey: ['dossier', projectId],
      exact: false
    })
    queryClient.refetchQueries({ 
      queryKey: ['dossier', projectId],
      exact: false
    })
    triggerRefresh()
  }, [queryClient, triggerRefresh])

  // Listen for dossier_updated events
  useEffect(() => {
    const handleDossierUpdated = (event: CustomEvent) => {
      const { project_id } = event.detail || {}
      if (project_id) {
        console.log('🔄 [DOSSIER] Dossier updated event received for project:', project_id)
        refreshDossier(project_id)
      }
    }
    
    window.addEventListener('dossierUpdated', handleDossierUpdated as EventListener)
    return () => {
      window.removeEventListener('dossierUpdated', handleDossierUpdated as EventListener)
    }
  }, [refreshDossier])

  return (
    <DossierContext.Provider value={{ refreshTrigger, triggerRefresh, refreshDossier }}>
      {children}
    </DossierContext.Provider>
  )
}

export function useDossierRefresh() {
  const context = useContext(DossierContext)
  if (context === undefined) {
    throw new Error('useDossierRefresh must be used within a DossierProvider')
  }
  return context
}
