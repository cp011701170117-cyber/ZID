import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { apiRequest } from '../utils/api'

export default function Verification() {
  const { session, isAuthenticated } = useWallet()
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
            <button onClick={() => navigate('/credentials')} className="zid-nav-link">Credentials</button>
            <button onClick={() => navigate('/verification')} className="zid-nav-link active">Verification</button>
          </div>
        </div>
      </nav>
      <div className="page-container verification-container">
        <header className="verification-header">
          <h1 className="page-title">Verification Requests</h1>
          <p className="page-description">Pending requests from verifiers to access your credentials</p>
        </header>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div className="loading-spinner" />
          </div>
        ) : verificationRequests.length === 0 ? (
          <div className="section-card">
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-text">No pending verification requests</div>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>When verifiers request access to your credentials, they will appear here</p>
            </div>
          </div>
        ) : (
          <section className="verify-list">
            {verificationRequests.map((request) => (
              <article key={request.id} className="section-card verify-card">
                <div className="verify-card-header">
                  <div className="verify-card-title">{request.verifier}</div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Requested: {new Date(request.requestedAt).toLocaleString()}
                  </p>
                </div>
                <div className="verify-card-actions">
                  <button
                    onClick={() => handleApprove(request.id)}
                    className="gradient-button"
                    style={{ padding: '10px 20px', fontSize: '13px' }}
                  >
                    <span>Approve</span>
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    className="danger-button"
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
