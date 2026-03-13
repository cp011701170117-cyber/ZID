// ensure environment is validated
require('../config');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

// JWT_SECRET ensured by config
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET not configured');
}

// Separate nonce store for verifier
const verifierNonceStore = new Map();

/**
 * POST /api/auth/verifier/nonce
 * body: { address }
 */
exports.generateVerifierNonce = (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');

    verifierNonceStore.set(address.toLowerCase(), {
      nonce,
      createdAt: Date.now()
    });

    return res.json({ nonce });
  } catch (err) {
    console.error('Verifier nonce error:', err);
    return res.status(500).json({ error: 'Failed to generate verifier nonce' });
  }
};

/**
 * POST /api/auth/verifier/verify
 * body: { address, signature }
 */
// helper to inspect registry state (lazy import avoids circular)
const { getRegistryInstance } = require('../blockchain/registryInstance');

exports.verifyVerifierLogin = async (req, res) => {
  try {
    let { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ error: 'address and signature required' });
    }

    address = address.toLowerCase();
    const record = verifierNonceStore.get(address);

    if (!record) {
      return res.status(400).json({ error: 'Nonce not found' });
    }

    const { nonce, createdAt } = record;

    // ⏱ Expire nonce after 5 minutes
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      verifierNonceStore.delete(address.toLowerCase());
      return res.status(400).json({ error: 'Nonce expired' });
    }

    const recovered = ethers.verifyMessage(nonce, signature);

    if (recovered.toLowerCase() !== address) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 🔐 WHITELIST VERIFIER WALLET
    // support either ALLOWED_VERIFIERS or ALLOWED_VERIFIER_WALLETS
    let allowed = process.env.ALLOWED_VERIFIERS || process.env.ALLOWED_VERIFIER_WALLETS;
    if (!allowed) {
      return res.status(500).json({ error: 'Verifier whitelist not configured' });
    }

    const verifierList = allowed
      .split(',')
      .map(i => i.trim().toLowerCase());

    if (!verifierList.includes(address)) {
      return res.status(403).json({ error: 'Not authorized as verifier' });
    }

    // One-time use nonce
    verifierNonceStore.delete(address.toLowerCase());

    // determine whether this DID is already marked approved in registry
    const did = `did:ethr:${address}`;
    const { didRegistry } = getRegistryInstance();
    const approved = didRegistry.isApprovedVerifier(did);

    const token = jwt.sign(
      {
        address,
        did,
        role: 'verifier'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      address,
      did,
      role: 'verifier',
      approved
    });
  } catch (err) {
    console.error('Verifier verify error:', err);
    return res.status(500).json({ error: 'Verifier login failed' });
  }
};

/**
 * GET /api/auth/verifier/status
 * requires a valid bearer token; returns approval state of DID
 */
exports.getVerifierStatus = (req, res) => {
  try {
    const did = req.user && req.user.did;
    if (!did) {
      return res.status(400).json({ error: 'Missing DID in token' });
    }
    const { didRegistry } = getRegistryInstance();
    const approved = didRegistry.isApprovedVerifier(did);
    return res.json({ approved });
  } catch (err) {
    console.error('Verifier status error:', err);
    return res.status(500).json({ error: 'Failed to determine status' });
  }
};