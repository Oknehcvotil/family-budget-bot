const {
  getMonthlyLimit,
  setMonthlyLimit,
  deleteMonthlyLimit,
  getTotalByPeriod,
} = require("../database/db");
const {
  getStartOfMonth,
  getStartOfNextMonth,
  getMonthKey,
  formatDateForDb,
} = require("../utils/date");

async function getCurrentMonthLimitStatus() {
  const monthKey = getMonthKey();
  const start = getStartOfMonth();
  const end = getStartOfNextMonth();

  const [limit, spent] = await Promise.all([
    getMonthlyLimit(monthKey),
    getTotalByPeriod(formatDateForDb(start), formatDateForDb(end)),
  ]);

  const limitAmount = limit ? Number(limit.limit_amount) : null;
  const spentAmount = Number(spent || 0);
  const remaining =
    limitAmount !== null ? Math.max(limitAmount - spentAmount, 0) : null;

  return {
    monthKey,
    limitAmount,
    spentAmount,
    remaining,
    isExceeded: limitAmount !== null ? spentAmount > limitAmount : false,
  };
}

async function saveCurrentMonthLimit(amount) {
  const monthKey = getMonthKey();
  await setMonthlyLimit(monthKey, amount);
  return getCurrentMonthLimitStatus();
}

async function removeCurrentMonthLimit() {
  const monthKey = getMonthKey();
  await deleteMonthlyLimit(monthKey);
}

function formatLimitStatusMessage(status) {
  const limitText =
    status.limitAmount !== null ? `${status.limitAmount} €` : "не установлен";
  const spentText = `${status.spentAmount} €`;
  const remainingText =
    status.remaining !== null ? `${status.remaining} €` : "—";

  const exceededText = status.isExceeded ? "\n⚠️ Лимит превышен" : "";

  return `📅 Лимит на текущий месяц

💰 Лимит: ${limitText}
📉 Потрачено: ${spentText}
📦 Осталось: ${remainingText}${exceededText}`;
}

module.exports = {
  getCurrentMonthLimitStatus,
  saveCurrentMonthLimit,
  removeCurrentMonthLimit,
  formatLimitStatusMessage,
};
