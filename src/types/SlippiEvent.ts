export interface SlippiPlayer {
    port: number;
    character: number; // Slippi's own numbering, see lib/slippi/players.ts
    costume: number; // the skin, in the game's own order
}

// What the app is told about a game. The shape matches `Event` in src-tauri/src/slippi/parser.rs.
export type SlippiEvent =
    | { type: "start"; players: SlippiPlayer[] }
    | { type: "end"; winner: number | null }; // the port that won, when the replay says
