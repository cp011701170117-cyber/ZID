const crypto = require('crypto');

class Block {
  constructor(index, previousHash, timestamp, data, validator, signature) {
    this.index = index;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data; // { type: 'DID' | 'VC', payload: {...} }
    this.validator = validator; // validator DID or name (PoA)
    this.signature = signature; // signature over hash by validator
    this.hash = this.calculateHash();
  }

  calculateHash() {
    const blockString = `${this.index}${this.previousHash}${this.timestamp}${JSON.stringify(
      this.data
    )}${this.validator}${this.signature || ''}`;
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

