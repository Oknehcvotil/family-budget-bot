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
const { getReportsMenuKeyboard } = require("../keyboards/menu");

function registerReportHandlers(bot) {
  bot.hears("Отчеты", (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    return ctx.reply("Выбери отчет:", getReportsMenuKeyboard());
  });

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

    const familyId = ctx.state.member.family_id;
    const years = await getAvailableYears(familyId);

    if (!years.length) {
      return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
    }

    return ctx.reply(
      "Выбери год для отчета по месяцам:",
      await getYearsKeyboard("pick_month_year", familyId),
    );
  });

  bot.command("year", async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.reply("Нет доступа");
    }

    setUserState(ctx.from.id, {
      mode: "year_select",
    });

    const familyId = ctx.state.member.family_id;
    const years = await getAvailableYears(familyId);

    if (!years.length) {
      return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
    }

    return ctx.reply(
      "Выбери год для отчета:",
      await getYearsKeyboard("pick_year", familyId),
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

  bot.action(/^menu_report:(today|week|month|year|all)$/, async (ctx) => {
    if (!userIsAllowed(ctx)) {
      return ctx.answerCbQuery("Нет доступа");
    }

    const action = ctx.match[1];
    await ctx.answerCbQuery();

    if (action === "today") {
      setUserState(ctx.from.id, {
        mode: "choosing_report_type",
        reportAction: "today",
        label: "за сегодня",
        startDate: getStartOfToday(),
        endDate: getStartOfTomorrow(),
      });

      return ctx.editMessageText(
        "Выбери формат отчета за сегодня:",
        getReportTypeKeyboard("today"),
      );
    }

    if (action === "week") {
      setUserState(ctx.from.id, {
        mode: "choosing_report_type",
        reportAction: "week",
        label: "за неделю",
        startDate: getStartOfWeek(),
        endDate: getStartOfNextWeek(),
      });

      return ctx.editMessageText(
        "Выбери формат отчета за неделю:",
        getReportTypeKeyboard("week"),
      );
    }

    if (action === "month") {
      setUserState(ctx.from.id, {
        mode: "month_select",
      });

      const familyId = ctx.state.member.family_id;
      const years = await getAvailableYears(familyId);

      if (!years.length) {
        return ctx.editMessageText(
          "Пока нет расходов, поэтому выбрать год нельзя.",
        );
      }

      return ctx.editMessageText(
        "Выбери год для отчета по месяцам:",
        await getYearsKeyboard("pick_month_year", familyId),
      );
    }

    if (action === "year") {
      setUserState(ctx.from.id, {
        mode: "year_select",
      });

      const familyId = ctx.state.member.family_id;
      const years = await getAvailableYears(familyId);

      if (!years.length) {
        return ctx.editMessageText(
          "Пока нет расходов, поэтому выбрать год нельзя.",
        );
      }

      return ctx.editMessageText(
        "Выбери год для отчета:",
        await getYearsKeyboard("pick_year", familyId),
      );
    }

    setUserState(ctx.from.id, {
      mode: "choosing_report_type",
      reportAction: "all",
    });

    return ctx.editMessageText(
      "Выбери формат отчета за все время:",
      getReportTypeKeyboard("all"),
    );
  });
}

module.exports = { registerReportHandlers };
