const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ცხრილების შექმნა თუ არ არსებობს
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(50),
        ss_sub VARCHAR(255) UNIQUE,
        ss_pin VARCHAR(255),
        roles TEXT DEFAULT '["USER"]',
        myhome_token TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS drafts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500),
        source VARCHAR(50),
        source_url TEXT,
        template TEXT,
        files TEXT,
        ss_id VARCHAR(255),
        myhome_id VARCHAR(255),
        myhome_expired_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS currency (
        id SERIAL PRIMARY KEY,
        usd_gel NUMERIC,
        eur_gel NUMERIC,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database ready');
  } catch (e) {
    console.error('DB init error:', e.message);
  } finally {
    client.release();
  }
}

const db = {
  users: {
    findBySub: async (ss_sub) => {
      const res = await pool.query('SELECT * FROM users WHERE ss_sub = $1', [ss_sub]);
      return res.rows[0] || null;
    },
    findById: async (id) => {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    },
    create: async (user) => {
      const res = await pool.query(
        `INSERT INTO users (name, phone, ss_sub, ss_pin, roles)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [user.name, user.phone, user.ss_sub, user.ss_pin, JSON.stringify(user.roles || ['USER'])]
      );
      return res.rows[0];
    },
    update: async (id, fields) => {
      const keys = Object.keys(fields);
      if (keys.length === 0) return null;
      const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
      const values = keys.map(k => fields[k]);
      const res = await pool.query(
        `UPDATE users SET ${sets} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );
      return res.rows[0] || null;
    }
  },

  drafts: {
    findByUserAndUrl: async (user_id, source_url) => {
      const res = await pool.query(
        'SELECT * FROM drafts WHERE user_id = $1 AND source_url = $2',
        [user_id, source_url]
      );
      return res.rows[0] || null;
    },
    findByUserAndId: async (id, user_id) => {
      const res = await pool.query(
        'SELECT * FROM drafts WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );
      return res.rows[0] || null;
    },
    findAllByUser: async (user_id) => {
      const res = await pool.query(
        'SELECT * FROM drafts WHERE user_id = $1 ORDER BY updated_at DESC',
        [user_id]
      );
      return res.rows;
    },
    create: async (draft) => {
      const res = await pool.query(
        `INSERT INTO drafts (user_id, title, source, source_url, template, files)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [draft.user_id, draft.title, draft.source, draft.source_url,
         draft.template, draft.files]
      );
      return res.rows[0];
    },
    update: async (id, user_id, fields) => {
      const keys = Object.keys(fields);
      if (keys.length === 0) return null;
      const sets = keys.map((k, i) => `${k} = $${i + 3}`).join(', ');
      const values = keys.map(k => fields[k]);
      const res = await pool.query(
        `UPDATE drafts SET ${sets}, updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, user_id, ...values]
      );
      return res.rows[0] || null;
    },
    delete: async (id, user_id) => {
      await pool.query(
        'DELETE FROM drafts WHERE id = $1 AND user_id = $2',
        [id, user_id]
      );
    }
  },

  currency: {
    save: async (usd_gel, eur_gel) => {
      await pool.query(
        'INSERT INTO currency (usd_gel, eur_gel) VALUES ($1, $2)',
        [usd_gel, eur_gel]
      );
      // ძველი ჩანაწერები წაშალე (100-ზე მეტი)
      await pool.query(`
        DELETE FROM currency WHERE id NOT IN (
          SELECT id FROM currency ORDER BY updated_at DESC LIMIT 100
        )
      `);
    }
  }
};

module.exports = { db, initDB, pool };
