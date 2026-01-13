const express = require('express');

function createDidRouter(didRegistry) {
  const router = express.Router();

  // Client sends DID and public key generated in browser; backend anchors it.
  router.post('/register', (req, res) => {
    try {
      const { did, publicKey } = req.body;
      if (!did || !publicKey) {
        return res.status(400).json({ error: 'did and publicKey are required' });
      }
      const record = didRegistry.registerDID(did, publicKey);
      return res.status(201).json(record);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/resolve/:did', (req, res) => {
    const { did } = req.params;
    const record = didRegistry.resolveDID(did);
    if (!record) {
      return res.status(404).json({ error: 'DID not found' });
    }
    return res.json(record);
  });

  return router;
}

module.exports = createDidRouter;

