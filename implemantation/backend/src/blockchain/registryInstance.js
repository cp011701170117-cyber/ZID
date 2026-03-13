// lazily created registry instances to avoid filesystem side-effects on import
let cachedInstance = null;

function getRegistryInstance() {
  if (cachedInstance) return cachedInstance;

  const Blockchain = require('./blockchain');
  const DIDRegistry = require('./didRegistry');
  const CredentialRegistry = require('./credentialRegistry');

  // allow validatorId to be configured via environment variable
  const validatorId = process.env.VALIDATOR_ID || 'AUTHORITY_NODE';
  const blockchain = new Blockchain(validatorId);
  // persist initial chain to disk (genesis overwritten) now that directory exists
  // this guarantees startup reset even if a stale file was present
  blockchain.chain = [require('./block').genesis()];
  blockchain.saveChain();

  const didRegistry = new DIDRegistry(blockchain);
  const credentialRegistry = new CredentialRegistry(blockchain);

  // --- bootstrap authority DID (same logic as server.js) ---
  const authorityAddress = validatorId; // validatorId doubles as authority node address
  const authorityDid = didRegistry.generateDIDFromAddress(authorityAddress);
  if (!didRegistry.resolveDID(authorityDid)) {
    didRegistry.registerDID({
      did: authorityDid,
      publicKeyPem: null,
      address: authorityAddress,
      role: 'authority',
      approved: true
    });
  }

  // --- auto-approve issuers listed in environment (used during testing) ---
  // entries can be either full DIDs or plain addresses
  // accept either plural or singular environment key
  const rawAllowed = process.env.ALLOWED_ISSUERS || process.env.ALLOWED_ISSUER;
  if (rawAllowed) {
    rawAllowed
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
      .forEach((entry) => {
        let did;
        if (entry.startsWith('did:')) {
          did = entry;
        } else {
          did = `did:ethr:${entry}`;
        }

        // register DID if missing
        if (!didRegistry.resolveDID(did)) {
          didRegistry.registerDID({
            did,
            publicKeyPem: null,
            address: entry
          });
        }

        // approve in DID registry and persist changes
        if (!didRegistry.isApprovedIssuer(did)) {
          didRegistry.approveIssuer(did, authorityDid);
        }

        // mirror approval in credential registry so issuance logic passes
        if (!credentialRegistry.isIssuerApproved(did)) {
          credentialRegistry.approveIssuer(did);
        }
      });
  }

  // --- auto-approve verifiers via environment variable ---
  // allow either environment variable name
  const allowedVerifiers = process.env.ALLOWED_VERIFIERS || process.env.ALLOWED_VERIFIER_WALLETS;
  if (allowedVerifiers) {
    allowedVerifiers
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
      .forEach((entry) => {
        let did;
        if (entry.startsWith('did:')) {
          did = entry;
        } else {
          did = `did:ethr:${entry}`;
        }
        if (!didRegistry.resolveDID(did)) {
          didRegistry.registerDID({
            did,
            publicKeyPem: null,
            address: entry
          });
        }
        if (!didRegistry.isApprovedVerifier(did)) {
          didRegistry.approveVerifier(did, authorityDid);
        }
        // mirror in credential registry for fast lookups
        if (!credentialRegistry.isVerifierApproved(did)) {
          credentialRegistry.approveVerifier(did);
        }
      });
  }

  cachedInstance = { blockchain, didRegistry, credentialRegistry };
  return cachedInstance;
}

module.exports = { getRegistryInstance };
