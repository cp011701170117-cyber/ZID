const crypto = require('crypto');
const Block = require('./block');
const fs = require('fs');
const path = require('path');
const { writeJsonAtomicSync } = require('../storage/storageService');


class Blockchain {
  constructor(validatorId) {
    // determine storage file based on environment
    const filename =
      process.env.NODE_ENV === 'test'
        ? 'blockchain.test.json'
        : 'blockchain.json';
    this.chainFile = path.join(__dirname, '../../storage', filename);

    // initialize properties
    this.chain = [];
    this.validatorId = validatorId || 'AUTHORITY_NODE';

    // always start fresh at server startup: remove any existing chain file
    const storageDir = path.dirname(this.chainFile);
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    if (fs.existsSync(this.chainFile)) {
      try {
        fs.unlinkSync(this.chainFile);
      } catch (e) {
        // ignore
      }
    }
    // initialize chain with a single genesis block
    this.chain = [Block.genesis()];
    // caller (registryInstance) will persist via saveChain

    // 🔐 Load Authority RSA keys
    this.authorityPrivateKey = fs.readFileSync(
      path.join(__dirname, '../../keys/authority/private.pem'),
      'utf8'
    );

    this.authorityPublicKey = fs.readFileSync(
      path.join(__dirname, '../../keys/authority/public.pem'),
      'utf8'
    );
  }

  // ✅ Get the latest block
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  // ✅ Add a new block
  addBlock(data) {
    const previousBlock = this.getLatestBlock();
    const index = previousBlock.index + 1;
    const timestamp = Date.now();

    const block = new Block(
      index,
      previousBlock.hash,
      timestamp,
      data,
      this.validatorId,
      null
    );

    // hash already calculated in constructor
    block.signature = this.signBlockHash(block.hash);

    if (!this.isValidNewBlock(block, previousBlock)) {
      throw new Error('Invalid block');
    }

    this.chain.push(block);
    this.saveChain();
    return block;
  }

  // ✅ Sign a block hash with RAC (PoA-style)
  signBlockHash(hash) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(hash);
    sign.end();

    return sign.sign(this.authorityPrivateKey, 'hex');
  }

  isValidNewBlock(newBlock, previousBlock) {
    if (previousBlock.index + 1 !== newBlock.index) {
      return false;
    }

    if (newBlock.previousHash !== previousBlock.hash) {
      return false;
    }

    if (newBlock.calculateHash() !== newBlock.hash) {
      return false;
    }

    if (!this.verifyBlockSignature(newBlock)) {
      return false;
    }

    return true;
  }

  verifyBlockSignature(block) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(block.hash);
    verify.end();

    return verify.verify(
      this.authorityPublicKey,
      Buffer.from(block.signature, 'hex')
    );
  }

  // ✅ Check if the full chain is valid
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];
      if (!this.isValidNewBlock(current, prev)) return false;
    }
    return true;
  }

  saveChain() {
    // atomic write to prevent corruption
    writeJsonAtomicSync(this.chainFile, this.chain);
  }

  // ✅ Query chain by a predicate
  queryByPredicate(predicateFn) {
    return this.chain.filter((block) => predicateFn(block.data));
  }
}

module.exports = Blockchain;
