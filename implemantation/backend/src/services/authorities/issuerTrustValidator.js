function evaluate(workflow, context) {
  const { reqUser, didRegistry, credentialRegistry } = context;

  if (!reqUser) {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'No authenticated issuer context'
    };
  }

  if (reqUser.role !== 'issuer') {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'User role is not issuer'
    };
  }

  if (!reqUser.did || reqUser.did !== workflow.issuerDid) {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'Issuer DID mismatch'
    };
  }

  if (!didRegistry.isApprovedIssuer(workflow.issuerDid)) {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'Issuer DID is not approved by DID authority'
    };
  }

  if (!credentialRegistry.isIssuerApproved(workflow.issuerDid)) {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'Issuer is not approved for credential issuance'
    };
  }

  if (reqUser.isIssuerAuthorityActive === false) {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'Issuer authority is marked inactive'
    };
  }

  if (reqUser.canIssueCredentials === false) {
    return {
      authorityName: 'ISSUER_TRUST',
      decision: 'REJECTED',
      reason: 'Issuer cannot issue credentials'
    };
  }

  return {
    authorityName: 'ISSUER_TRUST',
    decision: 'APPROVED',
    reason: 'Issuer trust checks passed'
  };
}

module.exports = { evaluate };
