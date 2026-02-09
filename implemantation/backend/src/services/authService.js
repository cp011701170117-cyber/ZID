const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_later';
const NONCE_TTL = 5 * 60 * 1000; // 5 minutes

// In-memory nonce store (no DB, restart-safe logic)
const nonceStore = new Map();

/**
 * Generate a nonce for a wallet
 */
function generateNonce(publicKey) {
  const nonce = crypto.randomBytes(16).toString('hex');

  nonceStore.set(publicKey.toLowerCase(), {
    nonce,
    expiresAt: Date.now() + NONCE_TTL
  });

  return nonce;
}

/**
 * Verify signed nonce and issue JWT
 */
function verifySignature(publicKey, signature) {
  const entry = nonceStore.get(publicKey.toLowerCase());
  if (!entry) throw new Error('Nonce not found');

  if (Date.now() > entry.expiresAt) {
    nonceStore.delete(publicKey.toLowerCase());
    throw new Error('Nonce expired');
  }

  const message = `Login to ZID: ${entry.nonce}`;
  const recovered = ethers.verifyMessage(message, signature);

  if (recovered.toLowerCase() !== publicKey.toLowerCase()) {
    throw new Error('Signature verification failed');
  }

  nonceStore.delete(publicKey.toLowerCase());

  const token = jwt.sign(
    { publicKey },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return token;
}

module.exports = {
  generateNonce,
  verifySignature
};
