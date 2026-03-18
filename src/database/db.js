const { Pool } = require("pg");
const crypto = require("crypto");

const ssl =
  process.env.DATABASE_URL?.includes("supabase") ||
  process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

async function hasColumn(tableName, columnName) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName],
  );

  return result.rowCount > 0;
}

async function ensureLegacyFamilyId() {
  const hasUnscopedExpenses = await pool.query(
    `SELECT 1 FROM expenses WHERE family_id IS NULL LIMIT 1`,
  );

  const hasUnscopedLimits = await pool.query(
    `SELECT 1 FROM monthly_limits WHERE family_id IS NULL LIMIT 1`,
  );

  if (!hasUnscopedExpenses.rowCount && !hasUnscopedLimits.rowCount) {
    return null;
  }

  const now = new Date().toISOString();
  const family = await pool.query(
    `INSERT INTO families (name, created_at)
     VALUES ($1, $2)
     RETURNING id`,
    ["Legacy family", now],
  );

  return family.rows[0].id;
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS families (
      id         SERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS family_members (
      user_id    BIGINT      PRIMARY KEY,
      family_id  INTEGER     NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      user_name  TEXT        NOT NULL,
      role       TEXT        NOT NULL CHECK (role IN ('admin', 'member')),
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS family_invites (
      code       TEXT        PRIMARY KEY,
      family_id  INTEGER     NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      created_by BIGINT      NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ,
      used_by    BIGINT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id        SERIAL PRIMARY KEY,
      family_id INTEGER,
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
      family_id    INTEGER,
      month_key    TEXT           NOT NULL,
      limit_amount NUMERIC(12, 2) NOT NULL,
      created_at   TIMESTAMPTZ    NOT NULL,
      updated_at   TIMESTAMPTZ    NOT NULL
    )
  `);

  if (!(await hasColumn("expenses", "family_id"))) {
    await pool.query(`ALTER TABLE expenses ADD COLUMN family_id INTEGER`);
  }

  if (!(await hasColumn("monthly_limits", "family_id"))) {
    await pool.query(`ALTER TABLE monthly_limits ADD COLUMN family_id INTEGER`);
  }

  const legacyFamilyId = await ensureLegacyFamilyId();

  if (legacyFamilyId) {
    await pool.query(
      `UPDATE expenses SET family_id = $1 WHERE family_id IS NULL`,
      [legacyFamilyId],
    );

    await pool.query(
      `UPDATE monthly_limits SET family_id = $1 WHERE family_id IS NULL`,
      [legacyFamilyId],
    );

    const membersFromExpenses = await pool.query(
      `SELECT user_id, MAX(user_name) AS user_name
       FROM expenses
       WHERE family_id = $1
       GROUP BY user_id
       ORDER BY user_id ASC`,
      [legacyFamilyId],
    );

    const adminUserId = membersFromExpenses.rows[0]?.user_id || null;
    const now = new Date().toISOString();

    for (const row of membersFromExpenses.rows) {
      const role = row.user_id === adminUserId ? "admin" : "member";

      await pool.query(
        `INSERT INTO family_members (user_id, family_id, user_name, role, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id) DO NOTHING`,
        [row.user_id, legacyFamilyId, row.user_name || "Пользователь", role, now],
      );
    }
  }

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_family_created_at
      ON expenses (family_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_family_user_created_at
      ON expenses (family_id, user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_family_members_family
      ON family_members (family_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_family_invites_family
      ON family_invites (family_id)
  `);

  await pool.query(`
    ALTER TABLE monthly_limits
    DROP CONSTRAINT IF EXISTS monthly_limits_pkey
  `);

  await pool.query(`
    ALTER TABLE monthly_limits
    ADD CONSTRAINT monthly_limits_pkey PRIMARY KEY (family_id, month_key)
  `);
}

function buildInviteCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

async function getFamilyMemberByUserId(userId) {
  const result = await pool.query(
    `SELECT user_id, family_id, user_name, role, created_at
     FROM family_members
     WHERE user_id = $1
     LIMIT 1`,
    [userId],
  );

  return result.rows[0] || null;
}

async function createFamilyWithAdmin({ adminUserId, adminUserName, familyName }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const now = new Date().toISOString();
    const familyResult = await client.query(
      `INSERT INTO families (name, created_at)
       VALUES ($1, $2)
       RETURNING id, name`,
      [familyName, now],
    );

    const family = familyResult.rows[0];

    const memberResult = await client.query(
      `INSERT INTO family_members (user_id, family_id, user_name, role, created_at)
       VALUES ($1, $2, $3, 'admin', $4)
       ON CONFLICT (user_id) DO UPDATE SET
         family_id = EXCLUDED.family_id,
         user_name = EXCLUDED.user_name,
         role = 'admin'
       RETURNING user_id, family_id, user_name, role, created_at`,
      [adminUserId, family.id, adminUserName, now],
    );

    await client.query("COMMIT");

    return {
      family,
      member: memberResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function createFamilyInvite(familyId, createdByUserId) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = buildInviteCode();

    try {
      await pool.query(
        `INSERT INTO family_invites (code, family_id, created_by, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [code, familyId, createdByUserId, now.toISOString(), expiresAt.toISOString()],
      );

      return {
        code,
        expiresAt,
      };
    } catch (error) {
      if (error.code !== "23505") {
        throw error;
      }
    }
  }

  throw new Error("Не удалось сгенерировать уникальный код приглашения");
}

async function getFamilyMembers(familyId) {
  const result = await pool.query(
    `SELECT user_id, family_id, user_name, role, created_at
     FROM family_members
     WHERE family_id = $1
     ORDER BY
       CASE WHEN role = 'admin' THEN 0 ELSE 1 END,
       created_at ASC,
       user_name ASC`,
    [familyId],
  );

  return result.rows;
}

async function removeFamilyMemberByAdmin({ familyId, targetUserId }) {
  const result = await pool.query(
    `DELETE FROM family_members
     WHERE family_id = $1 AND user_id = $2 AND role = 'member'`,
    [familyId, targetUserId],
  );

  return result.rowCount > 0;
}

async function leaveFamily(userId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT user_id, family_id, role, user_name, created_at
       FROM family_members
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );

    const current = currentResult.rows[0];

    if (!current) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "not_member" };
    }

    if (current.role === "admin") {
      const nextAdminResult = await client.query(
        `SELECT user_id
         FROM family_members
         WHERE family_id = $1 AND user_id <> $2
         ORDER BY created_at ASC, user_id ASC
         LIMIT 1`,
        [current.family_id, userId],
      );

      const nextAdminUserId = nextAdminResult.rows[0]?.user_id || null;

      if (!nextAdminUserId) {
        await client.query("ROLLBACK");
        return { ok: false, reason: "last_admin" };
      }

      await client.query(
        `UPDATE family_members
         SET role = 'admin'
         WHERE user_id = $1`,
        [nextAdminUserId],
      );
    }

    await client.query(
      `DELETE FROM family_members WHERE user_id = $1`,
      [userId],
    );

    await client.query("COMMIT");
    return { ok: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function joinFamilyByInviteCode({ inviteCode, userId, userName }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inviteResult = await client.query(
      `SELECT code, family_id, expires_at, used_by
       FROM family_invites
       WHERE code = $1
       LIMIT 1`,
      [inviteCode],
    );

    const invite = inviteResult.rows[0];

    if (!invite) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "invalid" };
    }

    if (invite.used_by) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "used" };
    }

    if (invite.expires_at && new Date(invite.expires_at) <= new Date()) {
      await client.query("ROLLBACK");
      return { ok: false, reason: "expired" };
    }

    const now = new Date().toISOString();
    const existingMemberResult = await client.query(
      `SELECT family_id, role
       FROM family_members
       WHERE user_id = $1
       LIMIT 1`,
      [userId],
    );

    const previousFamilyId = existingMemberResult.rows[0]?.family_id || null;

    const memberResult = await client.query(
      `INSERT INTO family_members (user_id, family_id, user_name, role, created_at)
       VALUES ($1, $2, $3, 'member', $4)
       ON CONFLICT (user_id) DO UPDATE SET
         family_id = EXCLUDED.family_id,
         user_name = EXCLUDED.user_name,
         role = 'member'
       RETURNING user_id, family_id, user_name, role, created_at`,
      [userId, invite.family_id, userName, now],
    );

    if (previousFamilyId && previousFamilyId !== invite.family_id) {
      await client.query(
        `UPDATE expenses
         SET family_id = $1
         WHERE family_id = $2 AND user_id = $3`,
        [invite.family_id, previousFamilyId, userId],
      );
    }

    await client.query(
      `UPDATE family_invites
       SET used_by = $1
       WHERE code = $2 AND used_by IS NULL`,
      [userId, inviteCode],
    );

    await client.query("COMMIT");

    return {
      ok: true,
      member: memberResult.rows[0],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function addExpense({
  familyId,
  userId,
  userName,
  amount,
  category,
  comment,
  createdAt,
}) {
  const result = await pool.query(
    `INSERT INTO expenses (family_id, user_id, user_name, amount, category, comment, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [familyId, userId, userName, amount, category, comment || "", createdAt],
  );
  return { id: result.rows[0].id };
}

async function getLastExpense(familyId, userId) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE family_id = $1 AND user_id = $2
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [familyId, userId],
  );
  return result.rows[0] || null;
}

async function getExpenseById(familyId, expenseId, userId) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE family_id = $1 AND id = $2 AND user_id = $3
     LIMIT 1`,
    [familyId, expenseId, userId],
  );
  return result.rows[0] || null;
}

async function deleteExpenseById(familyId, expenseId, userId) {
  const result = await pool.query(
    `DELETE FROM expenses WHERE family_id = $1 AND id = $2 AND user_id = $3`,
    [familyId, expenseId, userId],
  );
  return result.rowCount > 0;
}

async function getExpensesByPeriod(familyId, startDate, endDate) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE family_id = $1 AND created_at >= $2 AND created_at < $3
     ORDER BY created_at DESC, id DESC`,
    [familyId, startDate, endDate],
  );
  return result.rows;
}

async function getTotalByPeriod(familyId, startDate, endDate) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE family_id = $1 AND created_at >= $2 AND created_at < $3`,
    [familyId, startDate, endDate],
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function getCategoryStatsByPeriod(familyId, startDate, endDate) {
  const result = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE family_id = $1 AND created_at >= $2 AND created_at < $3
     GROUP BY category
     ORDER BY total DESC, category ASC`,
    [familyId, startDate, endDate],
  );
  return result.rows;
}

async function getUserStatsByPeriod(familyId, startDate, endDate) {
  const result = await pool.query(
    `SELECT user_name, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE family_id = $1 AND created_at >= $2 AND created_at < $3
     GROUP BY user_name
     ORDER BY total DESC, user_name ASC`,
    [familyId, startDate, endDate],
  );
  return result.rows;
}

async function getAllExpenses(familyId) {
  const result = await pool.query(
    `SELECT id, user_id, user_name, amount, category, comment, created_at
     FROM expenses
     WHERE family_id = $1
     ORDER BY created_at DESC, id DESC`,
    [familyId],
  );
  return result.rows;
}

async function getAllTotal(familyId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE family_id = $1`,
    [familyId],
  );
  return Number(result.rows[0]?.total ?? 0);
}

async function getAllCategoryStats(familyId) {
  const result = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE family_id = $1
     GROUP BY category
     ORDER BY total DESC, category ASC`,
    [familyId],
  );
  return result.rows;
}

async function getAllUserStats(familyId) {
  const result = await pool.query(
    `SELECT user_name, COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE family_id = $1
     GROUP BY user_name
     ORDER BY total DESC, user_name ASC`,
    [familyId],
  );
  return result.rows;
}

async function getAvailableYears(familyId) {
  const result = await pool.query(
    `SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS year
     FROM expenses
     WHERE family_id = $1 AND created_at IS NOT NULL
     ORDER BY year DESC`,
    [familyId],
  );
  return result.rows.map((row) => row.year).filter((y) => !Number.isNaN(y));
}

async function getMonthlyLimit(familyId, monthKey) {
  const result = await pool.query(
    `SELECT family_id, month_key, limit_amount, created_at, updated_at
     FROM monthly_limits
     WHERE family_id = $1 AND month_key = $2
     LIMIT 1`,
    [familyId, monthKey],
  );
  return result.rows[0] || null;
}

async function setMonthlyLimit(familyId, monthKey, amount) {
  const now = new Date().toISOString();
  const result = await pool.query(
    `INSERT INTO monthly_limits (family_id, month_key, limit_amount, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (family_id, month_key) DO UPDATE SET
       limit_amount = EXCLUDED.limit_amount,
       updated_at   = EXCLUDED.updated_at`,
    [familyId, monthKey, amount, now, now],
  );
  return { changes: result.rowCount };
}

async function deleteMonthlyLimit(familyId, monthKey) {
  const result = await pool.query(
    `DELETE FROM monthly_limits WHERE family_id = $1 AND month_key = $2`,
    [familyId, monthKey],
  );
  return result.rowCount > 0;
}

async function clearFamilyData(familyId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const expenses = await client.query(
      "DELETE FROM expenses WHERE family_id = $1",
      [familyId],
    );
    const limits = await client.query(
      "DELETE FROM monthly_limits WHERE family_id = $1",
      [familyId],
    );
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
  getFamilyMemberByUserId,
  getFamilyMembers,
  removeFamilyMemberByAdmin,
  leaveFamily,
  createFamilyWithAdmin,
  createFamilyInvite,
  joinFamilyByInviteCode,
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
  clearFamilyData,
};
