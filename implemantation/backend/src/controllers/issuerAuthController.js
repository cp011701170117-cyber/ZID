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

// Separate nonce store for issuer
const issuerNonceStore = new Map();

/**
 * POST /api/auth/issuer/nonce
 * body: { address }
 */
exports.generateIssuerNonce = (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');

    issuerNonceStore.set(address.toLowerCase(), {
      nonce,
      createdAt: Date.now()
    });

    return res.json({ nonce });

  } catch (err) {
    console.error('Issuer nonce error:', err);
    return res.status(500).json({ error: 'Failed to generate issuer nonce' });
  }
};


/**
 * POST /api/auth/issuer/verify
 * body: { address, signature }
 */
exports.verifyIssuerLogin = async (req, res) => {
  try {
    let { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ error: 'address and signature required' });
    }

    // normalize address for comparisons; Ethereum addresses are case insensitive
    address = address.toLowerCase();
    const record = issuerNonceStore.get(address);

    if (!record) {
      return res.status(400).json({ error: 'Nonce not found' });
    }

    const { nonce, createdAt } = record;

    // ⏱ Expire nonce after 5 minutes
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      issuerNonceStore.delete(address.toLowerCase());
      return res.status(400).json({ error: 'Nonce expired' });
    }

    const recovered = ethers.verifyMessage(nonce, signature);

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 🔐 WHITELIST ISSUER WALLET (CRITICAL SECURITY)
    // support either singular or plural environment variable name
    const rawAllowed = process.env.ALLOWED_ISSUERS || process.env.ALLOWED_ISSUER;
    if (!rawAllowed) {
      return res.status(500).json({ error: 'Issuer whitelist not configured' });
    }

    const issuerList = rawAllowed
      .split(',')
      .map(addr => addr.trim().toLowerCase())
      .filter(a => a.length > 0);

    if (!issuerList.includes(address.toLowerCase())) {
      return res.status(403).json({ error: 'Not authorized as issuer' });
    }

    // One-time use nonce
    issuerNonceStore.delete(address.toLowerCase());

    // ------------------------------------------------------------------
    // make sure the DID exists in our registries and is approved
    // previously the DID/issuer approval was managed separately by an
    // authority node; failing to do so resulted in 403 when issuing
    // credentials even though the JWT was valid.  Automatically
    // register/approve here so that a freshly‑logged‑in (and whitelisted)
    // issuer can immediately issue credentials.
    // ------------------------------------------------------------------
    const { getRegistryInstance } = require('../blockchain/registryInstance');
    const { didRegistry, credentialRegistry } = getRegistryInstance();
    const issuerDid = `did:ethr:${address}`;

    // register the DID if it's not yet known
    if (!didRegistry.resolveDID(issuerDid)) {
      didRegistry.registerDID({
        did: issuerDid,
        publicKeyPem: null,
        address
      });
    }

    // mark as approved in both registries if not already
    if (!didRegistry.isApprovedIssuer(issuerDid)) {
      const authorityAddress = process.env.VALIDATOR_ID || 'AUTHORITY_NODE';
      const authorityDid = didRegistry.generateDIDFromAddress(authorityAddress);
      didRegistry.approveIssuer(issuerDid, authorityDid);
    }
    if (!credentialRegistry.isIssuerApproved(issuerDid)) {
      credentialRegistry.approveIssuer(issuerDid);
    }

    // token should carry lowercase address and did for consistency
    const token = jwt.sign(
      {
        address,
        did: issuerDid,
        role: 'issuer'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      address,
      did: issuerDid,
      role: 'issuer'
    });

  } catch (err) {
    console.error('Issuer verify error:', err);
    return res.status(500).json({ error: 'Issuer login failed' });
  }
};