const { Markup } = require("telegraf");

function getReportTypeKeyboard(action) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("📄 Полный", `report_type:${action}:full`),
      Markup.button.callback("⚡ Короткий", `report_type:${action}:short`),
    ],
    [Markup.button.callback("❌ Отмена", "cancel_selection")],
  ]);
}

module.exports = {
  getReportTypeKeyboard,
};
