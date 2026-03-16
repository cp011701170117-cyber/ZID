# Decentralized Identity & Verifiable Credential Platform

A decentralized identity management platform where trusted institutions issue digitally signed credentials, holders manage those credentials in a wallet, and verifiers validate authenticity without relying on a single centralized authority.

The system combines wallet signatures, DID-based identity, IPFS storage, and a custom blockchain anchor layer to provide credential integrity, tamper detection, and user-controlled data sharing.

---

## Project Overview

Traditional identity systems store records in centralized databases, which often introduces:

- Data breaches and single points of failure
- Identity misuse and unauthorized edits
- Limited user control over personal records
- Slow, costly cross-organization verification

This project demonstrates a decentralized credential model in which:

- Issuers sign and issue Verifiable Credentials (VCs)
- Holders manage credentials through wallet-based identity
- Verifiers validate credentials by signature, hash consistency, approval status, and revocation state

The result is practical trust: fast verification with cryptographic proof and transparent auditability.

This repository demonstrates a strong prototype for decentralized identity and verifiable credential workflows.

---

## System Roles

The platform is built around three primary actors.

### Issuer

Trusted institutions such as universities, training providers, or company authorities.

**Responsibilities:**

- Authenticate with wallet signature
- Issue signed credentials to subject DIDs
- Revoke credentials when required

**Example:**
A university issues a digital degree credential.

---

### Wallet Holder (User)

The individual who owns a DID and receives credentials.

**Responsibilities:**

- Connect wallet and register DID
- Hold credentials linked to that DID
- Present credentials to verifiers when required

**Example:**
A graduate stores a degree VC in an identity wallet.

---

### Verifier

An organization that needs to validate a credential.

**Responsibilities:**

- Authenticate as verifier
- Submit VC JSON, VC ID, or CID for validation
- Interpret validity, revocation, and expiry results

**Example:**
An employer verifies a candidate's degree claim.

With roles established, the next section summarizes core capabilities delivered by the platform.

---

## Key Features

- **DID-based identity lifecycle**
- **Nonce + wallet-signature authentication flow**
- **Role-aware JWT authorization** (issuer, holder, verifier, authority)
- **Verifiable Credential issuance with RSA proof**
- **Canonical JSON hashing and blockchain anchoring**
- **IPFS storage integration (Pinata)**
- **Revocation and expiration handling**
- **Verifier and issuer approval controls**
- **Admin reset endpoints for test/dev operations**
- **Three dedicated UIs:** issuer, wallet holder, verifier

These features are implemented through a layered architecture described below.

---

## Architecture

The project is organized into frontend clients, backend API/services, and blockchain-backed registries.

### Frontend

- `implemantation/frontend-wallet`: React + Vite holder portal
- `implemantation/frontend-issuer`: React + Vite issuer portal
- `implemantation/frontend-verifier`: Vite + JavaScript verifier portal
- Each frontend proxies `/api` requests to backend (`http://localhost:5000`)

### Backend

- `implemantation/backend/src/server.js`: app bootstrap, security middleware, and route registration
- Auth controllers: nonce generation + wallet signature verification
- DID routes: register and resolve DID
- Credential routes: issue, revoke, verify, list, verify-by-cid
- Governance routes: authority approval for issuer/verifier
- Admin routes: reset storage and reset chain

### Blockchain Layer

- Custom Proof-of-Authority style chain in `src/blockchain`
- Credential hash anchors and DID/governance events become blocks
- Chain and DID state persist in local JSON files under `backend/storage`

### Data and Storage

- VC payload JSON is uploaded to IPFS via Pinata
- Anchor metadata (`hash`, `cid`, `issuer`, `subject`) is stored in the credential registry
- Persistent files:
  - `backend/storage/blockchain.json` or `blockchain.test.json`
  - `backend/storage/dids.json`

The following diagram presents this architecture in a single layered view.

---

## System Architecture Diagram

```mermaid
flowchart LR

subgraph Users
A[Issuer Portal]
B[Holder Wallet]
C[Verifier Portal]
end

subgraph Frontend
D[React + Vite Applications]
E[Wallet Interaction Layer]
end

subgraph Backend
F[Node.js Express API]
G[Authentication Service]
H[DID Registry]
I[Credential Issuance Service]
J[Credential Verification Service]
end

subgraph TrustLayer[Trust Layer]
K[IPFS Storage (Pinata)]
L[Blockchain Anchor Ledger]
end

A --> D
B --> D
C --> D

D --> E
E --> F

F --> G
F --> H
F --> I
F --> J

I --> K
I --> L

J --> K
J --> L
```

The architecture is organized into four layers:

- **User interaction layer:** issuer, holder, and verifier portals provide role-specific entry points.
- **Frontend client layer:** React + Vite apps drive UI and route wallet interactions through Ethers.js/MetaMask.
- **Backend services layer:** Node.js/Express handles authentication, DID operations, issuance, and verification.
- **Decentralized trust layer:** IPFS (Pinata) stores credential payloads, while the blockchain ledger stores tamper-evident anchors.

From architecture, we can now walk through the end-to-end operational flow.

---

## Workflow

### 1. Identity Creation

Holder connects a wallet and registers a DID through `/api/did/register`.

### 2. Authentication

Client requests a nonce (`/api/auth/*/nonce`), signs it using the wallet, and sends the signature to a verify endpoint (`/api/auth/*/verify`) to receive a JWT.

### 3. Credential Issuance

Issuer sends subject DID + claims to `/api/credentials/issue`.
Backend creates the VC, signs it, canonicalizes and hashes it, uploads VC JSON to IPFS, then anchors metadata on blockchain.

### 4. Credential Sharing

Holder shares credential data (VC JSON, VC ID, or CID) with a verifier.

### 5. Verification

Verifier submits the credential for validation. Backend checks:

- Verifier approval
- Signature validity
- Canonical hash equality with anchored hash
- Revocation status
- Expiration status
- Issuer approval state

If all checks pass, the credential is valid.

The stack below maps these capabilities to concrete technologies.

---

## Technology Stack

### Frontend

- React 18 + Vite (issuer and wallet)
- Vite + JavaScript (verifier)
- Tailwind CSS, PostCSS, Autoprefixer
- Ethers.js integration for wallet interactions

### Backend

- Node.js, Express.js
- Joi validation
- JSON Web Token (`jsonwebtoken`)
- Helmet, `express-rate-limit`, CORS, Morgan

### Blockchain / Cryptography

- Custom PoA-style blockchain implementation
- SHA-256 hashing (`crypto`)
- Canonical JSON (`canonicalize`)
- RSA proof signing/verification for VC payloads
- Ethers address recovery for wallet-signature login

### Storage and Integration

- Local JSON persistence for chain and DID state
- Pinata IPFS APIs for VC content storage/retrieval

### Testing

- Jest + Supertest integration tests

Given this stack, security controls are essential and are summarized next.

---

## Security Considerations

This project includes multiple security mechanisms:

- Nonce-based wallet login to reduce replay risk
- JWT token expiry (1 hour)
- Role-based middleware for issuer/verifier/authority endpoints
- Signature verification for credentials
- Hash-based tamper detection against blockchain anchors
- Approval checks for issuer and verifier roles
- Helmet security headers and API rate limiting

**Important note:**
This is a prototype architecture and uses local file storage and local key-material patterns that are not production-grade key management.

The next section covers setup for local development and evaluation.

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/cp011701170117-cyber/ZID.git
cd ZID
```

### 2. Install dependencies for all modules

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

### 3. Configure backend environment

Create `.env` in `implemantation/backend`:

```env
PORT=5000
NODE_ENV=development

JWT_SECRET=replace_with_a_long_random_secret

# Comma-separated origins allowed by backend CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001,http://localhost:5173

# Comma-separated wallet allowlists (lowercase recommended)
ALLOWED_ISSUERS=0xissuer_wallet_1,0xissuer_wallet_2
ALLOWED_VERIFIERS=0xverifier_wallet_1,0xverifier_wallet_2

# Optional authority seed id for bootstrap
VALIDATOR_ID=AUTHORITY_NODE

# Pinata credentials for IPFS upload/fetch
PINATA_API_KEY=your_pinata_api_key
PINATA_API_SECRET=your_pinata_api_secret
```

### 4. Start backend

```bash
cd implemantation/backend
npm run dev
```

Backend URL: `http://localhost:5000`

### 5. Start frontend apps (separate terminals)

Wallet app:

```bash
cd implemantation/frontend-wallet
npm run dev
```

Issuer app:

```bash
cd implemantation/frontend-issuer
npm run dev
```

Verifier app:

```bash
cd implemantation/frontend-verifier
npm run dev
```

Default dev ports in current configs:

- Wallet: `http://localhost:3000`
- Issuer: `http://localhost:3001`
- Verifier: `http://localhost:5173`

After setup, the API endpoints below support the core workflows.

---

## API Summary

Base URL: `http://localhost:5000`

### Health and chain inspection

- `GET /health`
- `GET /health/blockchain`
- `GET /api/health`
- `GET /api/blockchain/validate`
- `GET /api/blockchain`
- `GET /api/chain`
- `GET /chain/verify`
- `GET /block/:index/verify`

### Authentication

- `POST /api/auth/nonce`
- `POST /api/auth/verify`
- `POST /api/auth/issuer/nonce`
- `POST /api/auth/issuer/verify`
- `POST /api/auth/verifier/nonce`
- `POST /api/auth/verifier/verify`
- `GET /api/auth/verifier/status`

### DID operations

- `POST /api/did/register`
- `GET /api/did/resolve/:did`

### Credential operations

- `POST /api/credentials/issue`
- `POST /api/credentials/revoke`
- `POST /api/credentials/verify`
- `POST /api/credentials/verify-by-cid`
- `GET /api/credentials`
- `GET /api/credentials/wallet/:did`
- `GET /api/credentials/session/:did`
- `GET /api/credentials/issuer/:did`

### Governance and admin

- `POST /api/governance/approve`
- `POST /api/governance/approve-verifier`
- `POST /api/admin/reset-storage`
- `POST /api/admin/reset`
- `POST /api/admin/reset-chain`

For quick navigation, the repository layout is shown next.

---

## Project Structure

```text
ZID/
├── README.md
├── implemantation/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── blockchain/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── storage/
│   │   │   └── validators/
│   │   ├── storage/
│   │   ├── tests/
│   │   └── package.json
│   ├── frontend-wallet/
│   ├── frontend-issuer/
│   └── frontend-verifier/
└── sample/
```

You can validate backend behavior with the tests below.

---

## Running Tests

From backend folder:

```bash
cd implemantation/backend
npm test
```

Current tests cover key credential lifecycle scenarios, including issuance, tampering detection, revocation, expiration, verifier approval, and admin reset operations.

If issues arise during setup or test execution, use the troubleshooting guide below.

---

## Troubleshooting

### Backend exits on startup with missing environment variables

Set `JWT_SECRET` and `CORS_ORIGIN` in backend `.env`.

### Issuer login works but issuing fails

Check wallet address in `ALLOWED_ISSUERS` and ensure address format/lowercase consistency.

### Verifier gets "Verifier not approved"

Ensure address is in `ALLOWED_VERIFIERS` and verifier DID is approved (if governance flow is used).

### IPFS upload/fetch errors

Verify `PINATA_API_KEY` and `PINATA_API_SECRET` values and internet connectivity.

### CORS errors in browser

Add the exact frontend origin and port to `CORS_ORIGIN`, then restart backend.

---

## Current Status and Next Steps

This repository is a strong prototype and learning platform for decentralized identity and VC verification flows.

Recommended production-oriented upgrades:

- Move from JSON files to a robust database
- Introduce secure key management (HSM/KMS or vault)
- Add structured logging/metrics/tracing
- Add broader automated tests (especially frontend and error paths)
- Add deployment profiles (staging/production) with hardened configuration

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for full terms.

---

## About the Team

This project was created and developed by **Ghori Zeeshana Ahesanhusain**, along with her teammates **Divyansh Chauhan**, **Shubham Pattani**, and **Maulin Gandhi**, as a final-year degree project at **GLS Faculty of Engineering and Technology**.

More than just a project, it was a journey built together — and one worth remembering.
