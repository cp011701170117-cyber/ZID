// enforce test environment early
process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

// generate wallets up front (addresses used for DIDs)
const issuerWallet = ethers.Wallet.createRandom();
const verifierWallet = ethers.Wallet.createRandom();
const badVerifierWallet = ethers.Wallet.createRandom();
const subjectWallet = ethers.Wallet.createRandom();

// allow lists must be set before server modules initialize
process.env.ALLOWED_ISSUERS = issuerWallet.address;
process.env.ALLOWED_VERIFIERS = verifierWallet.address;

// ensure clean storage state so tests are deterministic
const storageDir = path.join(__dirname, '../storage');
if (fs.existsSync(storageDir)) {
  fs.rmSync(storageDir, { recursive: true, force: true });
}

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/server');

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_LATER';

function makeToken(address, role) {
  return jwt.sign(
    { address, did: `did:ethr:${address}`, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Credential issuance & verification flow', () => {
  let issuerToken;
  let goodVerifierToken;
  let badVerifierToken;
  let authorityToken;

  beforeAll(() => {
    issuerToken = makeToken(issuerWallet.address, 'issuer');
    goodVerifierToken = makeToken(verifierWallet.address, 'verifier');
    badVerifierToken = makeToken(badVerifierWallet.address, 'verifier');
    authorityToken = makeToken(issuerWallet.address, 'authority');
  });

  test('issues and verifies valid credential', async () => {
    // issue
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { value: 42 }
      });

    expect(issueRes.status).toBe(201);
    const vc = issueRes.body.vc;
    expect(vc).toBeDefined();

    // verify issuer-specific listing endpoint
    const listRes = await request(app)
      .get(`/api/credentials/issuer/did:ethr:${issuerWallet.address}`)
      .set('Authorization', `Bearer ${issuerToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.credentials)).toBe(true);
    expect(listRes.body.credentials.find(c => c.vcId === vc.id)).toBeDefined();

    // verify
    const verifyRes = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${goodVerifierToken}`)
      .send({ vc });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);
    expect(verifyRes.body.revoked).toBe(false);
    expect(verifyRes.body.expired).toBe(false);
    expect(verifyRes.body.vcId).toBe(vc.id);
  });

  test('can verify by vcId alone', async () => {
    // issue a fresh credential
    const resp = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { foo: 'bar' }
      },15000);
    expect(resp.status).toBe(201);
    const vc2 = resp.body.vc;

    const verifyById = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${goodVerifierToken}`)
      .send({ vcId: vc2.id });

    expect(verifyById.status).toBe(200);
    expect(verifyById.body.valid).toBe(true);
    expect(verifyById.body.vcId).toBe(vc2.id);
  });

  test('returns 404 when vcId not found', async () => {
    const badIdRes = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${goodVerifierToken}`)
      .send({ vcId: 'vc:nonexistent' });

    expect(badIdRes.status).toBe(404);
    expect(badIdRes.body.valid).toBe(false);
    expect(badIdRes.body.reason).toBe('Credential not found');
  });

  test('fails verification if tampered', async () => {
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { value: 100 }
      });
    expect(issueRes.status).toBe(201);
    const vc = issueRes.body.vc;

    // tamper claim inside credentialSubject to match real VC structure
    vc.credentialSubject.claims.value = 999;

    const verifyRes = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${goodVerifierToken}`)
      .send({ vc });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(false);
    expect(verifyRes.body.revoked).toBe(false);
    expect(verifyRes.body.expired).toBe(false);
    expect(verifyRes.body.reason).toBe('Credential tampered');
  });

  test('fails verification if revoked', async () => {
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { score: 1 }
      });
    expect(issueRes.status).toBe(201);
    const vc = issueRes.body.vc;

    // revoke it
    const revokeRes = await request(app)
      .post('/api/credentials/revoke')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({ vcId: vc.id });
    expect(revokeRes.status).toBe(200);
    expect(revokeRes.body.success).toBe(true);

    const verifyRes = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${goodVerifierToken}`)
      .send({ vc });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(false);
    expect(verifyRes.body.revoked).toBe(true);
    expect(verifyRes.body.expired).toBe(false);
    expect(verifyRes.body.reason).toBe('Credential revoked');
  });

  test('fails if verifier not approved', async () => {
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { foo: 'bar' }
      });
    expect(issueRes.status).toBe(201);
    const vc = issueRes.body.vc;

    const verifyRes = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${badVerifierToken}`)
      .send({ vc });

    expect(verifyRes.status).toBe(403);
    expect(verifyRes.body.valid).toBe(false);
    expect(verifyRes.body.reason).toBe('Verifier not approved');
  });

  test('verifier login returns approved and status endpoint works', async () => {
    // simulate the login flow using real endpoints so we can inspect approved flag
    const nonceRes = await request(app)
      .post('/api/auth/verifier/nonce')
      .send({ address: verifierWallet.address });
    expect(nonceRes.status).toBe(200);
    const { nonce } = nonceRes.body;
    const signature = await verifierWallet.signMessage(nonce);

    const loginRes = await request(app)
      .post('/api/auth/verifier/verify')
      .send({ address: verifierWallet.address, signature });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.approved).toBe(true);

    const statusRes = await request(app)
      .get('/api/auth/verifier/status')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.approved).toBe(true);
  });

  test('admin can reset storage and chain', async () => {
    // issue a credential so chain has more than genesis
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { sample: true }
      });
    expect(issueRes.status).toBe(201);

    // perform reset
    const resetRes = await request(app)
      .post('/api/admin/reset-storage')
      .set('Authorization', `Bearer ${authorityToken}`)
      .send();
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // chain should now contain only genesis
    const chainRes = await request(app).get('/api/chain');
    expect(chainRes.status).toBe(200);
    expect(Array.isArray(chainRes.body)).toBe(true);
    expect(chainRes.body.length).toBe(1);
    expect(chainRes.body[0].index).toBe(0);

    // wallet fetch returns empty
    const creds = await request(app).get(`/api/credentials/wallet/did:ethr:${subjectWallet.address}`);
    expect(creds.body.credentials).toEqual([]);
  });

  test('admin can reset blockchain only without wiping storage', async () => {
    // issue a credential so there is data in storage
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { keep: 'chain' }
      });
    expect(issueRes.status).toBe(201);

    // reset chain only
    const chainReset = await request(app)
      .post('/api/admin/reset-chain')
      .set('Authorization', `Bearer ${authorityToken}`)
      .send();
    expect(chainReset.status).toBe(200);
    expect(chainReset.body.success).toBe(true);

    const newChain = await request(app).get('/api/chain');
    expect(newChain.body.length).toBe(1);
    expect(newChain.body[0].index).toBe(0);

    // credentials should still be present for wallet lookups
    const credsAfter = await request(app).get(`/api/credentials/wallet/did:ethr:${subjectWallet.address}`);
    expect(credsAfter.body.credentials.length).toBeGreaterThan(0);
  });

  test('expires credential correctly', async () => {
    const past = new Date(Date.now() - 1000).toISOString();
    const issueRes = await request(app)
      .post('/api/credentials/issue')
      .set('Authorization', `Bearer ${issuerToken}`)
      .send({
        subjectDid: `did:ethr:${subjectWallet.address}`,
        credentialType: 'TestCredential',
        claims: { foo: 'baz' },
        expirationDate: past
      });
    expect(issueRes.status).toBe(201);
    const vc = issueRes.body.vc;

    const verifyRes = await request(app)
      .post('/api/credentials/verify')
      .set('Authorization', `Bearer ${goodVerifierToken}`)
      .send({ vc });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(false);
    expect(verifyRes.body.revoked).toBe(false);
    expect(verifyRes.body.expired).toBe(true);
    expect(verifyRes.body.reason).toBe('Credential expired');
  });
});
