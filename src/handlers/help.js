const { userIsAllowed, getUserName } = require("../utils/auth");
const { getHelpMessage } = require("../constants/messages");

function registerHelpHandlers(bot) {
  bot.help((ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply(getHelpMessage(getUserName(ctx)));
  });
}

module.exports = { registerHelpHandlers };
