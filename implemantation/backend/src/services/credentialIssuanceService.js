const crypto = require('crypto');
const canonicalize = require('canonicalize');
const { createVerifiableCredential } = require('../models/VerifiableCredential');
const { signData } = require('./cryptoService');
const { uploadJSONToIPFS } = require('./ipfsService');

function buildSignedCredential({ issuerDid, subjectDid, credentialType, claims, expirationDate }) {
  const vc = createVerifiableCredential({
    issuerDid,
    subjectDid,
    credentialType,
    claims
  });

  if (expirationDate) {
    vc.expirationDate = expirationDate;
  }

  const unsignedVc = { ...vc };
  delete unsignedVc.proof;

  vc.proof = {
    type: 'RsaSignature2018',
    created: new Date().toISOString(),
    proofPurpose: 'assertionMethod',
    verificationMethod: `${issuerDid}#key-1`,
    algorithm: 'RSA-SHA256',
    jws: signData(unsignedVc)
  };

  return vc;
}

async function finalizeCredentialIssuance({ workflow, credentialRegistry }) {
  const existing = credentialRegistry.getCredentialMeta(workflow.vc.id);
  if (existing) {
    return {
      alreadyIssued: true,
      vc: workflow.vc,
      vcHash: existing.vcHash,
      ipfsCid: existing.cid,
      anchor: existing
    };
  }

  const canonical = canonicalize(workflow.vc);
  const vcHash = crypto
    .createHash('sha256')
    .update(canonical)
    .digest('hex');

  const ipfsResult = process.env.NODE_ENV === 'test'
    ? { cid: `test-${vcHash.slice(0, 24)}` }
    : await uploadJSONToIPFS(workflow.vc);

  const anchor = credentialRegistry.addCredentialHash({
    credentialId: workflow.vc.id,
    hash: vcHash,
    cid: ipfsResult.cid,
    issuerDid: workflow.issuerDid,
    subjectDid: workflow.subjectDid,
    expirationDate: workflow.vc.expirationDate,
    vc: workflow.vc
  });

  return {
    alreadyIssued: false,
    vc: workflow.vc,
    vcHash,
    ipfsCid: ipfsResult.cid,
    anchor
  };
}

module.exports = {
  buildSignedCredential,
  finalizeCredentialIssuance
};
