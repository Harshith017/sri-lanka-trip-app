/* Project W — push notification sender (Cloudflare Worker, free plan).

   Sends standard Web Push (works on Android, desktop, and iPhone when the app
   is added to the Home Screen) without Firebase Cloud Functions, so the
   Firebase project can stay on the free Spark plan.

   Needs one KV namespace bound as PUSH_KV. On first use it generates its own
   VAPID key pair and keeps it in KV; the app fetches the public half from
   GET /vapid.

   Callers send their Firebase ID token. The worker never trusts it on its own:
   every action first reads a Firestore doc *with that token*, so Google checks
   the token and your Firestore rules decide who is a member.

   Endpoints
     GET  /vapid        → { key }                      public VAPID key
     POST /subscribe    { sub }                        save this device (members)
     POST /unsubscribe  { endpoint }                   forget this device
     POST /notify       { messages:[{to,title,body}], tag, tab }   (members)
     POST /notify       { joinRequest:true }           tell the organisers (requesters)
*/

const PROJECT_ID = "sri-lanka-trip-466a4";
const FS = "https://firestore.googleapis.com/v1/projects/" + PROJECT_ID + "/databases/(default)/documents";
const DEFAULT_SUBJECT = "https://github.com/Harshith017/sri-lanka-trip-app";
const MAX_DEVICES = 8, MAX_MESSAGES = 30, MAX_TITLE = 80, MAX_BODY = 200;

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const path = new URL(req.url).pathname.replace(/\/+$/, "");
    try {
      if (!env.PUSH_KV) throw httpError(500, "PUSH_KV binding is missing — add a KV namespace binding named PUSH_KV");
      if (req.method === "GET" && path === "/vapid") return json({ key: (await vapidKeys(env)).publicKey });
      if (req.method !== "POST") throw httpError(404, "Not found");

      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const email = tokenEmail(token);
      const body = await req.json().catch(() => ({}));

      if (path === "/subscribe") return json(await subscribe(env, token, email, body));
      if (path === "/unsubscribe") return json(await unsubscribe(env, token, email, body));
      if (path === "/notify") return json(await notify(env, token, email, body));
      throw httpError(404, "Not found");
    } catch (e) {
      return json({ error: e.message || String(e) }, e.status || 500);
    }
  }
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400"
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { ...CORS, "Content-Type": "application/json" } });
}
function httpError(status, msg) { const e = new Error(msg); e.status = status; return e; }

/* ---------------- Who is calling ---------------- */

// Reads the email out of a Firebase ID token. This only sanity-checks the
// claims — the real check is that Firestore accepts the token in fsGet().
function tokenEmail(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw httpError(401, "Sign in first");
  let c;
  try { c = JSON.parse(new TextDecoder().decode(b64uDecode(parts[1]))); } catch (e) { throw httpError(401, "Bad token"); }
  if (c.aud !== PROJECT_ID || c.iss !== "https://securetoken.google.com/" + PROJECT_ID) throw httpError(401, "Wrong project");
  if (!c.exp || c.exp * 1000 < Date.now()) throw httpError(401, "Token expired");
  if (!c.email) throw httpError(401, "No email on this account");
  return String(c.email).trim().toLowerCase();
}

function docId(email) { return email.replace(/\//g, "_"); }

// GET a Firestore doc as the caller. Returns the doc, or null if it doesn't
// exist / the caller's rules don't allow it. A bad token throws 401.
async function fsGet(token, path) {
  const res = await fetch(FS + "/" + path, { headers: { Authorization: "Bearer " + token } });
  if (res.status === 401) throw httpError(401, "Sign in again");
  if (!res.ok) return null;
  return res.json();
}
function isMember(token, email) { return fsGet(token, "people/" + encodeURIComponent(docId(email))); }
function fieldString(doc, name) {
  const f = doc && doc.fields && doc.fields[name];
  return f && typeof f.stringValue === "string" ? f.stringValue : "";
}
function clip(s, n) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n); }

/* ---------------- Storage (KV) ----------------
   subs:<email> → [{ endpoint, keys:{p256dh,auth}, at }]
   admins       → [email, …]  organisers who have notifications on
   vapid        → { publicKey, privateJwk }                                */

async function getSubs(env, email) { return (await env.PUSH_KV.get("subs:" + email, "json")) || []; }
async function putSubs(env, email, subs) {
  if (subs.length) await env.PUSH_KV.put("subs:" + email, JSON.stringify(subs));
  else await env.PUSH_KV.delete("subs:" + email);
}

async function subscribe(env, token, email, body) {
  if (!(await isMember(token, email))) throw httpError(403, "Only trip members can turn on notifications");
  const s = body.sub || {};
  const keys = s.keys || {};
  if (typeof s.endpoint !== "string" || !/^https:\/\//.test(s.endpoint) || s.endpoint.length > 1000 ||
      typeof keys.p256dh !== "string" || typeof keys.auth !== "string") throw httpError(400, "Bad subscription");

  const subs = (await getSubs(env, email)).filter(x => x.endpoint !== s.endpoint);
  subs.push({ endpoint: s.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, at: Date.now() });
  await putSubs(env, email, subs.slice(-MAX_DEVICES));

  // Remember organisers so join requests reach them.
  const adminsDoc = await fsGet(token, "trip/admins");
  const vals = adminsDoc && adminsDoc.fields && adminsDoc.fields.emails && adminsDoc.fields.emails.arrayValue &&
               adminsDoc.fields.emails.arrayValue.values || [];
  const isAdmin = vals.some(v => String(v.stringValue || "").trim().toLowerCase() === email);
  const admins = (await env.PUSH_KV.get("admins", "json")) || [];
  const has = admins.indexOf(email) >= 0;
  if (isAdmin && !has) await env.PUSH_KV.put("admins", JSON.stringify(admins.concat(email)));
  if (!isAdmin && has) await env.PUSH_KV.put("admins", JSON.stringify(admins.filter(e => e !== email)));
  return { ok: true };
}

async function unsubscribe(env, token, email, body) {
  await fsGet(token, "people/" + encodeURIComponent(docId(email)));   // throws on a bad token
  const subs = await getSubs(env, email);
  const left = subs.filter(x => x.endpoint !== body.endpoint);
  if (left.length !== subs.length) await putSubs(env, email, left);
  return { ok: true };
}

async function notify(env, token, email, body) {
  let messages = [];
  const tag = clip(body.tag, 60), tab = clip(body.tab, 20);

  if (body.joinRequest) {
    // Not a member yet — the only thing they may do is ping the organisers,
    // with text built here from their own request.
    const reqDoc = await fsGet(token, "requests/" + encodeURIComponent(docId(email)));
    if (!reqDoc) throw httpError(403, "No join request found");
    const name = clip(fieldString(reqDoc, "name"), 40) || email.split("@")[0];
    const admins = (await env.PUSH_KV.get("admins", "json")) || [];
    messages = admins.map(to => ({ to, title: "Join request", body: name + " wants to join the trip" }));
    return { ok: true, sent: await deliver(env, messages, { tag: "join-" + email, tab: "balances" }, email) };
  }

  if (!(await isMember(token, email))) throw httpError(403, "Only trip members can send notifications");
  if (!Array.isArray(body.messages)) throw httpError(400, "messages must be a list");
  messages = body.messages.slice(0, MAX_MESSAGES).map(m => ({
    to: clip(m && m.to, 200).toLowerCase(),
    title: clip(m && m.title, MAX_TITLE),
    body: clip(m && m.body, MAX_BODY)
  })).filter(m => m.to && m.title);
  return { ok: true, sent: await deliver(env, messages, { tag, tab }, email) };
}

// Sends each message to every device of its recipient; drops devices the
// push service says are gone. Never notifies the sender.
async function deliver(env, messages, extra, sender) {
  let sent = 0;
  await Promise.all(messages.filter(m => m.to !== sender).map(async m => {
    const subs = await getSubs(env, m.to);
    if (!subs.length) return;
    const payload = JSON.stringify({ title: m.title, body: m.body, tag: extra.tag || "", tab: extra.tab || "" });
    const dead = [];
    await Promise.all(subs.map(async s => {
      try {
        const res = await sendPush(env, s, payload);
        if (res.status === 404 || res.status === 410) dead.push(s.endpoint);
        else if (res.ok) sent++;
        else console.warn("push failed", res.status, await res.text());
      } catch (e) { console.warn("push error", e && e.message); }
    }));
    if (dead.length) await putSubs(env, m.to, subs.filter(s => dead.indexOf(s.endpoint) < 0));
  }));
  return sent;
}

/* ---------------- Web Push (RFC 8291 + RFC 8292) ---------------- */

async function vapidKeys(env) {
  const saved = await env.PUSH_KV.get("vapid", "json");
  if (saved && saved.publicKey && saved.privateJwk) return saved;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const keys = {
    publicKey: b64uEncode(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey))),
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey)
  };
  await env.PUSH_KV.put("vapid", JSON.stringify(keys));
  return keys;
}

async function vapidHeader(env, endpoint) {
  const k = await vapidKeys(env);
  const enc = o => b64uEncode(utf8(JSON.stringify(o)));
  const unsigned = enc({ typ: "JWT", alg: "ES256" }) + "." + enc({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || DEFAULT_SUBJECT
  });
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: k.privateJwk.x, y: k.privateJwk.y, d: k.privateJwk.d },
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(unsigned)));
  return "vapid t=" + unsigned + "." + b64uEncode(sig) + ", k=" + k.publicKey;
}

async function sendPush(env, sub, payload) {
  return fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidHeader(env, sub.endpoint),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high"
    },
    body: await encryptPayload(sub.keys, payload)
  });
}

async function encryptPayload(keys, text) {
  const uaPublic = b64uDecode(keys.p256dh);
  const authSecret = b64uDecode(keys.auth);
  const local = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  const ikm = await hmac(await hmac(authSecret, shared), concat(utf8("WebPush: info\0"), uaPublic, asPublic, [1]));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(utf8("Content-Encoding: aes128gcm\0"), [1]))).slice(0, 16);
  const nonce = (await hmac(prk, concat(utf8("Content-Encoding: nonce\0"), [1]))).slice(0, 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, concat(utf8(text), [2])));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
function utf8(s) { return new TextEncoder().encode(s); }
function concat(...parts) {
  const arrs = parts.map(p => p instanceof Uint8Array ? p : new Uint8Array(p));
  const out = new Uint8Array(arrs.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}
function b64uEncode(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uDecode(str) {
  const s = atob(String(str).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(str).length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}
