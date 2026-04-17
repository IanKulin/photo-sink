import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  const dbPath = path.resolve(process.env.DB_PATH || path.join(__dirname, "../../data/test.db"));
  const sessionDbPath = path.resolve(
    process.env.SESSION_DB_PATH || path.join(__dirname, "../../data/test-sessions.db")
  );

  for (const filePath of [dbPath, sessionDbPath]) {
    for (const suffix of ["", "-wal", "-shm"]) {
      const f = filePath + suffix;
      if (fs.existsSync(f)) fs.rmSync(f);
    }
  }
}
