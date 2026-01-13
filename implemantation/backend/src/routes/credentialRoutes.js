const express = require('express');
const { createVerifiableCredential, persistCredentialOffChain, sha256 } = require('../services/vcService');

function createCredentialRouter(credentialRegistry) {
  const router = express.Router();

  // Issue a new VC and anchor its hash on the blockchain.
  router.post('/issue', async (req, res) => {
    try {
      const { recipientDID, credentialType, credentialSubject, expirationDate } = req.body;
      if (!recipientDID || !credentialSubject) {
        return res.status(400).json({ error: 'recipientDID and credentialSubject are required' });
      }
      
      // For prototype, use a default issuer DID (in production, this would come from authenticated issuer)
      const issuerDid = process.env.ISSUER_DID || 'did:custom:issuer';
      
      const vc = createVerifiableCredential({ 
        issuerDid, 
        subjectDid: recipientDID, 
        claims: credentialSubject,
        type: credentialType,
        expirationDate
      });
      
      const { cid, hash } = await persistCredentialOffChain(vc);

      const record = credentialRegistry.storeCredentialHash({
        credentialId: vc.id,
        hash,
        issuerDid,
        subjectDid: recipientDID
      });

      // The VC itself is returned for wallet storage; only hash is on-chain.
      return res.status(201).json({
        credentialId: vc.id,
        ipfsHash: cid,
        vc,
        anchor: record
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post('/revoke', (req, res) => {
    try {
      const { credentialId, reason } = req.body;
      if (!credentialId) {
        return res.status(400).json({ error: 'credentialId is required' });
      }
      const updated = credentialRegistry.revokeCredential(credentialId, reason);
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Revoke by credential ID (for issuer dashboard)
  router.post('/:credentialId/revoke', (req, res) => {
    try {
      const { credentialId } = req.params;
      const { reason } = req.body;
      const updated = credentialRegistry.revokeCredential(credentialId, reason);
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get credentials for a wallet DID
  router.get('/wallet/:did', (req, res) => {
    try {
      const { did } = req.params;
      const credentials = credentialRegistry.getCredentialsBySubject(did);
      return res.json({ credentials });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Verification: wallet or verifier submits VC (or hash) and we compare to blockchain anchor.
  router.post('/verify', (req, res) => {
    try {
      const { credentialId, vc } = req.body;
      if (!credentialId || !vc) {
        return res.status(400).json({ error: 'credentialId and vc are required' });
      }
      const computedHash = sha256(JSON.stringify(vc));
      const result = credentialRegistry.verifyExistence(credentialId, computedHash);
      return res.json({
        ...result,
        computedHash
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createCredentialRouter;

