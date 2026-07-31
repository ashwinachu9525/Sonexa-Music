const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgres://avnadmin:AVNS_q5QvtrZtVk8xZw7cjpJ@pg-aeb4a95-aswink062000-a34a.j.aivencloud.com:24754/defaultdb',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT 1')
  .then(() => console.log('PG CONNECTED!'))
  .catch(e => console.error('PG ERROR:', e))
  .finally(() => pool.end());
