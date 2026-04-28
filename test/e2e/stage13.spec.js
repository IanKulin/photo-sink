import { test, expect } from "@playwright/test";
import path from "path";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(__dirname, "../fixtures");
const DB_PATH = process.env.DB_PATH;

async function uploadImage(page, filename) {
  await page.goto("/");
  await page
    .locator('input[type="file"][name="image"]')
    .setInputFiles(path.join(FIXTURES, filename));
  await page.locator('form[action="/upload/file"] button[type="submit"]').click();
  await page.waitForURL("/?success=1");
}

async function getLastImageId() {
  const db = new Database(DB_PATH, { readonly: true });
  const row = db.prepare("SELECT id FROM images ORDER BY id DESC LIMIT 1").get();
  db.close();
  return row ? row.id : null;
}

async function createCollection(page, name) {
  await page.goto("/collections");
  await page.locator("#collections-add-btn").click();
  await page.locator('#create-modal input[name="name"]').fill(name);
  await page.locator('#create-modal button[type="submit"]').click();
  await page.waitForURL("/collections");
}

test.describe("Stage 13 — Single Image View: Context, Collections, Navigation", () => {
  test("/image/:id renders with All Images context and back link", async ({ page }) => {
    await uploadImage(page, "red.jpg");
    const imageId = await getLastImageId();

    await page.goto(`/image/${imageId}`);
    await expect(page.locator(".back-link")).toContainText("All Images");
    await expect(page.locator(".back-link")).toHaveAttribute("href", "/allimages");
  });

  test("/image/:id shows download and delete buttons", async ({ page }) => {
    await uploadImage(page, "red.jpg");
    const imageId = await getLastImageId();

    await page.goto(`/image/${imageId}`);
    await expect(page.locator(`a[href="/image/${imageId}/download"]`)).toBeVisible();
    await expect(page.locator("#open-delete-btn")).toBeVisible();
  });

  test("/image/:id shows prev/next navigation", async ({ page }) => {
    await uploadImage(page, "red.jpg");
    await uploadImage(page, "green.png");
    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT id FROM images ORDER BY id DESC LIMIT 2").all();
    db.close();
    const [secondId, firstId] = rows.map((r) => r.id);

    await page.goto(`/image/${firstId}`);
    await expect(page.locator(`a[href="/image/${secondId}"]`)).toBeVisible();
  });

  test("/collections/:slug/image/:id renders with collection context", async ({
    page,
    request,
  }) => {
    const tag = Date.now();
    await createCollection(page, `CtxCol-${tag}`);
    await uploadImage(page, "red.jpg");

    const imageId = await getLastImageId();
    const colsRes = await request.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `CtxCol-${tag}`);
    await request.post(`/api/image/${imageId}/collections/${col.id}/toggle`);

    await page.goto(`/collections/${col.slug}/image/${imageId}`);
    await expect(page.locator(".back-link")).toContainText(`CtxCol-${tag}`);
    await expect(page.locator(".back-link")).toHaveAttribute("href", `/collections/${col.slug}`);
  });

  test("collection context image view returns 404 for image not in collection", async ({
    page,
    request,
  }) => {
    const tag = Date.now();
    await createCollection(page, `NotIn-${tag}`);
    await uploadImage(page, "red.jpg");

    const imageId = await getLastImageId();
    const colsRes = await request.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `NotIn-${tag}`);

    const res = await page.goto(`/collections/${col.slug}/image/${imageId}`);
    expect(res.status()).toBe(404);
  });

  test("collection context image: prev/next scoped to collection only", async ({
    page,
    request,
  }) => {
    const tag = Date.now();
    await createCollection(page, `Scoped-${tag}`);
    await uploadImage(page, "red.jpg");
    await uploadImage(page, "green.png");
    await uploadImage(page, "blue.webp");

    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT id FROM images ORDER BY id DESC LIMIT 3").all();
    db.close();
    const [id3, _id2, id1] = rows.map((r) => r.id);

    const colsRes = await request.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `Scoped-${tag}`);

    // Add only first and third images to collection
    await request.post(`/api/image/${id1}/collections/${col.id}/toggle`);
    await request.post(`/api/image/${id3}/collections/${col.id}/toggle`);

    // From id1, next should be id3 (skipping id2 which is not in collection)
    await page.goto(`/collections/${col.slug}/image/${id1}`);
    await expect(page.locator(`a[href="/collections/${col.slug}/image/${id3}"]`)).toBeVisible();
    // Prev should be disabled for first image in collection
    await expect(page.locator(".image-shelf__nav-btn--disabled").first()).toBeVisible();
  });

  test("image detail shows Collections button", async ({ page, request }) => {
    const tag = Date.now();
    await createCollection(page, `Membership-${tag}`);
    await uploadImage(page, "red.jpg");

    const imageId = await getLastImageId();
    const colsRes = await request.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `Membership-${tag}`);
    await request.post(`/api/image/${imageId}/collections/${col.id}/toggle`);

    await page.goto(`/image/${imageId}`);
    await expect(page.locator("#add-to-collection-btn")).toBeVisible();
    await expect(page.locator("#add-to-collection-btn")).toContainText("Collections...");
  });

  test("Collections button opens add-to-collection modal", async ({ page, request }) => {
    const tag = Date.now();
    await createCollection(page, `RemoveImg-${tag}`);
    await uploadImage(page, "red.jpg");

    const imageId = await getLastImageId();
    const colsRes = await request.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `RemoveImg-${tag}`);
    await request.post(`/api/image/${imageId}/collections/${col.id}/toggle`);

    await page.goto(`/image/${imageId}`);
    await page.locator("#add-to-collection-btn").click();
    await expect(page.locator("#atc-modal")).toBeVisible();
  });

  test("delete from collection image view redirects to collection", async ({
    page,
    request: req,
  }) => {
    const tag = Date.now();
    await createCollection(page, `DelCtx-${tag}`);
    await uploadImage(page, "red.jpg");

    const imageId = await getLastImageId();
    const colsRes = await req.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `DelCtx-${tag}`);
    await req.post(`/api/image/${imageId}/collections/${col.id}/toggle`);

    await page.goto(`/collections/${col.slug}/image/${imageId}`);
    await page.locator("#open-delete-btn").click();
    await page
      .locator('form[action="/image/' + imageId + '/delete"] button[type="submit"]')
      .click();
    await expect(page).toHaveURL(`/collections/${col.slug}`);
  });

  test("keyboard ArrowRight navigates to next image", async ({ page }) => {
    await uploadImage(page, "red.jpg");
    await uploadImage(page, "green.png");

    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT id FROM images ORDER BY id DESC LIMIT 2").all();
    db.close();
    const [secondId, firstId] = rows.map((r) => r.id);

    await page.goto(`/image/${firstId}`);
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(`/image/${secondId}`);
  });

  test("keyboard ArrowLeft navigates to prev image", async ({ page }) => {
    await uploadImage(page, "red.jpg");
    await uploadImage(page, "green.png");

    const db = new Database(DB_PATH, { readonly: true });
    const rows = db.prepare("SELECT id FROM images ORDER BY id DESC LIMIT 2").all();
    db.close();
    const [secondId, firstId] = rows.map((r) => r.id);

    await page.goto(`/image/${secondId}`);
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(`/image/${firstId}`);
  });

  test("Add to collection button opens modal from image detail", async ({ page }) => {
    const tag = Date.now();
    await createCollection(page, `ImgModal-${tag}`);
    await uploadImage(page, "red.jpg");
    const imageId = await getLastImageId();

    await page.goto(`/image/${imageId}`);
    await page.locator("#add-to-collection-btn").click();
    await expect(page.locator("#atc-modal")).toBeVisible();
    await expect(page.locator("#atc-list")).toContainText(`ImgModal-${tag}`);
  });

  test("non-existent collection slug returns 404 for image view", async ({ page }) => {
    await uploadImage(page, "red.jpg");
    const imageId = await getLastImageId();
    const res = await page.goto(`/collections/nonexistent-slug-xyz/image/${imageId}`);
    expect(res.status()).toBe(404);
  });

  test("Collections nav is active on collection context image view", async ({ page, request }) => {
    const tag = Date.now();
    await createCollection(page, `NavActive-${tag}`);
    await uploadImage(page, "red.jpg");

    const imageId = await getLastImageId();
    const colsRes = await request.get("/api/collections");
    const col = (await colsRes.json()).find((c) => c.name === `NavActive-${tag}`);
    await request.post(`/api/image/${imageId}/collections/${col.id}/toggle`);

    await page.goto(`/collections/${col.slug}/image/${imageId}`);
    await expect(page.locator('a[href="/collections"].nav-link--active')).toBeVisible();
  });
});
