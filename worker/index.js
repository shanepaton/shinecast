// Keeps the start.gg client secret out of the app. It does two things: trade a login code or a refresh token for an
// access token. The redirect and scope are fixed here, and each address is rate limited (see wrangler.toml).
const REDIRECT_URI = "http://localhost:29417/callback";
const SCOPE = "user.identity";
const MAX_CREDENTIAL_LENGTH = 8192; // start.gg's codes and tokens are long, but not this long

const endpoints = {
    "/token": { upstream: "access_token", grant: "authorization_code", field: "code" },
    "/refresh": { upstream: "refresh", grant: "refresh_token", field: "refresh_token" },
};

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
const respond = (body, status = 200) => new Response(body, { status, headers: { ...headers, "Content-Type": "application/json" } });
const fail = (message, status) => respond(JSON.stringify({ message }), status);

export default {
    async fetch(request, env) {
        if (request.method === "OPTIONS") return new Response(null, { headers });

        const endpoint = endpoints[new URL(request.url).pathname];
        if (request.method !== "POST" || !endpoint) return fail("Not found", 404);

        const { success } = await env.RATE_LIMITER.limit({ key: request.headers.get("CF-Connecting-IP") ?? "unknown" });
        if (!success) return fail("Too many requests, try again in a minute", 429);

        const credential = (await request.json().catch(() => ({})))[endpoint.field];
        if (typeof credential !== "string" || credential.length > MAX_CREDENTIAL_LENGTH) return fail("Bad request", 400);

        const upstream = await fetch(`https://api.start.gg/oauth/${endpoint.upstream}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: endpoint.grant,
                [endpoint.field]: credential,
                client_id: env.STARTGG_CLIENT_ID,
                client_secret: env.STARTGG_CLIENT_SECRET,
                redirect_uri: REDIRECT_URI,
                scope: SCOPE,
            }),
        });
        return respond(await upstream.text(), upstream.status);
    },
};
