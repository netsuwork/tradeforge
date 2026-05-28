const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// ======================
// MIDDLEWARE
// ======================

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
// ROOT
// ======================

app.get('/', (req, res) => {
  res.send('TradeForge API running');
});

// ======================
// CREATE TABLE
// ======================

async function initDB() {

  try {

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database ready');

  } catch (err) {

    console.error(err);
  }
}

initDB();

// ======================
// RESET USERS
// ======================

app.get('/reset-users', async (req, res) => {

  try {

    await pool.query(`
      DELETE FROM users;
    `);

    res.send('All users deleted');

  } catch (err) {

    console.error(err);

    res.status(500).send(err.message);
  }
});

// ======================
// SIGNUP
// ======================

app.post('/signup', async (req, res) => {

  try {

    const { name, email, password } = req.body;

    if (!name || !email || !password) {

      return res.status(400).json({
        error: 'All fields required'
      });
    }

    const existing = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {

      return res.status(400).json({
        error: 'Email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password)
      VALUES ($1, $2, $3)
      RETURNING id, name, email
      `,
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

    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ======================
// PROFILE
// ======================

app.get('/profile', async (req, res) => {

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

    const result = await pool.query(
      `
      SELECT id, name, email
      FROM users
      WHERE id = $1
      `,
      [decoded.id]
    );

    if (result.rows.length === 0) {

      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error(err);

    res.status(401).json({
      error: 'Invalid token'
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
