const {
  userIsAllowed,
  userIsAdmin,
  getUser,
  getUserName,
  getTelegramName,
} = require("../utils/auth");
const {
  createFamilyWithAdmin,
  joinFamilyByInviteCode,
} = require("../database/db");
const { getMainMenuKeyboard } = require("../keyboards/menu");

function registerStartHandlers(bot) {
  bot.start(async (ctx) => {
    const user = getUser(ctx);
    const displayName = getUserName(ctx);
    const payload = (ctx.startPayload || "").trim();

    if (payload.startsWith("join_")) {
      const inviteCode = payload.slice(5).toUpperCase();

      try {
        const joined = await joinFamilyByInviteCode({
          inviteCode,
          userId: ctx.from.id,
          userName: getTelegramName(ctx),
        });

        if (!joined.ok) {
          if (joined.reason === "used") {
            return ctx.reply(
              "Это приглашение уже использовано. Попроси администратора семьи отправить новое.",
            );
          }

          if (joined.reason === "expired") {
            return ctx.reply(
              "Срок действия приглашения истёк. Попроси администратора создать новое.",
            );
          }

          return ctx.reply(
            "Приглашение не найдено. Проверь ссылку или попроси новую у администратора семьи.",
          );
        }

        return ctx.reply(
          `Привет, ${joined.member.user_name} 👋\n\n` +
            "Ты добавлен(а) в семейный бюджет. Теперь ваши расходы и отчеты общие для этой семьи.",
          getMainMenuKeyboard({ isAdmin: joined.member.role === "admin" }),
        );
      } catch (error) {
        console.error("Ошибка при вступлении по приглашению:", error);
        return ctx.reply("Не удалось присоединиться к семье. Попробуй еще раз.");
      }
    }

    if (userIsAllowed(ctx) && user) {
      return ctx.reply(
        `С возвращением, ${displayName} 👋\n\n` +
          "Я веду бюджет вашей семьи: расходы, лимиты и отчеты.",
        getMainMenuKeyboard({ isAdmin: userIsAdmin(ctx) }),
      );
    }

    try {
      const creatorName = getTelegramName(ctx);
      const familyName = `Семья ${creatorName}`;

      const created = await createFamilyWithAdmin({
        adminUserId: ctx.from.id,
        adminUserName: creatorName,
        familyName,
      });

      return ctx.reply(
        `Привет, ${created.member.user_name} 👋\n\n` +
          "Я бот для семейного бюджета.\n" +
          "Помогаю добавлять расходы, ставить лимит на месяц и строить отчёты.\n\n" +
          "✅ Ты создал(а) новую семью и стал(а) админом.\n" +
          "Нажми «Добавить члена семьи», чтобы пригласить остальных.",
        getMainMenuKeyboard({ isAdmin: true }),
      );
    } catch (error) {
      console.error("Ошибка при создании семьи:", error);
      return ctx.reply("Не удалось завершить настройку. Попробуй /start еще раз.");
    }
  });
}

module.exports = { registerStartHandlers };
