import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { escapeForDockerCompose } from "../../scripts/docker-hash-password.js";

describe("escapeForDockerCompose", () => {
  test("replaces all $ with $$ in a bcrypt hash", () => {
    const hash = "$2b$10$IYEWZWuGLOfIwrx.sXdEiOAdZljCkVN1BikLkC7XqjyvXseBvwt/S";
    const result = escapeForDockerCompose(hash);
    assert.equal(result, "$$2b$$10$$IYEWZWuGLOfIwrx.sXdEiOAdZljCkVN1BikLkC7XqjyvXseBvwt/S");
  });

  test("output contains no bare $ signs", () => {
    const hash = "$2b$10$abcdefghijklmnopqrstuuVGZqGMCFsP5AIbqCUAfCuGKRtN5YKVi";
    const result = escapeForDockerCompose(hash);
    assert.doesNotMatch(result, /(?<!\$)\$(?!\$)/);
  });

  test("every $$ in output was a $ in input", () => {
    const hash = "$2b$10$abcdefghijklmnopqrstuuVGZqGMCFsP5AIbqCUAfCuGKRtN5YKVi";
    const result = escapeForDockerCompose(hash);
    assert.equal(result.split("$$").length - 1, hash.split("$").length - 1);
  });
});
