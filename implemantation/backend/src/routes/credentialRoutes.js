// src/routes/credentialRoutes.js
const express = require('express');
const crypto = require('crypto');
const { issueCredentialSchema } = require('../validators/credentialValidator');
const { createVerifiableCredential } = require('../models/VerifiableCredential');
const authMiddleware = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');

function createCredentialRouter(credentialRegistry) {
  const router = express.Router();

  // -------------------------
  // ISSUE CREDENTIAL
  // -------------------------
  router.post(
    '/issue',
    authMiddleware,
    validate(issueCredentialSchema),
    async (req, res) => {
      try {
        const issuerDid = req.user.did; // 🔒 always from JWT
        const { subjectDid, credentialType = "CustomCredential", claims } = req.body;

        // 1️⃣ Create VC
        const vc = createVerifiableCredential({
          issuerDid,
          subjectDid,
          credentialType,
          claims
        });

        const unsignedVc = { ...vc };
        delete unsignedVc.proof;

        const { signData } = require("../services/cryptoService");

        const proof = {
          type: "RsaSignature2018",
          created: new Date().toISOString(),
          proofPurpose: "assertionMethod",
          verificationMethod: `${issuerDid}#key-1`,
          jws: signData(unsignedVc)
        };

        vc.proof = proof;

        // 2️⃣ Canonical Hash
        const canonicalize = require('canonicalize');
        const canonical = canonicalize(vc);

        const vcHash = crypto
          .createHash('sha256')
          .update(canonical)
          .digest('hex');

        // 3️⃣ Upload to IPFS
        const { uploadJSONToIPFS } = require('../services/ipfsService');
        const ipfsResult = await uploadJSONToIPFS(vc);

        // 4️⃣ Anchor
        const anchor = credentialRegistry.addCredentialHash({
          credentialId: vc.id,
          hash: vcHash,
          cid: ipfsResult.cid,
          issuerDid,
          subjectDid
        });

        return res.status(201).json({
          message: 'Credential issued successfully',
          vcId: vc.id,
          vcHash,
          ipfsCid: ipfsResult.cid,
          anchor,
          vc
        });

      } catch (err) {
        console.error('Credential issuance error:', err);
        return res.status(500).json({ error: err.message });
      }
    }
  );

  // -------------------------
  // REVOKE CREDENTIAL
  // -------------------------
  router.post('/revoke', authMiddleware, (req, res) => {
    try {
      const { credentialId, reason } = req.body;
      const issuerDid = req.user.did; // 🔒 from token

      if (!credentialId) {
        return res.status(400).json({ error: 'credentialId is required' });
      }

      const result = credentialRegistry.revokeCredential(
        credentialId,
        issuerDid,
        reason || 'No reason provided'
      );

      if (result.error) {
        return res.status(400).json(result);
      }

      return res.json({
        message: 'Credential revoked successfully',
        revoked: result
      });

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
// VERIFY VC (POST /verify)
// -------------------------
router.post('/verify', (req, res) => {
  try {
    const { vc } = req.body;

    if (!vc || !vc.id) {
      return res.status(400).json({ error: 'VC object with id is required' });
    }

    const { verifySignature } = require('../services/cryptoService');

    // -------------------------
    // 1️⃣ Check Signature
    // -------------------------
    if (!vc.proof || !vc.proof.jws) {
      return res.status(400).json({ error: 'VC proof missing' });
    }

    const { proof, ...unsignedVc } = vc;

    const signatureValid = verifySignature(unsignedVc, proof.jws);

    if (!signatureValid) {
      return res.json({
        credentialId: vc.id,
        exists: false,
        reason: 'Invalid issuer signature'
      });
    }

    // -------------------------
    // 2️⃣ Check Blockchain Anchor
    // -------------------------
    const blockchainResult = credentialRegistry.verifyCredential({
      credentialId: vc.id,
      vc
    });

    // -------------------------
    // 3️⃣ Return Combined Result
    // -------------------------
    return res.json({
      credentialId: vc.id,
      signatureValid,
      ...blockchainResult
    });

  } catch (err) {
    console.error('Credential verification error:', err);
    return res.status(500).json({ error: err.message });
  }
});


// -------------------------
// VERIFY VC BY CID (Fetch from IPFS + Signature + Blockchain)
// -------------------------
router.post('/verify-by-cid', async (req, res) => {
  try {
    const { cid } = req.body;

    if (!cid) {
      return res.status(400).json({ error: 'CID is required' });
    }

    const { fetchFromIPFS } = require('../services/ipfsService');
    const vc = await fetchFromIPFS(cid);

    if (!vc || !vc.id) {
      return res.status(400).json({ error: 'Invalid VC structure from IPFS' });
    }

    const { verifySignature } = require('../services/cryptoService');

    // -------------------------
    // 1️⃣ Check Signature
    // -------------------------
    if (!vc.proof || !vc.proof.jws) {
      return res.status(400).json({ error: 'VC proof missing' });
    }

    // Remove proof to verify only the actual VC content
    const { proof, ...unsignedVc } = vc;

    const signatureValid = verifySignature(unsignedVc, proof.jws);

    if (!signatureValid) {
      return res.json({
        cid,
        credentialId: vc.id,
        exists: false,
        reason: 'Invalid issuer signature'
      });
    }

    // -------------------------
    // 2️⃣ Check Blockchain Anchor
    // -------------------------
    const blockchainResult = credentialRegistry.verifyCredential({
      credentialId: vc.id,
      vc
    });

    // -------------------------
    // 3️⃣ Return Combined Result
    // -------------------------
    return res.json({
      cid,
      credentialId: vc.id,
      signatureValid,
      ...blockchainResult
    });

  } catch (err) {
    console.error('Verify by CID error:', err);
    return res.status(500).json({ error: err.message });
  }
});




  return router;
}

module.exports = createCredentialRouter;
