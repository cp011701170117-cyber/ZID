// src/storage/storageService.js
// Provides crash-safe JSON persistence with atomic writes.

const fs = require('fs');
const path = require('path');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeJsonAtomicSync(filePath, data) {
  const dir = path.dirname(filePath);
  ensureDirSync(dir);

  const tempPath = `${filePath}.tmp-${Date.now()}`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
  fs.renameSync(tempPath, filePath);
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.promises.mkdir(dir, { recursive: true });

  const tempPath = `${filePath}.tmp-${Date.now()}`;
  await fs.promises.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.promises.rename(tempPath, filePath);
}

async function readJson(filePath, fallback = null) {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return fallback;
    }
    throw err;
  }
}

module.exports = {
  writeJsonAtomicSync,
  writeJsonAtomic,
  readJson
};
