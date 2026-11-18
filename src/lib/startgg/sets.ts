import type { PlayerData } from "../../types/PlayerData";
import type { TournamentData } from "../../types/TournamentData";
import { accessToken, API_URL, postJson } from "./auth";

// A set that hasn't finished yet, shaped to drop straight into the app's state.
export interface StartggSet {
    label: string;
    round: string;
    bestOf?: TournamentData["bestOf"];
    players: Partial<PlayerData>[];
}

// Sets that haven't finished. start.gg's docs name these states created, active, ready, called and queued, and the numbers
// (1, 2, 4, 6, 7) follow the order of that list, which the docs don't spell out. start.gg allows 1,000 objects per request,
// nested ones included, and each set here is roughly 13 by my count, so keep perPage well under 75.
const SETS_QUERY = `query ($slug: String!) {
    event(slug: $slug) {
        sets(page: 1, perPage: 50, sortType: CALL_ORDER, filters: { state: [1, 2, 4, 6, 7] }) {
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
        authorizations: { externalUsername: string }[] | null;
    } | null;
}

interface ApiSet {
    fullRoundText: string;
    round: number; // negative in the losers bracket
    totalGames: number | null;
    slots: { entrant: { participants: ApiParticipant[] | null } | null }[];
}

// Takes a full start.gg link or just "tournament/<name>/event/<name>".
const eventSlug = (input: string) => input.match(/tournament\/[^/?#\s]+\/event\/[^/?#\s]+/)?.[0];

// start.gg says "Quarter-Final", rounds.json says "Quarters".
const roundName = (text: string) => text.replace("Quarter-Final", "Quarters").replace("Semi-Final", "Semis");

const hasBothPlayers = ({ slots }: ApiSet) => slots.every((slot) => slot.entrant?.participants?.length);

function toPlayer({ gamerTag, prefix, user }: ApiParticipant, losers: boolean): Partial<PlayerData> {
    return {
        prefix: prefix ?? "",
        name: gamerTag,
        pronouns: user?.genderPronoun ?? "",
        country: user?.location?.country ?? "",
        region: user?.location?.state ?? "",
        socials: { twitter: user?.authorizations?.[0]?.externalUsername ?? "" },
        score: 0,
        losers,
    };
}

function toSet({ fullRoundText, round, totalGames, slots }: ApiSet): StartggSet {
    const players = slots.map((slot) => toPlayer(slot.entrant!.participants![0], round < 0));
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
    if (!slug) throw new Error("Pick a tournament and bracket in settings first");

    const { data } = await postJson(API_URL, { query: SETS_QUERY, variables: { slug } }, await accessToken());
    if (!data?.event) throw new Error("Event not found");

    const sets: ApiSet[] = data.event.sets?.nodes ?? [];
    return sets.filter(hasBothPlayers).map(toSet);
}
