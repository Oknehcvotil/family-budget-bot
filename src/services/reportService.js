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

async function sendPeriodReport(ctx, label, startDate, endDate) {
  try {
    const start = formatDateForDb(startDate);
    const end = formatDateForDb(endDate);

    const [expenses, total, categoryStats, userStats] = await Promise.all([
      getExpensesByPeriod(start, end),
      getTotalByPeriod(start, end),
      getCategoryStatsByPeriod(start, end),
      getUserStatsByPeriod(start, end),
    ]);

    const message =
      `📊 Отчет ${label}\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats)}\n\n` +
      `🧾 Расходы:\n${formatExpenseList(expenses)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении отчета:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

async function sendAllTimeReport(ctx) {
  try {
    const [expenses, total, categoryStats, userStats] = await Promise.all([
      getAllExpenses(),
      getAllTotal(),
      getAllCategoryStats(),
      getAllUserStats(),
    ]);

    const message =
      `📊 Отчет за все время\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats)}\n\n` +
      `🧾 Расходы:\n${formatExpenseList(expenses)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении отчета за все время:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

module.exports = {
  sendPeriodReport,
  sendAllTimeReport,
};
