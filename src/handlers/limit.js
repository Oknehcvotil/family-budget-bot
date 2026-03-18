const { userIsAllowed } = require("../utils/auth");
const { setUserState, clearUserState } = require("../state/userState");
const {
  getCurrentMonthLimitStatus,
  formatLimitStatusMessage,
  removeCurrentMonthLimit,
} = require("../services/limitService");
const { getLimitKeyboard } = require("../keyboards/limit");

function registerLimitHandlers(bot) {
  bot.command("limit", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const status = await getCurrentMonthLimitStatus(familyId);

      return ctx.reply(
        formatLimitStatusMessage(status),
        getLimitKeyboard(status.limitAmount !== null),
      );
    } catch (error) {
      console.error("Ошибка при получении лимита:", error);
      return ctx.reply("Ошибка при получении лимита.");
    }
  });

  bot.hears("Лимит", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const status = await getCurrentMonthLimitStatus(familyId);

      return ctx.reply(
        formatLimitStatusMessage(status),
        getLimitKeyboard(status.limitAmount !== null),
      );
    } catch (error) {
      console.error("Ошибка при получении лимита:", error);
      return ctx.reply("Ошибка при получении лимита.");
    }
  });

  bot.action("set_month_limit", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "waiting_month_limit",
    });

    await ctx.answerCbQuery();
    return ctx.editMessageText(
      `Введите лимит на текущий месяц числом.

Примеры:
1000
1500`,
    );
  });

  bot.action("delete_month_limit", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    try {
      const familyId = ctx.state.member.family_id;
      await removeCurrentMonthLimit(familyId);
      clearUserState(ctx.from.id);

      const status = await getCurrentMonthLimitStatus(familyId);

      await ctx.answerCbQuery("Лимит удалён");
      return ctx.editMessageText(formatLimitStatusMessage(status));
    } catch (error) {
      console.error("Ошибка при удалении лимита:", error);
      return ctx.answerCbQuery("Ошибка");
    }
  });
}

module.exports = { registerLimitHandlers };
