const { Markup } = require("telegraf");
const { adminUserId } = require("../config/users");
const { clearAllData } = require("../database/db");

function isAdmin(ctx) {
  return ctx.from?.id === adminUserId;
}

function getClearDbConfirmKeyboard() {
  return {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback("✅ Да, очистить всё", "admin_cleardb_confirm")],
      [Markup.button.callback("❌ Отмена", "admin_cleardb_cancel")],
    ]),
  };
}

function registerAdminHandlers(bot) {
  bot.hears("Очистить базу", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору.");
    }

    return ctx.reply(
      "⚠️ *Внимание!*\nЭто удалит ВСЕ расходы и лимиты из базы данных.\nДействие необратимо!\n\nПодтвердить?",
      getClearDbConfirmKeyboard(),
    );
  });

  // Кнопка из главного меню
  bot.action("admin_cleardb_start", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery("Нет доступа.");
    await ctx.answerCbQuery();
    await ctx.reply(
      "⚠️ *Внимание!*\nЭто удалит ВСЕ расходы и лимиты из базы данных.\nДействие необратимо!\n\nПодтвердить?",
      getClearDbConfirmKeyboard(),
    );
  });

  // Шаг 1: запрос подтверждения
  bot.command("cleardb", (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору.");
    }

    ctx.reply(
      "⚠️ *Внимание!*\nЭто удалит ВСЕ расходы и лимиты из базы данных.\nДействие необратимо!\n\nПодтвердить?",
      getClearDbConfirmKeyboard(),
    );
  });

  // Шаг 2: подтверждение — очистка
  bot.action("admin_cleardb_confirm", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery("Нет доступа.");
    }

    await ctx.answerCbQuery();

    try {
      const { deletedExpenses, deletedLimits } = await clearAllData();
      await ctx.editMessageText(
        `✅ База очищена.\nУдалено расходов: *${deletedExpenses}*\nУдалено лимитов: *${deletedLimits}*`,
        { parse_mode: "Markdown" },
      );
    } catch (err) {
      console.error("Ошибка при очистке БД:", err);
      await ctx.editMessageText("❌ Ошибка при очистке базы. Попробуй снова.");
    }
  });

  // Шаг 2: отмена
  bot.action("admin_cleardb_cancel", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText("Отмена. База данных не тронута.");
  });
}

module.exports = { registerAdminHandlers };
