/* Cloudflare Worker — keeps the DeepSeek key off your website and limits abuse.

   SETUP (dashboard):  Workers & Pages -> your worker -> Edit code -> paste this file -> Deploy.
   Then Settings -> Variables and secrets:
     DEEPSEEK_KEY     (type: Secret)  = your DeepSeek key
     ALLOWED_ORIGINS  (type: Text)    = your site origin, e.g. https://yourname.github.io
                                        (several: comma-separated; "*" = allow any site, testing only)
   Origin = scheme + host only. NO path, NO trailing slash:
     page  https://yourname.github.io/polish/   ->  origin  https://yourname.github.io

   Open the Worker URL in a browser to see a status page that tells you what is missing. */

const ALLOWED = ["https://YOUR-USERNAME.github.io"]; /* fallback if ALLOWED_ORIGINS is not set */
const MODEL = "deepseek-chat";  /* forced server-side */
const MAX_MESSAGES = 12;
const MAX_CHARS = 2500;
const MAX_TOKENS = 700;

const originList = env => {
  const l = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim().replace(/\/+$/, "")).filter(Boolean);
  return l.length ? l : ALLOWED;
};

export default {
  async fetch(req, env) {
    const list = originList(env);
    const origin = req.headers.get("Origin") || "";
    const any = list.includes("*");
    const ok = any || list.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? (any ? "*" : origin) : list[0],
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin"
    };
    const json = (status, obj, c) => new Response(JSON.stringify(obj), { status, headers: { ...(c || cors), "Content-Type": "application/json" } });

    /* Status / diagnostics (no secrets). CORS open so the app's "Test connection" button can read it. */
    if (req.method === "GET") {
      return json(200, {
        status: "ok",
        keyConfigured: !!env.DEEPSEEK_KEY,
        rateLimit: !!env.RL,
        allowedOrigins: list,
        yourOrigin: origin || "(none — opened directly in the browser)",
        yourOriginAllowed: ok,
        hint: !env.DEEPSEEK_KEY ? "Add the DEEPSEEK_KEY secret." : (!ok && origin ? "Set ALLOWED_ORIGINS to " + origin : "Looks good.")
      }, { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" });
    }
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return json(405, { error: "method not allowed" });
    if (!ok) return json(403, { error: "origin not allowed", yourOrigin: origin });
    if (!env.DEEPSEEK_KEY) return json(500, { error: "DEEPSEEK_KEY secret is not set" });

    if (env.RL) {
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.RL.limit({ key: ip });
      if (!success) return json(429, { error: "rate limited" });
    }

    let body;
    try { body = await req.json(); } catch (e) { return json(400, { error: "bad json" }); }
    if (!Array.isArray(body.messages) || !body.messages.length) return json(400, { error: "no messages" });

    const messages = body.messages.slice(-MAX_MESSAGES).map(m => ({
      role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
      content: String(m.content || "").slice(0, MAX_CHARS)
    }));
    const payload = {
      model: MODEL,
      messages,
      temperature: Math.min(Math.max(Number(body.temperature) || 0.5, 0), 1),
      max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS)
    };
    if (body.response_format && body.response_format.type === "json_object") payload.response_format = { type: "json_object" };

    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.DEEPSEEK_KEY },
      body: JSON.stringify(payload)
    });
    return new Response(r.body, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
  }
};
