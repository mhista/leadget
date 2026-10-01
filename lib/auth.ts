/**
 * The passcode lock. One person, one secret, no accounts.
 *
 * The cookie holds a SHA-256 of the passcode rather than the passcode, so
 * reading the cookie doesn't reveal it. Uses Web Crypto so it runs in the
 * middleware's edge runtime as well as in Node.
 */

export const SESSION_COOKIE = "leadget_session";

export async function sessionToken(passcode: string) {
  const bytes = new TextEncoder().encode(`leadget:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
