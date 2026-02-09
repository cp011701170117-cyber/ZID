const path = require('path');
const { uploadToIPFS } = require('../services/ipfsService');

(async () => {
  try {
    const filePath = path.join(__dirname, 'sample.txt');

    const result = await uploadToIPFS(filePath, 'sample.txt');

    console.log('✅ IPFS upload success:', result);
  } catch (err) {
    console.error('❌ IPFS upload failed:', err.message);
  }
})();
