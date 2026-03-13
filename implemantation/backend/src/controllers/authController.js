// ensure environment is validated
require('../config');
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { ethers } = require('ethers')

/**
 * In-memory nonce store
 * address (lowercase) -> { nonce, createdAt }
 */
const nonceStore = new Map()

// JWT_SECRET guaranteed by config
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET not configured');
}

/**
 * POST /api/auth/nonce
 * body: { address }
 */

exports.generateNonce = (req, res) => {
  try {
    const { address } = req.body

    if (!address) {
      return res.status(400).json({ error: 'Wallet address required' })
    }

    const nonce = crypto.randomBytes(16).toString('hex')

    nonceStore.set(address.toLowerCase(), {
      nonce,
      createdAt: Date.now()
    })

    return res.json({ nonce })
  } catch (err) {
    console.error('Generate nonce error:', err)
    return res.status(500).json({ error: 'Failed to generate nonce' })
  }
}

/**
 * POST /api/auth/verify
 * body: { address, signature }
 */
exports.verifyLogin = async (req, res) => {
  try {
    const { address, signature } = req.body

    if (!address || !signature) {
      return res.status(400).json({ error: 'address and signature required' })
    }

    const record = nonceStore.get(address.toLowerCase())

    if (!record) {
      return res.status(400).json({ error: 'Nonce not found' })
    }

    const { nonce, createdAt } = record

    // Expire nonce after 5 minutes
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      nonceStore.delete(address.toLowerCase())
      return res.status(400).json({ error: 'Nonce expired' })
    }

    // 🔥 VERIFY EXACT SAME STRING FRONTEND SIGNED
    const recoveredAddress = ethers.verifyMessage(nonce, signature)


    // normalize both sides to lowercase
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // One-time use nonce
    nonceStore.delete(address.toLowerCase())

    // determine role based on allowed lists -- issuer takes precedence, then verifier, otherwise holder
    let role = 'holder';
    const addrLower = address.toLowerCase();
    // issuer list may come from singular or plural variable name
    const rawIssuerList = process.env.ALLOWED_ISSUERS || process.env.ALLOWED_ISSUER || '';
    if (rawIssuerList) {
      const issuers = rawIssuerList
        .split(',')
        .map(a => a.trim().toLowerCase())
        .filter(a => a.length > 0);
      if (issuers.includes(addrLower)) {
        role = 'issuer';
      }
    }
    // only consider verifier if role wasn't already set to issuer
    if (role === 'holder' && process.env.ALLOWED_VERIFIERS) {
      const verifiers = process.env.ALLOWED_VERIFIERS
        .split(',')
        .map(a => a.trim().toLowerCase());
      if (verifiers.includes(addrLower)) {
        role = 'verifier';
      }
    }

    // normalize address/did stored in token (addrLower already declared above)
    const token = jwt.sign(
      {
        address: addrLower,
        did: `did:ethr:${addrLower}`,
        role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      address: addrLower,
      did: `did:ethr:${addrLower}`,
      role
    })
  } catch (err) {
    console.error('Verify login error:', err)
    return res.status(500).json({ error: 'Login verification failed' })
  }
}
