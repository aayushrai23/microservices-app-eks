const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: 5432,
  database: process.env.DB_NAME || 'paymentdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});
const connectDB = async () => {
  let retries = 10;
  while (retries) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Payment DB connected');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          status VARCHAR(20) DEFAULT 'pending',
          description TEXT,
          payment_method VARCHAR(50) DEFAULT 'card',
          transaction_id VARCHAR(255),
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
