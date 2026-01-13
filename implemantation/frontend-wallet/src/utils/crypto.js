import { ec as EC } from 'elliptic'

const ec = new EC('secp256k1')

/**
 * SHA-256 hash function for browser
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Generate a DID following format: did:custom:<sha256>
 */
export const generateDID = async () => {
  // Generate keypair
  const keyPair = ec.genKeyPair()
  
  // Create DID from public key hash
  const publicKeyHex = keyPair.getPublic('hex')
  const didHash = await sha256(publicKeyHex)
  const did = `did:custom:${didHash}`
  
  return {
    did,
    keyPair
  }
}

/**
 * Sign data with private key
 */
export const signData = async (data, privateKeyHex) => {
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex')
  const msgHash = await sha256(JSON.stringify(data))
  const signature = keyPair.sign(msgHash)
  return {
    r: signature.r.toString('hex'),
    s: signature.s.toString('hex'),
    recoveryParam: signature.recoveryParam
  }
}

/**
 * Verify signature
 */
export const verifySignature = async (data, signature, publicKeyHex) => {
  try {
    const keyPair = ec.keyFromPublic(publicKeyHex, 'hex')
    const msgHash = await sha256(JSON.stringify(data))
    return keyPair.verify(msgHash, signature)
  } catch (e) {
    return false
  }
}

/**
 * Store keypair securely (client-side only)
 */
export const saveKeyPairToStorage = (keyPair) => {
  const privateKeyHex = keyPair.getPrivate('hex')
  // In production, use proper encryption
  localStorage.setItem('wallet_private_key', privateKeyHex)
}

/**
 * Retrieve keypair from storage
 */
export const getKeyPairFromStorage = () => {
  const privateKeyHex = localStorage.getItem('wallet_private_key')
  if (!privateKeyHex) return null
  try {
    return ec.keyFromPrivate(privateKeyHex, 'hex')
  } catch (e) {
    return null
  }
}
