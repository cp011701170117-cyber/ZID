const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { addJson } = require('./ipfsClient');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function createVerifiableCredential({ issuerDid, subjectDid, claims, type, expirationDate }) {
  const now = new Date().toISOString();
  const id = `urn:uuid:${uuidv4()}`;
  const vc = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id,
    type: [type || 'VerifiableCredential'],
    issuer: issuerDid,
    issuanceDate: now,
    credentialSubject: {
      id: subjectDid,
      ...claims
    }
  };
  
  if (expirationDate) {
    vc.expirationDate = expirationDate;
  }
  
  return vc;
}

async function persistCredentialOffChain(vc) {
  const cid = await addJson(vc);
  const vcString = JSON.stringify(vc);
  const hash = sha256(vcString);
  return { cid, hash };
}

module.exports = {
  createVerifiableCredential,
  persistCredentialOffChain,
  sha256
};

