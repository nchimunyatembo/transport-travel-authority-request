require('dotenv').config();

const mysql = require('mysql2');

const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
const user = process.env.DB_USER || process.env.MYSQLUSER || 'root';
const password = process.env.DB_PASSWORD ?? process.env.MYSQLPASSWORD ?? '';
const database = process.env.DB_NAME || process.env.MYSQLDATABASE || 'pdho_requests';

if (process.env.NODE_ENV === 'production') {
  const missing = [];
  if (!(process.env.DB_HOST || process.env.MYSQLHOST)) missing.push('DB_HOST or MYSQLHOST');
  if (!(process.env.DB_USER || process.env.MYSQLUSER)) missing.push('DB_USER or MYSQLUSER');
  if (!(process.env.DB_PASSWORD || process.env.MYSQLPASSWORD)) missing.push('DB_PASSWORD or MYSQLPASSWORD');
  if (!(process.env.DB_NAME || process.env.MYSQLDATABASE)) missing.push('DB_NAME or MYSQLDATABASE');
  if (missing.length) throw new Error(`Missing production database variables: ${missing.join(', ')}`);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Database port must be an integer between 1 and 65535.');
}

const db = mysql.createPool({
  host,
  port,
  user,
  password,
  database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

module.exports = db.promise();