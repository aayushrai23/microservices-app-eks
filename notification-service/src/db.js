const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  database: process.env.DB_NAME || 'notificationdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});
const connectDB = async () => {
  let retries = 10;
  while (retries) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Notification DB connected');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          type VARCHAR(50) NOT NULL,
          subject VARCHAR(255),
          message TEXT NOT NULL,
          email VARCHAR(255),
          status VARCHAR(20) DEFAULT 'sent',
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      return;
    } catch (err) {
      retries--;
      console.log('DB not ready, retrying... (' + retries + ' left)');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};
module.exports = { pool, connectDB };
