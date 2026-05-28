require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// ── DB CONNECTION ──────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test DB connection and create tables on startup
pool.connect(async (err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    return;
  }
  console.log('✅ Database connected');
  release();
  await initDB();
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        completed_lessons TEXT[] DEFAULT '{}',
        xp INTEGER DEFAULT 0,
        quiz_scores JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id)
      );

      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        pair VARCHAR(50),
        direction VARCHAR(10),
        pnl VARCHAR(50),
        entry_price DECIMAL,
        exit_price DECIMAL,
        emotion VARCHAR(50),
        notes TEXT,
        trade_date DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tables ready');
  } catch (e) {
    console.error('❌ Table init error:', e.message);
  }
}

// ── MIDDLEWARE ─────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

// ── ROUTES ────────────────────────────────────
app.use('/api/auth', require('./routes/auth')(pool));
app.use('/api/user', require('./routes/user')(pool));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`🚀 TradeForge API running on port ${PORT}`));
