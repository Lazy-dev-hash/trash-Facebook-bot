const { sendMessage } = require("../handles/sendMessage");
const logger = require("../utils/logger");
const axios = require("axios");
const chalk = require("chalk");

// --- STATE MANAGEMENT, TIME HELPERS, AND FORMATTERS (Unchanged) ---
const activeSessions = new Map(); const lastSentCache = new Map(); const PH_TIMEZONE = "Asia/Manila"; function pad(n) { return n < 10 ? "0" + n : n; } function getPHTime() { return new Date(new Date().toLocaleString("en-US", { timeZone: PH_TIMEZONE })); } function getCountdown(target) { const now = getPHTime(); const msLeft = target - now; if (msLeft <= 0) return "Just Restocked!"; const h = Math.floor(msLeft / 3.6e6); const m = Math.floor((msLeft % 3.6e6) / 6e4); const s = Math.floor((msLeft % 6e4) / 1000); return `${pad(h)}h ${pad(m)}m ${pad(s)}s`; } function getNextRestocks() { const now = getPHTime(); const timers = {}; const nextEgg = new Date(now); nextEgg.setMinutes(now.getMinutes() < 30 ? 30 : 0, 0, 0); if (now.getMinutes() >= 30) nextEgg.setHours(now.getHours() + 1); timers.egg = getCountdown(nextEgg); const next5 = new Date(now); const nextM = Math.ceil((now.getMinutes() + 1) / 5) * 5; next5.setMinutes(nextM % 60, 0, 0); if (nextM >= 60) next5.setHours(now.getHours() + Math.floor(nextM / 60)); timers.gear = timers.seed = getCountdown(next5); const nextHour = new Date(now); nextHour.setHours(now.getHours() + 1, 0, 0, 0); timers.honey = getCountdown(nextHour); const next7 = new Date(now); const totalHours = now.getHours() + now.getMinutes() / 60; const next7h = Math.ceil(totalHours / 7) * 7; next7.setHours(next7h, 0, 0, 0); timers.cosmetics = getCountdown(next7); return timers; } function getNextScheduledTime() { const startTime = getPHTime(); const base = new Date(startTime); const min = base.getMinutes(); const next5 = Math.floor(min / 5) * 5 + 5; base.setMinutes(next5, 15, 0); if (base <= startTime) base.setMinutes(base.getMinutes() + 5); return base; } function formatValue(val) { if (val >= 1e6) return `x${(val / 1e6).toFixed(1)}M`; if (val >= 1e3) return `x${(val / 1e3).toFixed(1)}K`; return `x${val}`; } const EMOJIS = { "Common Egg": "🥚", "Uncommon Egg": "🐣", "Rare Egg": "🍳", "Legendary Egg": "🪺", "Mythical Egg": "🌟", "Bug Egg": "🪲", "Watering Can": "🚿", "Trowel": "🛠️", "Recall Wrench": "🔧", "Basic Sprinkler": "💧", "Advanced Sprinkler": "💦", "Godly Sprinkler": "⛲", "Lightning Rod": "⚡", "Master Sprinkler": "🌊", "Favorite Tool": "❤️", "Harvest Tool": "🌾", "Carrot": "🥕", "Strawberry": "🍓", "Blueberry": "🫐", "Orange Tulip": "🌷", "Tomato": "🍅", "Corn": "🌽", "Daffodil": "🌼", "Watermelon": "🍉", "Pumpkin": "🎃", "Apple": "🍎", "Bamboo": "🎍", "Coconut": "🥥", "Cactus": "🌵", "Dragon Fruit": "🍈", "Mango": "🥭", "Grape": "🍇", "Mushroom": "🍄", "Pepper": "🌶️", "Cacao": "🍫", "Beanstalk": "🌱", }; async function fetchWithTimeout(url, timeout = 8000) { const controller = new AbortController(); const id = setTimeout(() => controller.abort(), timeout); try { const response = await axios.get(url, { signal: controller.signal }); clearTimeout(id); return response; } catch (error) { clearTimeout(id); throw error; } } function buildMessage(stockData, weather, restocks, filters) { const formatList = (items) => items.map(i => `› ${EMOJIS[i.name] || '▫️'} ${i.name}: ${formatValue(i.value)}`).join("\n"); let messageBody = ""; let itemsFound = 0; const createSection = (title, items, restockTime) => { const filteredItems = filters.length > 0 ? items.filter(i => filters.some(f => i.name.toLowerCase().includes(f))) : items; if (filteredItems.length > 0) { itemsFound += filteredItems.length; return `${title} (Restocks in ${restockTime})\n${formatList(filteredItems)}\n\n`; } return ""; }; messageBody += createSection("🛠️ *Gears*", stockData.gearStock, restocks.gear); messageBody += createSection("🌱 *Seeds*", stockData.seedsStock, restocks.seed); messageBody += createSection("🥚 *Eggs*", stockData.eggStock, restocks.egg); messageBody += createSection("🍯 *Honey*", stockData.honeyStock, restocks.honey); messageBody += createSection("🎨 *Cosmetics*", stockData.cosmeticsStock, restocks.cosmetics); if (filters.length > 0 && itemsFound === 0) { return ` Mothing Found No items matched your filter: "${filters.join(", ")}". Try a broader term.`; } const updatedAtPH = getPHTime().toLocaleString("en-PH", { hour: 'numeric', minute: 'numeric', hour12: true }); return `✨ *Gʀᴏᴡ A Gᴀʀᴅᴇɴ Sᴛᴏᴄᴋ Tʀᴀᴄᴋᴇʀ* ✨\n\n` + `${messageBody}` + `-----------------------------------\n` + `🌦️ *Weather: ${weather.icon} ${weather.currentWeather}*\n` + `🌾 Crop Bonus: ${weather.cropBonuses}\n` + `-----------------------------------\n` + `🕒 Last Updated (PH): ${updatedAtPH}`; }

// --- MAIN MODULE ---
module.exports = {
    name: "gagstock",
    description: "Track Grow A Garden stock with aesthetic updates and filtering.",
    usage: "gagstock on | on [filter1|filter2] | off",
    category: "Tools ⚒️",

    async execute(senderId, args, pageAccessToken) {
        // --- Command setup logic (unchanged) ---
        const action = args[0]?.toLowerCase(); const filters = args.slice(1).join(" ").split("|").map(f => f.trim().toLowerCase()).filter(Boolean); if (action === "off") { const session = activeSessions.get(senderId); if (session) { clearTimeout(session.timeout); activeSessions.delete(senderId); lastSentCache.delete(senderId); logger.warn(`Stopped tracking for session: ${senderId}`); return await sendMessage(senderId, { text: "🛑 *Tracking Stopped.*\nYou will no longer receive stock updates." }, pageAccessToken); } return await sendMessage(senderId, { text: "⚠️ *No Active Session.*\nUse 'gagstock on' to start tracking." }, pageAccessToken); } if (action !== "on") { return await sendMessage(senderId, { text: "📌 *Invalid Usage*\n\nCorrect formats:\n› `gagstock on`\n› `gagstock on Sunflower | Watering Can`\n› `gagstock off`" }, pageAccessToken); } if (activeSessions.has(senderId)) { return await sendMessage(senderId, { text: "📡 *Already Tracking.*\nA session is already active. Use 'gagstock off' to stop it first." }, pageAccessToken); } const initialMessage = filters.length > 0 ? `✅ *Tracking Started with Filters!*\nYou'll be notified for changes to: *${filters.join(", ")}*` : "✅ *Tracking Started!*\nYou will now receive live updates for Grow A Garden stock."; await sendMessage(senderId, { text: initialMessage }, pageAccessToken); logger.success(`Started new tracking session for ${senderId} with filters: [${filters.join(', ')}]`);

        // --- NEW & IMPROVED FETCH AND NOTIFY FUNCTION ---
        const fetchAndNotify = async () => {
            // This spinner is the loading animation. Its text will change as it works.
            const spinner = logger.start(`Connecting to APIs for session ${senderId}...`);

            try {
                // Step 1: Fetch all data from APIs
                const [stockRes, weatherRes] = await Promise.all([
                    fetchWithTimeout("https://gagstock.gleeze.com/grow-a-garden"),
                    fetchWithTimeout("https://growagardenstock.com/api/stock/weather"),
                ]);

                const backup = stockRes.data.data;
                const stockData = {};

                // Step 2: Process each stock category, updating the animation text each time
                spinner.text = `Processing [${chalk.yellow('GEAR')}] stock...`;
                stockData.gearStock = backup.gear.items.map(i => ({ name: i.name, value: Number(i.quantity) }));

                spinner.text = `Processing [${chalk.yellow('SEED')}] stock...`;
                stockData.seedsStock = backup.seed.items.map(i => ({ name: i.name, value: Number(i.quantity) }));

                spinner.text = `Processing [${chalk.yellow('EGG')}] stock...`;
                stockData.eggStock = backup.egg.items.map(i => ({ name: i.name, value: Number(i.quantity) }));

                spinner.text = `Processing [${chalk.yellow('COSMETICS')}] stock...`;
                stockData.cosmeticsStock = backup.cosmetics.items.map(i => ({ name: i.name, value: Number(i.quantity) }));

                spinner.text = `Processing [${chalk.yellow('HONEY')}] stock...`;
                stockData.honeyStock = backup.honey.items.map(i => ({ name: i.name, value: Number(i.quantity) }));

                const weather = {
                    currentWeather: weatherRes.data.currentWeather || "Unknown",
                    icon: weatherRes.data.icon || "🌤️",
                    cropBonuses: weatherRes.data.cropBonuses || "None",
                };

                // Step 3: Finish the animation with a success message
                spinner.succeed(chalk.green('All data processed successfully!'));

                // Step 4: Compare with cache and send message if needed
                const currentKey = JSON.stringify({ stock: stockData, weather: weather.currentWeather });
                const lastSent = lastSentCache.get(senderId);

                if (lastSent === currentKey) {
                    logger.info(`No changes detected for ${senderId}. Skipping notification.`);
                    return false;
                }

                lastSentCache.set(senderId, currentKey);
                const message = buildMessage(stockData, weather, getNextRestocks(), filters);

                if (message.startsWith(" Mothing Found")) {
                    if (lastSent !== "nothing_found_marker") {
                        await sendMessage(senderId, { text: message }, pageAccessToken);
                        lastSentCache.set(senderId, "nothing_found_marker");
                    }
                    return false;
                }

                await sendMessage(senderId, { text: message }, pageAccessToken);
                logger.success(`Update sent to ${senderId}.`);
                return true;

            } catch (error) {
                // If anything fails, the animation will stop with an error message.
                spinner.fail(`Failed to process data for ${senderId}.`);
                logger.error(error);
                return false;
            }
        };

        // --- Scheduling logic (unchanged) ---
        const scheduleNextRun = () => { if (!activeSessions.has(senderId)) return; const nextTime = getNextScheduledTime(); const wait = Math.max(nextTime - getPHTime(), 1000); logger.info(`Scheduling next check for ${senderId} in ${Math.round(wait / 1000)}s.`); const timeoutId = setTimeout(async () => { await fetchAndNotify(); scheduleNextRun(); }, wait); activeSessions.set(senderId, { timeout: timeoutId, filters }); };

        await fetchAndNotify();
        scheduleNextRun();
    }
};