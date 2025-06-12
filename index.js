require('dotenv').config();
const fs = require('fs');
const express = require('express');
const bodyParser = 'body-parser';
const gradient = require('gradient-string');
const logger = require('./utils/logger');
const { sendMessage } = require('./handles/sendMessage');

const app = express();
app.use(express.json()); // Use express.json() instead of body-parser

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

// --- Webhook Verification ---
app.get('/webhook', (req, res) => { /* ... same as before ... */ });

// --- Message Handling ---
app.post('/webhook', (req, res) => { /* ... same as before ... */ });

// --- UPGRADED COMMAND HANDLER LOGIC ---
async function handleMessage(senderId, receivedMessage) {
    const PREFIX = "!"; 
    if (!receivedMessage.text || !receivedMessage.text.toLowerCase().startsWith(PREFIX)) {
        return; 
    }

    const args = receivedMessage.text.slice(PREFIX.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    
    const command = app.commands.get(commandName);

    if (!command) {
        logger.warn(`Unknown command '${commandName}' from user ${senderId}`);
        await sendMessage(senderId, { text: `❓ Sorry, I don't recognize that command. Type \`${PREFIX}help\` to see what I can do!` });
        return;
    }

    try {
        logger.info(`Executing command '${commandName}' for user ${senderId}`);
        await command.execute(senderId, args, PAGE_ACCESS_TOKEN);
    } catch (error) {
        logger.error(`Error executing command '${commandName}':`);
        logger.error(error);
        await sendMessage(senderId, { text: '❌ A critical error occurred while running that command.' });
    }
}

// --- Server Startup ---
app.listen(PORT, () => { /* ... same as before ... */ });
