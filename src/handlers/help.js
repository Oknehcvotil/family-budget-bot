const { userIsAllowed, getUserName } = require("../utils/auth");
const { getHelpMessage } = require("../constants/messages");
const { getMainMenuKeyboard } = require("../keyboards/menu");

function registerHelpHandlers(bot) {
  bot.help((ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply(
      getHelpMessage(getUserName(ctx)),
      getMainMenuKeyboard(ctx.from.id),
    );
  });

  bot.hears("Помощь", (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply(
      getHelpMessage(getUserName(ctx)),
      getMainMenuKeyboard(ctx.from.id),
    );
  });
}

module.exports = { registerHelpHandlers };
