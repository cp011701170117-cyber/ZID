const canonicalize = require('canonicalize');

function looksLikeDid(value) {
  return typeof value === 'string' && /^did:[a-z0-9]+:.+/i.test(value.trim());
}

function evaluate(workflow) {
  if (!looksLikeDid(workflow.subjectDid)) {
    return {
      authorityName: 'CREDENTIAL_INTEGRITY',
      decision: 'REJECTED',
      reason: 'Invalid holder DID format'
    };
  }

  if (!workflow.credentialType || typeof workflow.credentialType !== 'string') {
    return {
      authorityName: 'CREDENTIAL_INTEGRITY',
      decision: 'REJECTED',
      reason: 'Credential type is required'
    };
  }

  if (!workflow.claims || typeof workflow.claims !== 'object' || Object.keys(workflow.claims).length === 0) {
    return {
      authorityName: 'CREDENTIAL_INTEGRITY',
      decision: 'REJECTED',
      reason: 'Claims payload is missing or malformed'
    };
  }

  if (!workflow.vc || !workflow.vc.id || !workflow.vc.credentialSubject) {
    return {
      authorityName: 'CREDENTIAL_INTEGRITY',
      decision: 'REJECTED',
      reason: 'Credential object is not signable'
    };
  }

  try {
    canonicalize(workflow.vc);
  } catch (err) {
    return {
      authorityName: 'CREDENTIAL_INTEGRITY',
      decision: 'REJECTED',
      reason: 'Credential object is not canonicalizable'
    };
  }

  return {
    authorityName: 'CREDENTIAL_INTEGRITY',
    decision: 'APPROVED',
    reason: 'Credential integrity checks passed'
  };
}

module.exports = { evaluate };
