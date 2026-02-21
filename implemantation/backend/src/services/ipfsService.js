const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const PINATA_BASE_URL = 'https://api.pinata.cloud';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

if (!PINATA_API_KEY || !PINATA_API_SECRET) {
  throw new Error('Pinata API keys missing in .env');
}

/* =====================================================
   UPLOAD FILE TO IPFS
===================================================== */
async function uploadToIPFS(filePath, filename) {
  try {
    const data = new FormData();
    data.append('file', fs.createReadStream(filePath), filename);

    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinFileToIPFS`,
      data,
      {
        maxBodyLength: Infinity,
        headers: {
          ...data.getHeaders(),
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET
        }
      }
    );

    return {
      cid: response.data.IpfsHash,
      size: response.data.PinSize,
      timestamp: response.data.Timestamp
    };

  } catch (error) {
    console.error('IPFS File Upload Error:', error.response?.data || error.message);
    throw new Error('Failed to upload file to IPFS');
  }
}

/* =====================================================
   UPLOAD JSON DIRECTLY (Best for VC)
===================================================== */
async function uploadJSONToIPFS(jsonObject) {
  try {
    const response = await axios.post(
      `${PINATA_BASE_URL}/pinning/pinJSONToIPFS`,
      jsonObject,
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_API_SECRET
        }
      }
    );

    return {
      cid: response.data.IpfsHash,
      timestamp: response.data.Timestamp
    };

  } catch (error) {
    console.error('IPFS JSON Upload Error:', error.response?.data || error.message);
    throw new Error('Failed to upload JSON to IPFS');
  }
}

/* =====================================================
   FETCH FROM IPFS (Public Gateway)
===================================================== */
async function fetchFromIPFS(cid) {
  try {
    const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
    const response = await axios.get(url, { timeout: 10000 });

    return response.data;

  } catch (error) {
    console.error('IPFS Fetch Error:', error.message);
    throw new Error('Failed to fetch from IPFS');
  }
}

module.exports = {
  uploadToIPFS,
  uploadJSONToIPFS,
  fetchFromIPFS
};
