// src/config.js
// central environment configuration and validation

// load variables early
require('dotenv').config();

function validateEnv() {
  const isTest = process.env.NODE_ENV === 'test';

  // enforce JWT_SECRET in non-test environments
  if (!process.env.JWT_SECRET) {
    if (isTest) {
      // tests rely on a default value, replicate legacy behavior
      process.env.JWT_SECRET = 'DEV_SECRET_CHANGE_LATER';
    } else {
      console.error('🚫 Missing required environment variable: JWT_SECRET');
      process.exit(1);
    }
  }

  if (!process.env.CORS_ORIGIN) {
    if (isTest) {
      // allow any origin for tests
      process.env.CORS_ORIGIN = '*';
    } else {
      console.error('🚫 Missing required environment variable: CORS_ORIGIN');
      process.exit(1);
    }
  }

  // Additional critical variables may be logged as warnings
  if (!process.env.ALLOWED_ISSUERS) {
    console.warn('⚠️ ALLOWED_ISSUERS not set; no issuers will be automatically approved');
  }
  if (!process.env.ALLOWED_VERIFIERS) {
    console.warn('⚠️ ALLOWED_VERIFIERS not set; no verifiers will be automatically approved');
  }
}

validateEnv();

// parsed helper values
// ensure common localhost frontends are always permitted
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

let CORS_ORIGINS = [];
if (process.env.CORS_ORIGIN) {
  CORS_ORIGINS = process.env.CORS_ORIGIN
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}
// merge defaults without duplicates
CORS_ORIGINS = Array.from(new Set([...defaultOrigins, ...CORS_ORIGINS]));

// helper to split comma lists into trimmed entries
function parseList(envValue) {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ALLOWED_VERIFIERS_LIST is an array of strings exactly as provided
// (the controller will handle normalization if necessary)
const ALLOWED_VERIFIERS_LIST = parseList(process.env.ALLOWED_VERIFIERS);

module.exports = {
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS,
  ALLOWED_ISSUERS: process.env.ALLOWED_ISSUERS || '',
  ALLOWED_VERIFIERS: process.env.ALLOWED_VERIFIERS || '',
  ALLOWED_VERIFIERS_LIST,
  PORT: process.env.PORT || '5000'
};
