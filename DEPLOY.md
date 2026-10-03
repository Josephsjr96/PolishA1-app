# Fix "Couldn't reach the AI" — 3 steps (dashboard, no command line)

**Cause:** the Worker you deployed still has the placeholder `https://YOUR-USERNAME.github.io` as its allowed site.
It therefore refuses your real site, and the browser reports that as a network/CORS failure.

## 1. Update the Worker code
Cloudflare dashboard → Workers & Pages → `flat-waterfall-436c` → **Edit code** → select all →
paste the new `deepseek-proxy-worker.js` → **Deploy**.

## 2. Set two variables
Worker → **Settings → Variables and secrets** → Add:

| Name | Type | Value |
|---|---|---|
| `DEEPSEEK_KEY` | **Secret** | your NEW DeepSeek key (revoke the one pasted in chat) |
| `ALLOWED_ORIGINS` | Text | your site origin, e.g. `https://yourname.github.io` |

Origin = scheme + host only. Page `https://yourname.github.io/polish/` → origin `https://yourname.github.io`
(no `/polish`, no trailing slash). Several sites: separate with commas. Save/Deploy again.

## 3. Check it
- Open `https://flat-waterfall-436c.josephsanjari1996.workers.dev` in a browser → you should see
  `"keyConfigured": true`.
- Open your site with `#aidev` on the end (`https://yourname.github.io/polish/#aidev`) →
  My Polish → ⚙ Settings → **🩺 Test connection**. It says exactly what is missing.
- Visitors (no `#aidev`) just see the chat — no key box, no settings.

Upload to the site repo: `a1polish.html`, `ai-helper.js` (Worker URL is already set inside), and the other `.js` files.
Never put the DeepSeek key in any file.
