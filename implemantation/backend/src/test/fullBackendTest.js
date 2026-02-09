// src/test/fullBackendTest.js

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

// 🔥 Backend modules
const {
  blockchain,
  didRegistry,
  credentialRegistry
} = require('../blockchain/registryInstance');

const { uploadToIPFS } = require('../services/ipfsService');
const {
  createVerifiableCredential,
  persistCredentialOffChain,
  sha256
} = require('../services/vcService');

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_LATER';

// ------------------ IPFS TEST ------------------
async function testIPFS() {
  console.log('--- IPFS Upload Test ---');

  const filePath = path.join(__dirname, 'testfile.txt');

  // auto-create test file
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'IPFS test content');
  }

  const result = await uploadToIPFS(filePath, 'testfile.txt');
  console.log('✅ IPFS upload success:', result);
  return result.cid;
}

// ------------------ DID TEST ------------------
function testDIDRegistry() {
  console.log('--- DID Registry Test ---');

  const wallet = ethers.Wallet.createRandom();
  let didRecord = didRegistry.getDIDByAddress(wallet.address);

  if (!didRecord) {
    didRecord = didRegistry.registerDID({
      address: wallet.address,
      did: didRegistry.generateDIDFromAddress(wallet.address)
    });
  }

  console.log('✅ DID Record:', didRecord);
  return didRecord;
}

// ------------------ CREDENTIAL TEST ------------------
async function testCredentialRegistry(didRecord) {
  console.log('--- Credential Registry Test ---');

  const vc = createVerifiableCredential({
    issuerDid: 'did:custom:issuer',
    subjectDid: didRecord.did,
    type: 'TestCredential',
    claims: { score: 100 }
  });

  const { cid, hash } = await persistCredentialOffChain(vc);

  const anchor = credentialRegistry.addCredentialHash({
    credentialId: vc.id,
    hash,
    issuerDid: vc.issuer,
    subjectDid: didRecord.did
  });

  console.log('✅ Credential Issued:', { vcId: vc.id, cid, hash, anchor });

  const fetched = credentialRegistry.getCredentialsBySubject(didRecord.did);
  console.log('✅ Fetch credentials by subject:', fetched);

  const verified = credentialRegistry.verifyExistence(vc.id, hash);
  console.log('✅ Verify credential hash:', verified);

  const revoked = credentialRegistry.revokeCredential(vc.id);
  console.log('✅ Revoked credential:', revoked);

  return vc;
}

// ------------------ AUTH TEST ------------------
async function testAuthFlow(didRecord) {
  console.log('--- Auth Flow Test ---');

  const nonce = crypto.randomBytes(16).toString('hex');
  const wallet = ethers.Wallet.createRandom();
  const signature = await wallet.signMessage(nonce);

  console.log('Nonce:', nonce);
  console.log('Signature:', signature);

  const token = jwt.sign(
    { address: wallet.address, did: didRecord.did },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  console.log('✅ JWT Token:', token);
}

// ------------------ RUN ALL ------------------
async function runAllTests() {
  await testIPFS();
  const didRecord = testDIDRegistry();
  await testCredentialRegistry(didRecord);
  await testAuthFlow(didRecord);

  console.log('--- All tests completed ---');
}

runAllTests().catch(console.error);
