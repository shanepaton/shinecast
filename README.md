# shinecast
A modern tournament stream tool and overlay for Super Smash Bros. Melee.

## start.gg setup

Signing in with start.gg needs your own OAuth app and a Cloudflare Worker that keeps the client secret off the
user's machine. Do this once:

1. Create an OAuth application in start.gg's developer settings with the redirect URI `http://localhost:29417/callback`.
2. Put its client ID in `worker/wrangler.toml` and set the Worker's route to your own domain.
3. From `worker/`, run `npx wrangler deploy`, then `npx wrangler secret put STARTGG_CLIENT_SECRET`.
4. Copy `.env.example` to `.env` and fill in the client ID and the Worker's URL.
