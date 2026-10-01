import "server-only";

/**
 * The one place Leadget talks to Groq. Same approach as the AAC site: GPT-OSS
 * 20B by default (fast, on every plan), GROQ_MODEL to override without a code
 * change, and every failure turned into a sentence a person can act on.
 */

export const DEFAULT_MODEL = "openai/gpt-oss-20b";
const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export type Msg = { role: "system" | "user" | "assistant"; content: string };
export type GroqResult = { ok: true; text: string } | { ok: false; error: string };

export const groqConfigured = () => !!process.env.GROQ_API_KEY;
export const model = () => process.env.GROQ_MODEL || DEFAULT_MODEL;

export async function groqChat({
  messages, json = false, maxTokens = 1800, temperature = 0.6, timeoutMs = 40_000,
}: { messages: Msg[]; json?: boolean; maxTokens?: number; temperature?: number; timeoutMs?: number }): Promise<GroqResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, error: "No GROQ_API_KEY is set." };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model(),
        temperature,
        max_completion_tokens: maxTokens,
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
        return { ok: false, error: `The model "${model()}" isn't available on this Groq key. Set GROQ_MODEL to one your plan allows.` };
      }
      return { ok: false, error: `Groq returned ${res.status}. ${body.slice(0, 160)}` };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return { ok: false, error: "Groq returned an empty answer." };
    return { ok: true, text: text.trim() };
  } catch (err: any) {
    const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
    return { ok: false, error: timedOut ? "Groq took too long to answer." : "Could not reach Groq." };
  }
}
