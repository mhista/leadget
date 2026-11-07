import "server-only";
import { resolveMx } from "node:dns/promises";

/**
 * Is this email address real? A waterfall, cheapest first:
 *
 *   1. free checks: format, throwaway-inbox domains, the domain has mail servers
 *   2. MillionVerifier (MILLIONVERIFIER_API_KEY): asks the mail server whether
 *      the mailbox exists, and spots catch-all domains
 *   3. Hunter's verifier (HUNTER_API_KEY), if MillionVerifier isn't set
 *
 * (Resend doesn't verify addresses; it only blocks ones that already
 * bounced. A mailbox check needs an SMTP conversation on port 25, which
 * Vercel doesn't allow, hence the API.)
 *
 * Results:
 *   valid      the mailbox exists
 *   catch_all  the domain accepts any address, so we can't tell; usually fine
 *   risky      role inbox, full mailbox, or the check was inconclusive
 *   invalid    don't send: bounces hurt the sending domain
 *   unknown    nothing could be checked (no verifier set, server didn't answer)
 */

export type EmailStatus = "valid" | "catch_all" | "risky" | "invalid" | "unknown";
export type Verification = { email: string; status: EmailStatus; reason: string; provider: "free" | "millionverifier" | "hunter"; role: boolean; checked_at: string };

const SYNTAX = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const DISPOSABLE = /^(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|maildrop|dispostable|fakeinbox|throwawaymail|mintemail|mohmal|emailondeck)\./i;
export const ROLE = /^(info|hello|hi|contact|contactus|admin|office|enquiries|enquiry|inquiries|inquiry|sales|support|help|team|mail|reception|frontdesk|bookings?|reservations?|accounts?|billing|careers|jobs|hr|marketing|media|press|noreply|no-reply|webmaster|customercare|customerservice|service|general|clinic|law|legal)([._-]?\d*)?@/i;
const now = () => new Date().toISOString();
const MV = () => process.env.MILLIONVERIFIER_API_URL ?? "https://api.millionverifier.com/api/v3/";
const HUNTER = () => process.env.HUNTER_API_URL ?? "https://api.hunter.io/v2";

export const verifierName = () => (process.env.MILLIONVERIFIER_API_KEY ? "MillionVerifier" : process.env.HUNTER_API_KEY ? "Hunter" : null);

/** Free checks only: format, throwaway domains, mail servers. */
export async function quickCheck(address: string): Promise<Verification> {
  const email = address.trim().toLowerCase();
  const role = ROLE.test(email);
  const base = { email, provider: "free" as const, role, checked_at: now() };
  if (!SYNTAX.test(email) || email.length > 254) return { ...base, status: "invalid", reason: "Not a valid email address." };
  const domain = email.split("@")[1];
  if (DISPOSABLE.test(domain)) return { ...base, status: "invalid", reason: "A throwaway inbox service." };
  try {
    const mx = await resolveMx(domain);
    if (!mx.some((r) => r.exchange && r.exchange !== ".")) return { ...base, status: "invalid", reason: `${domain} accepts no email.` };
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA") return { ...base, status: "invalid", reason: `${domain} has no mail servers.` };
    return { ...base, status: "unknown", reason: "Couldn't look up the domain just now." };
  }
  return { ...base, status: role ? "risky" : "unknown", reason: role ? "A shared inbox (info@, hello@…): fine for the company, rarely the decision maker." : "The domain takes email; the mailbox itself isn't checked." };
}

/** Full check: free checks, then the paid verifier if one is set. */
export async function verifyEmail(address: string): Promise<Verification> {
  const q = await quickCheck(address);
  if (q.status === "invalid") return q;
  if (process.env.MILLIONVERIFIER_API_KEY) {
    try {
      const u = `${MV()}?api=${encodeURIComponent(process.env.MILLIONVERIFIER_API_KEY)}&email=${encodeURIComponent(q.email)}&timeout=20`;
      const r = await fetch(u, { signal: AbortSignal.timeout(30_000) });
      const j = (await r.json().catch(() => ({}))) as { result?: string; resultcode?: number; subresult?: string; role?: boolean; error?: string };
      if (j.error) return { ...q, status: "unknown", reason: `Verifier: ${j.error}`, provider: "millionverifier" };
      const res = (j.result ?? "").toLowerCase();
      const map: Record<string, [EmailStatus, string]> = {
        ok: ["valid", "The mailbox exists."],
        catch_all: ["catch_all", "The domain accepts every address, so the mailbox can't be confirmed."],
        unknown: ["risky", "The mail server didn't give a clear answer."],
        error: ["unknown", "The check failed; try again later."],
        disposable: ["invalid", "A throwaway inbox."],
        invalid: ["invalid", "The mailbox doesn't exist."],
      };
      const [status, reason] = map[res] ?? (j.resultcode === 1 ? map.ok : j.resultcode === 6 ? map.invalid : ["unknown", "Unclear result."]);
      return { ...q, status, reason: j.subresult && status !== "valid" ? `${reason} (${j.subresult})` : reason, provider: "millionverifier", role: q.role || !!j.role, checked_at: now() };
    } catch { return { ...q, status: "unknown", reason: "The verifier didn't answer." }; }
  }
  if (process.env.HUNTER_API_KEY) {
    try {
      const r = await fetch(`${HUNTER()}/email-verifier?email=${encodeURIComponent(q.email)}&api_key=${encodeURIComponent(process.env.HUNTER_API_KEY)}`, { signal: AbortSignal.timeout(30_000) });
      const j = (await r.json().catch(() => ({}))) as { data?: { status?: string }; errors?: { details?: string }[] };
      if (!r.ok) return { ...q, status: "unknown", reason: `Verifier: ${j.errors?.[0]?.details ?? r.status}`, provider: "hunter" };
      const s = j.data?.status ?? "unknown";
      const status: EmailStatus = s === "valid" ? "valid" : s === "invalid" || s === "disposable" ? "invalid" : s === "accept_all" ? "catch_all" : s === "webmail" ? "valid" : "risky";
      return { ...q, status, reason: { valid: "The mailbox exists.", invalid: "The mailbox doesn't exist.", disposable: "A throwaway inbox.", accept_all: "The domain accepts every address.", webmail: "A personal webmail address.", unknown: "The mail server didn't give a clear answer." }[s] ?? s, provider: "hunter", checked_at: now() };
    } catch { return { ...q, status: "unknown", reason: "The verifier didn't answer." }; }
  }
  return q;
}
