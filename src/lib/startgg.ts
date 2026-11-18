import { invoke } from "@tauri-apps/api/core";
import type { PlayerData } from "../types/PlayerData";
import type { TournamentData } from "../types/TournamentData";

// A set that hasn't finished yet, shaped to drop straight into the app's state.
export interface StartggSet {
    label: string;
    round: string;
    bestOf?: TournamentData["bestOf"];
    players: Partial<PlayerData>[];
}

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
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) ?? "null");
    return auth?.accessToken ? auth : null;
}

export const isSignedIn = () => loadAuth() !== null;

async function postJson(url: string, body: object, token?: string) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || json.errors) {
        throw new Error(json.errors?.[0]?.message ?? json.error_description ?? json.message ?? response.statusText);
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
async function accessToken() {
    const auth = loadAuth();
    if (!auth) throw new Error("Connect start.gg first");
    if (Date.now() < auth.expiresAt - 60_000) return auth.accessToken;

    try {
        return (await requestToken("refresh", { refresh_token: auth.refreshToken })).accessToken;
    } catch (error) {
        localStorage.removeItem(AUTH_KEY); // the login is dead, so the panel goes back to Connect
        throw error;
    }
}

// Sets

const SETS_QUERY = `query ($slug: String!) {
    event(slug: $slug) {
        sets(page: 1, perPage: 50, sortType: CALL_ORDER, filters: { state: [1, 2] }) {
            nodes {
                fullRoundText round totalGames
                slots { entrant { participants { gamerTag prefix user {
                    genderPronoun location { country state }
                    authorizations(types: [TWITTER]) { externalUsername }
                } } } }
            }
        }
    }
}`;

// Just the fields we read. Anything a player hasn't filled in on start.gg comes back null.
interface ApiParticipant {
    gamerTag: string;
    prefix: string | null;
    user: {
        genderPronoun: string | null;
        location: { country: string | null; state: string | null } | null;
        authorizations: { externalUsername: string }[];
    } | null;
}

interface ApiSet {
    fullRoundText: string;
    round: number; // negative in the losers bracket
    totalGames: number | null;
    slots: { entrant: { participants: ApiParticipant[] } | null }[];
}

// Takes a full start.gg link or just "tournament/<name>/event/<name>".
const eventSlug = (input: string) => input.match(/tournament\/[^/?#\s]+\/event\/[^/?#\s]+/)?.[0];

// start.gg says "Quarter-Final", rounds.json says "Quarters".
const roundName = (text: string) => text.replace("Quarter-Final", "Quarters").replace("Semi-Final", "Semis");

const hasBothPlayers = ({ slots }: ApiSet) => slots.every((slot) => slot.entrant?.participants.length);

function toPlayer({ gamerTag, prefix, user }: ApiParticipant, losers: boolean): Partial<PlayerData> {
    return {
        prefix: prefix ?? "",
        name: gamerTag,
        pronouns: user?.genderPronoun ?? "",
        country: user?.location?.country ?? "",
        region: user?.location?.state ?? "",
        socials: { twitter: user?.authorizations[0]?.externalUsername ?? "" },
        score: 0,
        losers,
    };
}

function toSet({ fullRoundText, round, totalGames, slots }: ApiSet): StartggSet {
    const players = slots.map((slot) => toPlayer(slot.entrant!.participants[0], round < 0));
    const roundText = roundName(fullRoundText);
    return {
        label: `${roundText}: ${players[0].name} vs ${players[1].name}`,
        round: roundText,
        bestOf: totalGames === 3 || totalGames === 5 ? totalGames : undefined,
        players,
    };
}

export async function fetchSets(event: string): Promise<StartggSet[]> {
    const slug = eventSlug(event);
    if (!slug) throw new Error("Paste the event link, e.g. start.gg/tournament/…/event/…");

    const { data } = await postJson("https://api.start.gg/gql/alpha", { query: SETS_QUERY, variables: { slug } }, await accessToken());
    if (!data?.event) throw new Error("Event not found");

    const sets: ApiSet[] = data.event.sets.nodes;
    return sets.filter(hasBothPlayers).map(toSet);
}
