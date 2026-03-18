const { categoriesHint } = require("../config/categories");

function getExpenseInputHint(userName) {
  return `${userName}, введите сумму и комментарий (необязательно).

Примеры:
150
150 кофе
45 такси домой`;
}

function getStartMessage(userName) {
  return `Привет, ${userName} 👋

Я бот для учета семейного бюджета.

Команды:
/add - добавить расход
/undo - удалить последний расход
/today - отчет за сегодня
/week - отчет за неделю
/month - выбрать месяц кнопками
/year - выбрать год кнопками
/all - отчет за все время
/help - справка

Как добавить расход:
1. Нажми /add
2. Введи сумму и комментарий
3. Выбери категорию кнопкой

Категории:
${categoriesHint}`;
}

function getHelpMessage(userName) {
  return `Команды:
/start - запуск
/help - справка
/add - добавить расход
/undo - удалить последний расход
/today - отчет за сегодня
/week - отчет за неделю
/month - выбрать месяц кнопками
/year - выбрать год кнопками
/all - отчет за все время

${getExpenseInputHint(userName)}

Категории:
${categoriesHint}`;
}

module.exports = {
  getExpenseInputHint,
  getStartMessage,
  getHelpMessage,
};
