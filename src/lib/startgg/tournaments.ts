import { accessToken, API_URL, postJson } from "./auth";

export interface StartggTournament {
    name: string;
    events: { name: string; slug: string }[]; // the brackets, e.g. "Melee Singles"
}

// The tournaments this user is organizing or competing in. 50 of them at a handful of brackets each is well inside
// start.gg's 1,000-object limit per request.
const TOURNAMENTS_QUERY = `query {
    currentUser {
        tournaments(query: { page: 1, perPage: 50 }) {
            nodes { name startAt events { name slug } }
        }
    }
}`;

interface ApiTournament {
    name: string;
    startAt: number | null;
    events: { name: string; slug: string }[] | null;
}

const CACHE_FOR = 30_000; // opening settings again soon after reuses the list instead of asking start.gg again
let cache: { token: string; at: number; tournaments: StartggTournament[] } | undefined;

// Newest first, and only tournaments that have a bracket to load. The list is kept for a short while per sign-in.
export async function fetchTournaments(): Promise<StartggTournament[]> {
    const token = await accessToken();
    if (cache?.token === token && Date.now() - cache.at < CACHE_FOR) return cache.tournaments;

    const { data } = await postJson(API_URL, { query: TOURNAMENTS_QUERY }, token);
    const nodes: ApiTournament[] = data?.currentUser?.tournaments?.nodes ?? [];
    const tournaments = nodes
        .filter((tournament) => tournament.events?.length)
        .sort((a, b) => (b.startAt ?? 0) - (a.startAt ?? 0))
        .slice(0, 25)
        .map(({ name, events }) => ({ name, events: events! }));

    cache = { token, at: Date.now(), tournaments };
    return tournaments;
}
