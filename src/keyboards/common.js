const { Markup } = require("telegraf");

function getCancelSelectionKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("❌ Отмена", "cancel_selection")],
  ]);
}

function getDeleteConfirmKeyboard(expenseId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "✅ Да, удалить",
        `confirm_delete_expense:${expenseId}`,
      ),
    ],
    [Markup.button.callback("❌ Отмена", "cancel_delete_expense")],
  ]);
}

module.exports = {
  getCancelSelectionKeyboard,
  getDeleteConfirmKeyboard,
};
