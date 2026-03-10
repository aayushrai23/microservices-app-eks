const express = require('express');
const { pool } = require('../db');
const router = express.Router();

router.post('/send', async (req, res) => {
  const { user_id, type, subject, message, email } = req.body;
  if (!user_id || !message) return res.status(400).json({ error: 'user_id and message required' });
  try {
    const result = await pool.query(
      "INSERT INTO notifications (user_id, type, subject, message, email, status) VALUES ($1,$2,$3,$4,$5,'sent') RETURNING *",
      [user_id, type || 'general', subject, message, email]
    );
    console.log('📧 Notification → [' + type + '] to ' + email + ': ' + message);
    res.status(201).json({ message: 'Notification sent', notification: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not send notification' });
  }
});

router.get('/user/:userId', async (req, res) => {
  const result = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC', [req.params.userId]);
  res.json({ notifications: result.rows });
});

router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100');
  res.json({ notifications: result.rows });
});
module.exports = router;
