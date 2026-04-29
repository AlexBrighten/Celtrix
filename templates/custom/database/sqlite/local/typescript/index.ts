import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.SQLITE_PATH || path.join(__dirname, "..", "data.db");
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma("journal_mode = WAL");

export { db };
