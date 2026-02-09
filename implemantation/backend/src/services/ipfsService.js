import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

const PINATA_BASE_URL = 'https://api.pinata.cloud';

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

console.log('Pinata key loaded:', !!PINATA_API_KEY);

if (!PINATA_API_KEY || !PINATA_API_SECRET) {
  throw new Error('❌ Pinata API keys are missing in .env');
}

/**
 * Upload file to IPFS via Pinata
 * @param {string} filePath
 * @param {string} filename
 */
export async function uploadToIPFS(filePath, filename) {
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
}
