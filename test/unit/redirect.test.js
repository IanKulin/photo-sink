import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirect } from "../../src/redirect.js";

const FALLBACK = "/fallback";

test("allows valid paths", () => {
  assert.equal(safeRedirect("/gallery", FALLBACK), "/gallery");
  assert.equal(safeRedirect("/collections/my-album", FALLBACK), "/collections/my-album");
  assert.equal(safeRedirect("/image/abc123/thumb", FALLBACK), "/image/abc123/thumb");
  assert.equal(safeRedirect("/a/b/c_d-e", FALLBACK), "/a/b/c_d-e");
});

test("rejects double slashes", () => {
  assert.equal(safeRedirect("//evil.com", FALLBACK), FALLBACK);
});

test("rejects path traversal", () => {
  assert.equal(safeRedirect("/../etc/passwd", FALLBACK), FALLBACK);
});

test("rejects query strings", () => {
  assert.equal(safeRedirect("/path?foo=bar", FALLBACK), FALLBACK);
});

test("rejects external URLs", () => {
  assert.equal(safeRedirect("https://evil.com", FALLBACK), FALLBACK);
  assert.equal(safeRedirect("http://evil.com/path", FALLBACK), FALLBACK);
});

test("rejects paths with dots", () => {
  assert.equal(safeRedirect("/some.file", FALLBACK), FALLBACK);
});

test("falls back on empty string", () => {
  assert.equal(safeRedirect("", FALLBACK), FALLBACK);
});

test("falls back on null", () => {
  assert.equal(safeRedirect(null, FALLBACK), FALLBACK);
});

test("falls back on undefined", () => {
  assert.equal(safeRedirect(undefined, FALLBACK), FALLBACK);
});
