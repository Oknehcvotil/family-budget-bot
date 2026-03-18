const {
  getExpensesByPeriod,
  getTotalByPeriod,
  getCategoryStatsByPeriod,
  getUserStatsByPeriod,
  getAllExpenses,
  getAllTotal,
  getAllCategoryStats,
  getAllUserStats,
} = require("../database/db");

const { formatDateForDb } = require("../utils/date");
const {
  formatExpenseList,
  formatCategoryStats,
  formatUserStats,
} = require("../utils/formatters");

async function getPeriodReportData(startDate, endDate) {
  const start = formatDateForDb(startDate);
  const end = formatDateForDb(endDate);

  const [expenses, total, categoryStats, userStats] = await Promise.all([
    getExpensesByPeriod(start, end),
    getTotalByPeriod(start, end),
    getCategoryStatsByPeriod(start, end),
    getUserStatsByPeriod(start, end),
  ]);

  return {
    expenses,
    total,
    categoryStats,
    userStats,
  };
}

async function getAllTimeReportData() {
  const [expenses, total, categoryStats, userStats] = await Promise.all([
    getAllExpenses(),
    getAllTotal(),
    getAllCategoryStats(),
    getAllUserStats(),
  ]);

  return {
    expenses,
    total,
    categoryStats,
    userStats,
  };
}

async function sendFullPeriodReport(ctx, label, startDate, endDate) {
  try {
    const { expenses, total, categoryStats, userStats } =
      await getPeriodReportData(startDate, endDate);

    const message =
      `📊 Отчет ${label}\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats, total)}\n\n` +
      `🧾 Расходы:\n${formatExpenseList(expenses)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении полного отчета:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

async function sendShortPeriodReport(ctx, label, startDate, endDate) {
  try {
    const { total, categoryStats, userStats } = await getPeriodReportData(
      startDate,
      endDate,
    );

    const message =
      `📊 Короткий отчет ${label}\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats, total)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении короткого отчета:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

async function sendFullAllTimeReport(ctx) {
  try {
    const { expenses, total, categoryStats, userStats } =
      await getAllTimeReportData();

    const message =
      `📊 Отчет за все время\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats, total)}\n\n` +
      `🧾 Расходы:\n${formatExpenseList(expenses)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении полного отчета за все время:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

async function sendShortAllTimeReport(ctx) {
  try {
    const { total, categoryStats, userStats } = await getAllTimeReportData();

    const message =
      `📊 Короткий отчет за все время\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats, total)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении короткого отчета за все время:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

module.exports = {
  sendFullPeriodReport,
  sendShortPeriodReport,
  sendFullAllTimeReport,
  sendShortAllTimeReport,
};
