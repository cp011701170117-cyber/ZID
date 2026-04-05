import { useEffect, useState } from 'react'
import { apiRequest } from '../utils/api'
import { useIssuer } from '../context/IssuerContext'
import BlockchainVisualizer from '../components/BlockchainVisualizer'

const AUTHORITY_STEPS = [
  {
    key: 'ISSUER_TRUST',
    title: 'Issuer Trust Authority',
    detail: 'checking issuer authorization...'
  },
  {
    key: 'CREDENTIAL_INTEGRITY',
    title: 'Credential Integrity Authority',
    detail: 'validating credential structure...'
  },
  {
    key: 'INSTITUTIONAL_POLICY',
    title: 'Institutional Policy Authority',
    detail: 'checking institutional issuance rules...'
  }
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toApprovedCount(threshold) {
  if (typeof threshold !== 'string') return 0
  const value = Number.parseInt(threshold.split('/')[0], 10)
  return Number.isNaN(value) ? 0 : value
}

function latestAuthorityDecisionMap(authorityDecisions = []) {
  const map = new Map()
  for (let i = authorityDecisions.length - 1; i >= 0; i -= 1) {
    const entry = authorityDecisions[i]
    if (entry?.authorityName && !map.has(entry.authorityName)) {
      map.set(entry.authorityName, entry)
    }
  }
  return map
}

function buildFinalStepStates(modalFinalState) {
  const approvedCount = toApprovedCount(modalFinalState?.threshold)
  const latestMap = latestAuthorityDecisionMap(modalFinalState?.authorityDecisions)

  return AUTHORITY_STEPS.map((step, index) => {
    const decision = latestMap.get(step.key)?.decision
    if (decision === 'APPROVED') return 'approved'
    if (decision === 'REJECTED') return 'rejected'

    // Fallback when backend decision list is unavailable.
    if (modalFinalState?.issuanceStatus === 'ISSUED') {
      return index < approvedCount ? 'approved' : 'pending'
    }
    if (modalFinalState?.issuanceStatus === 'REJECTED') {
      if (index < approvedCount) return 'approved'
      if (index === Math.min(approvedCount, AUTHORITY_STEPS.length - 1)) return 'rejected'
      return 'pending'
    }
    return 'pending'
  })
}

export default function IssueCredential() {
  const { session, isAuthenticated, loadCredentials } = useIssuer()
  const [formData, setFormData] = useState({
    recipientDID: '',
    credentialType: 'VerifiableCredential',
    subject: {
      name: '',
      age: '',
      email: ''
    },
    expirationDate: ''
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [showProcessingModal, setShowProcessingModal] = useState(false)
  const [completedVisualSteps, setCompletedVisualSteps] = useState(0)
  const [modalFinalState, setModalFinalState] = useState(null)
  const [triggerBlockAnimation, setTriggerBlockAnimation] = useState(false)

  useEffect(() => {
    if (!showProcessingModal) {
      setCompletedVisualSteps(0)
      setModalFinalState(null)
      return undefined
    }

    if (modalFinalState) {
      return undefined
    }

    const intervalId = setInterval(() => {
      setCompletedVisualSteps((prev) => (prev < AUTHORITY_STEPS.length ? prev + 1 : prev))
    }, 700)

    return () => clearInterval(intervalId)
  }, [showProcessingModal, modalFinalState])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('subject.')) {
      const field = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        subject: {
          ...prev.subject,
          [field]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) return
    const submissionStartedAt = Date.now()
    setLoading(true)
    setShowProcessingModal(true)
    setCompletedVisualSteps(0)
    setModalFinalState(null)
    setError('')
    setResult(null)

    try {
      // token will be attached automatically by apiRequest; the
      // helper now prioritises issuerSession so we can't accidentally
      // send a stale wallet/verifier jwt and receive a 403.
      const data = await apiRequest('/issuer/credentials/create-request', {
        method: 'POST',
        body: {
          subjectDid: formData.recipientDID,
          credentialType: formData.credentialType,
          claims: formData.subject,
          expirationDate: formData.expirationDate || undefined
        }
      })

      setResult({
        success: true,
        requestId: data.requestId,
        credentialId: data.vcId || data.credentialId,
        ipfsHash: data.ipfsCid || data.ipfsHash,
        issuanceStatus: data.issuanceStatus,
        threshold: data.threshold,
        authorityDecisions: data.authorityDecisions || [],
        message: data.message || 'Credential request submitted to pipeline.'
      })

      const resolvedThreshold = typeof data.threshold === 'string'
        ? data.threshold
        : `${data.approvalCount || 0}/${AUTHORITY_STEPS.length}`
      const approvedFromThreshold = Number.parseInt(resolvedThreshold.split('/')[0], 10)
      setCompletedVisualSteps(Number.isNaN(approvedFromThreshold) ? AUTHORITY_STEPS.length : Math.max(0, Math.min(approvedFromThreshold, AUTHORITY_STEPS.length)))
      setModalFinalState({
        issuanceStatus: data.issuanceStatus,
        threshold: resolvedThreshold,
        authorityDecisions: data.authorityDecisions || []
      })

      // Trigger blockchain animation
      setTriggerBlockAnimation(true)
      setTimeout(() => setTriggerBlockAnimation(false), 2500)

      // refresh list/stats
      if (typeof loadCredentials === 'function') {
        loadCredentials()
      }

      // Reset form
      setFormData({
        recipientDID: '',
        credentialType: 'VerifiableCredential',
        subject: {
          name: '',
          age: '',
          email: ''
        },
        expirationDate: ''
      })

      const minVisibleMs = 3200
      const elapsed = Date.now() - submissionStartedAt
      if (elapsed < minVisibleMs) {
        await sleep(minVisibleMs - elapsed)
      }
      await sleep(1200)
    } catch (err) {
      setError(err.response?.data?.error || err.data?.error || 'Failed to submit credential request')

      const minVisibleMs = 3000
      const elapsed = Date.now() - submissionStartedAt
      if (elapsed < minVisibleMs) {
        await sleep(minVisibleMs - elapsed)
      }
    } finally {
      setLoading(false)
      setShowProcessingModal(false)
    }
  }

  if (!isAuthenticated) return <p className="text-center p-8">Please login to issue credentials.</p>

  return (
    <>
      {showProcessingModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(3, 8, 20, 0.62)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
          padding: '20px'
        }}>
          <div style={{
            width: 'min(640px, 100%)',
            borderRadius: '18px',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            background: 'linear-gradient(160deg, rgba(6, 16, 40, 0.95), rgba(10, 24, 58, 0.88))',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            padding: '24px'
          }}>
            <h3 style={{ margin: 0, fontSize: '20px', color: '#dbeafe', letterSpacing: '0.2px' }}>Automated Multi-Authority Approval</h3>
            <p style={{ margin: '8px 0 18px', fontSize: '13px', color: '#93c5fd' }}>Running decentralized trust validation...</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {AUTHORITY_STEPS.map((step, index) => {
                const finalStepState = modalFinalState ? buildFinalStepStates(modalFinalState)[index] : null
                const isDone = finalStepState ? finalStepState === 'approved' : index < completedVisualSteps
                const isRejected = finalStepState === 'rejected'
                const isActive = !modalFinalState && !isDone && index === Math.min(completedVisualSteps, AUTHORITY_STEPS.length - 1)

                return (
                  <div key={step.title} style={{
                    border: '1px solid rgba(148, 163, 184, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    background: isRejected
                      ? 'rgba(248, 113, 113, 0.12)'
                      : isActive
                        ? 'rgba(56, 189, 248, 0.12)'
                        : isDone
                          ? 'rgba(34, 197, 94, 0.12)'
                          : 'rgba(15, 23, 42, 0.35)',
                    transition: 'all 0.24s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: isRejected
                          ? '1px solid rgba(248, 113, 113, 0.95)'
                          : isDone
                            ? '1px solid rgba(34, 197, 94, 0.95)'
                            : isActive
                              ? '2px solid rgba(125, 211, 252, 0.35)'
                              : '1px solid rgba(148, 163, 184, 0.45)',
                        borderTopColor: isActive ? '#7dd3fc' : undefined,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: isActive ? 'spin 0.8s linear infinite' : 'none',
                        color: isRejected ? '#f87171' : '#22c55e',
                        fontSize: '12px',
                        flexShrink: 0
                      }}>
                        {isRejected ? 'x' : isDone ? '✓' : ''}
                      </span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{step.title}</div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>{step.detail}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(148, 163, 184, 0.22)' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', color: '#cbd5e1' }}>
                Threshold Progress: {modalFinalState?.threshold || `${Math.min(completedVisualSteps, AUTHORITY_STEPS.length)} / ${AUTHORITY_STEPS.length}`}
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: modalFinalState?.issuanceStatus === 'REJECTED' ? '#f87171' : '#7dd3fc' }}>
                {modalFinalState?.issuanceStatus === 'REJECTED'
                  ? 'Status: Approval Rejected'
                  : completedVisualSteps >= AUTHORITY_STEPS.length
                    ? 'Status: Finalizing issuance...'
                    : 'Status: Threshold approval in progress...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="page-container">
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h1 className="page-title">Issue Verifiable Credential</h1>
        <p className="page-description">Create a credential request and submit it to an automated multi-authority approval pipeline.</p>

        <div className="section-card">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Recipient DID */}
            <div>
              <label className="tech-label">Recipient DID *</label>
              <input
                type="text"
                name="recipientDID"
                value={formData.recipientDID}
                onChange={handleChange}
                required
                className="tech-input"
                placeholder="did:custom:..."
              />
              <p className="tech-hint">Enter the decentralized identifier of the credential recipient</p>
            </div>

            {/* Credential Type */}
            <div>
              <label className="tech-label">Credential Type *</label>
              <select
                name="credentialType"
                value={formData.credentialType}
                onChange={handleChange}
                required
                className="tech-input"
              >
                <option value="VerifiableCredential">Verifiable Credential</option>
                <option value="EducationalCredential">Educational Credential</option>
                <option value="IdentityCredential">Identity Credential</option>
                <option value="ProfessionalCredential">Professional Credential</option>
              </select>
            </div>

            <hr className="form-divider" />

            {/* Subject info */}
            <div>
              <div className="section-title" style={{ marginBottom: '16px' }}>Credential Subject</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div>
                  <label className="tech-label">Name</label>
                  <input type="text" name="subject.name" value={formData.subject.name} onChange={handleChange} className="tech-input" placeholder="Full name" />
                </div>
                <div>
                  <label className="tech-label">Age</label>
                  <input type="number" name="subject.age" value={formData.subject.age} onChange={handleChange} className="tech-input" placeholder="Age" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="tech-label">Email</label>
                  <input type="email" name="subject.email" value={formData.subject.email} onChange={handleChange} className="tech-input" placeholder="email@example.com" />
                </div>
              </div>
            </div>

            <hr className="form-divider" />

            {/* Expiry */}
            <div>
              <label className="tech-label">Expiration Date <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
              <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="tech-input" />
            </div>

            {error && <div className="result-error">{error}</div>}
            {result && result.issuanceStatus === 'ISSUED' && (
              <div className="result-success">
                <h3>✓ {result.message}</h3>
                {result.requestId && <p style={{ fontSize: '13px', color: '#22c55e', marginBottom: '4px' }}>Request ID: <span style={{ fontFamily: 'monospace' }}>{result.requestId}</span></p>}
                {result.credentialId && <p style={{ fontSize: '13px', color: '#22c55e', marginBottom: '4px' }}>Credential ID: <span style={{ fontFamily: 'monospace' }}>{result.credentialId}</span></p>}
                {result.ipfsHash && <p style={{ fontSize: '13px', color: '#22c55e' }}>IPFS Hash: <span style={{ fontFamily: 'monospace' }}>{result.ipfsHash}</span></p>}
                {result.threshold && <p style={{ fontSize: '13px', color: '#22c55e' }}>Threshold: {result.threshold}</p>}
                {result.issuanceStatus && <p style={{ fontSize: '13px', color: '#22c55e' }}>Status: {result.issuanceStatus}</p>}
              </div>
            )}
            {result && result.issuanceStatus && result.issuanceStatus !== 'ISSUED' && (
              <div className="result-error">
                <strong>{result.message || 'Credential request was not issued.'}</strong>
                {result.threshold && <p style={{ marginTop: '8px', fontSize: '13px' }}>Threshold: {result.threshold}</p>}
                <p style={{ marginTop: '4px', fontSize: '13px' }}>Status: {result.issuanceStatus}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="gradient-button" style={{ width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {loading ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Submitting to Pipeline...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit for Automated Approval
                  </>
                )}
              </span>
            </button>
          </form>
        </div>
      </div>

      {/* Blockchain Activity Visualizer */}
      <div style={{ marginTop: '40px' }}>
        <BlockchainVisualizer triggerAnimation={triggerBlockAnimation} />
      </div>
      </div>
    </>
  )
}
