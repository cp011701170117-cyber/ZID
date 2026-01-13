import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import axios from 'axios'

export default function Dashboard() {
  const { wallet, isAuthenticated, logout } = useWallet()
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadCredentials()
  }, [isAuthenticated, navigate])

  const loadCredentials = async () => {
    try {
      const response = await axios.get(`/api/credentials/wallet/${wallet.did}`)
      setCredentials(response.data.credentials || [])
    } catch (error) {
      console.error('Failed to load credentials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!wallet) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-800">Identity Wallet</h1>
              <Link to="/dashboard" className="text-indigo-600 font-medium">Dashboard</Link>
              <Link to="/credentials" className="text-gray-600 hover:text-gray-900">Credentials</Link>
              <Link to="/verification" className="text-gray-600 hover:text-gray-900">Verification</Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{wallet.username}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Decentralized Identity</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">DID</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                {wallet.did}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Public Key</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg font-mono text-xs break-all">
                {wallet.publicKey}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Created</label>
              <div className="mt-1 text-gray-700">
                {new Date(wallet.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Credentials</h2>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading credentials...</div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No credentials issued yet.</p>
              <p className="text-sm mt-2">Ask an issuer to issue you a credential.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {credentials.map((cred, idx) => (
                <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{cred.type || 'Credential'}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Issued by: {cred.issuer}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(cred.issuanceDate).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      cred.revoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {cred.revoked ? 'Revoked' : 'Active'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
