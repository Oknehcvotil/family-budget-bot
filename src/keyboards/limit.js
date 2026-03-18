const { Markup } = require("telegraf");

function getLimitKeyboard(hasLimit) {
  const rows = [];

  rows.push([
    Markup.button.callback(
      hasLimit ? "✏️ Изменить лимит" : "💰 Установить лимит",
      "set_month_limit",
    ),
  ]);

  if (hasLimit) {
    rows.push([
      Markup.button.callback("🗑 Удалить лимит", "delete_month_limit"),
    ]);
  }

  rows.push([Markup.button.callback("❌ Отмена", "cancel_selection")]);

  return Markup.inlineKeyboard(rows);
}

module.exports = {
  getLimitKeyboard,
};
