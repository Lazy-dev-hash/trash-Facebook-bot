const { sendMessage } = require("../handles/sendMessage");
const PREFIX = process.env.BOT_PREFIX || "!";

module.exports = {
  name: "help",
  description: "Displays a list of all available commands.",
  
  async execute(senderId, args, pageAccessToken, commands) {
    const helpMessage = 
`✨ *Hello! I'm your Grow A Garden Assistant!* ✨

Here's a list of things I can do. Just type a command to get started!

*Core Commands*
\`${PREFIX}help\`
› Shows this help message.

*Tool Commands*
\`${PREFIX}gagstock on\`
› Starts tracking all stock changes.

\`${PREFIX}gagstock on [item]\`
› Example: \`${PREFIX}gagstock on carrot\`
› Tracks a specific item.

\`${PREFIX}gagstock off\`
› Stops the stock tracker.`;

    await sendMessage(senderId, { text: helpMessage });
  }
};
