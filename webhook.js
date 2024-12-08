const axios = require('axios');

async function sendWebhookMessage(message, user = process.env.APP_USER) {
  if (!process.env.ENABLE_WEBHOOK || !process.env.WEBHOOK_URL) {
    return;
  }

  try {
    const timestamp = new Date().toLocaleString();
    const formattedMessage = `🔍 【Gradient 状态报告】\n⏰ 时间: ${timestamp}\n👤 账户: ${user}\n\n${message}`;

    const payload = {
      msgtype: "text",
      text: {
        content: formattedMessage
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
