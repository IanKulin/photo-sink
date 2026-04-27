import { test, expect } from "@playwright/test";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, "../fixtures");
const DB_PATH = process.env.DB_PATH;

async function uploadAndGetId(page) {
  await page.goto("/");
  await page
    .locator('input[type="file"][name="image"]')
    .setInputFiles(path.join(FIXTURES, "red.jpg"));
  await page.locator('form[action="/upload/file"] button[type="submit"]').click();
  await page.waitForURL("/?success=1");

  const db = new Database(DB_PATH, { readonly: true });
  const row = db.prepare("SELECT id FROM images ORDER BY id DESC LIMIT 1").get();
  db.close();
  return String(row.id);
}

test.describe("Full-image caching headers", () => {
  test("GET /image/:id.:ext includes Cache-Control and ETag headers", async ({ page, request }) => {
    const id = await uploadAndGetId(page);
    const response = await request.get(`/image/${id}.jpg`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("private, max-age=3600");
    expect(response.headers()["etag"]).toBe(`"${id}"`);
  });

  test("GET /image/:id.:ext with matching If-None-Match returns 304", async ({ page, request }) => {
    const id = await uploadAndGetId(page);
    const response = await request.get(`/image/${id}.jpg`, {
      headers: { "if-none-match": `"${id}"` },
    });
    expect(response.status()).toBe(304);
  });

  test("GET /image/:id.:ext with non-matching If-None-Match returns 200 with body", async ({
    page,
    request,
  }) => {
    const id = await uploadAndGetId(page);
    const response = await request.get(`/image/${id}.jpg`, {
      headers: { "if-none-match": '"999999"' },
    });
    expect(response.status()).toBe(200);
    const body = await response.body();
    expect(body.length).toBeGreaterThan(0);
  });

  test("GET /image/:id/download does not set Cache-Control header", async ({ page, request }) => {
    const id = await uploadAndGetId(page);
    const response = await request.get(`/image/${id}/download`);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBeUndefined();
  });
});
