const { userIsAllowed, userIsAdmin, getUserName } = require("../utils/auth");
const { setUserState } = require("../state/userState");
const { getExpenseInputHint } = require("../constants/messages");
const { formatExpensePreview } = require("../utils/formatters");
const { getDeleteConfirmKeyboard } = require("../keyboards/common");
const { getLastUserExpense } = require("../services/expenseService");
const { getMainMenuKeyboard } = require("../keyboards/menu");

function registerExpenseHandlers(bot) {
  bot.command("add", (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Доступ разрешен только владельцам.");
    }

    setUserState(ctx.from.id, { mode: "waiting_expense_input" });
    return ctx.reply(
      getExpenseInputHint(getUserName(ctx)),
      getMainMenuKeyboard({ isAdmin: userIsAdmin(ctx) }),
    );
  });

  bot.hears("Добавить расход", (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Доступ разрешен только владельцам.");
    }

    setUserState(ctx.from.id, { mode: "waiting_expense_input" });
    return ctx.reply(
      getExpenseInputHint(getUserName(ctx)),
      getMainMenuKeyboard({ isAdmin: userIsAdmin(ctx) }),
    );
  });

  bot.command("delete", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const lastExpense = await getLastUserExpense(familyId, ctx.from.id);

      if (!lastExpense) {
        return ctx.reply("❌ У тебя нет расходов для удаления");
      }

      return ctx.reply(
        `Удалить этот расход?\n\n${formatExpensePreview(lastExpense)}`,
        getDeleteConfirmKeyboard(lastExpense.id),
      );
    } catch (error) {
      console.error("Ошибка при получении последнего расхода:", error);
      return ctx.reply("❌ Ошибка при получении расхода");
    }
  });

  bot.hears("Удалить", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const lastExpense = await getLastUserExpense(familyId, ctx.from.id);

      if (!lastExpense) {
        return ctx.reply("❌ У тебя нет расходов для удаления");
      }

      return ctx.reply(
        `Удалить этот расход?\n\n${formatExpensePreview(lastExpense)}`,
        getDeleteConfirmKeyboard(lastExpense.id),
      );
    } catch (error) {
      console.error("Ошибка при получении последнего расхода:", error);
      return ctx.reply("❌ Ошибка при получении расхода");
    }
  });
}

module.exports = { registerExpenseHandlers };
