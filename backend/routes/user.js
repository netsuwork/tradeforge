const express = require('express');
const auth = require('../middleware/auth');

module.exports = function(pool) {
  const router = express.Router();

  // All routes here require authentication
  router.use(auth);

  // ── GET PROGRESS ─────────────────────────────
  router.get('/progress', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT completed_lessons, xp, quiz_scores FROM user_progress WHERE user_id=$1',
        [req.userId]
      );
      if (result.rows.length === 0) {
        return res.json({ completed_lessons: [], xp: 0, quiz_scores: {} });
      }
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── SAVE PROGRESS ────────────────────────────
  router.post('/progress', async (req, res) => {
    const { completed_lessons, xp, quiz_scores } = req.body;
    try {
      await pool.query(`
        INSERT INTO user_progress (user_id, completed_lessons, xp, quiz_scores, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET completed_lessons=$2, xp=$3, quiz_scores=$4, updated_at=NOW()
      `, [req.userId, completed_lessons || [], xp || 0, JSON.stringify(quiz_scores || {})]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── GET JOURNAL ──────────────────────────────
  router.get('/journal', async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM journal_entries WHERE user_id=$1 ORDER BY created_at DESC',
        [req.userId]
      );
      res.json(result.rows);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── ADD JOURNAL ENTRY ────────────────────────
  router.post('/journal', async (req, res) => {
    const { pair, direction, pnl, entry_price, exit_price, emotion, notes, trade_date } = req.body;
    try {
      const result = await pool.query(`
        INSERT INTO journal_entries
          (user_id, pair, direction, pnl, entry_price, exit_price, emotion, notes, trade_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `, [req.userId, pair, direction, pnl, entry_price||null, exit_price||null, emotion, notes, trade_date]);
      res.status(201).json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── DELETE JOURNAL ENTRY ─────────────────────
  router.delete('/journal/:id', async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM journal_entries WHERE id=$1 AND user_id=$2',
        [req.params.id, req.userId]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ── GET JOURNAL STATS ────────────────────────
  router.get('/journal/stats', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_trades,
          COUNT(CASE WHEN pnl LIKE '+%' THEN 1 END) as winning_trades,
          COUNT(CASE WHEN pnl LIKE '-%' THEN 1 END) as losing_trades
        FROM journal_entries WHERE user_id=$1
      `, [req.userId]);
      res.json(result.rows[0]);
    } catch (e) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
