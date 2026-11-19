import type { PlayerData } from "../types/PlayerData";

// Player data comes from two places, and each group moves together. Who the players are comes from start.gg. How the
// game is going comes from Slippi, which scores a win by port, so a port, its character and its score belong together.
const person = ["prefix", "name", "pronouns", "country", "region", "socials", "losers"] as const;
const game = ["character", "skin", "port", "score"] as const;

function swapField<K extends keyof PlayerData>(a: PlayerData, b: PlayerData, field: K) {
    [a[field], b[field]] = [b[field], a[field]];
}

function swapFields(a: PlayerData, b: PlayerData, fields: readonly (keyof PlayerData)[]) {
    fields.forEach((field) => swapField(a, b, field));
}

/** Swaps the names, and everything else about who the players are, such as pronouns and region. */
export const swapNames = (a: PlayerData, b: PlayerData) => swapFields(a, b, person);

/** Swaps the characters, skins, ports and scores. */
export const swapGames = (a: PlayerData, b: PlayerData) => swapFields(a, b, game);

/** Swaps everything, for when the players are on the wrong sides. */
export const swapPlayers = (a: PlayerData, b: PlayerData) => swapFields(a, b, [...person, ...game]);
