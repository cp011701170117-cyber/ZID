const crypto = require('crypto');

// For academic prototype: IPFS is optional, we use mock CIDs
// In production, configure IPFS endpoint (Pinata, Web3.Storage, or local node)

let client = null;

function getIpfsClient() {
  // IPFS client initialization disabled for prototype
  // To enable: configure IPFS_ENDPOINT and use ipfs-http-client
  return null;
}

async function addJson(data) {
  try {
    const ipfs = getIpfsClient();
    if (ipfs) {
      const { cid } = await ipfs.add(JSON.stringify(data));
      return cid.toString();
    }
  } catch (error) {
    console.warn('IPFS unavailable:', error.message);
  }
  
  // Fallback: Generate mock CID (hash-based identifier)
  const hash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return `mock:${hash.substring(0, 16)}`;
}

async function getJson(cid) {
  try {
    const ipfs = getIpfsClient();
    if (ipfs) {
      const stream = ipfs.cat(cid);
      let data = '';
      for await (const chunk of stream) {
        data += chunk.toString();
      }
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('IPFS unavailable, cannot retrieve:', cid);
  }
  
  // For prototype: Cannot retrieve from mock CID
  // In production, store VC data in a database or use IPFS
  throw new Error(`Cannot retrieve credential from mock CID: ${cid}. In production, use IPFS or database storage.`);
}

module.exports = {
  addJson,
  getJson
};
