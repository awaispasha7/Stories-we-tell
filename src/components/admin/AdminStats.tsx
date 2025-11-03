'use client'

import { useQuery } from '@tanstack/react-query'
import { useTheme, getThemeColors } from '@/lib/theme-context'
import { adminApi } from '@/lib/admin-api'

export default function AdminStats() {
  const { resolvedTheme } = useTheme()
  const colors = getThemeColors(resolvedTheme)

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminApi.getStats,
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  if (isLoading) {
    return (
      <div className={`p-6 rounded-lg border ${colors.border} ${colors.background}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-6 rounded-lg border ${colors.border} ${colors.background}`}>
      <h3 className={`font-semibold mb-4 ${colors.text}`}>Queue Statistics</h3>
      
      <div className="space-y-4">
        {/* Total Requests */}
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">
            {stats?.total_requests || 0}
          </div>
          <div className="text-sm text-blue-700">Total Requests</div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-2">
          <h4 className={`text-sm font-medium ${colors.text}`}>By Status</h4>
          
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between items-center p-2 bg-yellow-50 rounded border border-yellow-200">
              <span className="text-yellow-700">Pending</span>
              <span className="font-medium text-yellow-800">
                {stats?.pending_count || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-200">
              <span className="text-blue-700">In Review</span>
              <span className="font-medium text-blue-800">
                {stats?.in_review_count || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-green-50 rounded border border-green-200">
              <span className="text-green-700">Approved</span>
              <span className="font-medium text-green-800">
                {stats?.approved_count || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-200">
              <span className="text-red-700">Rejected</span>
              <span className="font-medium text-red-800">
                {stats?.rejected_count || 0}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-2 bg-purple-50 rounded border border-purple-200">
              <span className="text-purple-700">Sent to Client</span>
              <span className="font-medium text-purple-800">
                {stats?.sent_count || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        {stats && (
          <div className="pt-4 border-t space-y-2 text-xs">
            <div className={`flex justify-between ${colors.textSecondary}`}>
              <span>Avg. Review Time:</span>
              <span>{stats.avg_review_time || 'N/A'}</span>
            </div>
            <div className={`flex justify-between ${colors.textSecondary}`}>
              <span>Today's Requests:</span>
              <span>{stats.today_requests || 0}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
