import { apiRequest } from './utils/api.js';
import { ethers } from 'ethers';
import { addNewBlockToChain, renderBlockchainFromChain } from './blockchainVisualizer.js';
import { showBlockchainConfirmationAnimation, closeConfirmationModal, applySuccessCardStyling } from './blockchainConfirmation.js';
import { createSession } from './utils/sessionManager.js';

const currentPath = window.location.pathname;
const session = JSON.parse(sessionStorage.getItem('userSession'));
const hasVerifierAuth = Boolean(
  sessionStorage.getItem('verifierJwt') && sessionStorage.getItem('verifierDid')
);

if (currentPath === '/login') {
  // Always start verifier login from a clean state to avoid stale auth loops.
  sessionStorage.removeItem('userSession');
  sessionStorage.removeItem('verifierJwt');
  sessionStorage.removeItem('verifierDid');
}

if (currentPath !== '/login' && (!session || session.role !== 'verifier' || !hasVerifierAuth)) {
  sessionStorage.removeItem('userSession');
  sessionStorage.removeItem('verifierJwt');
  sessionStorage.removeItem('verifierDid');
  window.location.href = '/login';
}


const vcTextarea = document.getElementById('vcJson');
const credentialIdInput = document.getElementById('credentialIdInput');
const verifyBtn = document.getElementById('verifyBtn');
const verifyByIdBtn = document.getElementById('verifyByIdBtn');
const resultContainer = document.getElementById('resultContainer');
const chainStats = document.getElementById('chainStats');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletDidDisplay = document.getElementById('walletDid');
const walletCard = document.getElementById('walletCard');
const verifyCard = document.getElementById('verifyCard');
const blockchainCard = document.getElementById('blockchainInfo');

// modal elements
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

let jwtToken = sessionStorage.getItem('verifierJwt') || '';
let verifierDid = sessionStorage.getItem('verifierDid') || null;
let isAuthenticated = Boolean(jwtToken && verifierDid);
let verifierApproved = false; // fetched from backend


function updateUI() {
  // display approval status if we know it
  const approvalEl = document.getElementById('approvalStatus');
  if (approvalEl) {
    if (isAuthenticated) {
      approvalEl.textContent = verifierApproved
        ? 'Approval: ✅ authorized'
        : 'Approval pending or denied';
    } else {
      approvalEl.textContent = '';
    }
  }

  if (isAuthenticated) {
    walletCard.style.display = 'none';
    verifyCard.style.display = 'block';
    blockchainCard.style.display = 'block';
    walletDidDisplay.textContent = `Connected DID: ${verifierDid}`;
    // Keep buttons enabled - allow users to attempt verification
    // Backend will handle approval checks and return appropriate errors
    verifyBtn.disabled = false;
    if (verifyByIdBtn) verifyByIdBtn.disabled = false;
  } else {
    walletCard.style.display = 'block';
    verifyCard.style.display = 'none';
    blockchainCard.style.display = 'none';
    walletDidDisplay.textContent = '';
    verifyBtn.disabled = false;
    if (verifyByIdBtn) verifyByIdBtn.disabled = false;
  }
}

async function init() {
  if (!session || !hasVerifierAuth) {
    updateUI();
    return;
  }

  // try to auto-connect via injected provider
  if (!verifierDid && window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        verifierDid = `did:ethr:${accounts[0]}`;
        sessionStorage.setItem('verifierDid', verifierDid);
      }
    } catch (err) {
      console.warn('eth_accounts error', err);
    }
  }

  // recompute authenticated flag
  isAuthenticated = Boolean(jwtToken && verifierDid);
  updateUI();
  if (isAuthenticated) {
    await checkApproval();
    await loadBlockchain();
  }

  // modal close handler
  modalClose.addEventListener('click', () => {
    modal.classList.add('hidden');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  init();

  const verifyIdBtnEl = document.getElementById('verifyByIdBtn');
  if (!verifyIdBtnEl) {
    console.error('ID verify button not found');
  } else {
    verifyIdBtnEl.addEventListener('click', verifyCredentialById);
  }

  const verifyJsonBtnEl = document.getElementById('verifyBtn');
  if (!verifyJsonBtnEl) {
    console.error('JSON verify button not found');
  } else {
    verifyJsonBtnEl.addEventListener('click', verifyCredentialFromJson);
  }

  const connectBtnEl = document.getElementById('connectWalletBtn');
  if (!connectBtnEl) {
    console.error('Connect wallet button not found');
  } else {
    connectBtnEl.addEventListener('click', onConnectWalletClick);
  }
});


async function loginVeriferWithWallet() {
  if (!window.ethereum) {
    throw new Error('MetaMask or Ethereum provider not detected');
  }
  sessionStorage.removeItem('userSession');
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts returned');
  }
  const address = accounts[0];
  verifierDid = `did:ethr:${address}`;
  // get nonce
  const { nonce } = await apiRequest('/auth/verifier/nonce', {
    method: 'POST',
    body: { address }
  });
  // sign nonce (ethers v6 BrowserProvider)
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const signature = await signer.signMessage(nonce);
  // verify with backend
  const data = await apiRequest('/auth/verifier/verify', {
    method: 'POST',
    body: { address, signature }
  });
  jwtToken = data.token;
  verifierApproved = !!data.approved;
  sessionStorage.clear();
  createSession({ role: data.role || 'verifier', address });
  sessionStorage.setItem('verifierJwt', jwtToken);
  sessionStorage.setItem('verifierDid', verifierDid);
  isAuthenticated = true;

  updateUI();
  await checkApproval();
  await loadBlockchain();
}

async function onConnectWalletClick() {
  try {
    await loginVeriferWithWallet();
  } catch (err) {
    console.error('Wallet connect/login error', err);
    alert(err.message || 'Failed to connect and login');
  }
}

async function verifyCredentialFromJson() {
  console.log('Verify (JSON) button clicked');
  if (!verifierDid || !isAuthenticated) return alert('Please login with your verifier wallet first');

  const text = vcTextarea.value.trim();
  if (!text) return alert('Please paste a VC JSON');

  let vc;
  try {
    vc = JSON.parse(text);
  } catch (e) {
    return alert('Invalid JSON');
  }

  try {
    const payload = { vc };
    if (verifierDid) payload.verifierDid = verifierDid;

    const data = await apiRequest('/credentials/verify', {
      method: 'POST',
      body: payload
    });
    showResultModal(data);
  } catch (err) {
    showResultModal({ error: err.message || 'Verification failed' });
  }
}

async function loadBlockchain() {
  try {
    // fetch full chain and validity separately. some clients expect /chain, others /blockchain
    let chain;
    try {
      chain = await apiRequest('/chain');
    } catch (e) {
      if (e.status === 404) {
        chain = await apiRequest('/blockchain');
      } else {
        throw e;
      }
    }
    const info = await apiRequest('/blockchain/validate');

    const blockchain = Array.isArray(chain)
      ? chain
      : Array.isArray(chain?.chain)
        ? chain.chain
        : [];

    renderBlockchainFromChain(blockchain, info.valid);
  } catch (err) {
    chainStats.textContent = `Error loading chain: ${err.message}`;
  }
}

async function checkApproval() {
  if (!jwtToken) return;
  try {
    const res = await apiRequest('/auth/verifier/status', { token: jwtToken });
    verifierApproved = !!res.approved;
  } catch (err) {
    console.warn('approval check failed', err);
    verifierApproved = false;
  }
  updateUI();
}

// debug button for authority reset
const resetChainBtn = document.getElementById('resetChainBtn');
if (resetChainBtn) {
  resetChainBtn.addEventListener('click', async () => {
    if (!window.confirm('Reset blockchain only (authority)?')) return;
    try {
      await apiRequest('/admin/reset-chain', { method: 'POST', token: jwtToken });
      alert('Reset request sent.');
      await loadBlockchain();
    } catch (err) {
      console.error(err);
      alert('Failed to reset chain: ' + err.message);
    }
  });
}

// ---------------------------------------------
// Helper utilities added for verifier portal
// ---------------------------------------------

/**
 * Fetch a VC JSON by credential ID using registry lookup and IPFS gateway.
 * Returns null if not found or on error.
 */
async function fetchVcById(rawId) {
  if (!rawId) return null;
  const id = rawId.startsWith('vc:') ? rawId : `vc:${rawId}`;
  try {
    const res = await apiRequest('/credentials');
    if (!res || !Array.isArray(res.credentials)) return null;
    const entry = res.credentials.find(c => c.id === id || c.vcId === id);
    if (!entry) return null;
    if (entry.cid) {
      const gateway = `https://gateway.pinata.cloud/ipfs/${entry.cid}`;
      return await apiRequest(gateway, { skipAuth: true });
    }
    return null;
  } catch (e) {
    console.error('fetchVcById error', e);
    return null;
  }
}

/**
 * Run the blockchain scan animation with Step 4 showing a failure state
 * ("Credential Not Found") instead of the success state.
 */
function showFailureScanAnimation(callback) {
  const step4Title = document.querySelector('#step4Container .success-title');
  const step4Badge = document.querySelector('#step4Container .success-badge');
  const step4Circle = document.querySelector('#step4Container .success-badge-circle');

  // Swap to failure visuals
  if (step4Title) step4Title.textContent = 'Credential Not Found';
  if (step4Badge) step4Badge.textContent = '✗ Not Found';
  if (step4Circle) step4Circle.style.background = '#ef4444';

  showBlockchainConfirmationAnimation(() => {
    // Restore success visuals for next valid verification
    if (step4Title) step4Title.textContent = 'Credential Verified on Blockchain';
    if (step4Badge) step4Badge.textContent = '✔ Verified';
    if (step4Circle) step4Circle.style.background = '';
    if (callback) callback();
  });
}

/**
 * Show a modal dialog with verification results or error message.
 * For successful verification, shows blockchain confirmation animation first.
 */
function showResultModal(data) {
  // Trigger blockchain animation on successful verification
  if (data.valid && !data.error) {
    addNewBlockToChain();
    
    // Show blockchain confirmation animation before displaying results
    showBlockchainConfirmationAnimation(() => {
      displayVerificationResult(data);
    });
    return; // Animation will trigger result display
  }
  
  // For errors or invalid credentials, run scan animation then show failure message
  showFailureScanAnimation(() => {
    displayVerificationResult({ error: 'Credential does not match the blockchain.' });
  });
}

/**
 * Display the verification result in the modal with appropriate styling
 */
function displayVerificationResult(data) {
  closeConfirmationModal();

  let html = '<h2 class="text-xl font-bold mb-3">Credential Verification Result</h2>';
  if (data.error) {
    html += `<p class="error">${data.error}</p>`;
  } else {
    const statusText = data.valid ? 'VALID ✅' : data.revoked ? 'REVOKED' : data.expired ? 'EXPIRED' : 'INVALID';
    html += `<p><strong>Credential ID:</strong> ${data.vcId || data.credentialId || credentialIdInput.value || ''}</p>`;
    html += `<p><strong>Status:</strong> ${statusText}</p>`;
    if (data.issuer) html += `<p><strong>Issuer:</strong> ${data.issuer}</p>`;
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      html += `<p><strong>Issued Date:</strong> ${isNaN(date) ? data.timestamp : date.toISOString()}</p>`;
    }
    html += `<p><strong>Revoked:</strong> ${data.revoked ? 'Yes' : 'No'}</p>`;
    html += `<p><strong>Expired:</strong> ${data.expired ? 'Yes' : 'No'}</p>`;
    if (data.valid) {
      html += `<p><strong>Blockchain Anchor:</strong> Verified</p>`;
    }
    if (data.reason && !data.valid) {
      html += `<p><strong>Reason:</strong> ${data.reason}</p>`;
    }
  }
  html += '<button id="modalCloseBtn" class="mt-4">Close</button>';
  
  // For successful verification, wrap in styled result card
  if (data.valid && !data.error) {
    const card = document.createElement('div');
    card.className = 'result-card success-verified';
    card.innerHTML = html;
    modalBody.innerHTML = '';
    modalBody.appendChild(card);
    applySuccessCardStyling(card);
  } else {
    modalBody.innerHTML = html;
  }
  
  const btn = document.getElementById('modalCloseBtn');
  if (btn) btn.addEventListener('click', () => modal.classList.add('hidden'));
  modal.classList.remove('hidden');
}

// handler for credential-id verify flow
async function verifyCredentialById() {
  try {
    const idInput = document.getElementById('credentialIdInput');
    if (!idInput) {
      console.error('Credential input field missing');
      return;
    }

    console.log('Verify button clicked');

    const credentialId = (idInput.value || idInput.dataset.id || '').trim();
    console.log('Credential ID:', credentialId);

    if (!credentialId) {
      alert('Please enter credential ID');
      return;
    }

    const result = await apiRequest('/credentials/verify', {
      method: 'POST',
      body: { vcId: credentialId }
    });

    console.log('Verification response:', result);

    showVerificationPopup(result);
  } catch (err) {
    console.error('Verification failed:', err);
    showFailureScanAnimation(() => {
      displayVerificationResult({ error: 'Credential does not match the blockchain.' });
    });
  }
}

function showVerificationPopup(result) {
  // reuse existing modal component
  showResultModal(result);
}
