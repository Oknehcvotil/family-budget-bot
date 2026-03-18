const {
  userIsAllowed,
  userIsAdmin,
  getUser,
  getUserName,
} = require("../utils/auth");
const { getExpenseInputHint } = require("../constants/messages");
const {
  getUserState,
  setUserState,
  clearUserState,
} = require("../state/userState");
const { getCategoryKeyboard } = require("../keyboards/expense");
const {
  saveCurrentMonthLimit,
  formatLimitStatusMessage,
} = require("../services/limitService");
const { getLimitKeyboard } = require("../keyboards/limit");
const { getMainMenuKeyboard } = require("../keyboards/menu");

function registerTextHandlers(bot) {
  bot.on("text", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Сначала нажми /start, чтобы подключиться к семейному бюджету.");
    }

    const text = ctx.message.text.trim();

    if (!text || text.startsWith("/")) {
      return;
    }

    const user = getUser(ctx);
    const userName = getUserName(ctx);
    const state = getUserState(ctx.from.id);

    if (state?.mode === "waiting_month_limit") {
      const amount = Number(text.replace(",", "."));

      if (Number.isNaN(amount) || amount <= 0) {
        return ctx.reply(`Введите корректный лимит числом.

Примеры:
1000
1500`);
      }

      try {
        const familyId = ctx.state.member.family_id;
        const status = await saveCurrentMonthLimit(familyId, amount);
        clearUserState(ctx.from.id);

        return ctx.reply(
          `✅ Лимит сохранён

${formatLimitStatusMessage(status)}`,
          getLimitKeyboard(true),
        );
      } catch (error) {
        console.error("Ошибка при сохранении лимита:", error);
        return ctx.reply("Ошибка при сохранении лимита.");
      }
    }

    if (state?.mode === "waiting_expense_input") {
      const parts = text.split(/\s+/);
      const amount = Number(parts[0]);
      const comment = parts.length > 1 ? parts.slice(1).join(" ") : "";

      if (Number.isNaN(amount) || amount <= 0) {
        return ctx.reply(
          `${userName}, не узнал сумму.\n\n${getExpenseInputHint(userName).split("\n\n")[1]}`,
        );
      }

      setUserState(ctx.from.id, {
        mode: "waiting_category",
        pendingExpense: {
          amount,
          comment,
        },
      });

      const commentPreview = comment ? `\n📝 Комментарий: ${comment}` : "";

      return ctx.reply(
        `Выбери категорию:
💰 Сумма: ${amount} €${commentPreview}`,
        getCategoryKeyboard(),
      );
    }

    if (state?.mode === "waiting_category") {
      return ctx.reply(
        "Сначала выбери категорию кнопкой ниже или нажми /add заново.",
      );
    }

    return ctx.reply(
      `Чтобы добавить расход, нажми /add

После этого введи:
150
или
150 кофе`,
      getMainMenuKeyboard({ isAdmin: userIsAdmin(ctx) }),
    );
  });
}

module.exports = { registerTextHandlers };
