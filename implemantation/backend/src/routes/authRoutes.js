// src/routes/authRoutes.js

const express = require('express');
const router = express.Router();

const {
  generateNonce,
  verifyLogin
} = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

const {
  generateIssuerNonce,
  verifyIssuerLogin
} = require('../controllers/issuerAuthController');

// POST /api/auth/nonce
router.post('/nonce', generateNonce);

// POST /api/auth/verify (generic wallet login)
router.post('/verify', verifyLogin);
// ISSUER AUTH (separate)
router.post('/issuer/nonce', generateIssuerNonce);
router.post('/issuer/verify', verifyIssuerLogin);

// VERIFIER AUTH (similar to issuer flow)
const {
  generateVerifierNonce,
  verifyVerifierLogin,
  getVerifierStatus
} = require('../controllers/verifierAuthController');

router.post('/verifier/nonce', generateVerifierNonce);
router.post('/verifier/verify', verifyVerifierLogin);
// allow token-based status check for frontend approval display
router.get('/verifier/status', authMiddleware, getVerifierStatus);
module.exports = router;
