const express = require('express')

function createDidRouter(didRegistry) {
  const router = express.Router()

  /**
   * POST /api/did/register
   * body: { username, address }
   */
  router.post('/register', (req, res) => {
    try {
      const { username, address } = req.body

      if (!username || !address) {
        return res.status(400).json({
          error: 'username and address are required'
        })
      }

      // 🔁 Normalize address
      const normalizedAddress = address.toLowerCase()

      // 🧠 Check if DID already exists for this wallet
      const existing = didRegistry.getDIDByAddress(normalizedAddress)
      if (existing) {
        return res.status(200).json(existing)
      }

      // 🆔 Deterministic DID
      const did = didRegistry.generateDIDFromAddress(normalizedAddress)

      // ⛓️ Register DID on blockchain
      const record = didRegistry.registerDID({
        did,
        publicKeyPem: null,   // MetaMask proves ownership
        address: normalizedAddress
      })

      return res.status(201).json({
        username,
        ...record
      })

    } catch (err) {
      console.error('❌ DID register error:', err)
      return res.status(500).json({ error: err.message })
    }
  })

  /**
   * GET /api/did/resolve/:did
   */
  router.get('/resolve/:did', (req, res) => {
    const { did } = req.params
    const record = didRegistry.resolveDID(did)

    if (!record) {
      return res.status(404).json({ error: 'DID not found' })
    }

    return res.json(record)
  })

  return router
}

module.exports = createDidRouter
