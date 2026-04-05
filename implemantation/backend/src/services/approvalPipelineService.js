const { getRegistryInstance } = require('../blockchain/registryInstance');
const approvalWorkflowStore = require('./approvalWorkflowStore');
const { buildSignedCredential, finalizeCredentialIssuance } = require('./credentialIssuanceService');
const ApprovalOrchestrator = require('./approvalOrchestrator');
const issuerTrustValidator = require('./authorities/issuerTrustValidator');
const credentialIntegrityValidator = require('./authorities/credentialIntegrityValidator');
const institutionalPolicyValidator = require('./authorities/institutionalPolicyValidator');

const orchestrator = new ApprovalOrchestrator({
  approvalWorkflowStore,
  authorities: [
    { name: 'ISSUER_TRUST', evaluate: issuerTrustValidator.evaluate },
    { name: 'CREDENTIAL_INTEGRITY', evaluate: credentialIntegrityValidator.evaluate },
    { name: 'INSTITUTIONAL_POLICY', evaluate: institutionalPolicyValidator.evaluate }
  ],
  finalizeIssuance: async (workflow) => {
    const { credentialRegistry } = getRegistryInstance();
    return finalizeCredentialIssuance({ workflow, credentialRegistry });
  }
});

function normalizeDid(did) {
  if (typeof did !== 'string') return did;
  return did.toLowerCase();
}

function normalizeIssuerAccess(reqUser, didRegistry, credentialRegistry) {
  let issuerDid = normalizeDid(reqUser.did);

  let issuerAddress = issuerDid;
  if (issuerAddress.startsWith('did:ethr:') || issuerAddress.startsWith('did:ether:')) {
    issuerAddress = issuerAddress.split(':').pop();
  }

  const rawAllowed = process.env.ALLOWED_ISSUERS || process.env.ALLOWED_ISSUER;
  if (rawAllowed) {
    const allowedAddrs = rawAllowed
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .filter((a) => a.length > 0);

    const normalizedIssuer = issuerAddress.toString().toLowerCase();
    if (!allowedAddrs.includes(normalizedIssuer)) {
      const err = new Error('Issuer not approved');
      err.statusCode = 403;
      throw err;
    }

    if (!didRegistry.resolveDID(issuerDid)) {
      didRegistry.registerDID({ did: issuerDid, publicKeyPem: null, address: issuerAddress });
    }
    if (!didRegistry.isApprovedIssuer(issuerDid)) {
      const authorityAddress = process.env.VALIDATOR_ID || 'AUTHORITY_NODE';
      const authorityDid = didRegistry.generateDIDFromAddress(authorityAddress);
      didRegistry.approveIssuer(issuerDid, authorityDid);
    }
    if (!credentialRegistry.isIssuerApproved(issuerDid)) {
      credentialRegistry.approveIssuer(issuerDid);
    }
  }

  if (!didRegistry.isApprovedIssuer(issuerDid)) {
    const err = new Error('DID not approved as issuer');
    err.statusCode = 403;
    throw err;
  }

  if (!credentialRegistry.isIssuerApproved(issuerDid)) {
    const err = new Error('Issuer not approved by authority');
    err.statusCode = 403;
    throw err;
  }

  return issuerDid;
}

async function createCredentialRequestAndRun({ reqUser, payload }) {
  const { didRegistry, credentialRegistry } = getRegistryInstance();
  const issuerDid = normalizeIssuerAccess(reqUser, didRegistry, credentialRegistry);

  const {
    subjectDid,
    credentialType = 'CustomCredential',
    claims,
    expirationDate
  } = payload;

  const normalizedSubjectDid = normalizeDid(subjectDid);

  const vc = buildSignedCredential({
    issuerDid,
    subjectDid: normalizedSubjectDid,
    credentialType,
    claims,
    expirationDate
  });

  const workflow = approvalWorkflowStore.createWorkflow({
    issuerDid,
    createdByIssuer: issuerDid,
    subjectDid: normalizedSubjectDid,
    credentialType,
    claims,
    expirationDate: expirationDate || null,
    requiredApprovals: orchestrator.authorities.length,
    vc
  });

  const orchestrationResult = await orchestrator.run(workflow.id, {
    reqUser,
    didRegistry,
    credentialRegistry,
    approvalWorkflowStore
  });

  return orchestrationResult.workflow;
}

function getPipelineStatusById(id) {
  return approvalWorkflowStore.getWorkflow(id);
}

function getPendingByIssuer(issuerDid) {
  return approvalWorkflowStore.listByIssuer(normalizeDid(issuerDid));
}

async function retryAutomation(workflowId, reqUser) {
  const { didRegistry, credentialRegistry } = getRegistryInstance();
  return orchestrator.run(workflowId, {
    reqUser,
    didRegistry,
    credentialRegistry,
    approvalWorkflowStore
  });
}

async function finalizeAfterThreshold(workflowId) {
  const { credentialRegistry } = getRegistryInstance();
  const workflow = approvalWorkflowStore.getWorkflow(workflowId);

  if (!workflow) {
    throw new Error('Credential request not found');
  }

  if (!workflow.isThresholdApproved) {
    const err = new Error('Threshold not approved');
    err.statusCode = 400;
    throw err;
  }

  if (workflow.issuanceStatus === 'ISSUED') {
    return workflow;
  }

  const issuanceResult = await finalizeCredentialIssuance({ workflow, credentialRegistry });
  return approvalWorkflowStore.updateWorkflow(workflowId, {
    issuanceStatus: 'ISSUED',
    issuedAt: workflow.issuedAt || new Date().toISOString(),
    issuanceResult,
    lastAutomationError: null
  });
}

module.exports = {
  createCredentialRequestAndRun,
  getPipelineStatusById,
  getPendingByIssuer,
  retryAutomation,
  finalizeAfterThreshold
};
