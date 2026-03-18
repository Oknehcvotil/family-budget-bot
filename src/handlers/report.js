const { getAvailableYears } = require("../database/db");
const { userIsAllowed } = require("../utils/auth");
const { setUserState } = require("../state/userState");
const {
  getStartOfToday,
  getStartOfTomorrow,
  getStartOfWeek,
  getStartOfNextWeek,
} = require("../utils/date");
const { getYearsKeyboard } = require("../keyboards/report");
const { getReportTypeKeyboard } = require("../keyboards/reportType");

function registerReportHandlers(bot) {
  bot.command("today", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "choosing_report_type",
      reportAction: "today",
      label: "за сегодня",
      startDate: getStartOfToday(),
      endDate: getStartOfTomorrow(),
    });

    return ctx.reply(
      "Выбери формат отчета за сегодня:",
      getReportTypeKeyboard("today"),
    );
  });

  bot.command("week", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "choosing_report_type",
      reportAction: "week",
      label: "за неделю",
      startDate: getStartOfWeek(),
      endDate: getStartOfNextWeek(),
    });

    return ctx.reply(
      "Выбери формат отчета за неделю:",
      getReportTypeKeyboard("week"),
    );
  });

  bot.command("month", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "month_select",
    });

    const years = await getAvailableYears();

    if (!years.length) {
      return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
    }

    return ctx.reply(
      "Выбери год для отчета по месяцам:",
      await getYearsKeyboard("pick_month_year"),
    );
  });

  bot.command("year", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "year_select",
    });

    const years = await getAvailableYears();

    if (!years.length) {
      return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
    }

    return ctx.reply(
      "Выбери год для отчета:",
      await getYearsKeyboard("pick_year"),
    );
  });

  bot.command("all", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "choosing_report_type",
      reportAction: "all",
    });

    return ctx.reply(
      "Выбери формат отчета за все время:",
      getReportTypeKeyboard("all"),
    );
  });
}

module.exports = { registerReportHandlers };
