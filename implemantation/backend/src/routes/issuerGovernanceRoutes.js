const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

function createIssuerGovernanceRouter(didRegistry) {
  const router = express.Router();
  const { getRegistryInstance } = require('../blockchain/registryInstance');

  // Only authority node can approve issuer
  router.post(
    '/approve',
    authMiddleware,
    roleMiddleware('authority'),
    (req, res, next) => {
      try {
        const { did } = req.body;

        if (!did) {
          return res.status(400).json({ error: 'DID is required' });
        }

        const result = didRegistry.approveIssuer(did, req.user.did);

        if (result.error) {
          return res.status(400).json(result);
        }

        // mirror approval in credential registry for performance checks
        const { credentialRegistry } = getRegistryInstance();
        if (!credentialRegistry.isIssuerApproved(did)) {
          credentialRegistry.approveIssuer(did);
        }

        return res.json({
          message: 'Issuer approved successfully',
          issuer: result
        });
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    '/approve-verifier',
    authMiddleware,
    roleMiddleware('authority'),
    (req, res, next) => {
      try {
        const { did } = req.body;
        if (!did) {
          return res.status(400).json({ error: 'DID is required' });
        }

        const result = didRegistry.approveVerifier(did, req.user.did);
        if (result.error) {
          return res.status(400).json(result);
        }

        const { credentialRegistry } = getRegistryInstance();
        if (!credentialRegistry.isVerifierApproved(did)) {
          credentialRegistry.approveVerifier(did);
        }

        return res.json({
          message: 'Verifier approved successfully',
          verifier: result
        });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}

module.exports = createIssuerGovernanceRouter;