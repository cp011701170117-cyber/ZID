const crypto = require("crypto");
const canonicalize = require("canonicalize");

const privateKey = process.env.RSA_PRIVATE_KEY?.replace(/\\n/g, "\n");
const publicKey = process.env.RSA_PUBLIC_KEY?.replace(/\\n/g, "\n");

/* ==============================
   SIGN CANONICAL DATA
============================== */
function signData(data) {
  const canonical = canonicalize(data);

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(canonical);
  signer.end();

  return signer.sign(privateKey, "base64");
}

/* ==============================
   VERIFY SIGNATURE
============================== */
function verifySignature(data, signature) {
  const canonical = canonicalize(data);

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(canonical);
  verifier.end();

  return verifier.verify(publicKey, signature, "base64");
}

module.exports = {
  signData,
  verifySignature,
};
