const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: '*'
}));

app.use(express.json());

// ======================
// DATABASE
// ======================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// ======================
// INIT DATABASE
// ======================

async function initDB() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        xp INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        lesson VARCHAR(255),
        completed BOOLEAN DEFAULT true
      );
    `);

    console.log('Database ready');

  } catch (err) {

    console.error(err);
  }
}

initDB();

// ======================
// ROOT
// ======================

app.get('/', (req, res) => {
  res.send('TradeForge API running');
});

// ======================
// AUTH MIDDLEWARE
// ======================

function auth(req, res, next) {

  try {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        error: 'No token'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (err) {

    return res.status(401).json({
      error: 'Invalid token'
    });
  }
}

// ======================
// SIGNUP
// ======================

app.post('/signup', async (req, res) => {

  try {

    const { name, email, password } = req.body;

    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {

      return res.status(400).json({
        error: 'Email already exists'
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, xp
      `,
      [name, email, hashed]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '30d'
      }
    );

    res.json({
      token,
      user
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ======================
// LOGIN
// ======================

app.post('/login', async (req, res) => {

  try {

    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {

      return res.status(400).json({
        error: 'Invalid credentials'
      });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password
    );

    if (!valid) {

      return res.status(400).json({
        error: 'Invalid credentials'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '30d'
      }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: user.xp
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ======================
// PROFILE
// ======================

app.get('/profile', auth, async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT id, name, email, xp
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ======================
// COMPLETE LESSON
// ======================

app.post('/complete-lesson', auth, async (req, res) => {

  try {

    const { lesson } = req.body;

    const existing = await pool.query(
      `
      SELECT *
      FROM progress
      WHERE user_id = $1
      AND lesson = $2
      `,
      [req.user.id, lesson]
    );

    if (existing.rows.length === 0) {

      await pool.query(
        `
        INSERT INTO progress (user_id, lesson)
        VALUES ($1, $2)
        `,
        [req.user.id, lesson]
      );

      await pool.query(
        `
        UPDATE users
        SET xp = xp + 10
        WHERE id = $1
        `,
        [req.user.id]
      );
    }

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ======================
// GET PROGRESS
// ======================

app.get('/progress', auth, async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT lesson
      FROM progress
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ======================
// START SERVER
// ======================

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
