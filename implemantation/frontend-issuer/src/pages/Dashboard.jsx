import { useEffect, useState } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalIssued: 0,
    activeCredentials: 0,
    revokedCredentials: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      // In a real app, this would fetch issuer-specific stats
      // For now, we'll use mock data
      setStats({
        totalIssued: 0,
        activeCredentials: 0,
        revokedCredentials: 0
      })
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Issuer Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Issued</h3>
          <p className="text-3xl font-bold text-gray-800">{stats.totalIssued}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Active</h3>
          <p className="text-3xl font-bold text-green-600">{stats.activeCredentials}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Revoked</h3>
          <p className="text-3xl font-bold text-red-600">{stats.revokedCredentials}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="space-y-4">
          <p className="text-gray-600">
            Use the navigation menu to issue new credentials, view issuance history, and manage credential lifecycle.
          </p>
        </div>
      </div>
    </div>
  )
}
