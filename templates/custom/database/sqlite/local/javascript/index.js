const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, "..", "data.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

module.exports = { db };
