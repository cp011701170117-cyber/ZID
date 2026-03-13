import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { apiRequest } from '../utils/api'
import { startSessionWatcher, validateSession } from '../utils/sessionManager'

export default function Dashboard() {
  const { session, isAuthenticated, logout } = useWallet()
  const navigate = useNavigate()

  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState(null)

  useEffect(() => {
    validateSession()

    const watcherId = startSessionWatcher()
    const onStorage = (event) => {
      if (event.key === 'userSession' && !event.newValue) {
        window.location.href = '/login'
      }
    }

    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(watcherId)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !session?.did) {
      navigate('/login')
      return
    }

    loadCredentials()
  }, [isAuthenticated, session])

  const loadCredentials = async () => {
    try {
      const data = await apiRequest(`/credentials/wallet/${encodeURIComponent(session.did)}`, {
        token: session.token
      })
      setCredentials(data.credentials || [])
    } catch (error) {
      console.error('Credentials API not available', error)
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
    <div style={{ minHeight: '100vh' }}>
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />

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
            <button onClick={() => navigate('/dashboard')} className="zid-nav-link active">Dashboard</button>
            <button onClick={() => navigate('/credentials')} className="zid-nav-link">Credentials</button>
            <button onClick={() => navigate('/verification')} className="zid-nav-link">Verification</button>
            <button onClick={handleLogout} className="danger-button" style={{ marginLeft: '8px' }}>Disconnect</button>
          </div>
        </div>
      </nav>
  
      <div className="page-container dashboard-container">
        <header className="dashboard-header">
          <h1
            className="glitch-title"
            data-text="Digital Identity"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 700, letterSpacing: '-0.04em', color: '#0F172A', marginBottom: '8px' }}
          >
            Digital Identity
          </h1>
          <p style={{ color: '#475569', fontSize: '15px' }}>
            Self-sovereign · Cryptographically secured · User controlled
          </p>
        </header>

        {session && (
          <section className="wallet-cards">
            {session.address && (
              <div className="section-card wallet-meta-card">
                <div className="stat-label" style={{ marginBottom: '12px' }}>Wallet Address</div>
                <div className="did-display" style={{ fontSize: '12px', letterSpacing: '0.02em' }}>
                  {session.address}
                </div>
              </div>
            )}
            {session.did && (
              <div className="section-card wallet-meta-card">
                <div className="stat-label" style={{ marginBottom: '12px' }}>Decentralized Identifier</div>
                <div className="did-display">{session.did}</div>
              </div>
            )}
            <div className="section-card wallet-meta-card">
              <div className="stat-label">Credentials Linked</div>
              <div className="stat-value purple">{credentials.length}</div>
              <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Anchored to your identity wallet
              </p>
            </div>
          </section>
        )}

        <section className="credentials-grid">
          {credentials.slice(0, 3).map((cred) => {
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
                  <div className="holo-card-meta-row">Issuer: {(cred.issuerDid || cred.issuer || '').substring(0, 28)}...</div>
                  <div className="holo-card-meta-row">Issued: {new Date(cred.timestamp || cred.issuanceDate).toLocaleDateString()}</div>
                </div>
                <div style={{ marginTop: '18px' }}>
                  <span className={badgeClass}>{statusText}</span>
                </div>
              </article>
            )
          })}
        </section>

        <section>
          <button
            className="danger-button"
            onClick={async () => {
              if (!window.confirm('Reset blockchain only?')) return;
              try {
                await apiRequest('/admin/reset-chain', { method: 'POST', token: session.token });
                alert('Blockchain reset request sent');
              } catch (err) {
                console.error(err);
                alert('Reset failed: ' + err.message);
              }
            }}
          >
            Reset Blockchain (Authority)
          </button>
        </section>
      </div>
    </div>
  )
}
