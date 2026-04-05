function evaluate(workflow, context) {
  const { approvalWorkflowStore, credentialRegistry } = context;

  if (approvalWorkflowStore.hasDuplicateIssuedOrPending({
    issuerDid: workflow.issuerDid,
    subjectDid: workflow.subjectDid,
    credentialType: workflow.credentialType,
    excludeWorkflowId: workflow.id
  })) {
    return {
      authorityName: 'INSTITUTIONAL_POLICY',
      decision: 'REJECTED',
      reason: 'Duplicate issuance request for issuer, holder DID and type'
    };
  }

  const issuedByIssuer = credentialRegistry.getCredentialsByIssuer(workflow.issuerDid);
  const duplicateIssued = issuedByIssuer.some((cred) => (
    cred.subjectDid === workflow.subjectDid
      && ((cred.type || 'VerifiableCredential') === workflow.credentialType)
      && !cred.revoked
  ));

  if (duplicateIssued) {
    return {
      authorityName: 'INSTITUTIONAL_POLICY',
      decision: 'REJECTED',
      reason: 'Issuer already issued this credential category to this holder'
    };
  }

  return {
    authorityName: 'INSTITUTIONAL_POLICY',
    decision: 'APPROVED',
    reason: 'Institutional policy checks passed'
  };
}

module.exports = { evaluate };
