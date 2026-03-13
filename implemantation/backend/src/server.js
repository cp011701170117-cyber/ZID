// src/server.js
// entry point for backend API with production hardening

// load and validate environment variables
require('./config');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { getRegistryInstance } = require('./blockchain/registryInstance');
// lazily obtain shared instances (will initialise on first call)
const { blockchain, didRegistry, credentialRegistry } = getRegistryInstance();
const chain = blockchain;

const authRoutes = require('./routes/authRoutes');
const createDidRouter = require('./routes/didRoutes');
const createCredentialRouter = require('./routes/credentialRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const createIssuerGovernanceRouter = require('./routes/issuerGovernanceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');
const { CORS_ORIGINS } = require('./config');

const app = express();

// security headers
app.use(helmet());
// disable x-powered-by header
app.disable('x-powered-by');

// rate limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
  })
);

// CORS setup with whitelist
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      // allow non-browser clients or server-to-server
      return callback(null, true);
    }
    // accept if the list contains '*' or the actual origin string
    if (CORS_ORIGINS.includes('*') || CORS_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  }
};
app.use(cors(corsOptions));

// body parsing with size limit
app.use(express.json({ limit: '1mb' }));

// request logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// routes
app.use('/api/auth', authRoutes);
app.use('/api/did', createDidRouter(didRegistry));
app.use('/api/credentials', createCredentialRouter(credentialRegistry));
app.use('/api/protected', protectedRoutes);
app.use('/api/governance', createIssuerGovernanceRouter(didRegistry));
// administrative endpoints (storage reset, etc.)
app.use('/api/admin', adminRoutes);

// public health endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/blockchain', (req, res) => {
  res.json({ chainLength: chain.chain.length, chainValid: chain.isChainValid() });
});

// legacy paths
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', chainLength: chain.chain.length, chainValid: chain.isChainValid() });
});

// blockchain inspection endpoints
app.get('/api/blockchain/validate', (req, res) => {
  res.json({ valid: chain.isChainValid(), length: chain.chain.length });
});

// full chain listing (alias for frontends that want /blockchain)
app.get('/api/blockchain', (req, res) => {
  res.json(chain.chain);
});
app.get('/api/chain', (req, res) => res.json(chain.chain));
app.get('/chain/verify', (req, res) => {
  const isValid = chain.isChainValid();
  res.json({ valid: isValid });
});
app.get('/block/:index/verify', (req, res) => {
  const index = parseInt(req.params.index);
  const block = chain.chain[index];

  if (!block) {
    return res.status(404).json({ error: 'Block not found' });
  }

  const valid = chain.verifyBlockSignature(block);
  res.json({ index, valid });
});

// centralized error handler
app.use(errorHandler);

// start server only when run directly
let server;
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  server = app.listen(PORT, () => console.log(`DID VC backend listening on port ${PORT}`));

  const shutdown = () => {
    console.log('🛑 Shutting down server...');
    if (server) {
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
