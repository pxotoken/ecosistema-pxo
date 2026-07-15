const crypto = require('crypto');
const axios = require('axios');

// 1. Configuration
const API_KEY = "QGSpbzxnSf";
const API_SECRET = "a71cd765a366d869b23d866def2da7c2";
const STAGING_URL = "https://stage.bitso.com"; // Base endpoint

// Your application webhook details
const WEBHOOK_PAYLOAD = {
  callback_url: "https://pxoapi-exchange-dev.up.railway.app/api/exchange/webhooks/bitso",
  events: ["TRANSACTION"] // common options: TRANSACTION, DEPOSIT, WITHDRAWAL
};

async function registerWebhook() {
  const method = "POST";
  const requestPath = "/api/v3/webhooks";
  const nonce = Date.now().toString(); // Must be a unique, increasing integer
  const jsonBody = JSON.stringify(WEBHOOK_PAYLOAD);

  // 2. Build the Signature String
  // Format required: nonce + HTTP method + request path + JSON payload string
  const signatureData = nonce + method + requestPath + jsonBody;

  // 3. Generate HMAC-SHA256 Hash
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(signatureData)
    .digest('hex');

  // 4. Build the Authorization Header
  // Format required: Bitso API_KEY:NONCE:SIGNATURE
  const authHeader = `Bitso ${API_KEY}:${nonce}:${signature}`;

  try {
    const response = await axios.post(STAGING_URL, WEBHOOK_PAYLOAD, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    console.log("✅ Webhook Registered Successfully!");
    console.log("-----------------------------------------");
    console.log("Server Response Payload:", JSON.stringify(response.data, null, 2));
    console.log("-----------------------------------------");
    console.log("🔑 SAVE THIS: Your secret token is in the returned object fields.");
    
  } catch (error) {
    console.error("❌ Registration Failed!");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", error.response.data);
    } else {
      console.error("Error Message:", error.message);
    }
  }
}

registerWebhook();
