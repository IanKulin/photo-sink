import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use a separate in-memory DB for unit tests so we don't touch the real file
describe("database module", () => {
  let db;

  before(() => {
    // Open a fresh in-memory database with the same schema
    db = new Database(":memory:");
    db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        mime_type        TEXT    NOT NULL,
        created_at       DATETIME NOT NULL DEFAULT (datetime('now')),
        iv_image         BLOB    NOT NULL,
        image_data       BLOB    NOT NULL,
        iv_thumb         BLOB    NOT NULL,
        thumb_data       BLOB    NOT NULL,
        auth_tag_image   BLOB    NOT NULL,
        auth_tag_thumb   BLOB    NOT NULL,
        iv_url           BLOB,
        url_data         BLOB,
        auth_tag_url     BLOB,
        iv_comment       BLOB,
        comment_data     BLOB,
        auth_tag_comment BLOB
      )
    `);
  });

  after(() => {
    db.close();
  });

  test("images table has correct columns", () => {
    const cols = db.pragma("table_info(images)").map((c) => c.name);
    const expected = [
      "id",
      "mime_type",
      "created_at",
      "iv_image",
      "image_data",
      "iv_thumb",
      "thumb_data",
      "auth_tag_image",
      "auth_tag_thumb",
      "iv_url",
      "url_data",
      "auth_tag_url",
      "iv_comment",
      "comment_data",
      "auth_tag_comment",
    ];
    assert.deepEqual(cols, expected);
  });

  test("insert and retrieve a row", () => {
    const stmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (@mime_type, @iv_image, @image_data, @iv_thumb, @thumb_data, @auth_tag_image, @auth_tag_thumb, @iv_url, @url_data, @auth_tag_url, @iv_comment, @comment_data, @auth_tag_comment)
    `);

    const row = {
      mime_type: "image/jpeg",
      iv_image: Buffer.alloc(12, 1),
      image_data: Buffer.from("fake-image"),
      iv_thumb: Buffer.alloc(12, 2),
      thumb_data: Buffer.from("fake-thumb"),
      auth_tag_image: Buffer.alloc(16, 3),
      auth_tag_thumb: Buffer.alloc(16, 4),
      iv_url: null,
      url_data: null,
      auth_tag_url: null,
      iv_comment: null,
      comment_data: null,
      auth_tag_comment: null,
    };

    const info = stmt.run(row);
    assert.equal(info.changes, 1);
    assert.ok(info.lastInsertRowid > 0);

    const saved = db.prepare("SELECT * FROM images WHERE id = ?").get(info.lastInsertRowid);
    assert.equal(saved.mime_type, "image/jpeg");
    assert.deepEqual(Buffer.from(saved.iv_image), row.iv_image);
    assert.deepEqual(Buffer.from(saved.image_data), row.image_data);
    assert.deepEqual(Buffer.from(saved.auth_tag_image), row.auth_tag_image);
  });

  test("id is auto-incremented", () => {
    const count = db.prepare("SELECT COUNT(*) as n FROM images").get();
    const before = count.n;

    const stmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const b = Buffer.alloc(1);
    stmt.run("image/png", b, b, b, b, b, b, null, null, null, null, null, null);
    stmt.run("image/png", b, b, b, b, b, b, null, null, null, null, null, null);

    const rows = db.prepare("SELECT id FROM images ORDER BY id ASC").all();
    const ids = rows.map((r) => r.id);
    // IDs should be strictly increasing
    for (let i = 1; i < ids.length; i++) {
      assert.ok(ids[i] > ids[i - 1]);
    }
    assert.equal(db.prepare("SELECT COUNT(*) as n FROM images").get().n, before + 2);
  });

  test("delete removes a row", () => {
    const stmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const b = Buffer.alloc(1);
    const { lastInsertRowid } = stmt.run(
      "image/gif",
      b,
      b,
      b,
      b,
      b,
      b,
      null,
      null,
      null,
      null,
      null,
      null
    );

    db.prepare("DELETE FROM images WHERE id = ?").run(lastInsertRowid);
    const row = db.prepare("SELECT * FROM images WHERE id = ?").get(lastInsertRowid);
    assert.equal(row, undefined);
  });

  test("insert with url stores all url blob columns", () => {
    const insertStmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (@mime_type, @iv_image, @image_data, @iv_thumb, @thumb_data, @auth_tag_image, @auth_tag_thumb, @iv_url, @url_data, @auth_tag_url, @iv_comment, @comment_data, @auth_tag_comment)
    `);
    const b = Buffer.alloc(1);
    const ivUrl = Buffer.alloc(12, 5);
    const urlData = Buffer.from("fake-url-ciphertext");
    const authTagUrl = Buffer.alloc(16, 6);
    const info = insertStmt.run({
      mime_type: "image/jpeg",
      iv_image: b,
      image_data: b,
      iv_thumb: b,
      thumb_data: b,
      auth_tag_image: b,
      auth_tag_thumb: b,
      iv_url: ivUrl,
      url_data: urlData,
      auth_tag_url: authTagUrl,
      iv_comment: null,
      comment_data: null,
      auth_tag_comment: null,
    });
    const saved = db.prepare("SELECT * FROM images WHERE id = ?").get(info.lastInsertRowid);
    assert.deepEqual(Buffer.from(saved.iv_url), ivUrl);
    assert.deepEqual(Buffer.from(saved.url_data), urlData);
    assert.deepEqual(Buffer.from(saved.auth_tag_url), authTagUrl);
    assert.equal(saved.iv_comment, null);
    assert.equal(saved.comment_data, null);
    assert.equal(saved.auth_tag_comment, null);
  });

  test("insert without url has null url columns", () => {
    const insertStmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (@mime_type, @iv_image, @image_data, @iv_thumb, @thumb_data, @auth_tag_image, @auth_tag_thumb, @iv_url, @url_data, @auth_tag_url, @iv_comment, @comment_data, @auth_tag_comment)
    `);
    const b = Buffer.alloc(1);
    const info = insertStmt.run({
      mime_type: "image/jpeg",
      iv_image: b,
      image_data: b,
      iv_thumb: b,
      thumb_data: b,
      auth_tag_image: b,
      auth_tag_thumb: b,
      iv_url: null,
      url_data: null,
      auth_tag_url: null,
      iv_comment: null,
      comment_data: null,
      auth_tag_comment: null,
    });
    const saved = db.prepare("SELECT * FROM images WHERE id = ?").get(info.lastInsertRowid);
    assert.equal(saved.iv_url, null);
    assert.equal(saved.url_data, null);
    assert.equal(saved.auth_tag_url, null);
  });

  test("update comment columns on existing row", () => {
    const insertStmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (@mime_type, @iv_image, @image_data, @iv_thumb, @thumb_data, @auth_tag_image, @auth_tag_thumb, @iv_url, @url_data, @auth_tag_url, @iv_comment, @comment_data, @auth_tag_comment)
    `);
    const b = Buffer.alloc(1);
    const info = insertStmt.run({
      mime_type: "image/jpeg",
      iv_image: b,
      image_data: b,
      iv_thumb: b,
      thumb_data: b,
      auth_tag_image: b,
      auth_tag_thumb: b,
      iv_url: null,
      url_data: null,
      auth_tag_url: null,
      iv_comment: null,
      comment_data: null,
      auth_tag_comment: null,
    });
    const id = info.lastInsertRowid;

    const ivComment = Buffer.alloc(12, 7);
    const commentData = Buffer.from("fake-comment-ciphertext");
    const authTagComment = Buffer.alloc(16, 8);
    db.prepare(
      `
      UPDATE images SET iv_comment = @iv_comment, comment_data = @comment_data, auth_tag_comment = @auth_tag_comment WHERE id = @id
    `
    ).run({
      id,
      iv_comment: ivComment,
      comment_data: commentData,
      auth_tag_comment: authTagComment,
    });

    const saved = db.prepare("SELECT * FROM images WHERE id = ?").get(id);
    assert.deepEqual(Buffer.from(saved.iv_comment), ivComment);
    assert.deepEqual(Buffer.from(saved.comment_data), commentData);
    assert.deepEqual(Buffer.from(saved.auth_tag_comment), authTagComment);
  });

  test("clear comment by setting comment columns to null", () => {
    const insertStmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (@mime_type, @iv_image, @image_data, @iv_thumb, @thumb_data, @auth_tag_image, @auth_tag_thumb, @iv_url, @url_data, @auth_tag_url, @iv_comment, @comment_data, @auth_tag_comment)
    `);
    const b = Buffer.alloc(1);
    const info = insertStmt.run({
      mime_type: "image/jpeg",
      iv_image: b,
      image_data: b,
      iv_thumb: b,
      thumb_data: b,
      auth_tag_image: b,
      auth_tag_thumb: b,
      iv_url: null,
      url_data: null,
      auth_tag_url: null,
      iv_comment: Buffer.alloc(12, 9),
      comment_data: Buffer.from("some"),
      auth_tag_comment: Buffer.alloc(16, 10),
    });
    const id = info.lastInsertRowid;

    db.prepare(
      `
      UPDATE images SET iv_comment = @iv_comment, comment_data = @comment_data, auth_tag_comment = @auth_tag_comment WHERE id = @id
    `
    ).run({ id, iv_comment: null, comment_data: null, auth_tag_comment: null });

    const saved = db.prepare("SELECT * FROM images WHERE id = ?").get(id);
    assert.equal(saved.iv_comment, null);
    assert.equal(saved.comment_data, null);
    assert.equal(saved.auth_tag_comment, null);
  });

  test("fresh insert has null comment columns", () => {
    const insertStmt = db.prepare(`
      INSERT INTO images (mime_type, iv_image, image_data, iv_thumb, thumb_data, auth_tag_image, auth_tag_thumb, iv_url, url_data, auth_tag_url, iv_comment, comment_data, auth_tag_comment)
      VALUES (@mime_type, @iv_image, @image_data, @iv_thumb, @thumb_data, @auth_tag_image, @auth_tag_thumb, @iv_url, @url_data, @auth_tag_url, @iv_comment, @comment_data, @auth_tag_comment)
    `);
    const b = Buffer.alloc(1);
    const info = insertStmt.run({
      mime_type: "image/png",
      iv_image: b,
      image_data: b,
      iv_thumb: b,
      thumb_data: b,
      auth_tag_image: b,
      auth_tag_thumb: b,
      iv_url: null,
      url_data: null,
      auth_tag_url: null,
      iv_comment: null,
      comment_data: null,
      auth_tag_comment: null,
    });
    const saved = db.prepare("SELECT * FROM images WHERE id = ?").get(info.lastInsertRowid);
    assert.equal(saved.iv_comment, null);
    assert.equal(saved.comment_data, null);
    assert.equal(saved.auth_tag_comment, null);
  });

  test("db file is created on disk when module is loaded", async () => {
    const tmpPath = path.join(__dirname, "../../data/test-unit-tmp.db");
    process.env.ENCRYPTION_KEY = "a".repeat(64);
    process.env.DB_PATH = tmpPath;
    try {
      await import("../../src/db.js");
      assert.ok(fs.existsSync(tmpPath), "db file should exist after module load");
    } finally {
      delete process.env.DB_PATH;
      try {
        fs.unlinkSync(tmpPath);
      } catch {}
      try {
        fs.unlinkSync(tmpPath + "-wal");
      } catch {}
      try {
        fs.unlinkSync(tmpPath + "-shm");
      } catch {}
    }
  });
});
