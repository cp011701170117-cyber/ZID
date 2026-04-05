// src/routes/adminRoutes.js
// provides administrative endpoints such as storage reset

const express = require('express');
const fs = require('fs');
const path = require('path');
const { writeJsonAtomicSync } = require('../storage/storageService');
const Block = require('../blockchain/block');
const { getRegistryInstance } = require('../blockchain/registryInstance');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// IMPORTANT: this endpoint is protected by authority role
// and will clean up on-disk storage without removing configuration.
const performReset = (req, res, next) => {
    try {
      const { blockchain, didRegistry, credentialRegistry } = getRegistryInstance();
      const storageDir = path.join(__dirname, '../../storage');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      // determine chain filename
      const filename =
        process.env.NODE_ENV === 'test'
          ? 'blockchain.test.json'
          : 'blockchain.json';
      const chainFile = path.join(storageDir, filename);

      // reinitialize chain to a single genesis block
      const genesis = Block.genesis();
      // replace in-memory chain and persist through blockchain helper
      blockchain.chain = [genesis];
      // ensure file is rewritten atomically via blockchain API
      if (typeof blockchain.saveChain === 'function') {
        blockchain.saveChain();
      } else {
        writeJsonAtomicSync(chainFile, blockchain.chain);
      }

      // wipe additional storage files if present
      ['credentials.json', 'revocations.json', 'verifiers.json', 'credentialApprovalWorkflows.json'].forEach((name) => {
        const p = path.join(storageDir, name);
        if (fs.existsSync(p)) {
          writeJsonAtomicSync(p, []);
        }
      });

      // reset DID registry in memory and on disk
      didRegistry._dids.clear();
      writeJsonAtomicSync(didRegistry.storagePath, []);

      // re-add authority DID record in-memory (no blockchain anchor)
      const authorityAddress = blockchain.validatorId;
      const authorityDid = didRegistry.generateDIDFromAddress(authorityAddress);
      const now = Date.now();
      didRegistry._dids.set(authorityDid, {
        did: authorityDid,
        address: authorityAddress,
        publicKeyPem: null,
        createdAt: now,
        updatedAt: now,
        role: 'authority',
        approved: true
      });
      // persist the updated DID file
      if (typeof didRegistry._saveToDisk === 'function') {
        didRegistry._saveToDisk();
      }

      // clear credential registry indexes
      credentialRegistry.index.clear();
      credentialRegistry.revokedIndex.clear();
      credentialRegistry.approvedIssuers.clear();
      credentialRegistry.approvedVerifiers.clear();
      credentialRegistry.subjectIndex.clear();

      // re-apply environment approvals for issuers/verifiers without generating blockchain blocks
      const applyEnvApprovals = (envVar, isIssuer) => {
        if (!envVar) return;
        // normalize entries up front so we treat everything case‑insensitively
      envVar
        .split(',')
        .map((entry) => entry.trim().toLowerCase())   // <-- lowercase here
        .filter((entry) => entry.length > 0)
        .forEach((entry) => {
          let did;
          if (entry.startsWith('did:')) {
            did = entry; // already lowercased
          } else {
            did = `did:ethr:${entry}`; // entry is lowercased
          }

          if (!didRegistry.resolveDID(did)) {
            // manually insert record without creating a blockchain entry.  we
            // normalize to lowercase earlier, so we can safely set the map key.
            const timestamp = Date.now();
            const record = { did, address: entry, publicKeyPem: null, createdAt: timestamp, updatedAt: timestamp };
            didRegistry._dids.set(did, record);
            if (typeof didRegistry._saveToDisk === 'function') {
              didRegistry._saveToDisk();
            }
          }

          if (isIssuer) {
            // mark approved in DID registry directly
            const rec = didRegistry._dids.get(did);
            if (rec) {
              rec.role = 'issuer';
              rec.approved = true;
              rec.approvedBy = blockchain.validatorId;
              rec.approvedAt = new Date().toISOString();
              if (typeof didRegistry._saveToDisk === 'function') {
                didRegistry._saveToDisk();
              }
            }
            if (!credentialRegistry.isIssuerApproved(did)) {
              credentialRegistry.approvedIssuers.add(did);
            }
          } else {
            const rec = didRegistry._dids.get(did);
            if (rec) {
              rec.role = 'verifier';
              rec.approved = true;
              rec.approvedBy = blockchain.validatorId;
              rec.approvedAt = new Date().toISOString();
              if (typeof didRegistry._saveToDisk === 'function') {
                didRegistry._saveToDisk();
              }
            }
            if (!credentialRegistry.isVerifierApproved(did)) {
              credentialRegistry.approvedVerifiers.add(did);
            }
          }
        });
      };

      applyEnvApprovals(process.env.ALLOWED_ISSUERS, true);
      applyEnvApprovals(process.env.ALLOWED_VERIFIERS, false);

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

// important: expose two endpoints for backwards/shorter path
router.post('/reset-storage', authMiddleware, roleMiddleware('authority'), performReset);
router.post('/reset', authMiddleware, roleMiddleware('authority'), performReset);

// reset blockchain only (preserves DID/credential files)
const resetChainOnly = (req, res, next) => {
  try {
    const { blockchain } = getRegistryInstance();
    const storageDir = path.join(__dirname, '../../storage');
    // support both filenames for backwards or spec reasons
    const filename =
      process.env.NODE_ENV === 'test'
        ? 'blockchain.test.json'
        : 'blockchain.json';
    const altFilename = process.env.NODE_ENV === 'test' ? 'chain.test.json' : 'chain.json';
    const chainFile = path.join(storageDir, filename);
    const altChainFile = path.join(storageDir, altFilename);

    const genesis = Block.genesis();
    blockchain.chain = [genesis];
    if (typeof blockchain.saveChain === 'function') {
      blockchain.saveChain();
    } else {
      writeJsonAtomicSync(chainFile, blockchain.chain);
    }
    // also rewrite alternate filename if present
    if (fs.existsSync(altChainFile)) {
      writeJsonAtomicSync(altChainFile, blockchain.chain);
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

router.post('/reset-chain', authMiddleware, roleMiddleware('authority'), resetChainOnly);

module.exports = router;
