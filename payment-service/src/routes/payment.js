const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db');
const router = express.Router();
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
const NOTIF_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3003';

const authenticate = async (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Authorization required' });
  try {
    const { data } = await axios.post(AUTH_URL + '/api/auth/verify', {}, { headers: { Authorization: token } });
    req.user = data.user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

router.post('/', authenticate, async (req, res) => {
  const { amount, currency = 'USD', description, payment_method = 'card' } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
  try {
    const status = Math.random() > 0.1 ? 'completed' : 'failed';
    const transaction_id = 'txn_' + uuidv4().replace(/-/g, '').slice(0, 16);
    const result = await pool.query(
      'INSERT INTO payments (user_id, amount, currency, status, description, payment_method, transaction_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, amount, currency, status, description, payment_method, transaction_id]
    );
    axios.post(NOTIF_URL + '/api/notification/send', {
      user_id: req.user.id, type: 'payment',
      subject: 'Payment ' + status,
      message: 'Your payment of ' + currency + ' ' + amount + ' has ' + status + '. Txn: ' + transaction_id,
      email: req.user.email,
    }).catch(() => {});
    res.status(201).json({ message: 'Payment ' + status, payment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment failed' });
  }
});

router.get('/my', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM payments WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
  res.json({ payments: result.rows });
});

router.get('/', authenticate, async (req, res) => {
  const result = await pool.query('SELECT * FROM payments ORDER BY created_at DESC LIMIT 100');
  res.json({ payments: result.rows });
});
module.exports = router;
