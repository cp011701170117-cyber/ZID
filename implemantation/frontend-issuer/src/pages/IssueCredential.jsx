import { useState } from 'react'
import axios from 'axios'

export default function IssueCredential() {
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
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await axios.post('/api/credentials/issue', {
        recipientDID: formData.recipientDID,
        credentialType: formData.credentialType,
        credentialSubject: formData.subject,
        expirationDate: formData.expirationDate || undefined
      })

      setResult({
        success: true,
        credentialId: response.data.credentialId,
        ipfsHash: response.data.ipfsHash,
        message: 'Credential issued successfully!'
      })

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Issue Verifiable Credential</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient DID *
            </label>
            <input
              type="text"
              name="recipientDID"
              value={formData.recipientDID}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="did:custom:..."
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the DID of the credential recipient
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credential Type *
            </label>
            <select
              name="credentialType"
              value={formData.credentialType}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="VerifiableCredential">Verifiable Credential</option>
              <option value="EducationalCredential">Educational Credential</option>
              <option value="IdentityCredential">Identity Credential</option>
              <option value="ProfessionalCredential">Professional Credential</option>
            </select>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Credential Subject</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="subject.name"
                  value={formData.subject.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  name="subject.age"
                  value={formData.subject.age}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="subject.email"
                  value={formData.subject.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              name="expirationDate"
              value={formData.expirationDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <p className="font-semibold">{result.message}</p>
              {result.credentialId && (
                <p className="text-sm mt-2">Credential ID: {result.credentialId}</p>
              )}
              {result.ipfsHash && (
                <p className="text-sm">IPFS Hash: {result.ipfsHash}</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Issuing Credential...' : 'Issue Credential'}
          </button>
        </form>
      </div>
    </div>
  )
}
