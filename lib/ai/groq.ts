import "server-only";

/**
 * The one place Leadget talks to Groq. Same approach as the AAC site: GPT-OSS
 * 20B by default (fast, on every plan), GROQ_MODEL to override without a code
 * change, and every failure turned into a sentence a person can act on.
 */

export const DEFAULT_MODEL = "openai/gpt-oss-20b";
/** Tried once when the main model fails for a reason other than the key or rate limits. */
const FALLBACK_MODEL = "llama-3.3-70b-versatile";
/** GPT-OSS thinks before it answers; that thinking counts against the token limit. */
const reasons = (m: string) => /gpt-oss|qwen3|deepseek-r1/i.test(m);
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export type Msg = { role: "system" | "user" | "assistant"; content: string };
export type GroqResult = { ok: true; text: string } | { ok: false; error: string };

export const groqConfigured = () => !!process.env.GROQ_API_KEY;
export const model = () => process.env.GROQ_MODEL || DEFAULT_MODEL;

/** The JSON object in a model answer, even when it is wrapped in a code fence or a sentence. */
export function jsonFrom(text: string) {
  const t = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  try { return JSON.parse(t); } catch { /* look for the object inside */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no JSON");
  return JSON.parse(t.slice(a, b + 1));
}

type Opts = { messages: Msg[]; json?: boolean; maxTokens?: number; temperature?: number; timeoutMs?: number };

/**
 * Ask Groq, and recover from the ways it commonly fails: a JSON-mode
 * rejection, an answer cut off by the token limit (GPT-OSS spends tokens
 * thinking first), or a model problem. Each gets one more try, the last on
 * a different model, before an error comes back.
 */
export async function groqChat(o: Opts): Promise<GroqResult> {
  // Pages give a server action 60 seconds; leave room to answer.
  const start = Date.now(), left = () => 55_000 - (Date.now() - start);
  const first = await ask({ ...o, use: model() });
  if (first.ok || !first.retry) return first.ok ? { ok: true, text: first.text } : { ok: false, error: first.error };
  if (left() < 12_000) return { ok: false, error: first.error };
  const again = await ask({ ...o, use: model(), timeoutMs: Math.min(o.timeoutMs ?? 20_000, left() - 10_000), json: first.retry === "json" ? false : o.json, maxTokens: first.retry === "length" ? 8000 : o.maxTokens, temperature: Math.min(o.temperature ?? 0.6, 0.4) });
  if (again.ok) return { ok: true, text: again.text };
  if (model() === FALLBACK_MODEL || !again.retry || left() < 12_000) return { ok: false, error: again.error };
  const last = await ask({ ...o, use: FALLBACK_MODEL, timeoutMs: left(), json: false, temperature: Math.min(o.temperature ?? 0.6, 0.4) });
  return last.ok ? { ok: true, text: last.text } : { ok: false, error: `${again.error} (also tried ${FALLBACK_MODEL}: ${last.error})` };
}

type Asked = { ok: true; text: string } | { ok: false; error: string; retry?: "json" | "length" | "model" };

async function ask({ messages, json = false, maxTokens = 1800, temperature = 0.6, timeoutMs = 20_000, use }: Opts & { use: string }): Promise<Asked> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, error: "No GROQ_API_KEY is set." };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: use,
        temperature,
        max_completion_tokens: reasons(use) ? Math.max(maxTokens, 4000) : maxTokens,
        ...(reasons(use) ? { reasoning_effort: "low", include_reasoning: false } : {}),
        ...(json ? { response_format: { type: "json_object" } } : {}),
        messages,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 401) return { ok: false, error: "The Groq key was refused. It may have been rotated or revoked." };
      if (res.status === 429) return { ok: false, error: "Too many requests to Groq just now. Try again in a minute." };
      if (res.status === 404 || /model.*(not found|does not exist|decommissioned)/i.test(body)) {
        return { ok: false, retry: "model", error: `The model "${use}" isn't available on this Groq key. Set GROQ_MODEL to one your plan allows.` };
      }
      // JSON mode rejects an answer that isn't strict JSON (often one cut off at the token limit). Ask again without it; the caller pulls the JSON out of the text.
      if (json && res.status === 400 && /json_validate_failed|Failed to validate JSON|max_tokens|length/i.test(body)) {
        return { ok: false, retry: "json", error: "Groq's answer wasn't valid JSON." };
      }
      return { ok: false, retry: res.status >= 500 || res.status === 400 ? "model" : undefined, error: `Groq returned ${res.status}. ${body.slice(0, 160)}` };
    }
    const data = await res.json();
    const choice = data?.choices?.[0];
    const text = choice?.message?.content;
    if (choice?.finish_reason === "length") return { ok: false, retry: "length", error: "Groq's answer was cut off before it finished." };
    if (typeof text !== "string" || !text.trim()) return { ok: false, retry: "length", error: "Groq returned an empty answer." };
    return { ok: true, text: text.trim() };
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return { ok: false, retry: timedOut ? "model" : undefined, error: timedOut ? "Groq took too long to answer." : "Could not reach Groq." };
  }
}
