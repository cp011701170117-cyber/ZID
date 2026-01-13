class CredentialRegistry {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this._credentials = new Map(); // credId -> { hash, issuerDid, subjectDid, status, issuedAt, revokedAt }
  }

  storeCredentialHash({ credentialId, hash, issuerDid, subjectDid }) {
    const issuedAt = Date.now();
    const record = {
      credentialId,
      hash,
      issuerDid,
      subjectDid,
      status: 'ACTIVE',
      issuedAt,
      revokedAt: null
    };
    this._credentials.set(credentialId, record);

    this.blockchain.addBlock({
      type: 'VC',
      payload: {
        op: 'ISSUE',
        ...record
      }
    });

    return record;
  }

  revokeCredential(credentialId, reason) {
    const existing = this._credentials.get(credentialId);
    if (!existing) throw new Error('Credential not found');
    const revokedAt = Date.now();
    const updated = {
      ...existing,
      status: 'REVOKED',
      revokedAt,
      revokeReason: reason || 'unspecified'
    };
    this._credentials.set(credentialId, updated);

    this.blockchain.addBlock({
      type: 'VC',
      payload: {
        op: 'REVOKE',
        credentialId,
        revokedAt,
        reason: updated.revokeReason
      }
    });

    return updated;
  }

  getCredentialRecord(credentialId) {
    return this._credentials.get(credentialId) || null;
  }

  verifyExistence(credentialId, hash) {
    const record = this._credentials.get(credentialId);
    if (!record) return { exists: false };
    return {
      exists: true,
      matchesHash: record.hash === hash,
      status: record.status,
      issuedAt: record.issuedAt,
      revokedAt: record.revokedAt
    };
  }

  getCredentialsBySubject(subjectDid) {
    const credentials = [];
    for (const [credentialId, record] of this._credentials.entries()) {
      if (record.subjectDid === subjectDid) {
        // Query blockchain for full record
        const blocks = this.blockchain.queryByPredicate(
          (data) => data.type === 'VC' && 
                     data.payload.credentialId === credentialId
        );
        const latestBlock = blocks[blocks.length - 1];
        
        credentials.push({
          id: credentialId,
          issuer: record.issuerDid,
          type: 'VerifiableCredential', // Would be stored in VC itself
          issuanceDate: new Date(record.issuedAt).toISOString(),
          revoked: record.status === 'REVOKED',
          revokedAt: record.revokedAt ? new Date(record.revokedAt).toISOString() : null
        });
      }
    }
    return credentials;
  }
}

module.exports = CredentialRegistry;

