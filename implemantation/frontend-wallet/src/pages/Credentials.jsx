import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import axios from 'axios'

export default function Credentials() {
  const { wallet, isAuthenticated } = useWallet()
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

  const handleSelectiveDisclosure = async (credentialId, attributes) => {
    // Implement selective disclosure logic
    alert(`Selective disclosure for ${credentialId}: ${attributes.join(', ')}`)
  }

  if (!wallet) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Credentials</h1>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : credentials.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No credentials found.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {credentials.map((cred, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-gray-800">
                    {cred.type || 'Credential'}
                  </h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    cred.revoked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {cred.revoked ? 'Revoked' : 'Active'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">Issuer:</span>
                    <span className="ml-2 text-gray-800">{cred.issuer}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Issued:</span>
                    <span className="ml-2 text-gray-800">
                      {new Date(cred.issuanceDate).toLocaleDateString()}
                    </span>
                  </div>
                  {cred.expirationDate && (
                    <div>
                      <span className="text-gray-500">Expires:</span>
                      <span className="ml-2 text-gray-800">
                        {new Date(cred.expirationDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => handleSelectiveDisclosure(cred.id, ['name', 'age'])}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                  >
                    Selective Disclosure
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
