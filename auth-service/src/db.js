const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'authdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres123',
});
const connectDB = async () => {
  let retries = 10;
  while (retries) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Auth DB connected');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'user',
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
