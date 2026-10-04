const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function bootstrapAdmin() {
  try {
    const name = (process.env.INITIAL_ADMIN_NAME || '').trim();
    const email = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD || '';
    const provided = [name, email, password].some(Boolean);

    if (!provided) {
      console.log('Initial administrator bootstrap skipped; no bootstrap variables are set.');
      return;
    }

    if (!name || !email || !password) {
      throw new Error('Set INITIAL_ADMIN_NAME, INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD together.');
    }
    if (Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('INITIAL_ADMIN_PASSWORD must be 8 to 72 bytes long.');
    }

    const [users] = await db.query('SELECT COUNT(*) AS total FROM users');
    if (Number(users[0].total) > 0) {
      console.log('Initial administrator bootstrap skipped; the users table is not empty.');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO users (name, email, password, role, approval_status)
       VALUES (?, ?, ?, 'delegate', 'approved')`,
      [name, email, passwordHash]
    );
    console.log(`Initial administrator created for ${email}.`);
  } finally {
    await db.end();
  }
}

bootstrapAdmin().catch((error) => {
  console.error('Initial administrator bootstrap failed:', error.message);
  process.exitCode = 1;
});