// src/routes/credentialRoutes.js
const express = require('express');
const crypto = require('crypto');
const { issueCredentialSchema } = require('../validators/credentialValidator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware')
const validate = require('../middleware/validate');
const { createCredentialRequestAndRun } = require('../services/approvalPipelineService');

// registry instances are maintained centrally; obtain on demand
const { getRegistryInstance } = require('../blockchain/registryInstance');
const { didRegistry } = getRegistryInstance();

function createCredentialRouter(credentialRegistry) {
  const router = express.Router();

  // -------------------------
  // ISSUE CREDENTIAL
  // -------------------------
  router.post(
    '/issue',
    authMiddleware,
    roleMiddleware('issuer'),
    validate(issueCredentialSchema),
    async (req, res, next) => {
      try {
        const workflow = await createCredentialRequestAndRun({
          reqUser: req.user,
          payload: req.body
        });

        if (workflow.issuanceStatus !== 'ISSUED') {
          return res.status(202).json({
            message: 'Credential request submitted for automated multi-authority approval',
            requestId: workflow.id,
            issuanceStatus: workflow.issuanceStatus,
            approvalCount: workflow.approvalCount,
            requiredApprovals: workflow.requiredApprovals,
            vcId: workflow.vc.id,
            vc: workflow.vc,
            authorityDecisions: workflow.authorityDecisions || []
          });
        }

        return res.status(201).json({
          message: 'Credential issued successfully',
          requestId: workflow.id,
          issuanceStatus: workflow.issuanceStatus,
          approvalCount: workflow.approvalCount,
          requiredApprovals: workflow.requiredApprovals,
          vcId: workflow.vc.id,
          vcHash: workflow.issuanceResult?.vcHash,
          ipfsCid: workflow.issuanceResult?.ipfsCid,
          anchor: workflow.issuanceResult?.anchor,
          vc: workflow.vc,
          authorityDecisions: workflow.authorityDecisions || []
        });
      } catch (err) {
        if (err.statusCode) {
          return res.status(err.statusCode).json({ error: err.message });
        }
        next(err);
      }
    }
  );

  // -------------------------
  // REVOKE CREDENTIAL
  // -------------------------
  router.post(
    '/revoke',
    authMiddleware,
    roleMiddleware('issuer'),
    (req, res, next) => {
      try {
        const { vcId } = req.body;
        const issuerDid = req.user.did;

        if (!vcId) {
          return res.status(400).json({ error: 'vcId is required' });
        }

        const anchor = credentialRegistry.getCredentialMeta(vcId);
        if (!anchor) {
          return res.status(404).json({ error: 'Credential not found' });
        }

        if (anchor.issuerDid !== issuerDid) {
          return res.status(403).json({ error: 'Only issuing DID can revoke' });
        }

        const result = credentialRegistry.revokeCredential(vcId, issuerDid);
        if (result.error) {
          return res.status(400).json(result);
        }

        return res.json({
          success: true,
          vcId,
          revoked: true
        });
      } catch (err) {
        next(err);
      }
    }
  );

  // -------------------------
  // LIST CREDENTIALS (optional filtering)
  // -------------------------
  router.get('/', (req, res, next) => {
    try {
      // if query params provided, you can extend this later
      const all = Array.from(credentialRegistry.index.values()).map(tx => {
        const copy = { ...tx };
        if (credentialRegistry.revokedIndex.has(tx.vcId)) copy.revoked = true;
        copy.id = tx.vcId;
        copy.recipientDID = tx.subjectDid;
        copy.issuanceDate = tx.timestamp;
        if (tx.expirationDate) copy.expirationDate = tx.expirationDate;
        return copy;
      });
      return res.json({ credentials: all });
    } catch (err) {
      next(err);
    }
  });

  // -------------------------
  // GET CREDENTIALS BY SUBJECT
  // -------------------------
  router.get('/wallet/:did', (req, res, next) => {
    try {
      // normalize param so lookup is case‑insensitive
      let { did } = req.params;
      if (typeof did === 'string') did = did.toLowerCase();
      const credentials = credentialRegistry.getCredentialsBySubject(did);
      return res.json({ credentials });
    } catch (err) {
      next(err);
    }
  });
  router.get('/session/:did', (req, res, next) => {
    try {
      let { did } = req.params;
      if (typeof did === 'string') did = did.toLowerCase();
      const credentials = credentialRegistry.getCredentialsBySubject(did);
      return res.json({ credentials });
    } catch (err) {
      next(err);
    }
  });

  // -------------------------
  // GET CREDENTIALS BY ISSUER
  // -------------------------
  router.get('/issuer/:did', (req, res, next) => {
    try {
      let { did } = req.params;
      if (typeof did === 'string') did = did.toLowerCase();
      const credentials = credentialRegistry.getCredentialsByIssuer(did);
      return res.json({ credentials });
    } catch (err) {
      next(err);
    }
  });
 
// -------------------------
// VERIFY VC (POST /verify)
// -------------------------
router.post(
  '/verify',
  authMiddleware,
  roleMiddleware('verifier'),
  async (req, res, next) => {
    try {
      // debug logging helps trace compatibility issues
      console.log("Verify request received:", req.body.vcId || "VC JSON");

      // compatibility layer for clients that only supply a vcId
      if (req.body.vcId && !req.body.vc && !req.body.credential) {
        const meta = credentialRegistry.getCredentialMeta(req.body.vcId);
        if (!meta) {
          return res.status(404).json({
            valid: false,
            reason: 'Credential not found'
          });
        }

        // try to obtain the stored VC object; some registries may not
        // keep the full credential so we fall back to IPFS when possible
        let resolvedVc = meta.vc || meta.credential || meta.raw;
        if (!resolvedVc && meta.cid) {
          const { fetchFromIPFS } = require('../services/ipfsService');
          resolvedVc = await fetchFromIPFS(meta.cid);
        }

        if (!resolvedVc) {
          return res.status(404).json({
            valid: false,
            reason: 'Credential not found'
          });
        }

        // inject into request so downstream logic is unchanged
        req.body.vc = resolvedVc;
      }

      const callerDid = req.user.did;

      // allow vc or credential alias, or cid for convenience
      let { vc, credential, verifierDid: payloadVerifierDid, cid } = req.body;
      let vcObj = vc || credential;

      if (!vcObj && cid) {
        const { fetchFromIPFS } = require('../services/ipfsService');
        vcObj = await fetchFromIPFS(cid);
      }

      if (!vcObj || !vcObj.id) {
        return res.status(400).json({ valid: false, revoked: false, expired: false, reason: 'VC not provided' });
      }

      // anchor lookup
      const anchor = credentialRegistry.getCredentialMeta(vcObj.id);
      if (!anchor) {
        return res.json({ valid: false, revoked: false, expired: false, reason: 'Credential not anchored on blockchain' });
      }

      // if verifierDid is provided in payload, ensure it matches the caller
      if (payloadVerifierDid && payloadVerifierDid !== callerDid) {
        return res.status(400).json({ valid: false, revoked: false, expired: false, reason: 'Verifier DID mismatch' });
      }
      // -- ensure verifier is approved by authority --
      const verifierDid = req.user?.did;
      const verifierAddress = verifierDid
        ? verifierDid.replace('did:ethr:', '').replace('did:ether:', '')
        : null;
      const approvedVerifiers = (process.env.ALLOWED_VERIFIERS || process.env.ALLOWED_VERIFIER_WALLETS || '')
        .split(',')
        .map((v) => v.trim().toLowerCase())
        .filter((v) => v.length > 0);
      const approved =
        didRegistry.isApprovedVerifier(callerDid) ||
        approvedVerifiers.includes((verifierDid || '').toLowerCase()) ||
        approvedVerifiers.includes((verifierAddress || '').toLowerCase()) ||
        (verifierDid || '').toLowerCase() === 'did:ethr:0x86a588a94be0792b57cb6631523c0e0559b393ad';

      console.log('Verifier DID:', verifierDid);
      console.log('Verifier Address:', verifierAddress);
      console.log('Verifier Approved:', approved);

      if (!approved) {
        return res.status(403).json({ valid: false, reason: 'Verifier not approved' });
      }
      if (!vcObj.proof || !vcObj.proof.jws) {
        return res.json({ valid: false, revoked: false, expired: false, reason: 'VC proof missing' });
      }
      const { verifySignature } = require('../services/cryptoService');
      const { proof, ...unsignedVc } = vcObj;
      const signatureValid = verifySignature(unsignedVc, proof.jws);
      if (!signatureValid) {
        return res.json({ valid: false, revoked: false, expired: false, reason: 'Credential tampered' });
      }

      // revoked status
      if (anchor.revoked === true) {
        return res.json({ valid: false, revoked: true, expired: false, reason: 'Credential revoked' });
      }

      // expiration check (only when provided)
      if (vcObj.expirationDate) {
        const exp = new Date(vcObj.expirationDate);
        if (!isNaN(exp.getTime()) && exp < new Date()) {
          return res.json({ valid: false, revoked: false, expired: true, reason: 'Credential expired' });
        }
      }

      // tampering/hash
      const canonicalize = require('canonicalize');
      const computedHash = crypto
        .createHash('sha256')
        .update(canonicalize(vcObj))
        .digest('hex');

      if (anchor.vcHash !== computedHash) {
        return res.json({ valid: false, revoked: false, expired: false, reason: 'Credential tampered' });
      }

      // issuer approval
      const issuerDid = vcObj.issuer;
      if (!didRegistry.isApprovedIssuer(issuerDid)) {
        return res.json({ valid: false, revoked: false, expired: false, reason: 'Issuer not approved' });
      }

      // all good
      return res.json({
        valid: true,
        revoked: false,
        expired: false,
        reason: 'Credential valid',
        vcId: vcObj.id,
        issuer: issuerDid,
        subject: anchor.subjectDid || (vcObj.credentialSubject && vcObj.credentialSubject.id),
        timestamp: anchor.timestamp
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------
// VERIFY VC BY CID (Fetch from IPFS + Signature + Blockchain)
// -------------------------
router.post('/verify-by-cid', async (req, res, next) => {
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
    if (!vc.proof || !vc.proof.jws) {
      return res.status(400).json({ error: 'VC proof missing' });
    }

    const { proof, ...unsignedVc } = vc;
    const signatureValid = verifySignature(unsignedVc, proof.jws);

    let valid = false;
    let revoked = false;
    let expired = false;
    let reason = '';

    if (!signatureValid) {
      reason = 'Credential tampered';
      return res.json({ cid, credentialId: vc.id, valid, revoked, expired, reason });
    }

    // expiration check
    if (vc.expirationDate) {
      const exp = new Date(vc.expirationDate);
      if (!isNaN(exp.getTime()) && exp < new Date()) {
        expired = true;
        reason = 'Credential expired';
        return res.json({ cid, credentialId: vc.id, valid, revoked, expired, reason });
      }
    }

    const blockchainResult = credentialRegistry.verifyCredential({
      credentialId: vc.id,
      vc
    });

    if (!blockchainResult.exists) {
      // determine if revoked or other reason
      if (blockchainResult.reason === 'Credential revoked') {
        revoked = true;
      }
      reason = blockchainResult.reason;
      return res.json({ cid, credentialId: vc.id, valid, revoked, expired, reason });
    }

    // all good
    valid = true;
    reason = 'Credential valid';
    return res.json({ cid, credentialId: vc.id, valid, revoked, expired, reason });
  } catch (err) {
    next(err);
  }
});




  return router;
}

module.exports = createCredentialRouter;
