import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

const IDLE_HOURS = 1;

async function loadMiddleware(idleHours = IDLE_HOURS) {
  process.env.SESSION_IDLE_TIMEOUT_HOURS = String(idleHours);
  // Force re-import by busting module cache via query param
  const { default: requireAuth } = await import(
    `../../src/middleware/requireAuth.js?h=${idleHours}_${Date.now()}`
  );
  return requireAuth;
}

function makeReq({ authenticated = false, lastActivity = undefined, username = "admin" } = {}) {
  const session = { authenticated, username };
  if (lastActivity !== undefined) session.lastActivity = lastActivity;
  session.destroy = (cb) => cb();
  return { session };
}

function makeRes() {
  const res = { redirectedTo: null, locals: {} };
  res.redirect = (url) => {
    res.redirectedTo = url;
  };
  return res;
}

describe("requireAuth", () => {
  let requireAuth;

  before(async () => {
    requireAuth = await loadMiddleware(IDLE_HOURS);
  });

  after(() => {
    delete process.env.SESSION_IDLE_TIMEOUT_HOURS;
  });

  it("calls next when authenticated and lastActivity is recent", (_, done) => {
    const req = makeReq({ authenticated: true, lastActivity: Date.now() });
    const res = makeRes();
    requireAuth(req, res, () => {
      assert.equal(res.redirectedTo, null);
      assert.equal(res.locals?.user ?? req.session.username, "admin");
      done();
    });
  });

  it("redirects to /login when not authenticated", () => {
    const req = makeReq({ authenticated: false });
    const res = makeRes();
    requireAuth(req, res, () => assert.fail("next should not be called"));
    assert.equal(res.redirectedTo, "/login");
  });

  it("redirects to /login and destroys session when lastActivity is expired", () => {
    const expiredTime = Date.now() - IDLE_HOURS * 60 * 60 * 1000 - 1000;
    const req = makeReq({ authenticated: true, lastActivity: expiredTime });
    let destroyed = false;
    req.session.destroy = (cb) => {
      destroyed = true;
      cb();
    };
    const res = makeRes();
    requireAuth(req, res, () => assert.fail("next should not be called"));
    assert.equal(res.redirectedTo, "/login");
    assert.equal(destroyed, true);
  });

  it("redirects to /login when lastActivity is absent (legacy session)", () => {
    const req = makeReq({ authenticated: true });
    let destroyed = false;
    req.session.destroy = (cb) => {
      destroyed = true;
      cb();
    };
    const res = makeRes();
    requireAuth(req, res, () => assert.fail("next should not be called"));
    assert.equal(res.redirectedTo, "/login");
    assert.equal(destroyed, true);
  });

  it("respects a custom SESSION_IDLE_TIMEOUT_HOURS value", async () => {
    const shortIdleAuth = await loadMiddleware(0.001); // ~3.6 seconds
    const expiredTime = Date.now() - 5000;
    const req = makeReq({ authenticated: true, lastActivity: expiredTime });
    req.session.destroy = (cb) => cb();
    const res = makeRes();
    shortIdleAuth(req, res, () => assert.fail("next should not be called"));
    assert.equal(res.redirectedTo, "/login");
  });
});
