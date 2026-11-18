import { invoke } from "@tauri-apps/api/core";

// Signing in: the browser opens, the user approves, and start.gg redirects back to a listener on localhost (see
// wait_for_redirect in src-tauri). The Worker in /worker holds the client secret and swaps codes for tokens. The port
// and scope must match the Worker and the redirect registered with start.gg.

const CLIENT_ID = import.meta.env.VITE_STARTGG_CLIENT_ID;
const AUTH_URL = import.meta.env.VITE_STARTGG_AUTH_URL;
const PORT = 29417;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = "user.identity";
const AUTH_KEY = "startgg-auth";

interface Auth {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
}

function loadAuth(): Auth | null {
    try {
        const auth = JSON.parse(localStorage.getItem(AUTH_KEY) ?? "null");
        return auth?.accessToken ? auth : null;
    } catch {
        return null; // a corrupt entry just means signed out
    }
}

export const isSignedIn = () => loadAuth() !== null;
export const signOut = () => localStorage.removeItem(AUTH_KEY);

export const API_URL = "https://api.start.gg/gql/alpha";

// Also used by sets.ts and tournaments.ts to call start.gg's API.
export async function postJson(url: string, body: object, token?: string) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.errors) {
        const message = json.errors?.[0]?.message ?? json.error_description ?? json.message ?? response.statusText;
        throw Object.assign(new Error(message), { status: response.status });
    }
    return json;
}

// Trades a login code or a refresh token for an access token and saves it.
async function requestToken(endpoint: "token" | "refresh", credential: { code: string } | { refresh_token: string }) {
    const { access_token, refresh_token, expires_in } = await postJson(`${AUTH_URL}/${endpoint}`, credential);
    const auth: Auth = {
        accessToken: access_token,
        refreshToken: refresh_token ?? ("refresh_token" in credential ? credential.refresh_token : undefined), // a refresh may not send a new one
        expiresAt: Date.now() + expires_in * 1000,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
    return auth;
}

export async function signIn() {
    if (!CLIENT_ID || !AUTH_URL) throw new Error("Add the start.gg client ID and auth URL to .env");

    const state = crypto.randomUUID(); // Rust only accepts a redirect that carries this
    const authorizeUrl = "https://start.gg/oauth/authorize?" +
        new URLSearchParams({ response_type: "code", client_id: CLIENT_ID, scope: SCOPE, redirect_uri: REDIRECT_URI, state });

    const redirect = await invoke<string>("wait_for_redirect", { url: authorizeUrl, port: PORT, state });
    const code = new URLSearchParams(redirect).get("code");
    if (!code) throw new Error("start.gg sign-in was cancelled");
    await requestToken("token", { code });
}

// Tokens last a week. A minute before one runs out, trade it for a new one.
export async function accessToken() {
    const auth = loadAuth();
    if (!auth) throw new Error("Connect start.gg first");
    if (Date.now() < auth.expiresAt - 60_000) return auth.accessToken;

    try {
        return (await requestToken("refresh", { refresh_token: auth.refreshToken })).accessToken;
    } catch (error) {
        // Only a refusal means the login is dead. A dropped connection or a rate limit shouldn't sign anyone out.
        if ([400, 401].includes((error as { status?: number }).status ?? 0)) signOut();
        throw error;
    }
}
