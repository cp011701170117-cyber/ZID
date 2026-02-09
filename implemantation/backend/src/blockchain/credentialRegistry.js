// src/services/credentialRegistry.js
const fs = require('fs')
const path = require('path')

class CredentialRegistry {
  constructor(blockchain) {
    this.blockchain = blockchain
    this._credentials = new Map()

    this.storageDir = path.join(__dirname, '../../storage')
    this.storagePath = path.join(this.storageDir, 'credentials.json')

    this._ensureStorage()
    this._loadFromDisk()
  }

  _ensureStorage() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }

    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(
        this.storagePath,
        JSON.stringify([], null, 2)
      )
    }
  }

  _loadFromDisk() {
    try {
      const raw = fs.readFileSync(this.storagePath, 'utf-8')
      const records = JSON.parse(raw)

      for (const cred of records) {
        this._credentials.set(cred.id, cred)
      }
    } catch (err) {
      console.error('⚠️ Failed to load credentials:', err.message)
    }
  }

  _saveToDisk() {
    fs.writeFileSync(
      this.storagePath,
      JSON.stringify([...this._credentials.values()], null, 2)
    )
  }

  issueCredential({ issuerDid, subjectDid, type, claims }) {
    const id = `vc:${Date.now()}`

    const credential = {
      id,
      type,
      issuer: issuerDid,
      subjectDid,
      claims,
      issuanceDate: new Date().toISOString(),
      revoked: false
    }

    this._credentials.set(id, credential)
    this._saveToDisk()

    // Anchor credential hash on blockchain
    this.blockchain.addBlock({
      type: 'VC',
      payload: {
        op: 'ISSUE',
        credentialId: id,
        issuer: issuerDid,
        subject: subjectDid
      }
    })

    return credential
  }

  addCredentialHash({ credentialId, hash, issuerDid, subjectDid }) {
    const tx = {
      type: 'CREDENTIAL_ISSUED',
      vcId: credentialId,
      vcHash: hash,
      issuerDid,
      subjectDid,
      timestamp: Date.now()
    };

    this.blockchain.addBlock([tx]);
    return tx;
  }

  getCredentialsBySubject(subjectDid) {
    const results = [];

    for (const block of this.blockchain.chain) {
      if (!Array.isArray(block.data)) continue;

      for (const tx of block.data) {
        if (
          tx.type === 'CREDENTIAL_ISSUED' &&
          tx.subjectDid === subjectDid
        ) {
          results.push(tx);
        }
      }
    }

    return results;
  }


  getCredentialHash(vcId) {
    for (const block of this.blockchain.chain) {
      const data = Array.isArray(block.data)
        ? block.data
        : [block.data]; // 🔥 normalize

      for (const tx of data) {
        if (
          tx &&
          tx.type === 'CREDENTIAL_ISSUED' &&
          tx.vcId === vcId
        ) {
          return tx.vcHash;
        }
      }
    }
    return null;
  }


  revokeCredential(credentialId) {
      const cred = this._credentials.get(credentialId)
      if (!cred) return null

      cred.revoked = true
      this._saveToDisk()

      this.blockchain.addBlock({
        type: 'VC',
        payload: {
          op: 'REVOKE',
          credentialId
        }
      })

      return cred
    }
    verifyExistence(vcId, computedHash) {
    const storedHash = this.getCredentialHash(vcId);

    if (!storedHash) {
      return {
        exists: false,
        reason: 'Credential not anchored on blockchain'
      };
    }

    if (storedHash !== computedHash) {
      return {
        exists: false,
        reason: 'Hash mismatch'
      };
    }

    return {
      exists: true,
      reason: 'Credential verified successfully'
    };
  }
  /**
 * ✅ Unified verification entry point
 * Used by routes, tests, frontend, and panel
 */
  verifyCredential({ credentialId, vc }) {
    if (!credentialId || !vc) {
      throw new Error('credentialId and vc are required');
    }

    const canonicalize = require('canonicalize');
    const crypto = require('crypto');

    const vcString = canonicalize(vc);
    const computedHash = crypto
      .createHash('sha256')
      .update(vcString)
      .digest('hex');

    const result = this.verifyExistence(credentialId, computedHash);

    return {
      credentialId,
      computedHash,
      ...result
    };
  }


}

// ✅ CommonJS export
module.exports = CredentialRegistry
