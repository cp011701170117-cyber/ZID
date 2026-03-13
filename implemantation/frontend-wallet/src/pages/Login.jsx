import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { resetAuthState } from '../utils/authReset.js'

export default function Login() {
  const { loginWithWallet, registerDID } = useWallet()
  const [username, setUsername] = useState('')
  const [needsUsername, setNeedsUsername] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    resetAuthState()
  }, [])

  const handleWalletLogin = async () => {
    try {
      sessionStorage.clear()
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
  <div className="login-page">
    <div className="ambient-blob ambient-blob-1" />
    <div className="ambient-blob ambient-blob-2" />
    <div className="login-card">
      <div className="login-icon">
        <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <h1 className="login-title">Identity Wallet</h1>
      <p className="login-subtitle">
        Self-Sovereign · Cryptographically Secured · On-Chain Identity
      </p>

      {!needsUsername ? (
        <button onClick={handleWalletLogin} className="neon-button full-width">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect Wallet
          </span>
        </button>
      ) : (
        <div className="register-section">
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="cyber-input"
          />
          <button onClick={handleRegister} className="neon-button full-width">
            Create DID
          </button>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Decentralized Identity Verification System
      </p>
    </div>
  </div>
)
}
