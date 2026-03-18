const { userIsAllowed, getUser, getUserName } = require("../utils/auth");
const { getExpenseInputHint } = require("../constants/messages");
const { getUserState, setUserState } = require("../state/userState");
const { getCategoryKeyboard } = require("../keyboards/expense");

function registerTextHandlers(bot) {
  bot.on("text", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply(
        "Доступ к вводу расходов предоставлен только владельцам.",
      );
    }

    const text = ctx.message.text.trim();

    if (!text || text.startsWith("/")) {
      return;
    }

    const user = getUser(ctx);
    const userName = getUserName(ctx);
    const state = getUserState(ctx.from.id);

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
    );
  });
}

module.exports = { registerTextHandlers };
