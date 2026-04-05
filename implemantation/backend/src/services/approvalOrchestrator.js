const crypto = require('crypto');

class ApprovalOrchestrator {
  constructor({
    approvalWorkflowStore,
    authorities,
    finalizeIssuance
  }) {
    this.approvalWorkflowStore = approvalWorkflowStore;
    this.authorities = authorities;
    this.finalizeIssuance = finalizeIssuance;
  }

  _latestDecisionMap(authorityDecisions) {
    const map = new Map();
    for (let i = authorityDecisions.length - 1; i >= 0; i -= 1) {
      const entry = authorityDecisions[i];
      if (!map.has(entry.authorityName)) {
        map.set(entry.authorityName, entry);
      }
    }
    return map;
  }

  async run(workflowId, context) {
    let workflow = this.approvalWorkflowStore.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error('Credential request not found');
    }

    if (workflow.issuanceStatus === 'ISSUED') {
      return {
        workflow,
        approvedCount: workflow.approvalCount,
        thresholdReached: true,
        issued: true,
        alreadyIssued: true
      };
    }

    const runId = `run:${crypto.randomUUID()}`;
    const runStartedAt = new Date().toISOString();

    const evaluatedDecisions = this.authorities.map((authority) => ({
      ...authority.evaluate(workflow, context),
      evaluatedAt: new Date().toISOString(),
      runId
    }));

    workflow = this.approvalWorkflowStore.appendAuthorityDecisions(workflowId, evaluatedDecisions);

    const latestMap = this._latestDecisionMap(workflow.authorityDecisions || []);
    const latestDecisions = this.authorities
      .map((authority) => latestMap.get(authority.name))
      .filter(Boolean);

    const approvedCount = latestDecisions.filter((entry) => entry.decision === 'APPROVED').length;
    const rejectedCount = latestDecisions.filter((entry) => entry.decision === 'REJECTED').length;
    const totalAuthorities = this.authorities.length;
    const requiredApprovals = Number.isInteger(workflow.requiredApprovals)
      ? workflow.requiredApprovals
      : totalAuthorities;
    const thresholdReached = approvedCount >= requiredApprovals && rejectedCount === 0;

    let issuanceStatus = 'UNDER_REVIEW';
    let isThresholdApproved = false;
    let thresholdApprovedAt = workflow.thresholdApprovedAt;
    let issuedAt = workflow.issuedAt;
    let issued = false;
    let issuanceError = null;
    let issuanceResult = null;

    if (rejectedCount > 0) {
      issuanceStatus = 'REJECTED';
    } else if (thresholdReached) {
      issuanceStatus = 'THRESHOLD_APPROVED';
      isThresholdApproved = true;
      thresholdApprovedAt = thresholdApprovedAt || new Date().toISOString();

      try {
        issuanceResult = await this.finalizeIssuance(workflow);
        issuanceStatus = 'ISSUED';
        issuedAt = issuedAt || new Date().toISOString();
        issued = true;
      } catch (err) {
        issuanceError = err.message || 'Final issuance failed';
      }
    }

    workflow = this.approvalWorkflowStore.updateWorkflow(workflowId, {
      approvalCount: approvedCount,
      issuanceStatus,
      isThresholdApproved,
      thresholdApprovedAt,
      issuedAt,
      lastAutomationError: issuanceError,
      issuanceResult: issuanceResult || workflow.issuanceResult || null
    });

    this.approvalWorkflowStore.appendPipelineRun(workflowId, {
      runId,
      startedAt: runStartedAt,
      completedAt: new Date().toISOString(),
      approvedCount,
      rejectedCount,
      thresholdReached,
      issued,
      issuanceError
    });

    workflow = this.approvalWorkflowStore.getWorkflow(workflowId);

    return {
      workflow,
      approvedCount,
      thresholdReached,
      issued,
      issuanceResult
    };
  }
}

module.exports = ApprovalOrchestrator;
