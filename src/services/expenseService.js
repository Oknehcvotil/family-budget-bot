const {
  addExpense,
  getLastExpense,
  getExpenseById,
  deleteExpenseById,
} = require("../database/db");

async function createExpense(data) {
  return addExpense(data);
}

async function getLastUserExpense(userId) {
  return getLastExpense(userId);
}

async function getUserExpenseById(expenseId, userId) {
  return getExpenseById(expenseId, userId);
}

async function removeUserExpenseById(expenseId, userId) {
  return deleteExpenseById(expenseId, userId);
}

module.exports = {
  createExpense,
  getLastUserExpense,
  getUserExpenseById,
  removeUserExpenseById,
};
