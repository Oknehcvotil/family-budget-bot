const { Markup } = require("telegraf");
const { getAvailableYears } = require("../database/db");

async function getYearsKeyboard(prefix) {
  const years = await getAvailableYears();

  if (!years.length) {
    return Markup.inlineKeyboard([
      [Markup.button.callback("❌ Отмена", "cancel_selection")],
    ]);
  }

  const rows = [];

  for (let i = 0; i < years.length; i += 2) {
    const row = years
      .slice(i, i + 2)
      .map((year) => Markup.button.callback(String(year), `${prefix}:${year}`));

    rows.push(row);
  }

  rows.push([Markup.button.callback("❌ Отмена", "cancel_selection")]);

  return Markup.inlineKeyboard(rows);
}

function getMonthsKeyboard(year) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("Январь", `pick_month:${year}:1`),
      Markup.button.callback("Февраль", `pick_month:${year}:2`),
      Markup.button.callback("Март", `pick_month:${year}:3`),
    ],
    [
      Markup.button.callback("Апрель", `pick_month:${year}:4`),
      Markup.button.callback("Май", `pick_month:${year}:5`),
      Markup.button.callback("Июнь", `pick_month:${year}:6`),
    ],
    [
      Markup.button.callback("Июль", `pick_month:${year}:7`),
      Markup.button.callback("Август", `pick_month:${year}:8`),
      Markup.button.callback("Сентябрь", `pick_month:${year}:9`),
    ],
    [
      Markup.button.callback("Октябрь", `pick_month:${year}:10`),
      Markup.button.callback("Ноябрь", `pick_month:${year}:11`),
      Markup.button.callback("Декабрь", `pick_month:${year}:12`),
    ],
    [
      Markup.button.callback("⬅️ Назад к годам", "back_to_month_years"),
      Markup.button.callback("❌ Отмена", "cancel_selection"),
    ],
  ]);
}

module.exports = {
  getYearsKeyboard,
  getMonthsKeyboard,
};
