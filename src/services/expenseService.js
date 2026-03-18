const {
  addExpense,
  getLastExpense,
  getExpenseById,
  deleteExpenseById,
} = require("../database/db");

async function createExpense(data) {
  return addExpense(data);
}

async function getLastUserExpense(familyId, userId) {
  return getLastExpense(familyId, userId);
}

async function getUserExpenseById(familyId, expenseId, userId) {
  return getExpenseById(familyId, expenseId, userId);
}

async function removeUserExpenseById(familyId, expenseId, userId) {
  return deleteExpenseById(familyId, expenseId, userId);
}

module.exports = {
  createExpense,
  getLastUserExpense,
  getUserExpenseById,
  removeUserExpenseById,
};
