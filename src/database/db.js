const { Pool } = require("pg");

const ssl =
  process.env.DATABASE_URL?.includes("supabase") ||
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id        SERIAL PRIMARY KEY,
      user_id   BIGINT          NOT NULL,
      user_name TEXT            NOT NULL,
      amount    NUMERIC(12, 2)  NOT NULL,
      category  TEXT            NOT NULL,
      comment   TEXT            NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ   NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS monthly_limits (
      month_key    TEXT           PRIMARY KEY,
      limit_amount NUMERIC(12, 2) NOT NULL,
      created_at   TIMESTAMPTZ    NOT NULL,
      updated_at   TIMESTAMPTZ    NOT NULL
    )
  `);
}

async function addExpense({ userId, userName, amount, category, comment, createdAt }) {
  const result = await pool.query(
    `INSERT INTO expenses (user_id, user_name, amount, category, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [userId, userName, amount, category, comment || "", createdAt],
  );
  return { id: result.rows[0].id };
}

async function getLastExpense(userId) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE user_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId],
  );
  return result.rows[0] || null;
}

async function getExpenseById(expenseId, userId) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [expenseId, userId],
  );
  return result.rows[0] || null;
}

async function deleteExpenseById(expenseId, userId) {
  const result = await pool.query(
    `DELETE FROM expenses WHERE id = $1 AND user_id = $2`,
    [expenseId, userId],
  );
  return result.rowCount > 0;
}

async function getExpensesByPeriod(startDate, endDate) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE created_at >= $1 AND created_at < $2
     ORDER BY created_at DESC, id DESC`,
    [startDate, endDate],
  );
  return result.rows;
}

async function getTotalByPeriod(startDate, endDate) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE created_at >= $1 AND created_at < $2`,
    [startDate, endDate],
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function getCategoryStatsByPeriod(startDate, endDate) {
  const result = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY category
     ORDER BY total DESC, category ASC`,
    [startDate, endDate],
  );
  return result.rows;
}

async function getUserStatsByPeriod(startDate, endDate) {
  const result = await pool.query(
    `SELECT user_name, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY user_name
     ORDER BY total DESC, user_name ASC`,
    [startDate, endDate],
  );
  return result.rows;
}

async function getAllExpenses() {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     ORDER BY created_at DESC, id DESC`,
  );
  return result.rows;
}

async function getAllTotal() {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`,
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function getAllCategoryStats() {
  const result = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     GROUP BY category
     ORDER BY total DESC, category ASC`,
  );
  return result.rows;
}

async function getAllUserStats() {
  const result = await pool.query(
    `SELECT user_name, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     GROUP BY user_name
     ORDER BY total DESC, user_name ASC`,
  );
  return result.rows;
}

async function getAvailableYears() {
  const result = await pool.query(
    `SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year
     FROM expenses
     WHERE created_at IS NOT NULL
     ORDER BY year DESC`,
  );
  return result.rows.map((row) => row.year).filter((y) => !Number.isNaN(y));
}

async function getMonthlyLimit(monthKey) {
  const result = await pool.query(
    `SELECT month_key, limit_amount, created_at, updated_at
     FROM monthly_limits
     WHERE month_key = $1
     LIMIT 1`,
    [monthKey],
  );
  return result.rows[0] || null;
}

async function setMonthlyLimit(monthKey, amount) {
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO monthly_limits (month_key, limit_amount, created_at, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (month_key) DO UPDATE SET
       limit_amount = EXCLUDED.limit_amount,
       updated_at   = EXCLUDED.updated_at`,
    [monthKey, amount, now, now],
  );
  return { changes: result.rowCount };
}

async function deleteMonthlyLimit(monthKey) {
  const result = await pool.query(
    `DELETE FROM monthly_limits WHERE month_key = $1`,
    [monthKey],
  );
  return result.rowCount > 0;
}

async function clearAllData() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expenses = await client.query("DELETE FROM expenses");
    const limits = await client.query("DELETE FROM monthly_limits");
    await client.query("COMMIT");
    return { deletedExpenses: expenses.rowCount, deletedLimits: limits.rowCount };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  initDb,
  addExpense,
  getLastExpense,
  getExpenseById,
  deleteExpenseById,
  getExpensesByPeriod,
  getTotalByPeriod,
  getCategoryStatsByPeriod,
  getUserStatsByPeriod,
  getAllExpenses,
  getAllTotal,
  getAllCategoryStats,
  getAllUserStats,
  getAvailableYears,
  getMonthlyLimit,
  setMonthlyLimit,
  deleteMonthlyLimit,
  clearAllData,
};
