require('dotenv').config();
const SibApiV3Sdk = require('sib-api-v3-sdk');

// create client instance
const defaultClient = SibApiV3Sdk.ApiClient.instance;

// authenticate using API key
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

// export ready APIs
module.exports = {
  transactionalEmailsApi: new SibApiV3Sdk.TransactionalEmailsApi(),
  emailCampaignsApi: new SibApiV3Sdk.EmailCampaignsApi(),
  SibApiV3Sdk
};
