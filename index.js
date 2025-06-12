require('dotenv').config();
const fs = require('fs');
const express = require('express');
const gradient = require('gradient-string');
const logger = require('./utils/logger');
const { sendMessage } = require('./handles/sendMessage');

const app = express();
app.use(express.json());

// --- DYNAMIC COMMAND HANDLER SETUP ---
app.commands = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        app.commands.set(command.name, command);
        logger.info(`Loaded command: ${command.name}.js`);
    } catch (error) {
        logger.error(`Failed to load command ${file}:`, error);
    }
}

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

// --- Webhook Verification (Unchanged) ---
app.get('/webhook', (req, res) => { const mode = req.query['hub.mode']; const token = req.query['hub.verify_token']; const challenge = req.query['hub.challenge']; if (mode && token) { if (mode === 'subscribe' && token === VERIFY_TOKEN) { logger.success('Webhook verified successfully!'); res.status(200).send(challenge); } else { logger.error('Webhook verification failed. Tokens do not match.'); res.sendStatus(403); } } else { res.sendStatus(400); } });

// --- Message Handling (Unchanged) ---
app.post('/webhook', (req, res) => { const body = req.body; if (body.object === 'page') { body.entry.forEach(entry => { const webhookEvent = entry.messaging[0]; if (webhookEvent.message) { handleMessage(webhookEvent.sender.id, webhookEvent.message); } }); res.status(200).send('EVENT_RECEIVED'); } else { res.sendStatus(404); } });

// --- FULLY FIXED COMMAND HANDLER LOGIC ---
async function handleMessage(senderId, receivedMessage) {
    const PREFIX = "!"; 
    if (!receivedMessage.text || !receivedMessage.text.toLowerCase().startsWith(PREFIX)) {
        return; 
    }

    const args = receivedMessage.text.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    
    if (!commandName) return;

    const command = app.commands.get(commandName);

    if (!command) {
        logger.warn(`Unknown command '${commandName}' from user ${senderId}`);
        await sendMessage(senderId, { text: `❓ Sorry, I don't recognize that command. Type \`${PREFIX}help\` to see what I can do!` });
        return;
    }

    try {
        logger.info(`Executing command '${commandName}' for user ${senderId}`);
        // *** THIS IS THE FIX: Using the correct PAGE_ACCESS_TOKEN variable ***
        await command.execute(senderId, args, PAGE_ACCESS_TOKEN);
    } catch (error) {
        logger.error(`Error executing command '${commandName}':`);
        logger.error(error);
        await sendMessage(senderId, { text: '❌ A critical error occurred while running that command. The developer has been notified.' });
    }
}

// --- Server Startup (Unchanged) ---
app.listen(PORT, () => { const banner = gradient.pastel.multiline(`\n===================================\n  Gagstock Facebook Bot is Running!\n      Created by Sunnel ☀️\n===================================\n`); console.log(banner); if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) { logger.error('FATAL ERROR: Environment variables are missing!'); logger.warn("The bot cannot connect to Facebook without required tokens."); if (!PAGE_ACCESS_TOKEN) logger.warn("  › PAGE_ACCESS_TOKEN is not set in your .env file."); if (!VERIFY_TOKEN) logger.warn("  › VERIFY_TOKEN is not set in your .env file."); logger.info("The bot will now shut down. Please add the tokens and restart."); process.exit(1); } logger.success(`Server is listening on port ${PORT}`); });
