require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const gradient = require('gradient-string');
const logger = require('./utils/logger');
const { sendMessage } = require('./handles/sendMessage');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// --- Webhook Verification ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.success('Webhook verified successfully!');
      res.status(200).send(challenge);
    } else {
      logger.error('Webhook verification failed. Tokens do not match.');
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// --- Message Handling (Entry Point) ---
app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const webhookEvent = entry.messaging[0];
      if (webhookEvent.message) {
        handleMessage(webhookEvent.sender.id, webhookEvent.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// --- NEW COMMAND HANDLER WITH PREFIX LOGIC ---
async function handleMessage(senderId, receivedMessage) {
  // --- Define your bot's prefix here. You can change it to "." or any other character. ---
  const PREFIX = "!"; 

  if (receivedMessage.text) {
    const messageText = receivedMessage.text.trim();

    // 1. Check if the message starts with the prefix. If not, ignore the message.
    if (!messageText.toLowerCase().startsWith(PREFIX)) {
      return; // This is a normal chat message, not a command. Do nothing.
    }

    // 2. Remove the prefix and split the message into command and arguments.
    const args = messageText.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();

    // 3. If the user only sent the prefix (e.g., "!"), do nothing.
    if (!commandName) {
        return;
    }

    try {
      // 4. Load and execute the command file.
      const command = require(`./commands/${commandName}`);
      logger.info(`Executing command '${commandName}' for user ${senderId}`);
      await command.execute(senderId, args, PAGE_ACCESS_TOKEN);
    } catch (error) {
      // 5. Handle errors, including unknown commands.
      if (error.code === 'MODULE_NOT_FOUND') {
        logger.warn(`Unknown command '${commandName}' from user ${senderId}`);
        // Guide the user on how to use the bot correctly
        await sendMessage(senderId, { text: `❓ Sorry, I don't recognize the command "${commandName}".\n\nTo see the stock, try: \`${PREFIX}gagstock on\`` });
      } else {
        logger.error(`Error executing command '${commandName}':`);
        logger.error(error);
        await sendMessage(senderId, { text: '❌ An error occurred while processing your request.' });
      }
    }
  }
}

// --- Server Startup ---
app.listen(PORT, () => {
  const banner = gradient.pastel.multiline(
`
===================================
  Gagstock Facebook Bot is Running!
      Created by Sunnel ☀️
===================================
`);
  console.log(banner);

  // Aesthetic Token Validation
  if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
    logger.error('FATAL ERROR: Environment variables are missing!');
    logger.warn("The bot cannot connect to Facebook without required tokens.");
    if (!PAGE_ACCESS_TOKEN) logger.warn("  › PAGE_ACCESS_TOKEN is not set in your .env file.");
    if (!VERIFY_TOKEN) logger.warn("  › VERIFY_TOKEN is not set in your .env file.");
    logger.info("The bot will now shut down. Please add the tokens and restart.");
    process.exit(1);
  }
  
  logger.success(`Server is listening on port ${PORT}`);
});
