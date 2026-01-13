import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import axios from 'axios'

export default function Verification() {
  const { wallet, isAuthenticated } = useWallet()
  const navigate = useNavigate()
  const [verificationRequests, setVerificationRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    // In a real app, this would fetch pending verification requests
    setLoading(false)
  }, [isAuthenticated, navigate])

  const handleApprove = async (requestId) => {
    try {
      // Implement approval logic
      alert(`Approved verification request ${requestId}`)
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = async (requestId) => {
    try {
      // Implement rejection logic
      alert(`Rejected verification request ${requestId}`)
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  if (!wallet) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Verification Requests</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : verificationRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No pending verification requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {verificationRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">
                      {request.verifier}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Requested: {new Date(request.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApprove(request.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
