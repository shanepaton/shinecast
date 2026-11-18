import characters from "../../data/characters.json";
import type { PlayerData } from "../../types/PlayerData";
import type { SlippiPlayer } from "../../types/SlippiEvent";

// Slippi numbers the characters in the game's own order: index i is Slippi's character i.
const slippiCharacters = [
    "Captain Falcon", "Donkey Kong", "Fox", "Mr. Game & Watch", "Kirby", "Bowser", "Link", "Luigi", "Mario", "Marth", "Mewtwo",
    "Ness", "Peach", "Pikachu", "Ice Climbers", "Jigglypuff", "Samus", "Yoshi", "Zelda", "Sheik", "Falco", "Young Link",
    "Dr. Mario", "Roy", "Pichu", "Ganondorf",
];

/** Where a Slippi character is in `characters.json`, or undefined for one this app doesn't know. */
function characterIndex(slippiId: number): number | undefined {
    const index = characters.findIndex(({ name }) => name === slippiCharacters[slippiId]);
    return index < 0 ? undefined : index;
}

/**
 * Gives each side the character and skin of the Slippi player on their port. A side whose port isn't in the game
 * takes whichever Slippi player no side is on, and that port, so players who change ports between games keep up.
 */
export function seatPlayers(sides: PlayerData[], players: SlippiPlayer[]) {
    const onPort = (port: number) => players.find((playing) => playing.port === port);
    const unseated = players.filter(({ port }) => !sides.some((side) => side.port === port));

    for (const side of sides) {
        const playing = onPort(side.port) ?? unseated.shift();
        if (!playing) continue;

        side.port = playing.port;
        const character = characterIndex(playing.character);
        if (character === undefined) continue;
        side.character = character;
        side.skin = playing.costume;
    }
}
