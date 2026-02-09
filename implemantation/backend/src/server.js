require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const Blockchain = require('./blockchain/blockchain');
const DIDRegistry = require('./blockchain/didRegistry');
const CredentialRegistry = require('./blockchain/credentialRegistry');

const authRoutes = require('./routes/authRoutes');
const createDidRouter = require('./routes/didRoutes');
const createCredentialRouter = require('./routes/credentialRoutes'); // now CommonJS
const protectedRoutes = require('./routes/protectedRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Instantiate blockchain + registries
const chain = new Blockchain(process.env.VALIDATOR_ID || 'AUTHORITY_NODE');
const didRegistry = new DIDRegistry(chain);
const credentialRegistry = new CredentialRegistry(chain);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/did', createDidRouter(didRegistry));
app.use('/api/credentials', createCredentialRouter(credentialRegistry));
app.use('/api/protected', protectedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', chainLength: chain.chain.length, chainValid: chain.isChainValid() });
});

// Expose blockchain
app.get('/api/chain', (req, res) => res.json(chain.chain));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`DID VC backend listening on port ${PORT}`));

module.exports = app;
