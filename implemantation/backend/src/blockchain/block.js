const crypto = require('crypto');
class Block {
  constructor(
    index,
    previousHash,
    timestamp,
    data,
    validator,
    signature = null,
    hash = null
  ) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
    this.validator = validator;
    this.signature = signature;

    // If hash is provided (loading from disk), use it.
    // Otherwise calculate new hash.
    this.hash = hash || this.calculateHash();
  }

  calculateHash() {
    const blockString = `${this.index}${this.previousHash}${this.timestamp}${JSON.stringify(
      this.data
    )}${this.validator}`;
    return crypto.createHash('sha256').update(blockString).digest('hex');
  }

  static genesis() {
    return new Block(
      0,
      '0',
      Date.now(),
      { type: 'GENESIS', payload: { message: 'DID VC Chain Genesis Block' } },
      'GENESIS_VALIDATOR',
      null
    );
  }
}

module.exports = Block;

