const { userIsAllowed, userIsAdmin, getUserName } = require("../utils/auth");
const { getHelpMessage } = require("../constants/messages");
const { getMainMenuKeyboard } = require("../keyboards/menu");

function registerHelpHandlers(bot) {
  bot.help((ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply(
      getHelpMessage(getUserName(ctx)),
      getMainMenuKeyboard({ isAdmin: userIsAdmin(ctx) }),
    );
  });

  bot.hears("Помощь", (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply(
      getHelpMessage(getUserName(ctx)),
      getMainMenuKeyboard({ isAdmin: userIsAdmin(ctx) }),
    );
  });
}

module.exports = { registerHelpHandlers };
