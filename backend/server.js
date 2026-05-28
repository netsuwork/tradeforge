const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// =========================
// MIDDLEWARE
// =========================

app.use(cors({
  origin: '*'
}));

app.use(express.json());

// =========================
// DEBUG ENV
// =========================

console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

// =========================
// DATABASE
// =========================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =========================
// ROOT ROUTE
// =========================

app.get('/', (req, res) => {
  res.send('TradeForge API is running');
});

// =========================
// INIT DATABASE
// =========================

async function initDB() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database initialized');

  } catch (err) {

    console.error('DATABASE INIT ERROR:');
    console.error(err);
  }
}

initDB();

// =========================
// SIGNUP
// =========================

app.post('/signup', async (req, res) => {

  try {

    console.log('Signup request received');

    const { name, email, password } = req.body;

    console.log(name, email);

    if (!name || !email || !password) {

      return res.status(400).json({
        error: 'All fields required'
      });
    }

    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {

      return res.status(400).json({
        error: 'Email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
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
      success: true,
      token,
      user
    });

  } catch (err) {

    console.error('SIGNUP ERROR:');
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =========================
// LOGIN
// =========================

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

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {

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
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {

    console.error('LOGIN ERROR:');
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
