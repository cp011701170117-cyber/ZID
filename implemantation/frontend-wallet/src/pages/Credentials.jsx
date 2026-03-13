import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { apiRequest } from '../utils/api'

export default function Credentials() {
  const { session, isAuthenticated } = useWallet()
  const navigate = useNavigate()
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (!isAuthenticated || !session?.did) {
      navigate('/login')
      return
    }
    loadCredentials()
  }, [isAuthenticated, session, navigate])

  const loadCredentials = async () => {
    setApiError('')
    try {
      const data = await apiRequest(`/credentials/wallet/${encodeURIComponent(session.did)}`, {
        token: session.token
      })
      setCredentials(data.credentials || [])
    } catch (error) {
      console.error('Failed to load credentials:', error)
      setApiError(error.message)
    } finally {
      setLoading(false)
    }
  }


  if (!session) return null

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <nav className="zid-navbar">
        <div className="zid-navbar-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="zid-logo">
              <div className="zid-logo-mark">ZID</div>
              <span className="zid-logo-text">ZID</span>
            </div>
            <span className="zid-portal-badge">Wallet Portal</span>
          </div>
          <div className="zid-nav-links">
            <button onClick={() => navigate('/dashboard')} className="zid-nav-link">Dashboard</button>
            <button onClick={() => navigate('/credentials')} className="zid-nav-link active">Credentials</button>
            <button onClick={() => navigate('/verification')} className="zid-nav-link">Verification</button>
          </div>
        </div>
      </nav>
      <div className="page-container credentials-container">
        <header className="credentials-header">
          <h1 className="page-title">My Credentials</h1>
          <p className="page-description">Your verified on-chain identity credentials</p>
        </header>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="loading-spinner" />
            <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontFamily: "'Poppins',sans-serif", fontSize: '14px' }}>Loading credentials...</p>
          </div>
        ) : apiError ? (
          <div className="result-error">{apiError}</div>
        ) : credentials.length === 0 ? (
          <div className="section-card">
            <div className="empty-state">
              <div className="empty-state-icon">🪪</div>
              <div className="empty-state-text">No credentials found</div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Credentials issued to your DID will appear here</p>
            </div>
          </div>
        ) : (
          <section className="credentials-grid">
            {credentials.map((cred) => {
              const key = cred.vcId || cred.id
              let isExpired = false
              if (cred.expirationDate) {
                const exp = new Date(cred.expirationDate)
                if (!isNaN(exp.getTime()) && exp < new Date()) isExpired = true
              }
              const statusText = cred.revoked ? 'Revoked' : isExpired ? 'Expired' : 'Active'
              const badgeClass = cred.revoked ? 'badge badge-revoked' : isExpired ? 'badge badge-expired' : 'badge badge-active'
              return (
                <article key={key} className="holo-card">
                  <div className="holo-corner" />
                  <div className="holo-corner-bl" />
                  <div className="holo-card-id word-break">{key || 'Credential ID unavailable'}</div>
                  <div className="holo-card-type">{cred.type || 'Verifiable Credential'}</div>
                  <div className="holo-card-meta">
                    <div className="holo-card-meta-row"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> Issuer: {(cred.issuerDid || cred.issuer || '').substring(0, 20)}...</div>
                    <div className="holo-card-meta-row"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> Issued: {new Date(cred.timestamp || cred.issuanceDate).toLocaleDateString()}</div>
                    {cred.expirationDate && (
                      <div className="holo-card-meta-row"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Expires: {new Date(cred.expirationDate).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div style={{ marginTop: '20px' }}>
                    <span className={badgeClass}>{statusText}</span>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}
