import { useEffect, useState } from 'react'
import { useIssuer } from '../context/IssuerContext'
import { resetAuthState } from '../utils/authReset.js'

export default function Login() {
  const { loginWithWallet, loading } = useIssuer()
  const [error, setError] = useState('')

  useEffect(() => {
    resetAuthState()
  }, [])

  const handleLogin = async () => {
    try {
      sessionStorage.clear()
      setError('')
      await loginWithWallet()
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h1 className="login-title">Issuer Portal</h1>
        <p className="login-subtitle">
          Connect your wallet and authenticate as a trusted credential issuer to access the dashboard.
        </p>
        <button onClick={handleLogin} disabled={loading} className="gradient-button" style={{ width: '100%' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            {loading ? (
              <>
                <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                Connecting...
              </>
            ) : (
              <>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Connect Wallet
              </>
            )}
          </span>
        </button>
        {error && <div className="error-alert">{error}</div>}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Decentralized Identity Verification System
        </p>
      </div>
    </div>
  )
}
