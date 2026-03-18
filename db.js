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
        resolve({ id: this.lastID });
      },
    );
  });
}

function getExpensesByPeriod(startDate, endDate) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT *
      FROM expenses
      WHERE created_at >= ? AND created_at < ?
      ORDER BY created_at DESC
      `,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
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
        resolve(row.total);
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
      ORDER BY total DESC
      `,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
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
      ORDER BY total DESC
      `,
      [startDate, endDate],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      },
    );
  });
}

function getAllExpenses() {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT *
      FROM expenses
      ORDER BY created_at DESC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
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
        resolve(row.total);
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
      ORDER BY total DESC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
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
      ORDER BY total DESC
      `,
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
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

        const years = rows
          .map((row) => Number(row.year))
          .filter((year) => !Number.isNaN(year));

        resolve(years);
      },
    );
  });
}

module.exports = {
  addExpense,
  getExpensesByPeriod,
  getTotalByPeriod,
  getCategoryStatsByPeriod,
  getUserStatsByPeriod,
  getAllExpenses,
  getAllTotal,
  getAllCategoryStats,
  getAllUserStats,
  getAvailableYears,
};
