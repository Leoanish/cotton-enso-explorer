# Chat proxy — keeps the Groq key secret

The dashboard is a public web page, so an API key placed inside it could be copied by anyone. This tiny
[Cloudflare Worker](https://developers.cloudflare.com/workers/) holds the key as an encrypted secret and
forwards the dashboard's chat requests to Groq. It:

- answers only requests coming from `https://leoanish.github.io` (edit `ALLOWED_ORIGINS` in `wrangler.toml`);
- rejects oversized or malformed requests and caps each answer at 1,500 tokens;
- tries `openai/gpt-oss-120b` first and falls back to `openai/gpt-oss-20b` when the first is rate-limited;
- optionally limits each visitor to 20 requests a minute (uncomment `[[ratelimits]]` in `wrangler.toml`).

Cloudflare's free plan is enough. Groq's free tier is enough for light use; if many people use the chat at once
some will see "busy — retrying". A paid Groq tier raises the limits without any code change.

## Deploy (about 5 minutes, once)

You need Node.js (`node -v` should print a version; otherwise install the LTS from nodejs.org) and a free
Cloudflare account.

```bash
cd chat-proxy
npx wrangler login                    # opens the browser; approve access
npx wrangler deploy                   # prints https://cotton-enso-chat.<your-subdomain>.workers.dev
npx wrangler secret put GROQ_API_KEY  # paste the Groq key when asked (it is not shown or saved locally)
```

Check it: open `https://cotton-enso-chat.<your-subdomain>.workers.dev/health` — it should say
`"keyConfigured": true`.

## Connect the dashboard

```bash
cd ..                                                    # back to the repository root
echo "https://cotton-enso-chat.<your-subdomain>.workers.dev" > chat-proxy/PROXY_URL
python3 scripts/build_page.py                            # rebuilds index.html with the URL
git add -A && git commit -m "Connect AI chat" && git push
```

GitHub Pages updates within a minute. The ✦ **Ask the data** button now works for every visitor without a key.

## Changing things later

| Want to… | Do this |
|---|---|
| Replace the key | `npx wrangler secret put GROQ_API_KEY` again |
| Use other models | edit `MODELS` in `wrangler.toml`, then `npx wrangler deploy` |
| Allow another site (e.g. a custom domain) | add it to `ALLOWED_ORIGINS`, then `npx wrangler deploy` |
| Turn the chat off | empty `chat-proxy/PROXY_URL`, rebuild, push (visitors can still paste their own key) |
| Watch live logs | `npx wrangler tail` |

## Without the proxy

The chat panel's ⚙ lets any visitor paste their **own** Groq key. It is stored only in that browser's
local storage and sent only to `api.groq.com`.
