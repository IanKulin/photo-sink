const { test, describe } = require("node:test");
const assert = require("node:assert/strict");

// Set up encryption key before requiring modules that depend on it
process.env.ENCRYPTION_KEY = "a".repeat(64);

// Point db at an in-memory database for isolation
process.env.DB_PATH = ":memory:";

const { saveImage, getImage, getThumb } = require("../../src/imageService");
const { stmts } = require("../../src/db");

describe("imageService", () => {
  test("saveImage encrypts data before storing", () => {
    const mime = "image/jpeg";
    const imageBuffer = Buffer.from("raw-image-data");
    const thumbBuffer = Buffer.from("raw-thumb-data");

    const info = saveImage(mime, imageBuffer, thumbBuffer);
    assert.ok(info.lastInsertRowid > 0);

    const row = stmts.getById.get(info.lastInsertRowid);
    assert.ok(
      !Buffer.from(row.image_data).equals(imageBuffer),
      "stored image_data should differ from plaintext"
    );
    assert.ok(
      !Buffer.from(row.thumb_data).equals(thumbBuffer),
      "stored thumb_data should differ from plaintext"
    );
  });

  test("getImage round-trip returns original buffer", () => {
    const mime = "image/png";
    const imageBuffer = Buffer.from("round-trip-image");
    const thumbBuffer = Buffer.from("round-trip-thumb");

    const info = saveImage(mime, imageBuffer, thumbBuffer);
    const result = getImage(info.lastInsertRowid);

    assert.ok(result !== null);
    assert.equal(result.mime_type, mime);
    assert.deepEqual(result.imageBuffer, imageBuffer);
  });

  test("getThumb round-trip returns original buffer", () => {
    const mime = "image/png";
    const imageBuffer = Buffer.from("thumb-round-trip-image");
    const thumbBuffer = Buffer.from("thumb-round-trip-thumb");

    const info = saveImage(mime, imageBuffer, thumbBuffer);
    const result = getThumb(info.lastInsertRowid);

    assert.ok(result !== null);
    assert.equal(result.mime_type, mime);
    assert.deepEqual(result.thumbBuffer, thumbBuffer);
  });

  test("getImage returns null for unknown id", () => {
    const result = getImage(999999);
    assert.equal(result, null);
  });

  test("getThumb returns null for unknown id", () => {
    const result = getThumb(999999);
    assert.equal(result, null);
  });
});
