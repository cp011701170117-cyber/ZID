import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'

export default function Login() {
  const { loginWithWallet, registerDID } = useWallet()
  const [username, setUsername] = useState('')
  const [needsUsername, setNeedsUsername] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleWalletLogin = async () => {
    try {
      const session = await loginWithWallet()

      if (!session.did) {
        setNeedsUsername(true)
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRegister = async () => {
    try {
      await registerDID(username)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">

        <h1 className="text-2xl font-bold text-center mb-6">
          Decentralized Identity Wallet
        </h1>

        {!needsUsername ? (
          <button
            onClick={handleWalletLogin}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold"
          >
            🔐 Connect Wallet
          </button>
        ) : (
          <>
            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border px-4 py-2 rounded mb-4"
            />
            <button
              onClick={handleRegister}
              className="w-full bg-green-600 text-white py-3 rounded-lg"
            >
              Create DID
            </button>
          </>
        )}

        {error && (
          <p className="mt-4 text-red-600 text-sm">{error}</p>
        )}
      </div>
    </div>
  )
}
