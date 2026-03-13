/**
 * Blockchain Confirmation Animation Module
 *
 * Displays a shortened blockchain confirmation sequence after successful
 * verification. This is purely presentational and does not alter any
 * verification, API, or backend behavior.
 */

const STEP_SEQUENCE = [
  { id: 'step1Container', duration: 1700 },
  { id: 'step2Container', duration: 1700 },
  { id: 'step3Container', duration: 1700 },
  { id: 'step4Container', duration: 1900 }
];

let confirmationTimeouts = [];

/**
 * Trigger the blockchain confirmation animation for a successful verification
 * @param {Function} onAnimationComplete - Callback to execute when animation completes
 */
export function showBlockchainConfirmationAnimation(onAnimationComplete) {
  const modal = document.getElementById('confirmationModal');
  const container = document.getElementById('confirmationAnimationContainer');
  
  if (!modal || !container) {
    console.error('Confirmation modal elements not found');
    if (onAnimationComplete) onAnimationComplete();
    return;
  }

  clearConfirmationTimeouts();
  resetAnimationSteps();
  modal.classList.remove('hidden');

  let elapsed = 0;

  STEP_SEQUENCE.forEach((step, index) => {
    const activationTimeout = window.setTimeout(() => {
      activateStep(step.id, index === STEP_SEQUENCE.length - 1);
    }, elapsed);

    confirmationTimeouts.push(activationTimeout);
    elapsed += step.duration;
  });

  const completionTimeout = window.setTimeout(() => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }, elapsed);

  confirmationTimeouts.push(completionTimeout);
}

/**
 * Reset all animation steps to their initial state
 */
function resetAnimationSteps() {
  const steps = document.querySelectorAll('.confirmation-step');
  steps.forEach(step => {
    step.classList.remove('active');
    step.classList.remove('final-step');
  });
}

function activateStep(stepId, isFinalStep) {
  resetAnimationSteps();

  const activeStep = document.getElementById(stepId);
  if (!activeStep) {
    return;
  }

  activeStep.classList.add('active');
  if (isFinalStep) {
    activeStep.classList.add('final-step');
  }
}

function clearConfirmationTimeouts() {
  confirmationTimeouts.forEach(timeoutId => window.clearTimeout(timeoutId));
  confirmationTimeouts = [];
}

/**
 * Close the confirmation modal
 */
export function closeConfirmationModal() {
  const modal = document.getElementById('confirmationModal');
  clearConfirmationTimeouts();
  resetAnimationSteps();
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Apply success styling to a result card
 * @param {HTMLElement} resultCard - The result card element to style
 */
export function applySuccessCardStyling(resultCard) {
  if (!resultCard) return;
  
  // Add success class for glowing border
  resultCard.classList.add('success-verified');
  
  // Add success header if not already present
  if (!resultCard.querySelector('.result-success-header')) {
    const header = document.createElement('div');
    header.className = 'result-success-header';
    header.innerHTML = `
      <div class="result-success-icon">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <div class="result-success-title">Credential Verified ✔</div>
        <div class="result-success-subtitle">Verified on Blockchain</div>
      </div>
    `;
    resultCard.insertBefore(header, resultCard.firstChild);
  }
}

/**
 * Format verification result data for display
 * @param {Object} resultData - The verification result from API
 * @returns {Object} Formatted display data
 */
export function formatResultDisplay(resultData) {
  return {
    credentialId: resultData.vcId || resultData.credentialId || '',
    issuer: resultData.issuer || 'Not specified',
    timestamp: resultData.timestamp || '',
    status: resultData.valid ? 'VALID ✅' : 'INVALID',
    revoked: resultData.revoked ? 'Yes' : 'No',
    expired: resultData.expired ? 'Yes' : 'No'
  };
}
