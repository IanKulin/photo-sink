import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sessionDbPath = process.env.SESSION_DB_PATH || path.join(dbDir, "sessions.db");
const sessionDb = new Database(sessionDbPath);
sessionDb.pragma("journal_mode = WAL");

function closeSessionDb() {
  sessionDb.pragma("wal_checkpoint(TRUNCATE)");
  sessionDb.close();
}

export { closeSessionDb };
export default sessionDb;
