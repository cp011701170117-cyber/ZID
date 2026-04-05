const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const canonicalize = require('canonicalize');

class CredentialRegistry {
  constructor(blockchain) {
    this.blockchain = blockchain;
    // indexes for fast lookups
    this.index = new Map(); // vcId -> issuance tx
    this.revokedIndex = new Set(); // revoked vcIds
    this.approvedIssuers = new Set();
    this.approvedVerifiers = new Set();
    this.subjectIndex = new Map(); // subjectDid -> [tx,...]

    this.rebuildIndex();
  }


  /* =====================================================
     ADD CREDENTIAL HASH (Anchor on blockchain)
  ===================================================== */
  addCredentialHash({
    credentialId,
    hash,
    cid,
    issuerDid,
    subjectDid,
    expirationDate,
    vc
  }) {
    // normalize stored identifiers
    if (typeof issuerDid === 'string') issuerDid = issuerDid.toLowerCase();
    if (typeof subjectDid === 'string') subjectDid = subjectDid.toLowerCase();

    const tx = {
      type: 'CREDENTIAL_ISSUED',
      vcId: credentialId,
      vcHash: hash,
      cid: cid || null,
      issuerDid,
      subjectDid,
      expirationDate: expirationDate || null,
      vc: vc || null,
      timestamp: Date.now(),
      revoked: false
    };

    this.blockchain.addBlock([tx]);
    this.index.set(tx.vcId, tx);
    if (subjectDid) {
      const arr = this.subjectIndex.get(subjectDid) || [];
      arr.push(tx);
      this.subjectIndex.set(subjectDid, arr);
    }
    return tx;
  }

  /* =====================================================
     GET FULL METADATA
  ===================================================== */
  getCredentialMeta(vcId) {
    const record = this.index.get(vcId);
    if (!record) return null;
    const copy = { ...record };
    if (this.revokedIndex.has(vcId)) {
      copy.revoked = true;
    }
    return copy;
  }

  /* =====================================================
     GET HASH ONLY (Backward Support)
  ===================================================== */
  getCredentialHash(vcId) {
    const record = this.index.get(vcId);
    return record ? record.vcHash : null;
  }


  /* =====================================================
     GET BY SUBJECT (For Wallet)
  ===================================================== */
  getCredentialsBySubject(subjectDid) {
    const arr = this.subjectIndex.get(subjectDid);
    if (!arr) return [];

    return arr.map((tx) => {
      const copy = { ...tx };
      if (this.revokedIndex.has(tx.vcId)) {
        copy.revoked = true;
      }

      // convenience aliases for frontend code
      copy.id = tx.vcId;
      copy.recipientDID = tx.subjectDid;
      copy.issuanceDate = tx.timestamp;
      if (tx.expirationDate) copy.expirationDate = tx.expirationDate;

      return copy;
    });
  }

  /* =====================================================
     GET BY ISSUER (For Issuer dashboard/history)
  ===================================================== */
  getCredentialsByIssuer(issuerDid) {
    if (typeof issuerDid === 'string') issuerDid = issuerDid.toLowerCase();
    const out = [];
    for (const tx of this.index.values()) {
      if (tx.issuerDid === issuerDid) {
        const copy = { ...tx };
        if (this.revokedIndex.has(tx.vcId)) {
          copy.revoked = true;
        }
        copy.id = tx.vcId;
        copy.recipientDID = tx.subjectDid;
        copy.issuanceDate = tx.timestamp;
        if (tx.expirationDate) copy.expirationDate = tx.expirationDate;
        out.push(copy);
      }
    }
    return out;
  }

  /* =====================================================
     REVOKE CREDENTIAL
  ===================================================== */
  revokeCredential(credentialId, issuerDid, reason = 'No reason provided') {
    const record = this.index.get(credentialId);

    if (!record) {
      return { error: 'Credential not found' };
    }

    if (record.issuerDid !== issuerDid) {
      return { error: 'Only original issuer can revoke this credential' };
    }

    if (this.revokedIndex.has(credentialId)) {
      return { error: 'Credential already revoked' };
    }

    const tx = {
      type: 'CREDENTIAL_REVOKED',
      vcId: credentialId,
      issuerDid,
      reason,
      timestamp: Date.now()
    };

    this.blockchain.addBlock([tx]);
    this.revokedIndex.add(credentialId);

    return tx;
  }

  /* =====================================================
     CHECK REVOCATION
  ===================================================== */
  isRevoked(vcId) {
    return this.revokedIndex.has(vcId);
  }


  /* =====================================================
     VERIFY EXISTENCE (Hash Match)
  ===================================================== */
  verifyExistence(vcId, computedHash) {
    const record = this.index.get(vcId);

    if (!record) {
      return {
        exists: false,
        reason: 'Credential not anchored on blockchain'
      };
    }

    if (this.revokedIndex.has(vcId)) {
      return {
        exists: false,
        reason: 'Credential revoked'
      };
    }

    if (record.vcHash !== computedHash) {
      return {
        exists: false,
        reason: 'Hash mismatch (tampered)'
      };
    }

    return {
      exists: true,
      reason: 'Credential verified successfully'
    };
  }

  /* =====================================================
     INDUSTRY-LEVEL VERIFY (Canonical Hash)
  ===================================================== */
  verifyCredential({ credentialId, vc }) {
    if (!credentialId || !vc) {
      throw new Error('credentialId and vc are required');
    }

    // expiry check (only mark expired when a valid past date is provided)
    if (vc.expirationDate) {
      const exp = new Date(vc.expirationDate);
      if (!isNaN(exp.getTime()) && exp < new Date()) {
        return {
          credentialId,
          computedHash: null,
          exists: false,
          reason: 'Credential expired'
        };
      }
    }

    const canonical = canonicalize(vc);
    const computedHash = crypto
      .createHash('sha256')
      .update(canonical)
      .digest('hex');

    const result = this.verifyExistence(
      credentialId,
      computedHash
    );

    return {
      credentialId,
      computedHash,
      ...result
    };
  }
  rebuildIndex() {
    for (const block of this.blockchain.chain) {
      const data = Array.isArray(block.data)
        ? block.data
        : [block.data];

      for (const tx of data) {
        if (!tx) continue;

        if (tx.type === 'CREDENTIAL_ISSUED') {
          this.index.set(tx.vcId, tx);
          if (tx.subjectDid) {
            const arr = this.subjectIndex.get(tx.subjectDid) || [];
            arr.push(tx);
            this.subjectIndex.set(tx.subjectDid, arr);
          }
        }

        if (tx.type === 'CREDENTIAL_REVOKED') {
          this.revokedIndex.add(tx.vcId);
        }

        // rebuild approval indexes
        if (tx.type === 'ISSUER_APPROVED' && tx.did) {
          this.approvedIssuers.add(tx.did);
        }

        if (tx.type === 'VERIFIER_APPROVED' && tx.did) {
          this.approvedVerifiers.add(tx.did);
        }
      }
    }
  }

  approveIssuer(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    this.approvedIssuers.add(did);
  }

  isIssuerApproved(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    return this.approvedIssuers.has(did);
  }

  approveVerifier(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    this.approvedVerifiers.add(did);
  }

  isVerifierApproved(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    return this.approvedVerifiers.has(did);
  }

}

module.exports = CredentialRegistry;
