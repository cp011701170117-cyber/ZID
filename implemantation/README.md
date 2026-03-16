# ZID: Decentralized Identity Verification System

ZID is a full-stack prototype for decentralized identity and credential verification. It combines a custom Proof-of-Authority style blockchain simulation, DID registries, Verifiable Credential (VC) flows, and IPFS storage using Pinata.

This repository includes:
- A Node.js/Express backend that handles blockchain anchoring, DID management, and VC issuance/verification
- Three frontend clients for different actors: Issuer, Wallet Holder, and Verifier
- Test coverage for core credential flow scenarios

## 1. What This Project Solves

Traditional identity systems keep sensitive records in centralized databases. ZID demonstrates a model where:
- Users control wallet-based identities
- Credentials are cryptographically signed
- Credential hashes are anchored on a blockchain-like ledger
- Full credential payloads are stored on IPFS
- Verifiers can validate authenticity and revocation status without trusting a central database

## 2. Core Roles and Flows

- Issuer
Issues signed Verifiable Credentials after wallet authentication and approval checks.

- Wallet Holder
Owns a DID and stores/uses credentials issued to that DID.

- Verifier
Verifies credentials by signature, hash-anchor consistency, revocation status, and issuer approval.

## 3. High-Level Architecture

### Backend responsibilities
- Wallet-signature authentication with nonce challenge
- JWT-based session authorization
- DID registry and role approvals
- Credential registry with anchor metadata and revocation tracking
- Blockchain simulation for immutable-ish event anchoring
- IPFS upload/fetch using Pinata APIs

### Frontend responsibilities
- Issuer UI: login, issue credentials, view history, blockchain visualizer
- Wallet UI: connect wallet, register DID, interact with identity/credentials
- Verifier UI: login, verify VC JSON or VC ID, view chain state

### Data path (issue then verify)
1. Issuer signs in with wallet.
2. Issuer submits credential payload.
3. Backend creates VC, signs VC, canonicalizes and hashes VC.
4. VC JSON is uploaded to IPFS (Pinata), and hash metadata is anchored to blockchain.
5. Verifier submits VC JSON (or ID/CID path), backend verifies:
- Signature validity
- Hash consistency vs on-chain anchor
- Revocation status
- Expiration status (if present)
- Issuer/verifier approval constraints

## 4. Repository Structure

```text
.
├── backend/
│   ├── src/
│   │   ├── blockchain/      # Block, chain, DID registry, credential registry, singleton wiring
│   │   ├── controllers/     # Auth and role-specific login handlers
│   │   ├── middleware/      # JWT auth, role checks, validation, error handler
│   │   ├── models/          # VC model/constructor
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Crypto and IPFS integration
│   │   ├── storage/         # JSON persistence (runtime)
│   │   └── server.js        # Express app and route wiring
│   ├── storage/             # Blockchain and DID persisted state
│   ├── tests/               # Integration tests
│   └── package.json
├── frontend-issuer/         # React + Vite (issuer portal)
├── frontend-wallet/         # React + Vite (holder wallet portal)
├── frontend-verifier/       # Vite + vanilla JS (verifier portal)
└── README.md
```

## 5. Technology Stack

- Backend
Node.js, Express, Joi, JWT, ethers, canonicalize, axios, helmet, express-rate-limit, morgan

- Frontend
React + Vite (issuer and wallet), Vite + vanilla JavaScript (verifier)

- Crypto and trust layer
RSA signatures for VC proof handling, SHA-256 hashing, Ethereum wallet signature recovery for login, PoA-style simulated chain for anchoring

- Storage
Local JSON files for chain and DID registry, Pinata/IPFS for VC document payloads

## 6. Prerequisites

Install before running:
- Node.js 18+ recommended
- npm 9+
- MetaMask (or compatible injected wallet)
- Pinata account and API keys

## 7. Environment Configuration (Critical)

Create a .env file in backend with the following keys:

```env
PORT=5000
NODE_ENV=development

JWT_SECRET=replace_with_a_long_random_secret

# Comma-separated allowlist for browser origins.
# Include all frontend dev URLs you use.
CORS_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000,http://localhost:3001,http://localhost:3002

# Issuer wallet allowlist (comma-separated lowercase addresses)
ALLOWED_ISSUERS=0xissuerwallet1,0xissuerwallet2

# Verifier wallet allowlist (comma-separated lowercase addresses)
ALLOWED_VERIFIERS=0xverifierwallet1,0xverifierwallet2

# Authority identity seed used in bootstrap
VALIDATOR_ID=AUTHORITY_NODE

# Pinata keys required for VC JSON upload/fetch flow
PINATA_API_KEY=your_pinata_key
PINATA_API_SECRET=your_pinata_secret
```

Important notes:
- Backend startup fails if JWT_SECRET or CORS_ORIGIN are missing.
- VC issuance and verify-by-cid flows require Pinata keys.
- Whitelisted issuer/verifier wallets are enforced during auth and/or approval checks.

## 8. Installation

Run once per module:

```bash
cd backend
npm install

cd ../frontend-issuer
npm install

cd ../frontend-wallet
npm install

cd ../frontend-verifier
npm install
```

## 9. Running the System Locally

Start each service in separate terminals.

### 9.1 Start backend

```bash
cd backend
npm run dev
```

Backend default URL: http://localhost:5000

### 9.2 Start issuer portal

```bash
cd frontend-issuer
npm run dev
```

### 9.3 Start wallet portal

```bash
cd frontend-wallet
npm run dev
```

### 9.4 Start verifier portal

```bash
cd frontend-verifier
npm run dev
```

Vite will print exact ports (commonly 5173+).

## 10. API Overview

Base URL: http://localhost:5000

### 10.1 Health and blockchain inspection
- GET /health
- GET /health/blockchain
- GET /api/health
- GET /api/blockchain/validate
- GET /api/blockchain
- GET /api/chain
- GET /chain/verify
- GET /block/:index/verify

### 10.2 Authentication
- POST /api/auth/nonce
- POST /api/auth/verify
- POST /api/auth/issuer/nonce
- POST /api/auth/issuer/verify
- POST /api/auth/verifier/nonce
- POST /api/auth/verifier/verify
- GET /api/auth/verifier/status

### 10.3 DID operations
- POST /api/did/register
- GET /api/did/resolve/:did

### 10.4 Credential operations
- POST /api/credentials/issue
- POST /api/credentials/revoke
- POST /api/credentials/verify
- POST /api/credentials/verify-by-cid
- GET /api/credentials
- GET /api/credentials/wallet/:did
- GET /api/credentials/session/:did
- GET /api/credentials/issuer/:did

### 10.5 Governance and admin
- POST /api/governance/approve
- POST /api/governance/approve-verifier
- POST /api/admin/reset-storage
- POST /api/admin/reset
- POST /api/admin/reset-chain

## 11. Typical User Journey (End-to-End)

### Step A: Wallet holder creates identity
1. Open wallet portal.
2. Connect wallet.
3. If no DID exists, register a username and create DID.

### Step B: Issuer logs in and issues credential
1. Open issuer portal.
2. Connect whitelisted issuer wallet.
3. Issue credential to subject DID.
4. Backend signs and stores VC in IPFS.
5. Credential hash and metadata are anchored on chain.

### Step C: Verifier validates credential
1. Open verifier portal.
2. Connect whitelisted verifier wallet.
3. Verify by VC JSON or VC ID.
4. Backend checks signature, chain anchor hash, revocation, expiry, and role approvals.

## 12. Testing

From backend:

```bash
cd backend
npm test
```

Current automated focus includes credential flow checks (issue, tamper detection, revoke, verifier approval constraints).

## 13. Security Notes

Prototype-level protections included:
- Helmet headers
- Global rate limiting
- JWT auth and role middleware
- Nonce-based wallet login challenge
- Signature verification and hash integrity checks

Important caution for real-world deployment:
- This repository includes local key material and file-based persistence patterns suitable for learning/prototyping, not production key management.
- Replace local JSON storage with transactional DB and secure key vaults for production.

## 14. Known Limitations

- File-based storage is not horizontally scalable.
- Some state is memory-backed and rebuilt from chain on startup behavior.
- No production-grade observability stack (structured logs/metrics/traces).
- Frontend end-to-end tests are not yet comprehensive.

## 15. Troubleshooting Guide

- Error: Missing required environment variable JWT_SECRET or CORS_ORIGIN
Add missing keys in backend .env and restart server.

- Error: Pinata API keys missing in .env
Set PINATA_API_KEY and PINATA_API_SECRET in backend .env.

- Error: Not authorized as issuer/verifier
Ensure wallet address is lowercase and listed in ALLOWED_ISSUERS or ALLOWED_VERIFIERS.

- CORS blocked in browser
Add the active frontend origin (including exact port) to CORS_ORIGIN.

- Verification says credential tampered
Ensure VC JSON sent for verification is exactly the original canonical content.

## 16. Production Hardening Suggestions

If extending this project beyond prototype:
- Move keys and signing operations into an HSM/KMS
- Replace JSON files with PostgreSQL or another ACID datastore
- Add audit logging and monitoring
- Add stricter RBAC and governance workflows
- Add CI security checks, dependency scanning, and API contract tests

## 17. License

This project is currently intended for academic and educational use.
