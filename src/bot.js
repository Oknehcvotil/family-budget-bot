const { Telegraf } = require("telegraf");
const { BOT_TOKEN } = require("./config/env");

const { registerStartHandlers } = require("./handlers/start");
const { registerHelpHandlers } = require("./handlers/help");
const { registerExpenseHandlers } = require("./handlers/expense");
const { registerReportHandlers } = require("./handlers/report");
const { registerActionHandlers } = require("./handlers/actions");
const { registerTextHandlers } = require("./handlers/text");
const { registerLimitHandlers } = require("./handlers/limit");

function createBot() {
  if (!BOT_TOKEN) {
    console.error("Ошибка: установите BOT_TOKEN в файле .env");
    process.exit(1);
  }

  const bot = new Telegraf(BOT_TOKEN);

  registerStartHandlers(bot);
  registerHelpHandlers(bot);
  registerExpenseHandlers(bot);
  registerReportHandlers(bot);
  registerLimitHandlers(bot);
  registerActionHandlers(bot);
  registerTextHandlers(bot);

  return bot;
}

module.exports = { createBot };
