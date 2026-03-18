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

async function getPeriodReportData(familyId, startDate, endDate) {
  const start = formatDateForDb(startDate);
  const end = formatDateForDb(endDate);

  const [expenses, total, categoryStats, userStats] = await Promise.all([
    getExpensesByPeriod(familyId, start, end),
    getTotalByPeriod(familyId, start, end),
    getCategoryStatsByPeriod(familyId, start, end),
    getUserStatsByPeriod(familyId, start, end),
  ]);

  return {
    expenses,
    total,
    categoryStats,
    userStats,
  };
}

async function getAllTimeReportData(familyId) {
  const [expenses, total, categoryStats, userStats] = await Promise.all([
    getAllExpenses(familyId),
    getAllTotal(familyId),
    getAllCategoryStats(familyId),
    getAllUserStats(familyId),
  ]);

  return {
    expenses,
    total,
    categoryStats,
    userStats,
  };
}

async function sendFullPeriodReport(ctx, familyId, label, startDate, endDate) {
  try {
    const { expenses, total, categoryStats, userStats } =
      await getPeriodReportData(familyId, startDate, endDate);

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

async function sendShortPeriodReport(ctx, familyId, label, startDate, endDate) {
  try {
    const { total, categoryStats, userStats } = await getPeriodReportData(
      familyId,
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

async function sendFullAllTimeReport(ctx, familyId) {
  try {
    const { expenses, total, categoryStats, userStats } =
      await getAllTimeReportData(familyId);

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

async function sendShortAllTimeReport(ctx, familyId) {
  try {
    const { total, categoryStats, userStats } = await getAllTimeReportData(familyId);

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
