const fs = require('fs/promises');
const path = require('path');
const db = require('../config/db');

async function setupDatabase() {
  const schemaPath = path.join(__dirname, '../models/schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf8');
  const statements = schema.split(';').map((statement) => statement.trim()).filter(Boolean);

  try {
    for (const statement of statements) {
      await db.query(statement);
    }
    console.log('Database schema is ready.');

  } finally {
    await db.end();
  }
}

setupDatabase().catch((error) => {
  console.error('Database schema setup failed:', error.message);
  process.exitCode = 1;
});
