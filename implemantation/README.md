# Decentralized Identity Verification System

A full-stack decentralized identity verification platform using W3C DIDs and Verifiable Credentials with a custom Node.js blockchain implementation.

## 🎯 Project Overview

This academic-grade prototype implements a decentralized identity system where:
- **Blockchain** serves as a trust anchor for hashes, public keys, timestamps, and revocation records
- **Sensitive data** remains off-chain (stored in IPFS or client-side)
- **Private keys** never leave the client device
- **Selective disclosure** enables privacy-preserving credential sharing

## 🏗️ Architecture

### Layers

1. **Frontend Identity Wallet** (`frontend-wallet/`)
   - User registration/login
   - DID generation and display
   - Credential viewing and management
   - Verification request approval/rejection
   - Client-side private key storage

2. **Frontend Issuer Dashboard** (`frontend-issuer/`)
   - Issue verifiable credentials
   - Digitally sign credentials
   - Hash and anchor documents on blockchain
   - Revoke credentials
   - View issuance history

3. **Core Identity Layer** (`backend/src/blockchain/`)
   - DID Generator: Creates `did:custom:<sha256>` format DIDs
   - Key Management: Client-side key vault with signature generation/verification
   - DID Registry: Stores public keys and DID mappings on blockchain

4. **Credential Layer** (`backend/src/services/`)
   - VC Issuer: Creates JSON-LD Verifiable Credentials
   - Wallet Storage: Stores VCs in IPFS, hashes on blockchain
   - Verification Engine: Verifies issuer signatures, checks revocation, validates timestamps

5. **Blockchain Layer** (`backend/src/blockchain/`)
   - Custom Node.js blockchain (Proof-of-Authority style)
   - DID Registry: `registerDID`, `resolveDID`, `rotateKey`
   - Credential Registry: `storeCredentialHash`, `revokeCredential`, `verifyExistence`

6. **Backend API** (`backend/src/`)
   - Node.js + Express REST API
   - Blockchain interaction endpoints
   - VC issuance and verification flows
   - IPFS coordination

## 🛠️ Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Blockchain**: Custom Node.js blockchain (PoA-style)
- **Crypto**: elliptic (ECDSA), crypto (SHA-256)
- **Storage**: IPFS (optional, can work without)
- **Testing**: Jest (ready for implementation)

## 📋 Prerequisites

- Node.js 18+ and npm
- Git

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend Wallet
cd ../frontend-wallet
npm install

# Frontend Issuer
cd ../frontend-issuer
npm install
```

### 2. Configure Environment

The backend includes a `.env` file with default values. For production, copy `.env.example` and update:

```bash
cd backend
cp .env.example .env
# Edit .env with your values
```

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5000`

**Terminal 2 - Identity Wallet:**
```bash
cd frontend-wallet
npm run dev
```
Wallet runs on `http://localhost:3000`

**Terminal 3 - Issuer Dashboard:**
```bash
cd frontend-issuer
npm run dev
```
Issuer runs on `http://localhost:3001`

## 📖 How It Works

### DID Generation Flow

1. User opens Identity Wallet
2. Creates new wallet with username
3. Client generates ECDSA keypair (secp256k1)
4. DID is created: `did:custom:<sha256(publicKey)>`
5. Public key and DID are registered on blockchain
6. Private key stays in browser localStorage (client-side only)

### Credential Issuance Flow

1. Issuer opens Issuer Dashboard
2. Fills form with recipient DID, credential type, and subject data
3. Backend creates Verifiable Credential (JSON-LD format)
4. VC is stored in IPFS (or mock storage)
5. VC hash is computed and anchored on blockchain
6. VC is returned to issuer, who delivers it to wallet

### Verification Flow

1. Verifier requests credential verification
2. Wallet owner approves/rejects request
3. If approved, wallet sends VC (or selective attributes) to verifier
4. Verifier computes VC hash and queries blockchain
5. Blockchain confirms hash match and revocation status
6. Verification result returned

### Selective Disclosure

- Wallet can share only specific credential attributes
- Full credential never exposed unnecessarily
- Privacy-preserving verification

## 🔐 Security Features

- **Client-side key storage**: Private keys never leave the browser
- **Hash-only blockchain**: Only hashes stored on-chain, not sensitive data
- **ECDSA signatures**: Cryptographic proof of ownership
- **Revocation support**: Credentials can be revoked and checked
- **Timestamp validation**: All operations timestamped on blockchain

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── blockchain/
│   │   │   ├── block.js              # Block structure
│   │   │   ├── blockchain.js         # Main blockchain
│   │   │   ├── didRegistry.js        # DID operations
│   │   │   └── credentialRegistry.js # VC operations
│   │   ├── services/
│   │   │   ├── ipfsClient.js         # IPFS integration
│   │   │   └── vcService.js           # VC creation/management
│   │   ├── routes/
│   │   │   ├── didRoutes.js          # DID API endpoints
│   │   │   └── credentialRoutes.js   # VC API endpoints
│   │   └── server.js                  # Express server
│   ├── package.json
│   └── .env
├── frontend-wallet/
│   ├── src/
│   │   ├── pages/                    # React pages
│   │   ├── context/                  # Wallet context
│   │   ├── utils/                    # Crypto utilities
│   │   └── App.jsx
│   └── package.json
├── frontend-issuer/
│   ├── src/
│   │   ├── pages/                    # Issuer pages
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## 🔌 API Endpoints

### DID Endpoints

- `POST /api/did/register` - Register a new DID
- `GET /api/did/resolve/:did` - Resolve a DID

### Credential Endpoints

- `POST /api/credentials/issue` - Issue a new credential
- `POST /api/credentials/:id/revoke` - Revoke a credential
- `GET /api/credentials/wallet/:did` - Get credentials for a DID
- `POST /api/credentials/verify` - Verify a credential

### System Endpoints

- `GET /api/health` - Health check
- `GET /api/chain` - View blockchain (for debugging)

## 🧪 Testing

```bash
cd backend
npm test
```

## 📝 Notes

- This is an **academic prototype**, not production-ready
- IPFS is optional - system works without it (uses mock storage)
- Blockchain is in-memory (resets on server restart)
- For production, implement persistent storage and proper key management

## 🤝 Contributing

This is an academic project. Feel free to fork and extend for learning purposes.

## 📄 License

Academic use only.

## 🙏 Acknowledgments

- W3C DID and Verifiable Credentials specifications
- Academic research in decentralized identity systems
