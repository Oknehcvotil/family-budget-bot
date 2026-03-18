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
/delete - удалить последний расход
/today - отчет за сегодня
/week - отчет за неделю
/month - выбрать месяц кнопками
/year - выбрать год кнопками
/all - отчет за все время
/limit - лимит на текущий месяц
/invite - пригласить члена семьи (для админа)
/members - удалить участника семьи (для админа)
/leave - выйти из семьи
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
/delete - удалить последний расход
/today - отчет за сегодня
/week - отчет за неделю
/month - выбрать месяц кнопками
/year - выбрать год кнопками
/all - отчет за все время
/limit - лимит на текущий месяц
/invite - пригласить члена семьи (для админа)
/members - удалить участника семьи (для админа)
/leave - выйти из семьи

${getExpenseInputHint(userName)}

Категории:
${categoriesHint}`;
}

module.exports = {
  getExpenseInputHint,
  getStartMessage,
  getHelpMessage,
};
