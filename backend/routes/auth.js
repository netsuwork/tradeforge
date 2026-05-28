const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = function(pool) {
  const router = express.Router();

  // ── SIGN UP ──────────────────────────────────
  router.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'Name, email, and password are required' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    try {
      // Check if email already exists
      const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
      if (existing.rows.length > 0)
        return res.status(409).json({ error: 'Email already registered. Please log in.' });

      const hash = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [name.trim(), email.toLowerCase().trim(), hash]
      );
      const user = result.rows[0];

      // Create default progress row
      await pool.query(
        'INSERT INTO user_progress (user_id, xp) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.id, 0]
      );

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (e) {
      console.error('Signup error:', e.message);
      res.status(500).json({ error: 'Server error. Please try again.' });
    }
  });

  // ── LOG IN ───────────────────────────────────
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    try {
      const result = await pool.query(
        'SELECT id, name, email, password_hash FROM users WHERE email=$1',
        [email.toLowerCase().trim()]
      );
      if (result.rows.length === 0)
        return res.status(401).json({ error: 'No account found with that email' });

      const user = result.rows[0];
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match)
        return res.status(401).json({ error: 'Incorrect password' });

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (e) {
      console.error('Login error:', e.message);
      res.status(500).json({ error: 'Server error. Please try again.' });
    }
  });

  // ── GET CURRENT USER ─────────────────────────
  router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT id, name, email, created_at FROM users WHERE id=$1',
        [req.userId]
      );
      if (result.rows.length === 0)
        return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
