// this file runs before each test file
// set environment to test so filesystem writes use a separate path
process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');

// remove test blockchain file to start clean
const chainPath = path.join(__dirname, 'storage', 'blockchain.test.json');
if (fs.existsSync(chainPath)) {
  fs.unlinkSync(chainPath);
}
