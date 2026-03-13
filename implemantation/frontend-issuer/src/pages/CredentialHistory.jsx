import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'
import { useIssuer } from '../context/IssuerContext'

export default function CredentialHistory() {
  const { session, isAuthenticated, credentials, loadCredentials } = useIssuer()
  const [loading, setLoading] = useState(true)
  const [revokingId, setRevokingId] = useState(null)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true)
      loadCredentials().finally(() => setLoading(false))
    }
  }, [isAuthenticated, session, loadCredentials])

  const handleRevoke = async (credentialId) => {
    if (!confirm('Are you sure you want to revoke this credential?')) {
      return
    }

    setRevokingId(credentialId)
    try {
      await apiRequest('/credentials/revoke', {
        method: 'POST',
        body: { vcId: credentialId },
        token: session?.token || null
      })
      alert('Credential revoked successfully')
      await loadCredentials()
    } catch (error) {
      alert('Failed to revoke credential: ' + (error.response?.data?.error || error.message))
    } finally {
      setRevokingId(null)
    }
  }

  if (!isAuthenticated) return <p className="text-center p-8">Please login to view history.</p>

  return (
    <div className="page-container">
      <h1 className="page-title">Issuance History</h1>
      <p className="page-description">All verifiable credentials issued from this portal</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontFamily: "'Poppins', sans-serif", fontSize: '14px' }}>Loading credentials...</p>
        </div>
      ) : apiError ? (
        <div className="result-error">{apiError}</div>
      ) : credentials.length === 0 ? (
        <div className="section-card">
          <div className="empty-state">
            <div className="empty-state-icon">🪪</div>
            <div className="empty-state-text">No credentials issued yet</div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '8px' }}>Issued credentials will appear here</p>
          </div>
        </div>
      ) : (
        <div className="section-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="zid-table">
              <thead>
                <tr>
                  <th>Credential ID</th>
                  <th>Recipient</th>
                  <th>Type</th>
                  <th>Issued</th>
                  <th>Status</th>
                  <th>Expiration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => {
                  const credKey = cred.id || cred.vcId;
                  const now = new Date();
                  const isExpired = cred.expirationDate && new Date(cred.expirationDate) < now;
                  let badgeClass = 'badge badge-active';
                  let badgeLabel = 'Active';
                  if (cred.revoked) { badgeClass = 'badge badge-revoked'; badgeLabel = 'Revoked'; }
                  else if (isExpired) { badgeClass = 'badge badge-expired'; badgeLabel = 'Expired'; }
                  return (
                    <tr key={credKey}>
                      <td><span className="font-mono-sm word-break">{credKey || 'Credential ID unavailable'}</span></td>
                      <td style={{ fontSize: '13px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cred.recipientDID || cred.subjectDid}</td>
                      <td style={{ fontSize: '13px' }}>{cred.type || 'Credential'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(cred.issuanceDate || cred.timestamp).toLocaleDateString()}</td>
                      <td><span className={badgeClass}>{badgeLabel}</span></td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{cred.expirationDate ? new Date(cred.expirationDate).toLocaleDateString() : '—'}</td>
                      <td>
                        {!cred.revoked && (
                          <button
                            onClick={() => handleRevoke(cred.id || cred.vcId)}
                            disabled={revokingId === (cred.id || cred.vcId)}
                            className="danger-button"
                            style={{ padding: '6px 14px', fontSize: '12px' }}
                          >
                            {revokingId === (cred.id || cred.vcId) ? 'Revoking…' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
