require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const Blockchain = require('./blockchain/blockchain');
const DIDRegistry = require('./blockchain/didRegistry');
const CredentialRegistry = require('./blockchain/credentialRegistry');

const createDidRouter = require('./routes/didRoutes');
const createCredentialRouter = require('./routes/credentialRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Instantiate in-memory blockchain and registries.
const chain = new Blockchain(process.env.VALIDATOR_ID || 'AUTHORITY_NODE');
const didRegistry = new DIDRegistry(chain);
const credentialRegistry = new CredentialRegistry(chain);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    chainLength: chain.chain.length,
    chainValid: chain.isChainValid()
  });
});

app.use('/api/did', createDidRouter(didRegistry));
app.use('/api/credentials', createCredentialRouter(credentialRegistry));

// Expose chain for debugging / academic explanation (no secrets stored).
app.get('/api/chain', (req, res) => {
  res.json(chain.chain);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`DID VC backend listening on port ${PORT}`);
});

module.exports = app;

