const express = require('express');
const router = express.Router();

const {
  generateNonce,
  verifyLogin
} = require('../controllers/authController');

router.get('/nonce', generateNonce);
router.post('/verify', verifyLogin);

module.exports = router;
