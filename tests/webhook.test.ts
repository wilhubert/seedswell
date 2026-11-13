import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyGitHubSignature } from "../lib/webhook.ts";

const SECRET = "test-secret";
const BODY = JSON.stringify({ zen: "Design for failure." });

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

test("accepts a correctly signed body", () => {
  assert.equal(verifyGitHubSignature(BODY, sign(BODY, SECRET), SECRET), true);
});

test("rejects a body signed over different bytes (tampering)", () => {
  const signature = sign(" tampered".concat(BODY), SECRET);
  assert.equal(verifyGitHubSignature(BODY, signature, SECRET), false);
});

test("accepts an arbitrary non-JSON raw body: signature is over bytes, not structure", () => {
  assert.equal(verifyGitHubSignature("not json at all", sign("not json at all", SECRET), SECRET), true);
});

test("rejects a signature computed with the wrong secret", () => {
  assert.equal(verifyGitHubSignature(BODY, sign(BODY, "evil-secret"), SECRET), false);
});

test("rejects a missing signature header", () => {
  assert.equal(verifyGitHubSignature(BODY, null, SECRET), false);
});

test("rejects malformed signature values without throwing", () => {
  assert.equal(verifyGitHubSignature(BODY, "sha256=not-hex", SECRET), false);
  assert.equal(verifyGitHubSignature(BODY, "", SECRET), false);
});
