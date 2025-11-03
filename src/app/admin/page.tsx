'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import ValidationQueue from '@/components/admin/ValidationQueue'
import AdminStats from '@/components/admin/AdminStats'

export default function AdminPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  // Check if user is admin (you can modify this logic as needed)
  const checkAdminAccess = (userEmail: string) => {
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    return adminEmails.some(email => email.trim().toLowerCase() === userEmail.toLowerCase())
  }

  useEffect(() => {
    if (isLoading) return

    if (!user) {
      router.push('/auth/login?redirect=/admin')
      return
    }

    const hasAccess = checkAdminAccess(user.email || '')
    setIsAuthorized(hasAccess)

    if (!hasAccess) {
      router.push('/chat')
    }
  }, [user, isLoading, router])

  if (isLoading || isAuthorized === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.background}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.background}`}>
        <div className={`text-center p-8 rounded-lg border ${colors.border}`}>
          <h1 className={`text-2xl font-bold mb-4 ${colors.text}`}>Access Denied</h1>
          <p className={colors.textSecondary}>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${colors.background}`}>
      {/* Header */}
      <div className={`border-b ${colors.border} ${colors.sidebarBackground}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className={`text-3xl font-bold ${colors.text}`}>Admin Dashboard</h1>
              <p className={colors.textSecondary}>Story Validation Management</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`text-sm ${colors.textSecondary}`}>
                Welcome, {user?.display_name || user?.email}
              </span>
              <button
                onClick={() => router.push('/chat')}
                className={`px-4 py-2 text-sm rounded-md border ${colors.border} ${colors.textSecondary} hover:${colors.text} transition-colors`}
              >
                Back to Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <AdminStats />
          </div>

          {/* Validation Queue */}
          <div className="lg:col-span-3">
            <ValidationQueue />
          </div>
        </div>
      </div>
    </div>
  )
}
