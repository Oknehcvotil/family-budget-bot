const { Markup } = require("telegraf");
const { categories } = require("../config/categories");

function getCategoryKeyboard() {
  const rows = [];

  for (let i = 0; i < categories.length; i += 2) {
    const row = categories
      .slice(i, i + 2)
      .map((category) =>
        Markup.button.callback(
          `${category.icon} ${category.shortLabel || category.label}`,
          `pick_category:${category.key}`,
        ),
      );

    rows.push(row);
  }

  rows.push([Markup.button.callback("❌ Отмена", "cancel_expense_add")]);

  return Markup.inlineKeyboard(rows);
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
