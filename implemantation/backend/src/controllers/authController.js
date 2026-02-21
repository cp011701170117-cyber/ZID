const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');

/**
 * In-memory nonce store
 * address (lowercase) -> nonce
 */
const nonceStore = new Map();

const JWT_SECRET = process.env.JWT_SECRET || 'DEV_SECRET_CHANGE_LATER';

/**
 * GET /api/auth/nonce?address=0x...
 */
exports.generateNonce = (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    nonceStore.set(address.toLowerCase(), {
      nonce,
      createdAt: Date.now()
    });

    return res.json({ nonce });
  } catch (err) {
    console.error('Generate nonce error:', err);
    return res.status(500).json({ error: 'Failed to generate nonce' });
  }
};

/**
 * POST /api/auth/verify
 * body: { address, signature }
 */
exports.verifyLogin = async (req, res) => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ error: 'address and signature required' });
    }

    if (!nonce) {
      return res.status(400).json({ error: 'Nonce not found' });
    }

    const message = `Login request for DID authentication.\nNonce: ${nonce}`;
    const recoveredAddress = ethers.verifyMessage(message, signature);


    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 🔥 Lazy import to avoid circular dependency
    const { didRegistry } = require('../blockchain/registryInstance');

    let didRecord = didRegistry.getDIDByAddress(address);
    if (didRecord && didRegistry.isRevoked(didRecord.did)) {
      return res.status(403).json({ error: 'DID is revoked' });
    }


    // Auto-register DID if not exists
    if (!didRecord) {
      didRecord = didRegistry.registerDID({
        address,
        did: didRegistry.generateDIDFromAddress(address)
      });
    }

    // One-time nonce usage
    const record = nonceStore.get(address.toLowerCase());
    if (!record) {
      return res.status(400).json({ error: 'Nonce not found' });
    }

    const { nonce, createdAt } = record;

    // Expire nonce after 5 minutes
    if (Date.now() - createdAt > 5 * 60 * 1000) {
      nonceStore.delete(address.toLowerCase());
      return res.status(400).json({ error: 'Nonce expired' });
    }

    const token = jwt.sign(
      {
        address,
        did: didRecord.did
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({
      token,
      address,
      did: didRecord.did
    });
  } catch (err) {
    console.error('Verify login error:', err);
    return res.status(500).json({ error: 'Login verification failed' });
  }
};
