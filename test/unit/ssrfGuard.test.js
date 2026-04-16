import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertSafeUrl, isBlockedIp, SsrfBlockedError } from "../../src/ssrfGuard.js";

function resolver(v4 = [], v6 = []) {
  return {
    resolve4: async () => v4,
    resolve6: async () => v6,
  };
}

const publicResolver = resolver(["93.184.216.34"]);

describe("isBlockedIp", () => {
  it("blocks 127.0.0.1", () => assert.equal(isBlockedIp("127.0.0.1"), true));
  it("blocks 10.0.0.1", () => assert.equal(isBlockedIp("10.0.0.1"), true));
  it("blocks 192.168.1.1", () => assert.equal(isBlockedIp("192.168.1.1"), true));
  it("blocks 172.16.0.1", () => assert.equal(isBlockedIp("172.16.0.1"), true));
  it("blocks 172.31.255.255", () => assert.equal(isBlockedIp("172.31.255.255"), true));
  it("blocks 169.254.169.254", () => assert.equal(isBlockedIp("169.254.169.254"), true));
  it("blocks 0.0.0.0", () => assert.equal(isBlockedIp("0.0.0.0"), true));
  it("blocks ::1", () => assert.equal(isBlockedIp("::1"), true));
  it("blocks fe80::1", () => assert.equal(isBlockedIp("fe80::1"), true));
  it("blocks fc00::1", () => assert.equal(isBlockedIp("fc00::1"), true));
  it("allows 93.184.216.34", () => assert.equal(isBlockedIp("93.184.216.34"), false));
  it("allows 172.15.0.1 (just outside private range)", () => assert.equal(isBlockedIp("172.15.0.1"), false));
  it("allows 172.32.0.1 (just outside private range)", () => assert.equal(isBlockedIp("172.32.0.1"), false));
});

describe("assertSafeUrl", () => {
  it("resolves for a public hostname", async () => {
    await assert.doesNotReject(() => assertSafeUrl("http://example.com", publicResolver));
  });

  it("throws for not-a-url", async () => {
    await assert.rejects(() => assertSafeUrl("not-a-url", publicResolver), SsrfBlockedError);
  });

  it("throws for ftp:// scheme", async () => {
    await assert.rejects(() => assertSafeUrl("ftp://example.com", publicResolver), SsrfBlockedError);
  });

  it("throws for http://localhost (resolves to loopback)", async () => {
    await assert.rejects(
      () => assertSafeUrl("http://localhost/secret", resolver(["127.0.0.1"])),
      SsrfBlockedError
    );
  });

  it("throws for http://127.0.0.1 (bare IP)", async () => {
    await assert.rejects(() => assertSafeUrl("http://127.0.0.1/etc/passwd", publicResolver), SsrfBlockedError);
  });

  it("throws for http://0.0.0.0 (bare IP)", async () => {
    await assert.rejects(() => assertSafeUrl("http://0.0.0.0", publicResolver), SsrfBlockedError);
  });

  it("throws for http://169.254.169.254 (bare IP)", async () => {
    await assert.rejects(
      () => assertSafeUrl("http://169.254.169.254/latest/meta-data", publicResolver),
      SsrfBlockedError
    );
  });

  it("throws for http://192.168.1.1 (bare IP)", async () => {
    await assert.rejects(() => assertSafeUrl("http://192.168.1.1", publicResolver), SsrfBlockedError);
  });

  it("throws for http://10.0.0.1 (bare IP)", async () => {
    await assert.rejects(() => assertSafeUrl("http://10.0.0.1", publicResolver), SsrfBlockedError);
  });

  it("throws for http://[::1] (bare IPv6)", async () => {
    await assert.rejects(() => assertSafeUrl("http://[::1]", publicResolver), SsrfBlockedError);
  });

  it("throws for http://[fe80::1] (bare IPv6)", async () => {
    await assert.rejects(() => assertSafeUrl("http://[fe80::1]", publicResolver), SsrfBlockedError);
  });

  it("throws when hostname resolves to 0 addresses", async () => {
    await assert.rejects(
      () => assertSafeUrl("http://nonexistent.invalid", resolver([], [])),
      SsrfBlockedError
    );
  });

  it("throws when hostname resolves to a private IP", async () => {
    await assert.rejects(
      () => assertSafeUrl("http://internal.corp", resolver(["10.0.0.5"])),
      SsrfBlockedError
    );
  });
});
