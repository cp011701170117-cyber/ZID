const crypto = require('crypto');
const Block = require('./block');

class Blockchain {
  constructor(validatorId) {
    this.chain = [Block.genesis()];
    this.validatorId = validatorId || 'AUTHORITY_NODE';
  }

  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  addBlock(data) {
    const previousBlock = this.getLatestBlock();
    const index = previousBlock.index + 1;
    const timestamp = Date.now();
    const tempBlock = new Block(
      index,
      previousBlock.hash,
      timestamp,
      data,
      this.validatorId,
      null
    );
    const signature = this.signBlockHash(tempBlock.hash);
    const newBlock = new Block(
      index,
      previousBlock.hash,
      timestamp,
      data,
      this.validatorId,
      signature
    );

    if (this.isValidNewBlock(newBlock, previousBlock)) {
      this.chain.push(newBlock);
      return newBlock;
    }
    throw new Error('Invalid block');
  }

  signBlockHash(hash) {
    // Simple HMAC-based PoA-style signature with a shared secret for prototype.
    const secret = process.env.AUTHORITY_SECRET || 'dev-secret';
    return crypto.createHmac('sha256', secret).update(hash).digest('hex');
  }

  isValidNewBlock(newBlock, previousBlock) {
    if (previousBlock.index + 1 !== newBlock.index) return false;
    if (previousBlock.hash !== newBlock.previousHash) return false;
    if (newBlock.calculateHash() !== newBlock.hash) return false;
    const expectedSignature = this.signBlockHash(newBlock.hash);
    if (expectedSignature !== newBlock.signature) return false;
    return true;
  }

  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];
      if (!this.isValidNewBlock(current, prev)) return false;
    }
    return true;
  }

  queryByPredicate(predicateFn) {
    return this.chain.filter((block) => predicateFn(block.data));
  }
}

module.exports = Blockchain;

