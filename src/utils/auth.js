const { getFamilyMemberByUserId } = require("../database/db");

function getTelegramName(ctx) {
  const firstName = ctx.from?.first_name || "";
  const lastName = ctx.from?.last_name || "";
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  if (ctx.from?.username) {
    return `@${ctx.from.username}`;
  }

  return "Пользователь";
}

async function attachMemberContext(ctx, next) {
  const userId = ctx.from?.id;

  if (!userId) {
    return next();
  }

  const member = await getFamilyMemberByUserId(userId);
  ctx.state = ctx.state || {};
  ctx.state.member = member;

  return next();
}

function getUser(ctx) {
  const member = ctx.state?.member;

  if (!member) {
    return null;
  }

  return {
    id: member.user_id,
    familyId: member.family_id,
    name: member.user_name,
    role: member.role,
  };
}

function getUserName(ctx) {
  const memberName = getUser(ctx)?.name;
  return memberName || getTelegramName(ctx);
}

function getActionWord() {
  return "добавил(а)";
}

function userIsAllowed(ctx) {
  return Boolean(ctx.state?.member);
}

function userIsAdmin(ctx) {
  return ctx.state?.member?.role === "admin";
}

module.exports = {
  attachMemberContext,
  getTelegramName,
  getUser,
  getUserName,
  getActionWord,
  userIsAllowed,
  userIsAdmin,
};
