const axios = require('axios');

async function sendWebhookMessage(message, mentions = []) {
  if (!process.env.ENABLE_WEBHOOK || !process.env.WEBHOOK_URL) {
    return;
  }

  try {
    const payload = {
      msgtype: "text",
      text: {
        content: message,
        mentioned_list: mentions
      }
    };

    const response = await axios.post(process.env.WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log("Webhook message sent successfully");
    } else {
      console.error("Failed to send webhook message:", response.status);
    }
  } catch (error) {
    console.error("Error sending webhook message:", error.message);
  }
}

module.exports = { sendWebhookMessage }; 
