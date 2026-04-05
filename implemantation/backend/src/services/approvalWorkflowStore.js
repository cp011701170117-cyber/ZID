const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeJsonAtomicSync } = require('../storage/storageService');

const storageFilePath = path.join(__dirname, '../../storage/credentialApprovalWorkflows.json');

class ApprovalWorkflowStore {
  constructor() {
    this.workflows = new Map();
    this._load();
  }

  _load() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    try {
      if (!fs.existsSync(storageFilePath)) {
        return;
      }

      const raw = fs.readFileSync(storageFilePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const records = Array.isArray(parsed) ? parsed : parsed.workflows || [];

      records.forEach((workflow) => {
        this.workflows.set(workflow.id, workflow);
      });
    } catch (err) {
      this.workflows = new Map();
    }
  }

  _persist() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    const records = Array.from(this.workflows.values());
    writeJsonAtomicSync(storageFilePath, { workflows: records });
  }

  createWorkflow(data) {
    const now = new Date().toISOString();
    const id = `crq:${crypto.randomUUID()}`;

    const workflow = {
      id,
      createdAt: now,
      updatedAt: now,
      issuanceStatus: 'UNDER_REVIEW',
      requiredApprovals: 2,
      totalAuthorities: 3,
      approvalCount: 0,
      isThresholdApproved: false,
      thresholdApprovedAt: null,
      issuedAt: null,
      automationMode: 'AUTOMATED_MULTI_AUTHORITY',
      authorityDecisions: [],
      pipelineRuns: [],
      lastAutomationError: null,
      ...data
    };

    this.workflows.set(id, workflow);
    this._persist();
    return workflow;
  }

  getWorkflow(id) {
    return this.workflows.get(id) || null;
  }

  updateWorkflow(id, partial) {
    const existing = this.getWorkflow(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, updated);
    this._persist();
    return updated;
  }

  appendAuthorityDecisions(id, decisions) {
    const existing = this.getWorkflow(id);
    if (!existing) return null;

    const merged = {
      ...existing,
      authorityDecisions: [...(existing.authorityDecisions || []), ...decisions],
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, merged);
    this._persist();
    return merged;
  }

  appendPipelineRun(id, runSummary) {
    const existing = this.getWorkflow(id);
    if (!existing) return null;

    const merged = {
      ...existing,
      pipelineRuns: [...(existing.pipelineRuns || []), runSummary],
      updatedAt: new Date().toISOString()
    };

    this.workflows.set(id, merged);
    this._persist();
    return merged;
  }

  listByIssuer(issuerDid) {
    return Array.from(this.workflows.values()).filter((workflow) => workflow.issuerDid === issuerDid);
  }

  listPendingByIssuer(issuerDid) {
    return this.listByIssuer(issuerDid).filter((workflow) => (
      workflow.issuanceStatus === 'UNDER_REVIEW' ||
      workflow.issuanceStatus === 'THRESHOLD_APPROVED'
    ));
  }

  hasDuplicateIssuedOrPending({ issuerDid, subjectDid, credentialType, excludeWorkflowId }) {
    return Array.from(this.workflows.values()).some((workflow) => {
      if (excludeWorkflowId && workflow.id === excludeWorkflowId) {
        return false;
      }

      const sameKey = workflow.issuerDid === issuerDid
        && workflow.subjectDid === subjectDid
        && workflow.credentialType === credentialType;

      if (!sameKey) return false;

      return ['UNDER_REVIEW', 'THRESHOLD_APPROVED', 'ISSUED'].includes(workflow.issuanceStatus);
    });
  }
}

module.exports = new ApprovalWorkflowStore();
module.exports.storageFilePath = storageFilePath;
