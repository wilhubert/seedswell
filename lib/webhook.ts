import { createHmac, timingSafeEqual } from "node:crypto";

// Constant-time comparison of the GitHub HMAC against the secret.
// The signature header looks like: sha256=<hex digest>.
export function verifyGitHubSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) {
    return false;
  }
  const expected = `sha256=${createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")}`;
  if (signatureHeader.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}
