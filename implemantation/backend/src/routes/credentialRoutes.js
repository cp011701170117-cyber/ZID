// src/routes/credentialRoutes.js
const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const { createVerifiableCredential, hashCredential } = require('../models/VerifiableCredential');
const { uploadToIPFS } = require('../services/ipfsService');

function createCredentialRouter(credentialRegistry) {
  const router = express.Router();

  // -------------------------
  // ISSUE CREDENTIAL
  // -------------------------
  router.post('/issue', async (req, res) => {
    try {
      const {
        issuerDid = process.env.ISSUER_DID || 'did:custom:issuer',
        subjectDid,
        credentialType,
        claims,
        tempFilePath // optional: if sending files to IPFS
      } = req.body;

      if (!subjectDid || !claims) {
        return res.status(400).json({ error: 'subjectDid and claims are required' });
      }

      // 1️⃣ Upload file to IPFS if provided
      let ipfsResult = null;
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        ipfsResult = await uploadToIPFS(tempFilePath, 'evidence.json');
        fs.unlinkSync(tempFilePath); // cleanup
      }

      // 2️⃣ Create VC
      const vc = createVerifiableCredential({
        issuerDid,
        subjectDid,
        credentialType,
        claims,
        ipfsCid: ipfsResult ? ipfsResult.cid : null
      });

      // 3️⃣ Hash VC
      const vcHash = hashCredential(vc);

      // 4️⃣ Store hash on blockchain
      const anchor = credentialRegistry.addCredentialHash(vc.id, vcHash, issuerDid);

      return res.status(201).json({
        message: 'Credential issued successfully',
        vcId: vc.id,
        vcHash,
        ipfsCid: ipfsResult ? ipfsResult.cid : null,
        anchor,
        vc
      });
    } catch (err) {
      console.error('Credential issuance error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // -------------------------
  // REVOKE CREDENTIAL
  // -------------------------
  router.post('/revoke', (req, res) => {
    try {
      const { credentialId, reason } = req.body;
      if (!credentialId) return res.status(400).json({ error: 'credentialId is required' });

      const revoked = credentialRegistry.revokeCredential(credentialId, reason || 'No reason provided');
      return res.json({ message: 'Credential revoked', revoked });
    } catch (err) {
      console.error('Credential revocation error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // -------------------------
  // GET CREDENTIALS BY DID
  // -------------------------
  router.get('/wallet/:did', (req, res) => {
    try {
      const { did } = req.params;
      const credentials = credentialRegistry.getCredentialsBySubject(did);
      return res.json({ credentials });
    } catch (err) {
      console.error('Fetch credentials error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/session/:did', (req, res) => {
    try {
      const { did } = req.params;
      const credentials = credentialRegistry.getCredentialsBySubject(did);
      return res.json({ credentials });
    } catch (err) {
      console.error('Session fetch error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  // -------------------------
  // VERIFY CREDENTIAL
  // -------------------------
  router.post('/verify', (req, res) => {
    try {
      const { vc } = req.body;
      if (!vc || !vc.id) return res.status(400).json({ error: 'VC object with id is required' });

      // Compute local hash
      const computedHash = crypto.createHash('sha256').update(JSON.stringify(vc)).digest('hex');

      // Fetch blockchain hash
      const onChainHash = credentialRegistry.getCredentialHash(vc.id);

      const valid = computedHash === onChainHash;

      return res.json({
        valid,
        computedHash,
        onChainHash,
        message: valid ? 'Credential verified successfully' : 'Verification failed'
      });
    } catch (err) {
      console.error('Credential verification error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createCredentialRouter;
