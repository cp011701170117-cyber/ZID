import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import axios from 'axios'

export default function Dashboard() {
  const { session, isAuthenticated, logout } = useWallet()
  const navigate = useNavigate()

  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || !session?.did) {
      navigate('/login')
      return
    }

    loadCredentials()
  }, [isAuthenticated, session])

  const loadCredentials = async () => {
    try {
      const response = await axios.get(
      `/api/credentials/wallet/${encodeURIComponent(session.did)}`
      );

      setCredentials(response.data.credentials || [])
    } catch (error) {
      console.error('Credentials API not available')
    } finally {
      setLoading(false)
    }
  }


  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <h1 className="font-bold text-lg">Identity Wallet</h1>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.username}</span>
            <span className="text-sm text-gray-500">
              {session.address.slice(0, 6)}...{session.address.slice(-4)}
            </span>
            <button onClick={handleLogout} className="text-sm text-red-500">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="bg-white p-6 rounded shadow">
          <h2 className="font-semibold mb-2">Decentralized ID</h2>
          <div className="font-mono text-sm bg-gray-100 p-3 rounded break-all">
            {session.did}
          </div>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h2 className="font-semibold mb-4">Credentials</h2>

          {loading && <p className="text-gray-500">Loading…</p>}

          {apiError && (
            <p className="text-sm text-orange-600">
              {apiError}
            </p>
          )}

          {!loading && credentials.length === 0 && !apiError && (
            <p className="text-gray-500 text-sm">
              No credentials issued yet
            </p>
          )}

          {credentials.map((cred, i) => (
            <div key={i} className="border p-3 rounded mb-2">
              <p className="font-medium">{cred.type}</p>
              <p className="text-xs text-gray-500">
                Issuer: {cred.issuer}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
