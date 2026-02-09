const Blockchain = require('./blockchain') 
const DIDRegistry = require('./didRegistry') 
const CredentialRegistry = require('./credentialRegistry') 
const blockchain = new Blockchain()
const didRegistry = new DIDRegistry(blockchain) 
const credentialRegistry = new CredentialRegistry(blockchain) 
module.exports = { 
    blockchain, 
    didRegistry,
    credentialRegistry 
}