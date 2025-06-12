require('dotenv').config();
const fs = require('fs');
const express = require('express');
const gradient = require('gradient-string');
const logger = require('./utils/logger');
const { sendMessage } = require('./handles/sendMessage');

// --- 1. App & Command Initialization ---
const app = express();
app.use(express.json());
app.commands = new Map();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  try {
    const command = require(`./commands/${file}`);
    app.commands.set(command.name, command);
    logger.info(`Loaded Command: ${command.name}.js`);
  } catch (err) {
    logger.error(`Failed to load command ${file}:`, err);
  }
}

// --- 2. Environment & Configuration ---
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PREFIX = process.env.BOT_PREFIX || "!";

// --- 3. Webhook Handling ---
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.success('Webhook Verified!');
    res.status(200).send(challenge);
  } else {
    logger.error('Webhook verification failed.');
    res.sendStatus(403);
  }
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      if (event.message) {
        handleMessage(event.sender.id, event.message);
      }
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

// --- 4. Command Dispatcher ---
async function handleMessage(senderId, message) {
  if (!message.text || !message.text.toLowerCase().startsWith(PREFIX)) {
    return; // Ignore non-command messages
  }

  const args = message.text.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const command = app.commands.get(commandName);

  if (!command) {
    return await sendMessage(senderId, { text: `❓ Sorry, I don't know that command. Type \`${PREFIX}help\` for a list of what I can do!` });
  }

  try {
    logger.info(`Executing [${commandName}] for user [${senderId}]`);
    await command.execute(senderId, args, PAGE_ACCESS_TOKEN, app.commands);
  } catch (error) {
    logger.error(`Error executing command '${commandName}':`, error);
    await sendMessage(senderId, { text: `❌ A critical error occurred. I've notified my developer!` });
  }
}

// --- 5. Server Startup ---
app.listen(PORT, () => {
  const banner = gradient.pastel.multiline(
    `\n===================================\n  Sunnel's Bot is now Online! ✨\n===================================\n`
  );
  console.log(banner);

  if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
    logger.error('FATAL: Missing PAGE_ACCESS_TOKEN or VERIFY_TOKEN in .env file.');
    logger.warn('Bot cannot start without these credentials. Please fix and restart.');
    process.exit(1);
  }

  logger.success(`Server is live and listening on port ${PORT}`);
});
