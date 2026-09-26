// Fuel & Lift — the only place that talks to Claude.
// The web page sends {task, prompt, images?, documents?}; this function checks
// the person is signed in (and invited, if invites are on), applies a daily
// cap, calls Claude with the model chosen for that task, and returns parsed JSON.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   required
//   DAILY_CAP           optional, Claude actions per person per day (default 30)
//   MODEL_SMART         optional, default claude-sonnet-5
//   MODEL_QUICK         optional, default claude-haiku-4-5
//   ALLOWED_ORIGIN      optional, e.g. https://fuel-lift.vercel.app (default *)
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const DAILY_CAP = Number(Deno.env.get("DAILY_CAP") ?? 30);
const MODEL_SMART = Deno.env.get("MODEL_SMART") ?? "claude-sonnet-5";
const MODEL_QUICK = Deno.env.get("MODEL_QUICK") ?? "claude-haiku-4-5";
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

// Which model and how much thinking each job gets. Chosen here, not by the
// page, so nobody can switch every request to the most expensive setting.
type Tier = { model: string; effort?: "low" | "medium" | "high"; maxTokens: number };
const TASKS: Record<string, Tier> = {
  log:        { model: MODEL_SMART, effort: "medium", maxTokens: 16000 }, // food / gym / health entries, photos
  coach:      { model: MODEL_SMART, effort: "medium", maxTokens: 16000 }, // sport session calories + recovery
  plan:       { model: MODEL_SMART, effort: "medium", maxTokens: 16000 }, // next session
  review:     { model: MODEL_SMART, effort: "medium", maxTokens: 16000 }, // weekly review
  report:     { model: MODEL_SMART, effort: "high",   maxTokens: 16000 }, // blood tests
  ideas:      { model: MODEL_QUICK, maxTokens: 4000 },                    // meal ideas
  questions:  { model: MODEL_QUICK, maxTokens: 4000 },                    // sport profile questions
};

const SYSTEM = "You are the analysis engine inside a personal fitness and nutrition tracker. " +
  "Reply with only the JSON the user message asks for: no prose before or after it, no code fences.";

const MAX_PROMPT = 60_000, MAX_IMAGES = 5, MAX_IMAGE_B64 = 7_000_000, MAX_PDF_B64 = 20_000_000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (status: number, code: string, extra: Record<string, unknown> = {}) => reply(status, { ok: false, code, ...extra });

// Pull the JSON value out of the model's text, tolerating stray fences or prose.
function extractJson(text: string): unknown {
  const t = text.replace(/```(?:json)?/gi, "").trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const starts = [t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) throw new Error("no json");
  const start = Math.min(...starts);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  return JSON.parse(t.slice(start, end + 1));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail(405, "method_not_allowed");

  // Who is calling?
  const auth = req.headers.get("Authorization") ?? "";
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return fail(401, "session_expired");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let body: {
    task?: string; prompt?: string; day?: string;
    images?: { media_type: string; data: string }[];
    documents?: { media_type: string; data: string }[];
  };
  try { body = await req.json(); } catch { return fail(400, "bad_request"); }

  // The person's local date, so the cap resets at their midnight, not UTC's.
  const day = /^\d{4}-\d{2}-\d{2}$/.test(body.day ?? "") ? body.day! : new Date().toISOString().slice(0, 10);

  if (body.task === "usage") {
    const { data } = await admin.from("ai_usage").select("count").eq("user_id", user.id).eq("day", day).maybeSingle();
    return reply(200, { ok: true, usage: { count: data?.count ?? 0, cap: DAILY_CAP } });
  }

  const tier = TASKS[body.task ?? ""];
  if (!tier) return fail(400, "bad_task");
  const prompt = String(body.prompt ?? "");
  if (!prompt || prompt.length > MAX_PROMPT) return fail(413, "prompt_too_large");
  const images = (body.images ?? []).slice(0, MAX_IMAGES);
  const documents = (body.documents ?? []).slice(0, 1);
  if (images.some((i) => !IMAGE_TYPES.includes(i.media_type) || i.data.length > MAX_IMAGE_B64)) return fail(400, "image_rejected");
  if (documents.some((d) => d.media_type !== "application/pdf" || d.data.length > MAX_PDF_B64)) return fail(400, "image_rejected");

  // Invite-only: if the invites table has anyone in it, only they can use Claude.
  const { count: invited } = await admin.from("invites").select("email", { count: "exact", head: true });
  if (invited) {
    const { data: me } = await admin.from("invites").select("email").eq("email", (user.email ?? "").toLowerCase()).maybeSingle();
    if (!me) return fail(403, "not_invited");
  }

  // Daily cap.
  const { data: used, error: capErr } = await admin.rpc("bump_ai_usage", { p_user: user.id, p_day: day });
  if (capErr) return fail(500, "server_error");
  if (used > DAILY_CAP) {
    await admin.rpc("refund_ai_usage", { p_user: user.id, p_day: day });
    return fail(429, "daily_cap", { usage: { count: DAILY_CAP, cap: DAILY_CAP } });
  }
  const usage = { count: used as number, cap: DAILY_CAP };
  const refund = () => admin.rpc("refund_ai_usage", { p_user: user.id, p_day: day });

  const content: Anthropic.ContentBlockParam[] = [
    ...documents.map((d) => ({ type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: d.data } })),
    ...images.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.media_type as "image/jpeg", data: i.data } })),
    { type: "text", text: prompt },
  ];

  try {
    const stream = anthropic.messages.stream({
      model: tier.model,
      max_tokens: tier.maxTokens,
      system: SYSTEM,
      ...(tier.effort ? { output_config: { effort: tier.effort } } : {}),
      messages: [{ role: "user", content }],
    });
    const msg = await stream.finalMessage();

    if (msg.stop_reason === "refusal") { await refund(); return fail(422, "refused", { usage }); }
    const text = msg.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("");
    if (!text.trim()) return fail(502, "empty_completion", { usage });
    let json: unknown;
    try { json = extractJson(text); } catch { return fail(502, "invalid_json", { usage }); }
    return reply(200, { ok: true, json, usage, model: msg.model });
  } catch (e) {
    await refund();
    if (e instanceof Anthropic.RateLimitError) return fail(429, "rate_limited", { usage });
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return fail(500, "server_config");
    if (e instanceof Anthropic.BadRequestError) return fail(400, images.length || documents.length ? "image_rejected" : "bad_request");
    if (e instanceof Anthropic.APIError) return fail(503, "unavailable");
    return fail(503, "unavailable");
  }
});
