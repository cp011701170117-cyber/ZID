# ZID: Decentralized Identity and Verifiable Credential Platform

ZID is a multi-portal decentralized identity prototype where:
- issuers authenticate with wallet signatures and issue verifiable credentials,
- holders keep credentials linked to their DID,
- verifiers validate credentials against cryptographic proof, blockchain anchor data, revocation state, expiration, and approval rules.

The repository includes one backend service and three separate frontend clients (wallet, issuer, verifier).

## What This Project Implements

- Wallet-signature authentication using nonce + MetaMask flow
- DID registration and DID resolution
- Role-aware JWT sessions (`holder`, `issuer`, `verifier`, `authority`)
- Verifiable Credential issuance with RSA proof (`RsaSignature2018`-style payload)
- Canonical JSON hashing + blockchain anchoring
- IPFS pinning and fetch through Pinata
- Credential revocation and expiration checks
- Automated multi-authority approval pipeline before issuance finalization
- Verifier approval checks
- Admin endpoints to reset storage and/or blockchain for testing
- Verifier-side blockchain visualizer UI

## Repository Layout

```text
ZID/
├── README.md
├── LICENSE
├── implemantation/
│   ├── backend/
│   │   ├── package.json
│   │   ├── jest.config.js
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── config.js
│   │   │   ├── blockchain/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── storage/
│   │   │   └── validators/
│   │   ├── storage/
│   │   └── tests/
│   ├── frontend-wallet/
│   ├── frontend-issuer/
│   └── frontend-verifier/
└── ...
```

Note: the top-level folder is intentionally named `implemantation` in this repository, and all commands below use that exact path.

## Architecture Summary

### Frontends

- `implemantation/frontend-wallet` (React + Vite, port `3000`)
  - Holder login and DID registration flow
  - Holder credential views/verification pages
- `implemantation/frontend-issuer` (React + Vite, port `3001`)
  - Issuer wallet login
  - Issue credential, view history, track pipeline status
- `implemantation/frontend-verifier` (Vite + vanilla JS, port `5173`)
  - Verifier wallet login
  - Verify by VC JSON or VC ID
  - Blockchain visualization and chain validation display

### Backend

`implemantation/backend/src/server.js` provides an Express API with:
- Helmet security headers
- CORS whitelist logic
- Rate limiting (`100` requests per `15` min window)
- Centralized error handling
- Route groups for auth, DID, credential lifecycle, governance, and admin actions

### Trust/Data Layer

- Local custom blockchain for immutable event anchoring
- DID registry and credential registry indexes in backend memory, persisted to JSON
- IPFS storage integration through Pinata for credential content retrieval/anchoring metadata

## Authentication and Roles

All three roles authenticate by signing a nonce with a wallet.

- Holder flow:
  - `POST /api/auth/nonce`
  - `POST /api/auth/verify`
- Issuer flow:
  - `POST /api/auth/issuer/nonce`
  - `POST /api/auth/issuer/verify`
- Verifier flow:
  - `POST /api/auth/verifier/nonce`
  - `POST /api/auth/verifier/verify`
  - `GET /api/auth/verifier/status` (requires bearer token)

JWTs expire in 1 hour.

## Credential Issuance and Verification Flow

### Issuance

1. Issuer authenticates via wallet signature.
2. Issuer calls `POST /api/credentials/issue` with:
   - `subjectDid`
   - `claims` (object)
   - optional `credentialType`
   - optional `expirationDate` (ISO date)
3. Backend creates VC payload, signs proof, runs authority pipeline, then finalizes issuance when approved.
4. On issuance, VC is:
   - canonicalized and hashed,
   - uploaded to IPFS (Pinata),
   - anchored into blockchain metadata.

### Verification

Verifier submits either:
- full VC JSON to `POST /api/credentials/verify`, or
- `vcId` to `POST /api/credentials/verify` (server resolves anchored VC), or
- CID to `POST /api/credentials/verify-by-cid`.

Validation includes:
- verifier approval checks,
- signature validation,
- canonical hash match with anchor,
- revocation status,
- expiration status,
- issuer approval status.

## API Reference (Current)

Base URL: `http://localhost:5000`

### Health and Chain

- `GET /health`
- `GET /health/blockchain`
- `GET /api/health`
- `GET /api/blockchain/validate`
- `GET /api/blockchain`
- `GET /api/chain`
- `GET /chain/verify`
- `GET /block/:index/verify`

### Auth

- `POST /api/auth/nonce`
- `POST /api/auth/verify`
- `POST /api/auth/issuer/nonce`
- `POST /api/auth/issuer/verify`
- `POST /api/auth/verifier/nonce`
- `POST /api/auth/verifier/verify`
- `GET /api/auth/verifier/status` (auth required)

### DID

- `POST /api/did/register`
- `GET /api/did/resolve/:did`

### Credentials

- `POST /api/credentials/issue` (issuer auth)
- `POST /api/credentials/revoke` (issuer auth)
- `POST /api/credentials/verify` (verifier auth)
- `POST /api/credentials/verify-by-cid`
- `GET /api/credentials`
- `GET /api/credentials/wallet/:did`
- `GET /api/credentials/session/:did`
- `GET /api/credentials/issuer/:did`

### Issuer Pipeline Endpoints

- `POST /api/issuer/credentials/create-request`
- `GET /api/issuer/credentials/:id/pipeline-status`
- `GET /api/issuer/credentials/pending-approvals`
- `POST /api/issuer/credentials/:id/retry-automation`
- `POST /api/issuer/credentials/:id/finalize-issuance`

### Governance

- `POST /api/governance/approve` (authority auth)
- `POST /api/governance/approve-verifier` (authority auth)

### Protected Utility

- `GET /api/protected/me`

### Admin

- `POST /api/admin/reset-storage` (authority auth)
- `POST /api/admin/reset` (authority auth)
- `POST /api/admin/reset-chain` (authority auth)

## Local Setup

### 1) Clone

```bash
git clone https://github.com/cp011701170117-cyber/ZID.git
cd ZID
```

### 2) Install Dependencies

```bash
cd implemantation/backend
npm install

cd ../frontend-wallet
npm install

cd ../frontend-issuer
npm install

cd ../frontend-verifier
npm install
```

### 3) Start Services

Backend:

```bash
cd implemantation/backend
npm run dev
```

Wallet frontend:

```bash
cd implemantation/frontend-wallet
npm run dev
```

Issuer frontend:

```bash
cd implemantation/frontend-issuer
npm run dev
```

Verifier frontend:

```bash
cd implemantation/frontend-verifier
npm run dev
```

Default dev URLs:
- Backend: `http://localhost:5000`
- Wallet: `http://localhost:3000`
- Issuer: `http://localhost:3001`
- Verifier: `http://localhost:5173`

## Running Tests

Backend tests:

```bash
cd implemantation/backend
npm test
```

The Jest suite covers credential issuance, tamper detection, revocation, expiration, verifier approval behavior, and admin reset flows.

## Implementation Notes and Caveats

- This is a prototype and uses local JSON persistence in `implemantation/backend/storage`.
- Some components use different DID prefixes (`did:ethr:` and `did:custom:`) depending on flow; keep values consistent per endpoint usage.
- The verifier app includes a config file named `vita.config.js` (not `vite.config.js`) in this repository.
- Production hardening still needed: managed key storage, stronger secret handling, database persistence, and deployment-grade observability.

## Troubleshooting

- Backend exits at startup:
  - Check `JWT_SECRET` and `CORS_ORIGIN` in backend `.env`.
- Issuer login succeeds but issuance fails:
  - Verify issuer wallet is in `ALLOWED_ISSUERS` and DID is approved.
- Verifier receives "Verifier not approved":
  - Ensure wallet is in `ALLOWED_VERIFIERS` and governance approval is completed if required.
- IPFS upload/fetch errors:
  - Validate Pinata keys and internet access.
- Browser CORS errors:
  - Add exact frontend origin to `CORS_ORIGIN` and restart backend.

## Team

This project was created and developed by Ghori Zeeshana Ahesanhusain, along with teammates Divyansh Chauhan, Shubham Pattani, and Maulin Gandhi, as a final-year degree project at GLS Faculty of Engineering and Technology.

## License

MIT License. See `LICENSE`.
