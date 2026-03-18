const { getAvailableYears } = require("../database/db");
const { userIsAllowed } = require("../utils/auth");
const {
  getStartOfToday,
  getStartOfTomorrow,
  getStartOfWeek,
  getStartOfNextWeek,
} = require("../utils/date");
const {
  sendPeriodReport,
  sendAllTimeReport,
} = require("../services/reportService");
const { setUserState } = require("../state/userState");
const { getYearsKeyboard } = require("../keyboards/report");

function registerReportHandlers(bot) {
  bot.command("today", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    await sendPeriodReport(
      ctx,
      "за сегодня",
      getStartOfToday(),
      getStartOfTomorrow(),
    );
  });

  bot.command("week", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    await sendPeriodReport(
      ctx,
      "за неделю",
      getStartOfWeek(),
      getStartOfNextWeek(),
    );
  });

  bot.command("month", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, { mode: "month_select" });

    const years = await getAvailableYears();

    if (!years.length) {
      return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
    }

    return ctx.reply(
      "Выбери год для отчета по месяцам:",
      await getYearsKeyboard("pick_month_year", getAvailableYears),
    );
  });

  bot.command("year", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, { mode: "year_select" });

    const years = await getAvailableYears();

    if (!years.length) {
      return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
    }

    return ctx.reply(
      "Выбери год для отчета:",
      await getYearsKeyboard("pick_year", getAvailableYears),
    );
  });

  bot.command("all", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    await sendAllTimeReport(ctx);
  });
}

module.exports = { registerReportHandlers };
