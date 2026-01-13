const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class DIDRegistry {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this._dids = new Map(); // did -> { publicKey, createdAt, updatedAt }
  }

  generateDID(publicKeyPem) {
    const hash = crypto.createHash('sha256').update(publicKeyPem).digest('hex');
    return `did:custom:${hash}`;
  }

  registerDID(did, publicKey) {
    const timestamp = Date.now();

    const record = {
      did,
      publicKey,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    this._dids.set(did, record);

    this.blockchain.addBlock({
      type: 'DID',
      payload: {
        op: 'REGISTER',
        ...record
      }
    });

    return record;
  }

  resolveDID(did) {
    return this._dids.get(did) || null;
  }

  rotateKey(did, newPublicKeyPem) {
    const existing = this._dids.get(did);
    if (!existing) throw new Error('DID not found');
    const timestamp = Date.now();
    const updated = {
      ...existing,
      publicKeyPem: newPublicKeyPem,
      updatedAt: timestamp
    };
    this._dids.set(did, updated);

    this.blockchain.addBlock({
      type: 'DID',
      payload: {
        op: 'ROTATE_KEY',
        did,
        newPublicKeyPem,
        updatedAt: timestamp
      }
    });

    return updated;
  }
}

module.exports = DIDRegistry;

