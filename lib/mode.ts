/**
 * Two ways to run the same codebase.
 *
 *   personal (default) — one person, no accounts. Your own copy: data on your
 *                        computer (or your own Supabase), optional passcode.
 *   saas               — anyone can sign up. Each account gets a workspace,
 *                        monthly credits and a plan. Needs Supabase (auth +
 *                        data) and, for paid plans, Paystack.
 *
 * Set APP_MODE=saas on the deployment you sell; leave it unset on yours.
 */
export const SAAS = process.env.APP_MODE === "saas";
export const PERSONAL_WORKSPACE = "personal";

/**
 * Kymaa mode (AUTH_MODE=kymaa): Leadget runs inside Kymaa's own database and
 * signs people in with their Kymaa dashboard accounts (owners, editors and
 * sales). Data stays in the "personal" workspace; tables use LEADGET_TABLE_PREFIX.
 */
export const KYMAA = process.env.AUTH_MODE === "kymaa";
/** The Kymaa dashboard (for invoices and enquiries). Public so the sidebar can link to it. */
export const DASHBOARD_URL = (process.env.NEXT_PUBLIC_DASHBOARD_URL || "").replace(/\/$/, "");
