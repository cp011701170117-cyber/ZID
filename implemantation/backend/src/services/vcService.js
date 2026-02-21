const { signData, verifySignature } = require('./cryptoService');
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

  // 🔐 SIGNING PART (IMPORTANT)
  const unsignedVc = { ...vc };

  const signature = signData(unsignedVc);

  vc.proof = {
    type: "RsaSignature2018",
    created: new Date().toISOString(),
    proofPurpose: "assertionMethod",
    verificationMethod: `${issuerDid}#keys-1`,
    jws: signature
  };

  return vc;
}

async function persistCredentialOffChain(vc) {
  const { proof, ...unsignedVc } = vc;

  const vcString = JSON.stringify(unsignedVc);
  const hash = sha256(vcString);

  const cid = await addJson(vc);

  return { cid, hash };
}

function verifyCredential(vc) {
  const { proof, ...unsignedVc } = vc;

  if (!proof || !proof.jws) {
    return { verified: false, reason: "Missing signature proof" };
  }

  const isValid = verifySignature(unsignedVc, proof.jws);

  if (!isValid) {
    return { verified: false, reason: "Invalid RSA signature" };
  }

  return { verified: true };
}


module.exports = {
  createVerifiableCredential,
  persistCredentialOffChain,
  verifyCredential,
  sha256
};

