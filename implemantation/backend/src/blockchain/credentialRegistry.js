const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const canonicalize = require('canonicalize');

class CredentialRegistry {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.index = new Map();      // vcId -> issuance tx
    this.revokedIndex = new Set(); // revoked vcIds

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
    subjectDid
  }) {
    const tx = {
      type: 'CREDENTIAL_ISSUED',
      vcId: credentialId,
      vcHash: hash,
      cid: cid || null,
      issuerDid,
      subjectDid,
      timestamp: Date.now(),
      revoked: false
    };

    this.blockchain.addBlock([tx]);
    this.index.set(tx.vcId,tx);
    return tx;
  }

  /* =====================================================
     GET FULL METADATA
  ===================================================== */
  getCredentialMeta(vcId) {
    for (const block of this.blockchain.chain) {
      const data = Array.isArray(block.data)
        ? block.data
        : [block.data];

      for (const tx of data) {
        if (
          tx &&
          tx.type === 'CREDENTIAL_ISSUED' &&
          tx.vcId === vcId
        ) {
          return tx;
        }
      }
    }
    return null;
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
    const results = [];

    for (const block of this.blockchain.chain) {
      const data = Array.isArray(block.data)
        ? block.data
        : [block.data];

      for (const tx of data) {
        if (
          tx &&
          tx.type === 'CREDENTIAL_ISSUED' &&
          tx.subjectDid === subjectDid
        ) {
          results.push(tx);
        }
      }
    }

    return results;
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
        }

        if (tx.type === 'CREDENTIAL_REVOKED') {
          this.revokedIndex.add(tx.vcId);
        }
      }
    }
  }

}

module.exports = CredentialRegistry;
