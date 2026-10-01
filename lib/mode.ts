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
