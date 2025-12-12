"use client"

import { useAuth } from '@/lib/auth-context'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function GlobalLoader() {
  const { isLoading: authLoading } = useAuth()
  
  // Only track CRITICAL queries (not background refetches)
  const criticalFetching = useIsFetching({
    predicate: (query) => {
      // Only show loader for queries marked as critical or initial loads
      const key = query.queryKey
      const isInitialLoad = !query.state.dataUpdatedAt && query.state.fetchStatus === 'fetching'
      return (
        Array.isArray(key) && (
          key.includes('critical') ||
          key.includes('initial') ||
          // Session/project creation (only on initial load, not background refetches)
          (key.includes('session') && isInitialLoad) ||
          (key.includes('project') && isInitialLoad)
        )
      )
    }
  })
  
  // Only track CRITICAL mutations
  const criticalMutating = useIsMutating({
    predicate: (mutation) => {
      // Only show loader for critical mutations
      const key = mutation.options.mutationKey
      return (
        Array.isArray(key) && (
          key.includes('critical') ||
          key.includes('create') ||
          key.includes('delete')
        )
      )
    }
  })

  // Route-change aware loading
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastLocationRef = useRef<string | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  useEffect(() => {
    const current = `${pathname}?${searchParams?.toString() || ''}`
    if (lastLocationRef.current && lastLocationRef.current !== current) {
      // Start a brief route-loading overlay
      setRouteLoading(true)
      const timeout = setTimeout(() => setRouteLoading(false), 500) // Reduced from 800ms
      return () => clearTimeout(timeout)
    }
    lastLocationRef.current = current
  }, [pathname, searchParams])

  // Only show loader for critical operations
  const show = authLoading || criticalFetching > 0 || criticalMutating > 0 || routeLoading
  if (!show) return null

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-white/80 dark:bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 100%)' }}
        >
          <span className="text-2xl text-white font-bold">SW</span>
        </div>
        <p className="text-gray-600 dark:text-gray-300">Loading...</p>
      </div>
    </div>
  )
}
