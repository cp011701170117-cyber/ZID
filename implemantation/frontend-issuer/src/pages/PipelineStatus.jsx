import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'
import { useIssuer } from '../context/IssuerContext'

function formatAuthority(authorityName) {
  if (authorityName === 'ISSUER_TRUST') return 'Issuer Trust Authority'
  if (authorityName === 'CREDENTIAL_INTEGRITY') return 'Credential Integrity Authority'
  if (authorityName === 'INSTITUTIONAL_POLICY') return 'Institutional Policy Authority'
  return authorityName
}

export default function PipelineStatus() {
  const { isAuthenticated } = useIssuer()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const loadRows = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await apiRequest('/issuer/credentials/pending-approvals')
      setRows(data.credentials || [])
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load pipeline status')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return
    loadRows()
  }, [isAuthenticated])

  const openDetails = async (requestId) => {
    setDetailsLoading(true)
    setError('')
    try {
      const data = await apiRequest(`/issuer/credentials/${encodeURIComponent(requestId)}/pipeline-status`)
      setSelected(data)
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to load pipeline details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const retryAutomation = async (requestId) => {
    try {
      await apiRequest(`/issuer/credentials/${encodeURIComponent(requestId)}/retry-automation`, { method: 'POST' })
      await loadRows()
      if (selected?.requestId === requestId) {
        await openDetails(requestId)
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Retry failed')
    }
  }

  const finalizeIssuance = async (requestId) => {
    try {
      await apiRequest(`/issuer/credentials/${encodeURIComponent(requestId)}/finalize-issuance`, { method: 'POST' })
      await loadRows()
      if (selected?.requestId === requestId) {
        await openDetails(requestId)
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Finalize issuance failed')
    }
  }

  if (!isAuthenticated) return <p className="text-center p-8">Please login to view pipeline status.</p>

  return (
    <div className="page-container">
      <h1 className="page-title">Credential Pipeline Status</h1>
      <p className="page-description">Review automated multi-authority decisions and issuance outcomes.</p>

      {error && <div className="result-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div className="section-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="zid-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Credential ID</th>
                <th>Holder DID</th>
                <th>Type</th>
                <th>Threshold</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>Loading pipeline records...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>No pending or reviewable credential pipelines.</td>
                </tr>
              ) : rows.map((row) => (
                <tr key={row.requestId}>
                  <td><span className="font-mono-sm word-break">{row.requestId}</span></td>
                  <td><span className="font-mono-sm word-break">{row.vcId || 'Not issued yet'}</span></td>
                  <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.subjectDid}</td>
                  <td>{row.credentialType}</td>
                  <td>{row.approvalCount}/{row.totalAuthorities} Approved</td>
                  <td>{row.issuanceStatus}</td>
                  <td>
                    <button
                      className="gradient-button"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => openDetails(row.requestId)}
                      disabled={detailsLoading}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="section-card">
          <div className="section-title">Pipeline Details</div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Request: <span className="font-mono-sm">{selected.requestId}</span>
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div><strong>Credential ID:</strong> {selected.credential?.vcId || 'Not issued yet'}</div>
            <div><strong>Holder DID:</strong> {selected.credential?.subjectDid}</div>
            <div><strong>Status:</strong> {selected.issuanceStatus}</div>
            <div><strong>Credential Type:</strong> {selected.credential?.credentialType}</div>
            <div><strong>Threshold:</strong> {selected.approvalCount}/{selected.totalAuthorities} Approved</div>
            <div><strong>Issued At:</strong> {selected.issuedAt ? new Date(selected.issuedAt).toLocaleString() : 'Not issued'}</div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            {(selected.authorityDecisions || []).slice(-3).map((decision, idx) => {
              const approved = decision.decision === 'APPROVED'
              return (
                <div key={`${decision.authorityName}-${idx}`} style={{ marginBottom: '8px' }}>
                  {approved ? '[✓]' : '[✗]'} {formatAuthority(decision.authorityName)} - {decision.decision} ({decision.reason})
                </div>
              )
            })}
          </div>

          {selected.lastAutomationError && (
            <div className="result-error" style={{ marginBottom: '12px' }}>
              Final issuance failed after threshold approval: {selected.lastAutomationError}
            </div>
          )}

          <div className="action-row">
            <button className="danger-button" onClick={() => setSelected(null)}>Close Details</button>
            <button className="gradient-button" onClick={() => retryAutomation(selected.requestId)}>Retry Automation</button>
            {selected.isThresholdApproved && selected.issuanceStatus !== 'ISSUED' && (
              <button className="gradient-button" onClick={() => finalizeIssuance(selected.requestId)}>Retry Final Issuance</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
