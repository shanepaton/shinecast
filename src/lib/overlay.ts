import { invoke } from "@tauri-apps/api/core";
import characters from "../data/characters.json";
import type { CasterData } from "../types/CasterData";
import type { PlayerData } from "../types/PlayerData";
import type { TournamentData } from "../types/TournamentData";

// What the overlay folder gets. See src-tauri/src/overlay.rs for how it is laid out and written.
interface OverlayExport {
    data: string; // data.json
    texts: [name: string, value: string][]; // text/<name>.txt
    images: [name: string, from: string][]; // images/<name>, copied from static/images/<from>
}

interface OverlayState {
    players: PlayerData[];
    casters: CasterData[];
    tournament: TournamentData;
}

const extension = (path: string) => path.slice(path.lastIndexOf("."));

/** One text file per value, named `<prefix>_<key>`. */
const textFiles = (prefix: string, values: Record<string, string | number | boolean>): [string, string][] =>
    Object.entries(values).map(([key, value]) => [`${prefix}_${key}`, String(value)]);

/** The pictures that go with a player, by kind: the character select image (css), the stock icon and the saga icon. */
function playerImages(character: (typeof characters)[number] | undefined, skin: number) {
    const from: Record<string, string> = { css: `characters/CSS/${character?.name ?? "Random"}.png` };
    if (character) {
        from.stock = `characters/Stock Icons/${character.name}/${character.skins[skin]}.png`;
        from.saga = `characters/Saga Icons/${character.saga}.png`;
    }
    return from;
}

/** Turns what's on screen into the files the overlay reads. */
export function buildExport({ players, casters, tournament }: OverlayState): OverlayExport {
    const texts: [string, string][] = [];
    const images: [string, string][] = [];

    const people = players.map((player, index) => {
        const prefix = `player${index + 1}`;
        const character = characters[player.character ?? -1]; // undefined until one is picked
        const skin = character?.skins[player.skin] ?? "";

        // Each picture is copied to images/<prefix>_<kind>.<ext>, and data.json says where.
        const files: Record<string, string> = {};
        for (const [kind, from] of Object.entries(playerImages(character, player.skin))) {
            const name = `${prefix}_${kind}${extension(from)}`;
            images.push([name, from]);
            files[kind] = `images/${name}`;
        }

        texts.push(
            ...textFiles(prefix, {
                prefix: player.prefix, name: player.name, pronouns: player.pronouns, country: player.country, region: player.region,
                twitter: player.socials.twitter, character: character?.name ?? "", skin, port: player.port, score: player.score,
                losers: player.losers,
            }),
        );
        return { ...player, character: character?.name ?? null, skin, images: files };
    });

    casters.forEach((caster, index) => texts.push(...textFiles(`caster${index + 1}`, { ...caster })));

    const { name, round, bestOf } = tournament;
    texts.push(["tournament_name", name], ["round", round], ["best_of", String(bestOf)]);

    const data = JSON.stringify({ tournament: { name, round, bestOf }, players: people, casters }, null, 2);
    return { data, texts, images };
}

/** Writes the overlay folder and returns where it is. */
export const exportOverlay = (state: OverlayState) => invoke<string>("export_overlay", { export: buildExport(state) });

/** Opens the overlay's html folder, where the pages go, in the file manager. */
export const openOverlayFolder = () => invoke<void>("open_overlay_folder");
