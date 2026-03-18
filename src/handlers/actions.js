const { getAvailableYears } = require("../database/db");
const { monthNames } = require("../config/months");
const { categoryMap } = require("../config/categories");
const { userIsAllowed, getUser, getActionWord } = require("../utils/auth");
const { getMonthRange, getYearRange } = require("../utils/date");
const { formatExpensePreview } = require("../utils/formatters");
const { sendPeriodReport } = require("../services/reportService");
const {
  createExpense,
  getUserExpenseById,
  removeUserExpenseById,
} = require("../services/expenseService");
const {
  getUserState,
  setUserState,
  clearUserState,
} = require("../state/userState");
const { getYearsKeyboard, getMonthsKeyboard } = require("../keyboards/report");
const {
  getCategoryKeyboard,
  getUndoKeyboard,
} = require("../keyboards/expense");
const { getDeleteConfirmKeyboard } = require("../keyboards/common");

function registerActionHandlers(bot) {
  bot.action("cancel_selection", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    clearUserState(ctx.from.id);
    await ctx.answerCbQuery("Отменено");
    return ctx.editMessageText("Выбор отменен.");
  });

  bot.action("cancel_expense_add", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    clearUserState(ctx.from.id);
    await ctx.answerCbQuery("Отменено");
    return ctx.editMessageText("Добавление расхода отменено.");
  });

  bot.action("cancel_delete_expense", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    await ctx.answerCbQuery("Отменено");
    return ctx.editMessageText("Удаление расхода отменено.");
  });

  bot.action("back_to_month_years", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    setUserState(ctx.from.id, { mode: "month_select" });
    await ctx.answerCbQuery();

    const years = await getAvailableYears();

    if (!years.length) {
      return ctx.editMessageText(
        "Пока нет расходов, поэтому выбрать год нельзя.",
      );
    }

    return ctx.editMessageText(
      "Выбери год для отчета по месяцам:",
      await getYearsKeyboard("pick_month_year", getAvailableYears),
    );
  });

  bot.action(/^pick_year:(\d{4})$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const year = Number(ctx.match[1]);
    const range = getYearRange(year);

    if (!range) {
      return ctx.answerCbQuery("Неверный год");
    }

    clearUserState(ctx.from.id);
    await ctx.answerCbQuery(`Отчет за ${year}`);
    await ctx.editMessageText(`Выбран год: ${year}`);

    return sendPeriodReport(ctx, `за ${year} год`, range.start, range.end);
  });

  bot.action(/^pick_month_year:(\d{4})$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const year = Number(ctx.match[1]);

    setUserState(ctx.from.id, {
      mode: "month_select",
      selectedYear: year,
    });

    await ctx.answerCbQuery(`Год ${year}`);
    return ctx.editMessageText(
      `Выбери месяц для ${year}:`,
      getMonthsKeyboard(year),
    );
  });

  bot.action(/^pick_month:(\d{4}):(\d{1,2})$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const year = Number(ctx.match[1]);
    const month = Number(ctx.match[2]);
    const range = getMonthRange(month, year);

    if (!range) {
      return ctx.answerCbQuery("Неверный месяц");
    }

    clearUserState(ctx.from.id);

    const monthName = monthNames[month];
    await ctx.answerCbQuery(`${monthName} ${year}`);
    await ctx.editMessageText(`Выбран период: ${monthName} ${year}`);

    return sendPeriodReport(
      ctx,
      `за ${monthName.toLowerCase()} ${year}`,
      range.start,
      range.end,
    );
  });

  bot.action(/^pick_category:(.+)$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const categoryKey = ctx.match[1];
    const categoryLabel = categoryMap[categoryKey];
    const state = getUserState(ctx.from.id);

    if (!categoryLabel) {
      return ctx.answerCbQuery("Неверная категория");
    }

    if (!state || state.mode !== "waiting_category" || !state.pendingExpense) {
      return ctx.answerCbQuery("Сначала нажми /add");
    }

    const user = getUser(ctx);
    const userName = user?.name || "Пользователь";
    const actionWord = getActionWord(user);
    const { amount, comment } = state.pendingExpense;

    try {
      const savedExpense = await createExpense({
        userId: ctx.from.id,
        userName,
        amount,
        category: categoryLabel,
        comment,
        createdAt: new Date().toISOString(),
      });

      clearUserState(ctx.from.id);

      await ctx.answerCbQuery(`Категория: ${categoryLabel}`);
      await ctx.editMessageText(`✅ Выбрана категория: ${categoryLabel}`);

      const commentText = comment ? `\n📝 Комментарий: ${comment}` : "";

      return ctx.reply(
        `${userName} ${actionWord} расход:
💰 Сумма: ${amount} €
📂 Категория: ${categoryLabel}${commentText}`,
        getUndoKeyboard(savedExpense.id),
      );
    } catch (error) {
      console.error("Ошибка при сохранении расхода:", error);
      return ctx.reply("Ошибка при сохранении расхода.");
    }
  });

  bot.action(/^ask_delete_expense:(\d+)$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const expenseId = Number(ctx.match[1]);

    try {
      const expense = await getUserExpenseById(expenseId, ctx.from.id);

      if (!expense) {
        await ctx.answerCbQuery("Расход не найден");
        return;
      }

      await ctx.answerCbQuery();

      return ctx.reply(
        `Удалить этот расход?\n\n${formatExpensePreview(expense)}`,
        getDeleteConfirmKeyboard(expense.id),
      );
    } catch (error) {
      console.error("Ошибка при получении расхода:", error);
      return ctx.answerCbQuery("Ошибка");
    }
  });

  bot.action(/^confirm_delete_expense:(\d+)$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const expenseId = Number(ctx.match[1]);

    try {
      const deleted = await removeUserExpenseById(expenseId, ctx.from.id);

      if (!deleted) {
        await ctx.answerCbQuery("Расход уже удалён или не найден");
        return;
      }

      await ctx.answerCbQuery("Удалено");
      return ctx.editMessageText("↩️ Расход удалён");
    } catch (error) {
      console.error("Ошибка при удалении расхода:", error);
      return ctx.answerCbQuery("Ошибка удаления");
    }
  });
}

module.exports = { registerActionHandlers };
