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

async function getCurrentMonthLimitStatus(familyId) {
  const monthKey = getMonthKey();
  const start = getStartOfMonth();
  const end = getStartOfNextMonth();

  const [limit, spent] = await Promise.all([
    getMonthlyLimit(familyId, monthKey),
    getTotalByPeriod(familyId, formatDateForDb(start), formatDateForDb(end)),
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

async function saveCurrentMonthLimit(familyId, amount) {
  const monthKey = getMonthKey();
  await setMonthlyLimit(familyId, monthKey, amount);
  return getCurrentMonthLimitStatus(familyId);
}

async function removeCurrentMonthLimit(familyId) {
  const monthKey = getMonthKey();
  await deleteMonthlyLimit(familyId, monthKey);
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
