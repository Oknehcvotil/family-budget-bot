const { userIsAllowed, getUser } = require("../utils/auth");
const { getStartMessage } = require("../constants/messages");

function registerStartHandlers(bot) {
  bot.start((ctx) => {
    const user = getUser(ctx);

    if (!userIsAllowed(ctx) || !user) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply(getStartMessage(user.name));
  });
}

module.exports = { registerStartHandlers };
