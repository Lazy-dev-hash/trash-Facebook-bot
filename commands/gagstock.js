const { sendMessage } = require("../handles/sendMessage");
const logger = require("../utils/logger");
const axios = require("axios");
const chalk = require("chalk");

// --- State Management ---
const activeSessions = new Map();

// --- Helper Functions ---
const PH_TIMEZONE = "Asia/Manila";
const getPHTime = () => new Date(new Date().toLocaleString("en-US", { timeZone: PH_TIMEZONE }));
const pad = (n) => (n < 10 ? "0" + n : n);

function getCountdown(targetDate) {
  const msLeft = targetDate - getPHTime();
  if (msLeft <= 0) return "Just Restocked!";
  const h = Math.floor(msLeft / 3.6e6);
  const m = Math.floor((msLeft % 3.6e6) / 6e4);
  const s = Math.floor((msLeft % 6e4) / 1000);
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// ... other helpers (buildMessage, etc.) would go here if needed ...

// --- Main Command Logic ---
module.exports = {
  name: "gagstock",
  description: "Tracks Grow A Garden stock.",

  async execute(senderId, args, pageAccessToken) {
    const action = args[0]?.toLowerCase();
    const filters = args.slice(1).join(" ").split("|").map(f => f.trim().toLowerCase()).filter(Boolean);

    if (action === "off") {
      const session = activeSessions.get(senderId);
      if (session) {
        clearTimeout(session.timeoutId);
        activeSessions.delete(senderId);
        logger.warn(`Tracking stopped for session: ${senderId}`);
        return await sendMessage(senderId, { text: "🛑 *Tracking Stopped.*\nYou will no longer receive stock updates." });
      }
      return await sendMessage(senderId, { text: "⚠️ *No Active Session.*\nUse `!gagstock on` to start." });
    }

    if (action !== "on") {
      const helpMessage = `❓*Invalid Usage*\n\nPlease use one of these formats:\n› \`!gagstock on\`\n› \`!gagstock on [item]\`\n› \`!gagstock off\``;
      return await sendMessage(senderId, { text: helpMessage });
    }

    if (activeSessions.has(senderId)) {
      return await sendMessage(senderId, { text: "📡 *Already Tracking.*\nUse `!gagstock off` to stop your current session first." });
    }

    const initialMessage = filters.length > 0
      ? `🚀 *Tracking Started with Filters!*\nI'll notify you about: *${filters.join(", ")}*`
      : "🚀 *Tracking Started!*\nYou will now get live stock updates.";
    await sendMessage(senderId, { text: initialMessage });

    const session = {
      senderId,
      filters,
      lastSentCache: null,
      timeoutId: null,
    };
    activeSessions.set(senderId, session);
    
    // Start the tracking loop
    runTracker(session, pageAccessToken, true);
  }
};

async function runTracker(session, pageAccessToken, isInitialCall = false) {
    let spinner; // Declare here to be accessible in catch block

    try {
        spinner = logger.spinner(`[${session.senderId}] Connecting to Gagstock APIs...`);
        spinner.start();

        const [stockRes, weatherRes] = await Promise.all([
            axios.get("https://gagstock.gleeze.com/grow-a-garden", { timeout: 8000 }),
            axios.get("https://growagardenstock.com/api/stock/weather", { timeout: 8000 })
        ]);

        if (!stockRes.data?.data || !weatherRes.data) {
            throw new Error("Invalid API response structure.");
        }
        
        spinner.text = `[${session.senderId}] Processing stock data...`;

        const { data: stockSource } = stockRes.data;
        const stockData = {
            gear: stockSource.gear.items.map(i => ({ name: i.name, value: +i.quantity })),
            seed: stockSource.seed.items.map(i => ({ name: i.name, value: +i.quantity })),
            egg: stockSource.egg.items.map(i => ({ name: i.name, value: +i.quantity })),
            honey: stockSource.honey.items.map(i => ({ name: i.name, value: +i.quantity })),
            cosmetics: stockSource.cosmetics.items.map(i => ({ name: i.name, value: +i.quantity })),
        };
        
        const currentKey = JSON.stringify({stockData, weather: weatherRes.data.currentWeather});
        if (!isInitialCall && session.lastSentCache === currentKey) {
            spinner.succeed(`[${session.senderId}] No changes detected.`);
            scheduleNextRun(session, pageAccessToken);
            return;
        }

        session.lastSentCache = currentKey;
        const message = buildMessage(stockData, weatherRes.data, session.filters);
        
        spinner.succeed(`[${session.senderId}] Update processed successfully.`);
        await sendMessage(session.senderId, { text: message });
        scheduleNextRun(session, pageAccessToken);

    } catch (error) {
        if (spinner) spinner.fail(`[${session.senderId}] Failed to fetch data.`);
        logger.error(error);
        activeSessions.delete(session.senderId); // Stop the tracker on failure
        await sendMessage(session.senderId, { text: "💥 Oops! Something went wrong while fetching stock data. The tracker has been stopped to prevent issues. Please try starting it again with `!gagstock on`." });
    }
}

function scheduleNextRun(session, pageAccessToken) {
    if (!activeSessions.has(session.senderId)) return; // Stop if session was removed
    const nextRun = new Date(getPHTime().getTime() + 5 * 60 * 1000); // Simple 5 min timer
    logger.info(`[${session.senderId}] Scheduling next check at ${nextRun.toLocaleTimeString()}`);
    session.timeoutId = setTimeout(() => runTracker(session, pageAccessToken), 5 * 60 * 1000);
}

// This function builds the final message string
function buildMessage(stockData, weather, filters) {
    // This is a placeholder for your existing message building logic
    // For now, it will just show a summary
    return `✅ Stock and weather data received successfully! Weather: ${weather.icon} ${weather.currentWeather}`;
}
