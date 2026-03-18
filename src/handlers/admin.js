const { Markup } = require("telegraf");
const {
  clearFamilyData,
  createFamilyInvite,
  getFamilyMembers,
  removeFamilyMemberByAdmin,
  leaveFamily,
} = require("../database/db");
const { userIsAdmin } = require("../utils/auth");

function isAdmin(ctx) {
  return userIsAdmin(ctx);
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

function getMembersManageKeyboard(members) {
  const memberRows = members
    .filter((member) => member.role === "member")
    .map((member) => [
      Markup.button.callback(
        `Удалить: ${member.user_name}`,
        `admin_remove_member:${member.user_id}`,
      ),
    ]);

  if (!memberRows.length) {
    memberRows.push([
      Markup.button.callback("Нет участников для удаления", "noop_members"),
    ]);
  }

  memberRows.push([Markup.button.callback("❌ Закрыть", "cancel_selection")]);

  return Markup.inlineKeyboard(memberRows);
}

function getRemoveMemberConfirmKeyboard(targetUserId) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "✅ Подтвердить удаление",
        `admin_remove_member_confirm:${targetUserId}`,
      ),
    ],
    [Markup.button.callback("❌ Отмена", "admin_remove_member_cancel")],
  ]);
}

function registerAdminHandlers(bot) {
  bot.hears("Удалить члена семьи", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору семьи.");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const members = await getFamilyMembers(familyId);

      return ctx.reply(
        "Выбери участника, которого нужно удалить из семьи:",
        getMembersManageKeyboard(members),
      );
    } catch (error) {
      console.error("Ошибка при получении участников:", error);
      return ctx.reply("Не удалось получить список участников.");
    }
  });

  bot.command("members", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору семьи.");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const members = await getFamilyMembers(familyId);

      return ctx.reply(
        "Выбери участника, которого нужно удалить из семьи:",
        getMembersManageKeyboard(members),
      );
    } catch (error) {
      console.error("Ошибка при получении участников:", error);
      return ctx.reply("Не удалось получить список участников.");
    }
  });

  bot.action(/^admin_remove_member:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery("Нет доступа.");
    }

    const targetUserId = ctx.match[1];

    try {
      const familyId = ctx.state.member.family_id;
      const members = await getFamilyMembers(familyId);
      const targetMember = members.find(
        (member) => String(member.user_id) === String(targetUserId),
      );

      if (!targetMember || targetMember.role !== "member") {
        await ctx.answerCbQuery("Участник не найден");
        return;
      }

      await ctx.answerCbQuery();
      return ctx.editMessageText(
        `Удалить участника ${targetMember.user_name}?\n\nПосле подтверждения он(а) потеряет доступ к семейному бюджету.`,
        getRemoveMemberConfirmKeyboard(targetUserId),
      );
    } catch (error) {
      console.error("Ошибка при удалении участника:", error);
      return ctx.answerCbQuery("Ошибка удаления");
    }
  });

  bot.action(/^admin_remove_member_confirm:(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery("Нет доступа.");
    }

    const targetUserId = ctx.match[1];

    try {
      const familyId = ctx.state.member.family_id;
      const removed = await removeFamilyMemberByAdmin({ familyId, targetUserId });

      if (!removed) {
        await ctx.answerCbQuery("Удалить не удалось");
        return;
      }

      const members = await getFamilyMembers(familyId);
      await ctx.answerCbQuery("Участник удалён");
      return ctx.editMessageText(
        "Участник удалён. Можешь удалить ещё одного:",
        getMembersManageKeyboard(members),
      );
    } catch (error) {
      console.error("Ошибка при удалении участника:", error);
      return ctx.answerCbQuery("Ошибка удаления");
    }
  });

  bot.action("admin_remove_member_cancel", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.answerCbQuery("Нет доступа.");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const members = await getFamilyMembers(familyId);
      await ctx.answerCbQuery("Отменено");
      return ctx.editMessageText(
        "Удаление отменено. Выбери участника, которого нужно удалить:",
        getMembersManageKeyboard(members),
      );
    } catch (error) {
      console.error("Ошибка при отмене удаления:", error);
      return ctx.answerCbQuery("Ошибка");
    }
  });

  bot.action("noop_members", async (ctx) => {
    await ctx.answerCbQuery("Список пуст");
  });

  bot.hears("Выйти из семьи", async (ctx) => {
    try {
      const result = await leaveFamily(ctx.from.id);

      if (!result.ok) {
        if (result.reason === "last_admin") {
          return ctx.reply(
            "Ты последний администратор в семье. Сначала добавь участника, чтобы передать роль админа.",
          );
        }

        return ctx.reply("Ты не состоишь в семье.");
      }

      return ctx.reply(
        "Ты вышел(а) из семейного бюджета. Чтобы подключиться снова, используй /start и приглашение от администратора.",
        Markup.removeKeyboard(),
      );
    } catch (error) {
      console.error("Ошибка при выходе из семьи:", error);
      return ctx.reply("Не удалось выйти из семьи. Попробуй позже.");
    }
  });

  bot.command("leave", async (ctx) => {
    try {
      const result = await leaveFamily(ctx.from.id);

      if (!result.ok) {
        if (result.reason === "last_admin") {
          return ctx.reply(
            "Ты последний администратор в семье. Сначала добавь участника, чтобы передать роль админа.",
          );
        }

        return ctx.reply("Ты не состоишь в семье.");
      }

      return ctx.reply(
        "Ты вышел(а) из семейного бюджета. Чтобы подключиться снова, используй /start и приглашение от администратора.",
        Markup.removeKeyboard(),
      );
    } catch (error) {
      console.error("Ошибка при выходе из семьи:", error);
      return ctx.reply("Не удалось выйти из семьи. Попробуй позже.");
    }
  });

  bot.hears("Добавить члена семьи", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору семьи.");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const invite = await createFamilyInvite(familyId, ctx.from.id);
      const payload = `join_${invite.code}`;
      const botUsername = ctx.botInfo?.username;

      if (!botUsername) {
        return ctx.reply(
          `Код приглашения: ${invite.code}\n` +
            `Срок действия: 7 дней.\n\n` +
            "Участнику нужно открыть бота и отправить /start с этим кодом.",
        );
      }

      const link = `https://t.me/${botUsername}?start=${payload}`;

      return ctx.reply(
        "Отправь эту ссылку члену семьи. После перехода он автоматически подключится:\n\n" +
          `${link}\n\n` +
          `Код приглашения (если нужен вручную): ${invite.code}\n` +
          "Срок действия: 7 дней.",
      );
    } catch (error) {
      console.error("Ошибка при создании приглашения:", error);
      return ctx.reply("Не удалось создать приглашение. Попробуй снова.");
    }
  });

  bot.command("invite", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору семьи.");
    }

    try {
      const familyId = ctx.state.member.family_id;
      const invite = await createFamilyInvite(familyId, ctx.from.id);
      const payload = `join_${invite.code}`;
      const botUsername = ctx.botInfo?.username;

      if (!botUsername) {
        return ctx.reply(
          `Код приглашения: ${invite.code}\n` +
            `Срок действия: 7 дней.\n\n` +
            "Участнику нужно открыть бота и отправить /start с этим кодом.",
        );
      }

      const link = `https://t.me/${botUsername}?start=${payload}`;
      return ctx.reply(
        `Ссылка для приглашения:\n${link}\n\n` +
          `Код: ${invite.code}\n` +
          "Срок действия: 7 дней.",
      );
    } catch (error) {
      console.error("Ошибка при создании приглашения:", error);
      return ctx.reply("Не удалось создать приглашение. Попробуй снова.");
    }
  });

  bot.hears("Очистить базу", async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору семьи.");
    }

    return ctx.reply(
      "⚠️ *Внимание!*\nЭто удалит расходы и лимиты только вашей семьи.\nДействие необратимо!\n\nПодтвердить?",
      getClearDbConfirmKeyboard(),
    );
  });

  // Кнопка из главного меню
  bot.action("admin_cleardb_start", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCbQuery("Нет доступа.");
    await ctx.answerCbQuery();
    await ctx.reply(
      "⚠️ *Внимание!*\nЭто удалит расходы и лимиты только вашей семьи.\nДействие необратимо!\n\nПодтвердить?",
      getClearDbConfirmKeyboard(),
    );
  });

  // Шаг 1: запрос подтверждения
  bot.command("cleardb", (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply("Эта команда доступна только администратору семьи.");
    }

    ctx.reply(
      "⚠️ *Внимание!*\nЭто удалит расходы и лимиты только вашей семьи.\nДействие необратимо!\n\nПодтвердить?",
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
      const familyId = ctx.state.member.family_id;
      const { deletedExpenses, deletedLimits } = await clearFamilyData(familyId);
      await ctx.editMessageText(
        `✅ Данные семьи очищены.\nУдалено расходов: *${deletedExpenses}*\nУдалено лимитов: *${deletedLimits}*`,
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
