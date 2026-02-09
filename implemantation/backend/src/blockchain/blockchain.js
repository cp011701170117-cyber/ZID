const crypto = require('crypto');
const Block = require('./block');
const fs = require('fs');
const path = require('path');

class Blockchain {
  chain = [];
  validatorId = '';

  constructor(validatorId) {
    this.chain = [Block.genesis()];
    this.validatorId = validatorId || 'AUTHORITY_NODE';
  
    // 🔑 Load validator keys
    this.validatorPrivateKey = fs.readFileSync(
      path.join(__dirname, '../../keys/validator.key')
    );
  
    this.validatorPublicKey = fs.readFileSync(
      path.join(__dirname, '../../keys/validator.pub')
    );
  }

  // ✅ Get the latest block
  getLatestBlock = () => this.chain[this.chain.length - 1];

  // ✅ Add a new block
addBlock(data) {
  const previousBlock = this.getLatestBlock();
  const index = previousBlock.index + 1;
  const timestamp = Date.now();

  // create block WITHOUT signature first
  let block = new Block(
    index,
    previousBlock.hash,
    timestamp,
    data,
    this.validatorId,
    ''
  );

  // sign the hash
  block.signature = this.signBlockHash(block.hash);

  // recalculate hash AFTER signature
  block.hash = block.calculateHash();

  if (!this.isValidNewBlock(block, previousBlock)) {
    throw new Error('Invalid block');
  }

  this.chain.push(block);
  return block;
}
  // ✅ Sign a block hash with HMAC (PoA-style)
  signBlockHash = (hash) => {
    const secret = process.env.AUTHORITY_SECRET || 'dev-secret';
    return crypto.createHmac('sha256', secret).update(hash).digest('hex');
  };
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

  return true;
}

  verifyBlockSignature(block) {
    if (!block.signature) return false;
  
    return crypto.verify(
      'SHA256',
      Buffer.from(block.hash),
      this.validatorPublicKey,   // make sure this exists
      Buffer.from(block.signature, 'hex')
    );
  }
  
  // ✅ Check if the full chain is valid
  isChainValid = () => {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];
      if (!this.isValidNewBlock(current, prev)) return false;
    }
    return true;
  };

  // ✅ Query chain by a predicate
  queryByPredicate = (predicateFn) => this.chain.filter((block) => predicateFn(block.data));
}

module.exports = Blockchain;
