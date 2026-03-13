/**
 * Verifier blockchain visualizer (UI-only)
 * Renders chain blocks from real API blockchain array indexes.
 */

let latestChainSnapshot = [];
let animationLock = false;

function getElements() {
  return {
    chainTrack: document.querySelector('.chain-track'),
    chainStats: document.getElementById('chainStats')
  };
}

function createBlockElement(blockIndex, isLatest = false) {
  const blockEl = document.createElement('div');
  blockEl.className = `chain-block ${isLatest ? 'is-latest' : ''}`;
  blockEl.dataset.blockIndex = String(blockIndex);

  blockEl.innerHTML = `
    <div class="block-box">${blockIndex}</div>
    <div class="block-label">Block ${blockIndex}</div>
  `;

  return blockEl;
}

function createLinkElement() {
  const linkEl = document.createElement('div');
  linkEl.className = 'chain-link';
  linkEl.setAttribute('aria-hidden', 'true');
  return linkEl;
}

function normalizeChain(chain) {
  if (!Array.isArray(chain)) {
    return [];
  }

  // Keep display strictly ordered from genesis to latest.
  return [...chain].sort((a, b) => {
    const aIndex = Number.isFinite(Number(a?.index)) ? Number(a.index) : 0;
    const bIndex = Number.isFinite(Number(b?.index)) ? Number(b.index) : 0;
    return aIndex - bIndex;
  });
}

function renderStats(chain, isValid) {
  const { chainStats } = getElements();
  if (!chainStats) return;

  const totalBlocks = chain.length;
  const latestBlockIndex = totalBlocks > 0 ? chain[totalBlocks - 1].index : 'N/A';

  const validState = typeof isValid === 'boolean' ? isValid : null;
  const validText = validState === null ? 'Unknown' : validState ? 'Valid' : 'Invalid';
  const validClass = validState === null ? 'unknown' : validState ? 'ok' : 'bad';

  chainStats.innerHTML = `
    <div class="chain-stats-grid">
      <div class="chain-stat-card">
        <div class="chain-stat-label">Total Blocks</div>
        <div class="chain-stat-value">${totalBlocks}</div>
      </div>
      <div class="chain-stat-card">
        <div class="chain-stat-label">Latest Block</div>
        <div class="chain-stat-value">${latestBlockIndex}</div>
      </div>
      <div class="chain-stat-card">
        <div class="chain-stat-label">Chain Status</div>
        <div class="chain-stat-value chain-status ${validClass}">${validText}</div>
      </div>
    </div>
  `;
}

export function renderBlockchainFromChain(chain, isValid) {
  const { chainTrack } = getElements();
  if (!chainTrack) return;

  const normalizedChain = normalizeChain(chain);
  latestChainSnapshot = normalizedChain;

  chainTrack.innerHTML = '';

  normalizedChain.forEach((block, idx) => {
    const isLatest = idx === normalizedChain.length - 1;
    const blockEl = createBlockElement(block.index, isLatest);
    chainTrack.appendChild(blockEl);

    if (idx < normalizedChain.length - 1) {
      chainTrack.appendChild(createLinkElement());
    }
  });

  renderStats(normalizedChain, isValid);
}

export function addNewBlockToChain() {
  if (animationLock) return;

  const { chainTrack } = getElements();
  if (!chainTrack) return;

  const latestBlock = chainTrack.querySelector('.chain-block:last-of-type .block-box');
  if (!latestBlock) return;

  animationLock = true;
  latestBlock.classList.remove('new');

  // Force reflow so repeated verify actions retrigger the keyframe.
  void latestBlock.offsetWidth;
  latestBlock.classList.add('new');

  window.setTimeout(() => {
    latestBlock.classList.remove('new');
    animationLock = false;
  }, 700);
}

export function getLatestRenderedChain() {
  return latestChainSnapshot;
}

export default {
  renderBlockchainFromChain,
  addNewBlockToChain,
  getLatestRenderedChain
};
