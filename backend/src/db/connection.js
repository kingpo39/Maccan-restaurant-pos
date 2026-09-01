// MACCAN RMS - Database Connection (sql.js - pure JS SQLite)

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const SCHEMA = require('./schema');
const SqlJsAdapter = require('./sqlite-adapter');

const DB_PATH = process.env.DB_PATH || './data/maccan.db';

let rawDb = null;
let wrappedDb = null;
let autoSaveInterval = null;

// Ensure data directory exists
const dataDir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function initDb() {
  if (rawDb) return wrappedDb;

  const SQL = await initSqlJs();
  const resolvedPath = path.resolve(DB_PATH);

  if (fs.existsSync(resolvedPath)) {
    const fileBuffer = fs.readFileSync(resolvedPath);
    rawDb = new SQL.Database(fileBuffer);
    console.log('📦 Loaded existing database');
  } else {
    rawDb = new SQL.Database();
    console.log('📦 Created new database');
  }

  rawDb.run('PRAGMA foreign_keys = ON');

  console.log('📦 Running database migrations...');
  rawDb.exec(SCHEMA);
  console.log('✅ Database ready');

  wrappedDb = new SqlJsAdapter(rawDb);

  // Auto-save periodically (every 30 seconds) — only if not in seed mode
  if (!process.env.NO_AUTO_SAVE) {
    autoSaveInterval = setInterval(() => {
      if (rawDb) saveDb();
    }, 30000);
  }

  return wrappedDb;
}

function getDb() {
  if (!wrappedDb) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return wrappedDb;
}

function saveDb() {
  if (rawDb) {
    const data = rawDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(path.resolve(DB_PATH), buffer);
    console.log('💾 Database saved');
  }
}

function closeDb() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
  }
  if (rawDb) {
    saveDb();
    rawDb.close();
    rawDb = null;
    wrappedDb = null;
    console.log('🔒 Database closed');
  }
}

module.exports = { initDb, getDb, closeDb, saveDb };
