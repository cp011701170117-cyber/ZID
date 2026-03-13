import { useEffect, useState } from 'react'
import { useIssuer } from '../context/IssuerContext'
import { apiRequest } from '../utils/api'
import BlockchainVisualizer from '../components/BlockchainVisualizer'
import { startSessionWatcher, validateSession } from '../utils/sessionManager'

export default function Dashboard() {
  const { session, isAuthenticated, logout, credentials, loadCredentials } = useIssuer()
  const [stats, setStats] = useState({
    totalIssued: 0,
    activeCredentials: 0,
    revokedCredentials: 0,
    expiredCredentials: 0
  })
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    validateSession()

    const watcherId = startSessionWatcher()
    const onStorage = (event) => {
      if (event.key === 'userSession' && !event.newValue) {
        window.location.href = '/'
      }
    }

    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(watcherId)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // when auth state changes, load fresh credentials
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      loadCredentials()
    }
  }, [isAuthenticated, session, loadCredentials])

  // recalc stats whenever credentials list updates
  useEffect(() => {
    refreshStats()
  }, [credentials])

  const refreshStats = () => {
    const total = credentials.length
    const revoked = credentials.filter(c => c.revoked).length
    const now = new Date()
    const expired = credentials.filter(c => c.expirationDate && new Date(c.expirationDate) < now).length
    const active = total - revoked - expired
    setStats({ totalIssued: total, activeCredentials: active, revokedCredentials: revoked, expiredCredentials: expired })
    setLoading(false)
  }

  if (!isAuthenticated) return <p className="text-center p-8">Please login to view dashboard.</p>
  if (loading) return <p className="text-center p-8">Loading dashboard...</p>

  return (
    <div className="page-container">
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '36px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title glitch-title" data-text="Issuer Dashboard">Issuer Dashboard</h1>
          <p className="page-description" style={{ marginBottom: 0 }}>
            Manage and monitor all issued verifiable credentials
          </p>
        </div>
        <button onClick={logout} className="danger-button">
          Disconnect
        </button>
      </div>

      {apiError && <div className="result-error" style={{ marginBottom: '24px' }}>{apiError}</div>}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="stat-card purple">
          <div className="stat-label">Total Issued</div>
          <div className="stat-value purple">{stats.totalIssued}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Credentials on chain</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Active</div>
          <div className="stat-value green">{stats.activeCredentials}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Valid & not revoked</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Expired</div>
          <div className="stat-value orange">{stats.expiredCredentials}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Past expiry date</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Revoked</div>
          <div className="stat-value red">{stats.revokedCredentials}</div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>Manually invalidated</div>
        </div>
      </div>

      {/* Quick actions panel */}
      <div className="section-card">
        <div className="section-title">System Actions</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
          Use the navigation bar to issue new credentials, review issuance history, and manage credential lifecycle.
        </p>
        <div className="action-row">
          <button
            className="danger-button"
            onClick={async () => {
              if (!window.confirm('Reset blockchain to genesis?')) return;
              try {
                await apiRequest('/admin/reset-chain', { method: 'POST', token: session.token });
                alert('Blockchain has been reset (authority only)');
              } catch (err) {
                console.error(err);
                alert('Failed to reset chain: ' + err.message);
              }
            }}
          >
            Reset Blockchain (Authority)
          </button>
        </div>
      </div>

      {/* Blockchain Activity Visualizer */}
      <div style={{ marginTop: '40px' }}>
        <BlockchainVisualizer />
      </div>
    </div>
  )
}
