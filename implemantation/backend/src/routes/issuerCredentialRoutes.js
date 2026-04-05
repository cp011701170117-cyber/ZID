const express = require('express');
const { issueCredentialSchema } = require('../validators/credentialValidator');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const validate = require('../middleware/validate');
const {
  createCredentialRequestAndRun,
  getPipelineStatusById,
  getPendingByIssuer,
  retryAutomation,
  finalizeAfterThreshold
} = require('../services/approvalPipelineService');

const router = express.Router();

router.post(
  '/create-request',
  authMiddleware,
  roleMiddleware('issuer'),
  validate(issueCredentialSchema),
  async (req, res, next) => {
    try {
      const workflow = await createCredentialRequestAndRun({
        reqUser: req.user,
        payload: req.body
      });

      return res.status(201).json({
        message: workflow.issuanceStatus === 'ISSUED'
          ? 'Credential auto-approved and issued successfully'
          : 'Credential request submitted for automated multi-authority approval',
        requestId: workflow.id,
        issuanceStatus: workflow.issuanceStatus,
        approvalCount: workflow.approvalCount,
        requiredApprovals: workflow.requiredApprovals,
        threshold: `${workflow.approvalCount}/${workflow.totalAuthorities}`,
        vcId: workflow.vc.id,
        vc: workflow.vc,
        vcHash: workflow.issuanceResult?.vcHash,
        ipfsCid: workflow.issuanceResult?.ipfsCid,
        anchor: workflow.issuanceResult?.anchor,
        authorityDecisions: workflow.authorityDecisions || []
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:id/pipeline-status',
  authMiddleware,
  roleMiddleware('issuer'),
  (req, res) => {
    const workflow = getPipelineStatusById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Credential request not found' });
    }

    if (workflow.issuerDid !== req.user.did) {
      return res.status(403).json({ error: 'Access denied for this credential request' });
    }

    return res.json({
      requestId: workflow.id,
      issuanceStatus: workflow.issuanceStatus,
      approvalCount: workflow.approvalCount,
      requiredApprovals: workflow.requiredApprovals,
      totalAuthorities: workflow.totalAuthorities,
      isThresholdApproved: workflow.isThresholdApproved,
      thresholdApprovedAt: workflow.thresholdApprovedAt,
      issuedAt: workflow.issuedAt,
      lastAutomationError: workflow.lastAutomationError,
      credential: {
        vcId: workflow.vc?.id,
        subjectDid: workflow.subjectDid,
        credentialType: workflow.credentialType,
        claims: workflow.claims,
        expirationDate: workflow.expirationDate
      },
      authorityDecisions: workflow.authorityDecisions || [],
      pipelineRuns: workflow.pipelineRuns || []
    });
  }
);

router.get(
  '/pending-approvals',
  authMiddleware,
  roleMiddleware('issuer'),
  (req, res) => {
    const rows = getPendingByIssuer(req.user.did).map((workflow) => ({
      requestId: workflow.id,
      vcId: workflow.vc?.id,
      subjectDid: workflow.subjectDid,
      credentialType: workflow.credentialType,
      issuanceStatus: workflow.issuanceStatus,
      approvalCount: workflow.approvalCount,
      requiredApprovals: workflow.requiredApprovals,
      totalAuthorities: workflow.totalAuthorities,
      isThresholdApproved: workflow.isThresholdApproved,
      thresholdApprovedAt: workflow.thresholdApprovedAt,
      issuedAt: workflow.issuedAt,
      lastAutomationError: workflow.lastAutomationError,
      createdAt: workflow.createdAt
    }));

    return res.json({ credentials: rows });
  }
);

router.post(
  '/:id/retry-automation',
  authMiddleware,
  roleMiddleware('issuer'),
  async (req, res, next) => {
    try {
      const current = getPipelineStatusById(req.params.id);
      if (!current) {
        return res.status(404).json({ error: 'Credential request not found' });
      }
      if (current.issuerDid !== req.user.did) {
        return res.status(403).json({ error: 'Access denied for this credential request' });
      }

      const result = await retryAutomation(req.params.id, req.user);
      return res.json({
        message: 'Automation pipeline retried',
        requestId: result.workflow.id,
        issuanceStatus: result.workflow.issuanceStatus,
        approvalCount: result.workflow.approvalCount,
        requiredApprovals: result.workflow.requiredApprovals,
        authorityDecisions: result.workflow.authorityDecisions || [],
        lastAutomationError: result.workflow.lastAutomationError,
        issuedAt: result.workflow.issuedAt
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/finalize-issuance',
  authMiddleware,
  roleMiddleware('issuer'),
  async (req, res, next) => {
    try {
      const current = getPipelineStatusById(req.params.id);
      if (!current) {
        return res.status(404).json({ error: 'Credential request not found' });
      }
      if (current.issuerDid !== req.user.did) {
        return res.status(403).json({ error: 'Access denied for this credential request' });
      }

      const workflow = await finalizeAfterThreshold(req.params.id);
      return res.json({
        message: 'Credential issuance finalized',
        requestId: workflow.id,
        issuanceStatus: workflow.issuanceStatus,
        issuedAt: workflow.issuedAt,
        vcId: workflow.vc?.id,
        vcHash: workflow.issuanceResult?.vcHash,
        ipfsCid: workflow.issuanceResult?.ipfsCid,
        anchor: workflow.issuanceResult?.anchor
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
