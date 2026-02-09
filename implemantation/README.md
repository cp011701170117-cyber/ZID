# ZID – Decentralized Identity Verification System

## 📌 Project Overview

ZID is a **blockchain-based decentralized identity (DID) verification system** designed to securely issue, store, and verify digital identities and credentials without relying on a centralized authority.

The system leverages **blockchain technology**, **IPFS**, and **verifiable credentials** to ensure data integrity, privacy, and trustless verification between issuers, holders, and verifiers.

---

## 🎯 Objectives

* Eliminate centralized identity storage risks
* Enable user-controlled digital identities (Self-Sovereign Identity)
* Provide tamper-proof credential verification
* Ensure secure authentication and authorization

---

## 🏗️ System Architecture

The project follows a **three-entity DID model**:

1. **Issuer** – Issues verifiable credentials
2. **Wallet Holder** – Owns and manages credentials
3. **Verifier** – Verifies credentials without accessing private data

### Core Technologies:

* **Blockchain** – Stores DID references and credential hashes
* **IPFS** – Decentralized storage for credential data
* **JWT & Cryptography** – Secure authentication and signing
* **Smart Contract Logic (Simulated)** – Registry-based verification

---

## 🧩 Project Structure

```
ZID/
├── implemantation/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── blockchain/        # DID & Credential registries
│   │   │   ├── controllers/       # Auth & business logic
│   │   │   ├── middleware/        # Authentication middleware
│   │   │   ├── models/            # Verifiable Credential models
│   │   │   ├── routes/            # API routes
│   │   │   ├── services/          # IPFS & auth services
│   │   │   └── server.js          # Backend entry point
│   │   └── package.json
│   ├── frontend-wallet/           # Wallet holder application
│   ├── frontend-verifier/         # Verifier application
│   └── .gitignore
```

---

## ⚙️ Features

* Decentralized Identifier (DID) creation
* Verifiable Credential issuance
* IPFS-based credential storage
* Secure authentication & authorization
* Credential verification without data exposure
* Modular backend and frontend design

---

## 🚀 How to Run the Project

### Backend Setup

```bash
cd implemantation/backend
npm install
npm start
```

### Frontend Wallet

```bash
cd implemantation/frontend-wallet
npm install
npm run dev
```

### Frontend Verifier

```bash
cd implemantation/frontend-verifier
npm install
npm run dev
```

---

## 🔐 Security Considerations

* Private keys and secrets are **never committed**
* Credential integrity ensured via cryptographic hashing
* Authorization enforced using middleware
* Decentralized storage prevents single point of failure

---

## 🧪 Testing

* Backend test cases included for blockchain and IPFS modules
* Credential issuance and verification flows validated

---

## 📚 Use Cases

* Academic credential verification
* Digital identity management
* KYC without centralized storage
* Secure document verification

---

## 🧠 Future Enhancements

* Smart contract deployment on Ethereum
* Zero-Knowledge Proof (ZKP) integration
* Mobile wallet support
* Role-based access control

---

## 👩‍💻 Author

**Zee**
Cybersecurity & Blockchain Enthusiast

---

## 📄 License

This project is for academic and educational purposes.
