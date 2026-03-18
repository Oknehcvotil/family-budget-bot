const { Markup } = require("telegraf");

function getMainMenuKeyboard({ isAdmin = false } = {}) {
  const rows = [
    [Markup.button.text("Добавить расход"), Markup.button.text("Удалить")],
    [Markup.button.text("Отчеты"), Markup.button.text("Лимит")],
    [Markup.button.text("Помощь"), Markup.button.text("Выйти из семьи")],
  ];

  if (isAdmin) {
    rows.push([
      Markup.button.text("Добавить члена семьи"),
      Markup.button.text("Удалить члена семьи"),
    ]);
    rows.push([
      Markup.button.text("Очистить базу"),
    ]);
  }

  return Markup.keyboard(rows).resize().persistent();
}

function getReportsMenuKeyboard() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Сегодня", "menu_report:today"),
      Markup.button.callback("Неделя", "menu_report:week"),
    ],
    [
      Markup.button.callback("Месяц", "menu_report:month"),
      Markup.button.callback("Год", "menu_report:year"),
    ],
    [Markup.button.callback("Все время", "menu_report:all")],
    [Markup.button.callback("❌ Отмена", "cancel_selection")],
  ]);
}

module.exports = {
  getMainMenuKeyboard,
  getReportsMenuKeyboard,
};