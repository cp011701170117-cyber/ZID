require('dotenv').config();
const { uploadToIPFS } = require('../services/ipfsService');

(async () => {
  try {
    const result = await uploadToIPFS(
      __filename,
      'test-file.txt'
    );
    console.log('IPFS upload success:', result);
  } catch (err) {
    console.error('IPFS upload failed:', err.message);
  }
})();
