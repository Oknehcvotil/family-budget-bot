const users = {
  [Number(process.env.KIRILL_ID)]: { name: "Кирилл", gender: "m" },
  [Number(process.env.LILIA_ID)]: { name: "Лиля", gender: "f" },
};

const allowedUserIds = (process.env.ALLOWED_USER_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean)
  .map(Number);

const adminUserId = Number(process.env.ADMIN_USER_ID);

module.exports = {
  users,
  allowedUserIds,
  adminUserId,
};
