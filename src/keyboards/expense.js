const { Markup } = require("telegraf");

function getCategoryKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Квартира", "pick_category:apartment"),
      Markup.button.callback("Коммунальные", "pick_category:utilities"),
    ],
    [
      Markup.button.callback("Развлечения", "pick_category:fun"),
      Markup.button.callback("Продукты", "pick_category:products"),
    ],
    [
      Markup.button.callback("Одежда", "pick_category:clothes"),
      Markup.button.callback("Разное", "pick_category:other"),
    ],
    [Markup.button.callback("❌ Отмена", "cancel_expense_add")],
  ]);
}

function getUndoKeyboard(expenseId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("↩️ Отменить", `ask_delete_expense:${expenseId}`)],
  ]);
}

module.exports = {
  getCategoryKeyboard,
  getUndoKeyboard,
};
