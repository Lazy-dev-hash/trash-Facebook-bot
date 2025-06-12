const { sendMessage } = require("../handles/sendMessage");

// Define your bot's prefix here so it's consistent
const PREFIX = "!";

module.exports = {
    name: "help",
    description: "Displays a list of all available commands.",
    usage: "help",
    category: "Core",

    async execute(senderId, args, pageAccessToken) {
        const helpMessage = 
`✨ *Here's what I can do!* ✨

*Core Commands*
\`${PREFIX}help\` - Shows this help message.

*Tool Commands*
\`${PREFIX}gagstock on\` - Starts tracking Grow A Garden stock.
\`${PREFIX}gagstock on [item]\` - Tracks a specific item (e.g., \`${PREFIX}gagstock on carrot\`).
\`${PREFIX}gagstock off\` - Stops the stock tracker.

Just type a command to get started!`;

        await sendMessage(senderId, { text: helpMessage }, pageAccessToken);
    }
};
