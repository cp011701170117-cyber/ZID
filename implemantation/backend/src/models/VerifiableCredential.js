import crypto from 'crypto';

export function createVerifiableCredential({
  issuerDid,
  subjectDid,
  credentialType,
  claims,
  ipfsCid
}) {
  const vc = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: `vc:${crypto.randomUUID()}`,
    type: ['VerifiableCredential', credentialType],
    issuer: issuerDid,
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: subjectDid,
      claims
    },
    evidence: {
      type: 'IPFS',
      cid: ipfsCid
    }
  };

  return vc;
}

export function hashCredential(vc) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(vc))
    .digest('hex');
}
