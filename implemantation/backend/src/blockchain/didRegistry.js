const fs = require('fs');
const path = require('path');
const { writeJsonAtomicSync } = require('../storage/storageService');

class DIDRegistry {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this._dids = new Map();

    this.storageDir = path.join(__dirname, '../../storage');
    this.storagePath = path.join(this.storageDir, 'dids.json')
    
    this._ensureStorage();
    this._loadFromDisk();
  }
  _ensureStorage() {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }

    if (!fs.existsSync(this.storagePath)) {
      writeJsonAtomicSync(this.storagePath, []);
    }
  }

    _loadFromDisk() {
    try {
      const raw = fs.readFileSync(this.storagePath, 'utf-8')
      const records = JSON.parse(raw)

      for (const record of records) {
        this._dids.set(record.did, record)
      }
    } catch (err) {
      console.error('⚠️ Failed to load DID storage:', err.message)
    }
  }


  _saveToDisk() {
    const records = Array.from(this._dids.values());
    writeJsonAtomicSync(this.storagePath, records);
  }

  generateDIDFromAddress(address) {
    return `did:custom:${address.toLowerCase()}`;
  }

  getDIDByAddress(address) {
    address = address.toLowerCase();
    for (const record of this._dids.values()) {
      if (record.address === address) return record;
    }
    return null;
  }

  registerDID({ did, publicKeyPem, address }) {
    // normalize inputs so lookups are case-insensitive
    if (typeof did === 'string') {
      did = did.toLowerCase();
    }
    if (typeof address === 'string') {
      address = address.toLowerCase();
    }

    if (this._dids.has(did)) {
      return this._dids.get(did) // idempotent
    }

    const timestamp = Date.now()

    const record = {
      did,
      address,
      publicKeyPem,
      createdAt: timestamp,
      updatedAt: timestamp
    }

    this._dids.set(did, record)
    this._saveToDisk()

    this.blockchain.addBlock({
      type: 'DID',
      payload: {
        op: 'REGISTER',
        ...record
      }
    })

    return record
  }


  resolveDID(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    return this._dids.get(did) || null;
  }
  /* =====================================================
   REVOKE DID
===================================================== */
revokeDID(did, reason = 'No reason provided') {
  const record = this._dids.get(did);
  if (!record) return null;

  // mark as revoked
  record.revoked = true;
  record.revokedReason = reason;
  record.revokedAt = Date.now();

  this._saveToDisk();

  // anchor on blockchain
  this.blockchain.addBlock({
    type: 'DID',
    payload: {
      op: 'REVOKE',
      did,
      reason,
      timestamp: record.revokedAt
    }
  });

  return record;
}

/* =====================================================
   ROTATE DID PUBLIC KEY
===================================================== */
rotateDIDKey(did, newPublicKeyPem) {
  const record = this._dids.get(did);
  if (!record || record.revoked) return null;

  const oldKey = record.publicKeyPem;
  record.publicKeyPem = newPublicKeyPem;
  record.updatedAt = Date.now();

  this._saveToDisk();

  // anchor on blockchain
  this.blockchain.addBlock({
    type: 'DID',
    payload: {
      op: 'ROTATE_KEY',
      did,
      oldKey,
      newKey: newPublicKeyPem,
      timestamp: record.updatedAt
    }
  });

  return record;
}


  /* =====================================================
    CHECK IF DID IS REVOKED
  ===================================================== */
  isRevoked(did) {
    const record = this._dids.get(did);
    return record ? !!record.revoked : false;
  }
 
  // Approve issuer role
  approveIssuer(did, approvedBy) {
    const record = this.resolveDID(did);

    if (!record) {
      return { error: "DID not found" };
    }

    record.role = "issuer";
    record.approved = true;
    record.approvedBy = approvedBy;
    record.approvedAt = new Date().toISOString();

    // persist the updated record
    this._saveToDisk();

    this.blockchain.addBlock({
      type: "ISSUER_APPROVED",
      did,
      approvedBy
    });

    return record;
  }

  // Check if DID is approved issuer
  isApprovedIssuer(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    const record = this.resolveDID(did);
    return record && record.role === "issuer" && record.approved === true;
  }
  approveVerifier(did, approvedBy) {
    const record = this.resolveDID(did);

    if (!record) {
      return { error: "DID not found" };
    }

    record.role = "verifier";
    record.approved = true;
    record.approvedBy = approvedBy;
    record.approvedAt = new Date().toISOString();

    this._saveToDisk();

    this.blockchain.addBlock({
      type: "VERIFIER_APPROVED",
      did,
      approvedBy
    });

    return record;
  }

  isApprovedVerifier(did) {
    if (typeof did === 'string') did = did.toLowerCase();
    const record = this.resolveDID(did);
    return record && record.role === "verifier" && record.approved === true;
  }

}

module.exports = DIDRegistry;
