const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./budget.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(
    `
    CREATE TABLE IF NOT EXISTS monthly_limits (
      month_key TEXT PRIMARY KEY,
      limit_amount REAL NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `,
  );

  db.run(`ALTER TABLE expenses ADD COLUMN comment TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column name")) {
      console.error("Ошибка при добавлении колонки comment:", err.message);
    }
  });
});

function addExpense({
  userId,
  userName,
  amount,
  category,
  comment,
  createdAt,
}) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO expenses (user_id, user_name, amount, category, comment, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [userId, userName, amount, category, comment || "", createdAt],
      function (err) {
        if (err) return reject(err);

        resolve({
          id: this.lastID,
        });
      },
    );
  });
}

function getLastExpense(userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT id, user_id, user_name, amount, category, comment, created_at
      FROM expenses
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 1
      `,
      [userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      },
    );
  });
}

function getExpenseById(expenseId, userId) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT id, user_id, user_name, amount, category, comment, created_at
      FROM expenses
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [expenseId, userId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      },
    );
  });
}

function deleteExpenseById(expenseId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      DELETE FROM expenses
      WHERE id = ? AND user_id = ?
      `,
      [expenseId, userId],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      },
    );
  });
}

function getExpensesByPeriod(startDate, endDate) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT id, user_id, user_name, amount, category, comment, created_at
      FROM expenses
      WHERE created_at >= ? AND created_at < ?
      ORDER BY datetime(created_at) DESC, id DESC
      `,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    );
  });
}

function getTotalByPeriod(startDate, endDate) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE created_at >= ? AND created_at < ?
      `,
      [startDate, endDate],
      (err, row) => {
        if (err) return reject(err);
        resolve(Number(row?.total ?? 0));
      },
    );
  });
}

function getCategoryStatsByPeriod(startDate, endDate) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE created_at >= ? AND created_at < ?
      GROUP BY category
      ORDER BY total DESC, category ASC
      `,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    );
  });
}

function getUserStatsByPeriod(startDate, endDate) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT user_name, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE created_at >= ? AND created_at < ?
      GROUP BY user_name
      ORDER BY total DESC, user_name ASC
      `,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    );
  });
}

function getAllExpenses() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT id, user_id, user_name, amount, category, comment, created_at
      FROM expenses
      ORDER BY datetime(created_at) DESC, id DESC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    );
  });
}

function getAllTotal() {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      `,
      [],
      (err, row) => {
        if (err) return reject(err);
        resolve(Number(row?.total ?? 0));
      },
    );
  });
}

function getAllCategoryStats() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT category, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      GROUP BY category
      ORDER BY total DESC, category ASC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    );
  });
}

function getAllUserStats() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT user_name, COALESCE(SUM(amount), 0) AS total
      FROM expenses
      GROUP BY user_name
      ORDER BY total DESC, user_name ASC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      },
    );
  });
}

function getAvailableYears() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT DISTINCT strftime('%Y', created_at) AS year
      FROM expenses
      WHERE created_at IS NOT NULL
      ORDER BY year DESC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);

        const years = (rows || [])
          .map((row) => Number(row.year))
          .filter((year) => !Number.isNaN(year));

        resolve(years);
      },
    );
  });
}

function getMonthlyLimit(monthKey) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT month_key, limit_amount, created_at, updated_at
      FROM monthly_limits
      WHERE month_key = ?
      LIMIT 1
      `,
      [monthKey],
      (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      },
    );
  });
}

function setMonthlyLimit(monthKey, amount) {
  const now = new Date().toISOString();

  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO monthly_limits (month_key, limit_amount, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(month_key) DO UPDATE SET
        limit_amount = excluded.limit_amount,
        updated_at = excluded.updated_at
      `,
      [monthKey, amount, now, now],
      function (err) {
        if (err) return reject(err);
        resolve({
          changes: this.changes,
        });
      },
    );
  });
}

function deleteMonthlyLimit(monthKey) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      DELETE FROM monthly_limits
      WHERE month_key = ?
      `,
      [monthKey],
      function (err) {
        if (err) return reject(err);
        resolve(this.changes > 0);
      },
    );
  });
}

module.exports = {
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
};
