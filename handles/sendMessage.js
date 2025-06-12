const axios = require('axios');
const logger = require('../utils/logger');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function sendApiRequest(requestBody) {
  try {
    await axios.post(
      `https://graph.facebook.com/v16.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      requestBody
    );
  } catch (error) {
    logger.error('Facebook API Error: Failed to send request.');
    if (error.response?.data?.error) {
      logger.error(JSON.stringify(error.response.data.error, null, 2));
    }
  }
}

async function sendTypingIndicator(recipientId, action = 'typing_on') {
  await sendApiRequest({
    recipient: { id: recipientId },
    sender_action: action,
  });
}

async function sendMessage(recipientId, messagePayload) {
  await sendTypingIndicator(recipientId, 'typing_on');
  await new Promise(resolve => setTimeout(resolve, 500)); // Natural delay

  await sendApiRequest({
    recipient: { id: recipientId },
    message: messagePayload,
    messaging_type: 'RESPONSE',
  });

  await sendTypingIndicator(recipientId, 'typing_off');
}

module.exports = { sendMessage };
