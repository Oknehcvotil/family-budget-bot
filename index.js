require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const {
  addExpense,
  getExpensesByPeriod,
  getTotalByPeriod,
  getCategoryStatsByPeriod,
  getUserStatsByPeriod,
  getAllExpenses,
  getAllTotal,
  getAllCategoryStats,
  getAllUserStats,
  getAvailableYears,
} = require("./db");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Ошибка: установите BOT_TOKEN в файле .env");
  process.exit(1);
}

const bot = new Telegraf(token);

const users = {
  [Number(process.env.KIRILL_ID)]: { name: "Кирилл", gender: "m" },
  [Number(process.env.LILIA_ID)]: { name: "Лиля", gender: "f" },
};

const allowedUserIds = (process.env.ALLOWED_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

const categories = [
  { key: "apartment", label: "Квартира" },
  { key: "utilities", label: "Коммунальные" },
  { key: "fun", label: "Развлечения" },
  { key: "products", label: "Продукты" },
  { key: "clothes", label: "Одежда" },
  { key: "other", label: "Разное" },
];

const categoryMap = Object.fromEntries(
  categories.map((category) => [category.key, category.label]),
);

const monthNames = {
  1: "Январь",
  2: "Февраль",
  3: "Март",
  4: "Апрель",
  5: "Май",
  6: "Июнь",
  7: "Июль",
  8: "Август",
  9: "Сентябрь",
  10: "Октябрь",
  11: "Ноябрь",
  12: "Декабрь",
};

const categoriesHint = categories.map((item) => `• ${item.label}`).join("\n");

const userStates = {};

function getUser(ctx) {
  const userId = ctx.from?.id;
  return users[userId] || null;
}

function getUserName(ctx) {
  return getUser(ctx)?.name || "Пользователь";
}

function getActionWord(user) {
  if (!user) return "добавил(а)";
  return user.gender === "f" ? "добавила" : "добавил";
}

function userIsAllowed(ctx) {
  const userId = ctx.from?.id;
  if (!userId) return false;
  return allowedUserIds.includes(userId);
}

function formatDateForDb(date) {
  return date.toISOString();
}

function getStartOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfTomorrow() {
  const today = getStartOfToday();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
}

function getStartOfWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
}

function getStartOfNextWeek() {
  const startOfWeek = getStartOfWeek();
  return new Date(
    startOfWeek.getFullYear(),
    startOfWeek.getMonth(),
    startOfWeek.getDate() + 7,
  );
}

function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getStartOfNextMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function getMonthRange(month, year) {
  const monthNumber = Number(month);
  const yearNumber = Number(year);

  if (
    Number.isNaN(monthNumber) ||
    Number.isNaN(yearNumber) ||
    monthNumber < 1 ||
    monthNumber > 12 ||
    yearNumber < 2000 ||
    yearNumber > 2100
  ) {
    return null;
  }

  const start = new Date(yearNumber, monthNumber - 1, 1);
  const end = new Date(yearNumber, monthNumber, 1);

  return { start, end };
}

function getYearRange(year) {
  const yearNumber = Number(year);

  if (Number.isNaN(yearNumber) || yearNumber < 2000 || yearNumber > 2100) {
    return null;
  }

  const start = new Date(yearNumber, 0, 1);
  const end = new Date(yearNumber + 1, 0, 1);

  return { start, end };
}

function formatExpenseList(expenses) {
  if (!expenses.length) {
    return "Расходов нет.";
  }

  return expenses
    .map((item) => {
      const date = new Date(item.created_at);
      const formattedDate = date.toLocaleString("ru-RU");
      const commentPart = item.comment ? ` — ${item.comment}` : "";
      return `• ${item.user_name}: ${item.amount} € — ${item.category}${commentPart} (${formattedDate})`;
    })
    .join("\n");
}

function formatCategoryStats(stats) {
  if (!stats.length) {
    return "По категориям пока пусто.";
  }

  return stats.map((item) => `• ${item.category}: ${item.total} €`).join("\n");
}

function formatUserStats(stats) {
  if (!stats.length) {
    return "По людям пока пусто.";
  }

  return stats.map((item) => `• ${item.user_name}: ${item.total} €`).join("\n");
}

function getExpenseInputHint(userName) {
  return `${userName}, введите сумму и комментарий (необязательно).

Примеры:
150
150 кофе
45 такси домой`;
}

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

async function sendPeriodReport(ctx, label, startDate, endDate) {
  try {
    const start = formatDateForDb(startDate);
    const end = formatDateForDb(endDate);

    const [expenses, total, categoryStats, userStats] = await Promise.all([
      getExpensesByPeriod(start, end),
      getTotalByPeriod(start, end),
      getCategoryStatsByPeriod(start, end),
      getUserStatsByPeriod(start, end),
    ]);

    const message =
      `📊 Отчет ${label}\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats)}\n\n` +
      `🧾 Расходы:\n${formatExpenseList(expenses)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении отчета:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

async function sendAllTimeReport(ctx) {
  try {
    const [expenses, total, categoryStats, userStats] = await Promise.all([
      getAllExpenses(),
      getAllTotal(),
      getAllCategoryStats(),
      getAllUserStats(),
    ]);

    const message =
      `📊 Отчет за все время\n\n` +
      `💰 Всего: ${total} €\n\n` +
      `👤 По людям:\n${formatUserStats(userStats)}\n\n` +
      `📂 По категориям:\n${formatCategoryStats(categoryStats)}\n\n` +
      `🧾 Расходы:\n${formatExpenseList(expenses)}`;

    return ctx.reply(message);
  } catch (error) {
    console.error("Ошибка при получении отчета за все время:", error);
    return ctx.reply("Ошибка при получении отчета.");
  }
}

bot.start((ctx) => {
  const user = getUser(ctx);

  if (!userIsAllowed(ctx) || !user) {
    return ctx.reply("Нет доступа");
  }

  return ctx.reply(
    `Привет, ${user.name} 👋

Я бот для учета семейного бюджета.

Команды:
/add - добавить расход
/today - отчет за сегодня
/week - отчет за неделю
/month - отчет за текущий месяц
/month_select - выбрать месяц кнопками
/year - отчет за текущий год
/year_select - выбрать год кнопками
/all - отчет за все время
/help - справка

Как добавить расход:
1. Нажми /add
2. Введи сумму и комментарий
3. Выбери категорию кнопкой

Категории:
${categoriesHint}`,
  );
});

bot.help((ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  const userName = getUserName(ctx);

  return ctx.reply(
    `Команды:
/start - запуск
/help - справка
/add - добавить расход
/today - отчет за сегодня
/week - отчет за неделю
/month - отчет за текущий месяц
/month_select - выбрать месяц кнопками
/year - отчет за текущий год
/year_select - выбрать год кнопками
/all - отчет за все время

${getExpenseInputHint(userName)}

Категории:
${categoriesHint}`,
  );
});

bot.command("add", (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Доступ разрешен только владельцам.");
  }

  userStates[ctx.from.id] = { mode: "waiting_expense_input" };

  return ctx.reply(getExpenseInputHint(getUserName(ctx)));
});

bot.command("today", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  await sendPeriodReport(
    ctx,
    "за сегодня",
    getStartOfToday(),
    getStartOfTomorrow(),
  );
});

bot.command("week", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  await sendPeriodReport(
    ctx,
    "за неделю",
    getStartOfWeek(),
    getStartOfNextWeek(),
  );
});

bot.command("month", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  await sendPeriodReport(
    ctx,
    "за текущий месяц",
    getStartOfMonth(),
    getStartOfNextMonth(),
  );
});

bot.command("year", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  const currentYear = new Date().getFullYear();
  const range = getYearRange(currentYear);

  await sendPeriodReport(ctx, `за ${currentYear} год`, range.start, range.end);
});

bot.command("all", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  await sendAllTimeReport(ctx);
});

bot.command("month_select", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  userStates[ctx.from.id] = { mode: "month_select" };

  const years = await getAvailableYears();

  if (!years.length) {
    return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
  }

  return ctx.reply(
    "Выбери год для отчета по месяцам:",
    await getYearsKeyboard("pick_month_year"),
  );
});

bot.command("year_select", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  userStates[ctx.from.id] = { mode: "year_select" };

  const years = await getAvailableYears();

  if (!years.length) {
    return ctx.reply("Пока нет расходов, поэтому выбрать год нельзя.");
  }

  return ctx.reply(
    "Выбери год для отчета:",
    await getYearsKeyboard("pick_year"),
  );
});

bot.action("cancel_selection", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  delete userStates[ctx.from.id];
  await ctx.answerCbQuery("Отменено");
  return ctx.editMessageText("Выбор отменен.");
});

bot.action("cancel_expense_add", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  delete userStates[ctx.from.id];
  await ctx.answerCbQuery("Отменено");
  return ctx.editMessageText("Добавление расхода отменено.");
});

bot.action("back_to_month_years", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  userStates[ctx.from.id] = { mode: "month_select" };
  await ctx.answerCbQuery();

  const years = await getAvailableYears();

  if (!years.length) {
    return ctx.editMessageText(
      "Пока нет расходов, поэтому выбрать год нельзя.",
    );
  }

  return ctx.editMessageText(
    "Выбери год для отчета по месяцам:",
    await getYearsKeyboard("pick_month_year"),
  );
});

bot.action(/^pick_year:(\d{4})$/, async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  const year = Number(ctx.match[1]);
  const range = getYearRange(year);

  if (!range) {
    return ctx.answerCbQuery("Неверный год");
  }

  delete userStates[ctx.from.id];
  await ctx.answerCbQuery(`Отчет за ${year}`);
  await ctx.editMessageText(`Выбран год: ${year}`);
  return sendPeriodReport(ctx, `за ${year} год`, range.start, range.end);
});

bot.action(/^pick_month_year:(\d{4})$/, async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  const year = Number(ctx.match[1]);

  userStates[ctx.from.id] = {
    mode: "month_select",
    selectedYear: year,
  };

  await ctx.answerCbQuery(`Год ${year}`);
  return ctx.editMessageText(
    `Выбери месяц для ${year}:`,
    getMonthsKeyboard(year),
  );
});

bot.action(/^pick_month:(\d{4}):(\d{1,2})$/, async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  const year = Number(ctx.match[1]);
  const month = Number(ctx.match[2]);
  const range = getMonthRange(month, year);

  if (!range) {
    return ctx.answerCbQuery("Неверный месяц");
  }

  delete userStates[ctx.from.id];

  const monthName = monthNames[month];
  await ctx.answerCbQuery(`${monthName} ${year}`);
  await ctx.editMessageText(`Выбран период: ${monthName} ${year}`);

  return sendPeriodReport(
    ctx,
    `за ${monthName.toLowerCase()} ${year}`,
    range.start,
    range.end,
  );
});

bot.action(/^pick_category:(.+)$/, async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.answerCbQuery("Нет доступа");
  }

  const categoryKey = ctx.match[1];
  const categoryLabel = categoryMap[categoryKey];
  const state = userStates[ctx.from.id];

  if (!categoryLabel) {
    return ctx.answerCbQuery("Неверная категория");
  }

  if (!state || state.mode !== "waiting_category" || !state.pendingExpense) {
    return ctx.answerCbQuery("Сначала нажми /add");
  }

  const user = getUser(ctx);
  const userName = user?.name || "Пользователь";
  const actionWord = getActionWord(user);

  const { amount, comment } = state.pendingExpense;

  try {
    await addExpense({
      userId: ctx.from.id,
      userName,
      amount,
      category: categoryLabel,
      comment,
      createdAt: new Date().toISOString(),
    });

    delete userStates[ctx.from.id];

    await ctx.answerCbQuery(`Категория: ${categoryLabel}`);
    await ctx.editMessageText(`Выбрана категория: ${categoryLabel}`);

    const commentText = comment ? `\n📝 Комментарий: ${comment}` : "";

    return ctx.reply(
      `${userName} ${actionWord} расход:
💰 Сумма: ${amount} €
📂 Категория: ${categoryLabel}${commentText}`,
    );
  } catch (error) {
    console.error("Ошибка при сохранении расхода:", error);
    return ctx.reply("Ошибка при сохранении расхода.");
  }
});

bot.on("text", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Доступ к вводу расходов предоставлен только владельцам.");
  }

  const text = ctx.message.text.trim();

  if (!text || text.startsWith("/")) {
    return;
  }

  const user = getUser(ctx);
  const userName = user?.name || "Пользователь";
  const state = userStates[ctx.from.id];

  if (state?.mode === "waiting_expense_input") {
    const parts = text.split(/\s+/);
    const amount = Number(parts[0]);
    const comment = parts.length > 1 ? parts.slice(1).join(" ") : "";

    if (Number.isNaN(amount) || amount <= 0) {
      return ctx.reply(
        `${userName}, не узнал сумму.

Примеры:
150
150 кофе
45 такси домой`,
      );
    }

    userStates[ctx.from.id] = {
      mode: "waiting_category",
      pendingExpense: {
        amount,
        comment,
      },
    };

    const commentPreview = comment ? `\n📝 Комментарий: ${comment}` : "";

    return ctx.reply(
      `Выбери категорию:
💰 Сумма: ${amount} €${commentPreview}`,
      getCategoryKeyboard(),
    );
  }

  if (state?.mode === "waiting_category") {
    return ctx.reply(
      "Сначала выбери категорию кнопкой ниже или нажми /add заново.",
    );
  }

  return ctx.reply(
    `Чтобы добавить расход, нажми /add

После этого введи:
150
или
150 кофе`,
  );
});

bot.launch().then(() => {
  console.log("Бот запущен");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
