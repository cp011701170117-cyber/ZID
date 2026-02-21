const crypto = require('crypto');
const Block = require('./block');
const fs = require('fs');
const path = require('path');


class Blockchain {
  chain = [];
  validatorId = '';
  

  constructor(validatorId) {
    
this.chainFile = path.join(__dirname, '../../storage/blockchain.json');

    if (fs.existsSync(this.chainFile)) {
      const raw = fs.readFileSync(this.chainFile);
      const parsed = JSON.parse(raw);

      this.chain = parsed.map(blockData => 
        new Block(
          blockData.index,
          blockData.previousHash,
          blockData.timestamp,
          blockData.data,
          blockData.validatorId,
          blockData.signature,
          blockData.hash
        )
      );
    } else {
      this.chain = [Block.genesis()];
      this.saveChain();
    }
    this.validatorId = validatorId || 'AUTHORITY_NODE';
  
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
  getLatestBlock = () => this.chain[this.chain.length - 1];

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
    this.saveChain()
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
  isChainValid = () => {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const prev = this.chain[i - 1];
      if (!this.isValidNewBlock(current, prev)) return false;
    }
    return true;
  };
  saveChain() {
    fs.writeFileSync(
    this.chainFile,
    JSON.stringify(this.chain, null, 2)
    );
  }

  // ✅ Query chain by a predicate
  queryByPredicate = (predicateFn) => this.chain.filter((block) => predicateFn(block.data));

  
}

module.exports = Blockchain;
