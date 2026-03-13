const Joi = require('joi');

const issueCredentialSchema = Joi.object({
  subjectDid: Joi.string().min(3).required(),
  claims: Joi.object().min(1).required(),
  credentialType: Joi.string().optional(),
  expirationDate: Joi.string().isoDate().optional()
});

module.exports = {
  issueCredentialSchema
};
    