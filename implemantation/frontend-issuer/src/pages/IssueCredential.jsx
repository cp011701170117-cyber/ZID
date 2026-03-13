import { useState } from 'react'
import { apiRequest } from '../utils/api'
import { useIssuer } from '../context/IssuerContext'
import BlockchainVisualizer from '../components/BlockchainVisualizer'

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
  const [triggerBlockAnimation, setTriggerBlockAnimation] = useState(false)

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
    setLoading(true)
    setError('')
    setResult(null)

    try {
      // token will be attached automatically by apiRequest; the
      // helper now prioritises issuerSession so we can't accidentally
      // send a stale wallet/verifier jwt and receive a 403.
      const data = await apiRequest('/credentials/issue', {
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
        credentialId: data.vcId || data.credentialId,
        ipfsHash: data.ipfsCid || data.ipfsHash,
        message: 'Credential issued successfully!'
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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to issue credential')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) return <p className="text-center p-8">Please login to issue credentials.</p>

  return (
    <div className="page-container">
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <h1 className="page-title">Issue Verifiable Credential</h1>
        <p className="page-description">Create a cryptographically signed credential and anchor it to the blockchain.</p>

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
            {result && (
              <div className="result-success">
                <h3>✓ {result.message}</h3>
                {result.credentialId && <p style={{ fontSize: '13px', color: '#065f46', marginBottom: '4px' }}>Credential ID: <span style={{ fontFamily: 'monospace' }}>{result.credentialId}</span></p>}
                {result.ipfsHash && <p style={{ fontSize: '13px', color: '#065f46' }}>IPFS Hash: <span style={{ fontFamily: 'monospace' }}>{result.ipfsHash}</span></p>}
              </div>
            )}
            <button type="submit" disabled={loading} className="gradient-button" style={{ width: '100%' }}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                {loading ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                    Issuing Credential...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Issue Credential
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
  )
}
