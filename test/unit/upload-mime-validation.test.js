import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";

// Minimal valid JPEG: SOI marker + JFIF APP0 marker start
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
// PNG signature (8 bytes) + IHDR chunk length (4 bytes) + "IHDR" (4 bytes)
const PNG_MAGIC = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // PNG signature
  0x00,
  0x00,
  0x00,
  0x0d, // IHDR length
  0x49,
  0x48,
  0x44,
  0x52, // "IHDR"
]);
// PDF magic bytes
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
// Plain text
const TEXT_BUFFER = Buffer.from("hello world this is not an image");

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];

describe("magic byte detection (file-type)", () => {
  test("JPEG buffer is detected as image/jpeg", async () => {
    const result = await fileTypeFromBuffer(JPEG_MAGIC);
    assert.ok(result, "should detect a type");
    assert.equal(result.mime, "image/jpeg");
  });

  test("PNG buffer is detected as image/png", async () => {
    const result = await fileTypeFromBuffer(PNG_MAGIC);
    assert.ok(result, "should detect a type");
    assert.equal(result.mime, "image/png");
  });

  test("PDF buffer is not in allowed MIME types", async () => {
    const result = await fileTypeFromBuffer(PDF_MAGIC);
    const mime = result?.mime ?? null;
    assert.equal(ALLOWED_MIME_TYPES.includes(mime), false, "PDF should not be allowed");
  });

  test("empty buffer returns undefined (no magic bytes detectable)", async () => {
    const result = await fileTypeFromBuffer(Buffer.alloc(0));
    assert.equal(result, undefined);
  });

  test("plain text buffer returns undefined (no magic bytes detectable)", async () => {
    const result = await fileTypeFromBuffer(TEXT_BUFFER);
    assert.equal(result, undefined);
  });
});

describe("validateImageBuffer logic", () => {
  // Replicate the validateImageBuffer function logic for direct unit testing
  async function validateImageBuffer(buffer, _declaredMime) {
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME_TYPES.includes(detected.mime)) {
      throw Object.assign(new Error("File content does not match an allowed image type"), {
        code: "INVALID_MAGIC_BYTES",
      });
    }
    return detected.mime;
  }

  test("valid JPEG buffer with image/jpeg declared passes and returns image/jpeg", async () => {
    const jpegBuf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    const result = await validateImageBuffer(jpegBuf, "image/jpeg");
    assert.equal(result, "image/jpeg");
  });

  test("valid PNG buffer with image/png declared passes and returns image/png", async () => {
    const pngBuf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .png()
      .toBuffer();

    const result = await validateImageBuffer(pngBuf, "image/png");
    assert.equal(result, "image/png");
  });

  test("valid JPEG buffer with image/png declared passes and returns detected image/jpeg", async () => {
    const jpegBuf = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 255, b: 255 } },
    })
      .jpeg()
      .toBuffer();

    // declared type is wrong, but detected type should win
    const result = await validateImageBuffer(jpegBuf, "image/png");
    assert.equal(result, "image/jpeg");
  });

  test("non-image bytes (PDF) with image/jpeg declared throws INVALID_MAGIC_BYTES", async () => {
    await assert.rejects(
      () => validateImageBuffer(Buffer.concat([PDF_MAGIC, Buffer.alloc(100)]), "image/jpeg"),
      (err) => {
        assert.equal(err.code, "INVALID_MAGIC_BYTES");
        return true;
      }
    );
  });

  test("empty buffer throws INVALID_MAGIC_BYTES", async () => {
    await assert.rejects(
      () => validateImageBuffer(Buffer.alloc(0), "image/jpeg"),
      (err) => {
        assert.equal(err.code, "INVALID_MAGIC_BYTES");
        return true;
      }
    );
  });

  test("plain text buffer throws INVALID_MAGIC_BYTES", async () => {
    await assert.rejects(
      () => validateImageBuffer(TEXT_BUFFER, "image/jpeg"),
      (err) => {
        assert.equal(err.code, "INVALID_MAGIC_BYTES");
        return true;
      }
    );
  });
});
