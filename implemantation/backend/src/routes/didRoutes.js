const express = require('express')

function createDidRouter(didRegistry) {
  const router = express.Router()

  /**
   * POST /api/did/register
   * body: { username, address }
   */
  router.post('/register', async (req, res, next) => {
    try {
      const { username, address } = req.body;

      if (!username || !address) {
        return res.status(400).json({
          error: 'username and address are required'
        });
      }

      const normalizedAddress = address.toLowerCase();

      const existing = didRegistry.getDIDByAddress(normalizedAddress);
      if (existing) {
        return res.status(200).json(existing);
      }

      const did = didRegistry.generateDIDFromAddress(normalizedAddress);

      const record = didRegistry.registerDID({
        did,
        publicKeyPem: null,
        address: normalizedAddress
      });

      return res.status(201).json({
        username,
        ...record
      });
    } catch (err) {
      next(err);
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
