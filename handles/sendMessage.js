const axios = require('axios');
const logger = require('../utils/logger');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function sendMessage(recipientId, message) {
  const messageData = {
    recipient: {
      id: recipientId
    },
    message: message
  };

  try {
    const response = await axios.post(
      `https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      messageData
    );
    logger.info(`Message sent to ${recipientId}. Message ID: ${response.data.message_id}`);
    return response.data;
  } catch (error) {
    logger.error('Failed to send message:');
    // Log the detailed error from Facebook's API if available
    if (error.response && error.response.data && error.response.data.error) {
        logger.error(JSON.stringify(error.response.data.error, null, 2));
    } else {
        logger.error(error);
    }
    return null;
  }
}

module.exports = { sendMessage };