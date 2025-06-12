const axios = require('axios');
const logger = require('../utils/logger');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

async function sendApiRequest(requestBody) {
    try {
        await axios.post(
            `https://graph.facebook.com/v15.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            requestBody
        );
        return true;
    } catch (error) {
        logger.error('Failed to send API request:');
        if (error.response && error.response.data && error.response.data.error) {
            logger.error(JSON.stringify(error.response.data.error, null, 2));
        } else {
            logger.error(error);
        }
        return false;
    }
}

async function sendTypingIndicator(recipientId, isTyping = true) {
    const requestBody = {
        recipient: { id: recipientId },
        sender_action: isTyping ? 'typing_on' : 'typing_off'
    };
    await sendApiRequest(requestBody);
}

async function sendMessage(recipientId, message) {
    // Show typing indicator, send message, then turn it off
    await sendTypingIndicator(recipientId, true);
    // Add a small delay to make the typing feel more natural
    await new Promise(resolve => setTimeout(resolve, 500)); 

    const requestBody = {
        recipient: { id: recipientId },
        message: message
    };
    await sendApiRequest(requestBody);
    await sendTypingIndicator(recipientId, false);
}

module.exports = { sendMessage };
