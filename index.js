require("dotenv").config();
const { Telegraf } = require("telegraf");
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
} = require("./db");

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error("Ошибка: установите BOT_TOKEN в файле .env");
  process.exit(1);
}

const users = {
  [Number(process.env.KIRILL_ID)]: {
    name: "Кирилл",
    gender: "m",
  },
  [Number(process.env.LILIA_ID)]: {
    name: "Лиля",
    gender: "f",
  },
};

const allowedUserIds = (process.env.ALLOWED_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

const allowedCategories = {
  квартира: "Квартира",
  коммунальные: "Коммунальные",
  развлечения: "Развлечения",
  продукты: "Продукты",
  одежда: "Одежда",
  разное: "Разное",
};

const categoriesHint = Object.values(allowedCategories)
  .map((category) => `• ${category}`)
  .join("\n");

const bot = new Telegraf(token);

function getUser(ctx) {
  const userId = ctx.from?.id;
  return users[userId] || null;
}

function getUserName(ctx) {
  const user = getUser(ctx);
  return user?.name || "Пользователь";
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

function normalizeCategory(input) {
  if (!input) return null;
  const key = input.trim().toLowerCase();
  return allowedCategories[key] || null;
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

function formatDateForDb(date) {
  return date.toISOString();
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

function formatUserStats(stats) {
  if (!stats.length) {
    return "По людям пока пусто.";
  }

  return stats.map((item) => `• ${item.user_name}: ${item.total} €`).join("\n");
}

function formatCategoryStats(stats) {
  if (!stats.length) {
    return "По категориям пока пусто.";
  }

  return stats.map((item) => `• ${item.category}: ${item.total} €`).join("\n");
}

function getExpenseInputHint(userName) {
  return `${userName}, введите расход в формате:

150 продукты
230 развлечения кино
900 квартира аренда
45 разное такси

Доступные категории:
${categoriesHint}`;
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
      `👤 По транжирам:\n${formatUserStats(userStats)}\n\n` +
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
/month 6 2025 - отчет за июнь 2025
/year - отчет за текущий год
/year 2025 - отчет за 2025 год
/all - отчет за все время
/help - справка

Формат ввода:
150 продукты
230 развлечения кофе
900 квартира аренда

Доступные категории:
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
/month 6 2025 - отчет за конкретный месяц
/year - отчет за текущий год
/year 2025 - отчет за конкретный год
/all - отчет за все время

${getExpenseInputHint(userName)}`,
  );
});

bot.command("add", (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Доступ разрешен только владельцам.");
  }

  const userName = getUserName(ctx);
  return ctx.reply(getExpenseInputHint(userName));
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

  const parts = ctx.message.text.trim().split(/\s+/);

  if (parts.length === 1) {
    return sendPeriodReport(
      ctx,
      "за текущий месяц",
      getStartOfMonth(),
      getStartOfNextMonth(),
    );
  }

  if (parts.length === 3) {
    const month = parts[1];
    const year = parts[2];
    const range = getMonthRange(month, year);

    if (!range) {
      return ctx.reply(
        "Неверный формат.\n\nПримеры:\n/month\n/month 6 2025\n/month 01 2026",
      );
    }

    return sendPeriodReport(
      ctx,
      `за ${String(month).padStart(2, "0")}.${year}`,
      range.start,
      range.end,
    );
  }

  return ctx.reply(
    "Неверный формат.\n\nПримеры:\n/month\n/month 6 2025\n/month 01 2026",
  );
});

bot.command("year", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  const parts = ctx.message.text.trim().split(/\s+/);

  if (parts.length === 1) {
    const currentYear = new Date().getFullYear();
    const range = getYearRange(currentYear);

    return sendPeriodReport(
      ctx,
      `за ${currentYear} год`,
      range.start,
      range.end,
    );
  }

  if (parts.length === 2) {
    const year = parts[1];
    const range = getYearRange(year);

    if (!range) {
      return ctx.reply(
        "Неверный формат.\n\nПримеры:\n/year\n/year 2024\n/year 2025\n/year 2026",
      );
    }

    return sendPeriodReport(ctx, `за ${year} год`, range.start, range.end);
  }

  return ctx.reply(
    "Неверный формат.\n\nПримеры:\n/year\n/year 2024\n/year 2025\n/year 2026",
  );
});

bot.command("all", async (ctx) => {
  if (!userIsAllowed(ctx)) {
    return ctx.reply("Нет доступа");
  }

  await sendAllTimeReport(ctx);
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
  const actionWord = getActionWord(user);

  const parts = text.split(/\s+/);
  const amount = Number(parts[0]);
  const rawCategory = parts[1];
  const category = normalizeCategory(rawCategory);
  const comment = parts.length > 2 ? parts.slice(2).join(" ") : "";

  if (Number.isNaN(amount) || amount <= 0 || parts.length < 2) {
    return ctx.reply(
      `${userName}, не узнал формат.

Введите так:
150 продукты
или
230 развлечения кофе

Доступные категории:
${categoriesHint}`,
    );
  }

  if (!category) {
    return ctx.reply(
      `${userName}, такой категории нет.

Доступные категории:
${categoriesHint}

Примеры:
150 продукты молоко
230 развлечения кино
45 разное такси`,
    );
  }

  try {
    await addExpense({
      userId: ctx.from.id,
      userName,
      amount,
      category,
      comment,
      createdAt: new Date().toISOString(),
    });

    const commentText = comment ? `\n📝 Комментарий: ${comment}` : "";

    return ctx.reply(
      `${userName} ${actionWord} расход:
💰 Сумма: ${amount} €
📂 Категория: ${category}${commentText}`,
    );
  } catch (error) {
    console.error("Ошибка при сохранении расхода:", error);
    return ctx.reply("Ошибка при сохранении расхода.");
  }
});

bot.launch().then(() => {
  console.log("Бот запущен");
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
