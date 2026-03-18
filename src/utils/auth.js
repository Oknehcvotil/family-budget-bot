const { users, allowedUserIds } = require("../config/users");

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

module.exports = {
  getUser,
  getUserName,
  getActionWord,
  userIsAllowed,
};
