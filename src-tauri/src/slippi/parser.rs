//! Reads a Slippi replay (`.slp`) as it is being written and picks out the moments the app cares about. The format is
//! documented at <https://github.com/project-slippi/slippi-wiki/blob/master/SPEC.md>.
//!
//! A replay is a short header, a table saying how many bytes each kind of event takes, then the events one after
//! another, each starting with a byte that says which kind it is. Events are skipped by their size, so kinds this
//! reader doesn't know about, and ones added in newer versions of Slippi, don't throw it off.

use serde::Serialize;
use std::collections::HashMap;

#[derive(Serialize, Clone, Debug)]
pub struct Player {
    pub port: u8,      // 1 to 4
    pub character: u8, // Slippi's own numbering, not the app's
    pub costume: u8,   // the skin, in the game's own order
}

#[derive(Serialize, Clone, Debug)]
pub struct GameStart {
    pub players: Vec<Player>, // humans and CPUs, in port order
}

#[derive(Serialize, Clone, Debug)]
pub struct GameEnd {
    pub winner: Option<u8>, // a port, when the replay says who won
}

/// What the page is told, as `{ "type": "start", "players": [...] }` or `{ "type": "end", "winner": 1 }`.
#[derive(Serialize, Clone, Debug)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Event {
    Start(GameStart),
    End(GameEnd),
}

/// How many bytes each kind of event takes after its first byte, for the kinds the replay's table lists.
type Sizes = HashMap<u8, u16>;

// The header is `{U\x03raw[$U#l` and four bytes for the length of the game data, which is 0 while the game is still
// being written and so is ignored. The table of sizes follows: its own kind (0x35), its length, then 3 bytes per kind.
const MAGIC: &[u8] = b"{U\x03raw[$U#l";
const HEADER_LEN: usize = MAGIC.len() + 4;
const SIZES_EVENT: u8 = 0x35;
const GAME_START: u8 = 0x36;
const GAME_END: u8 = 0x39;

enum Header {
    Incomplete,
    NotAReplay,
    Read { sizes: Sizes, length: usize },
}

fn read_header(bytes: &[u8]) -> Header {
    let Some(&table_len) = bytes.get(HEADER_LEN + 1) else { return Header::Incomplete };
    if !bytes.starts_with(MAGIC) || bytes[HEADER_LEN] != SIZES_EVENT {
        return Header::NotAReplay;
    }
    let length = HEADER_LEN + 1 + table_len as usize; // the length counts its own byte
    let Some(table) = bytes.get(HEADER_LEN + 2..length) else { return Header::Incomplete };

    let (entries, _) = table.as_chunks::<3>();
    let sizes = entries.iter().map(|&[kind, high, low]| (kind, u16::from_be_bytes([high, low]))).collect();
    Header::Read { sizes, length }
}

/// Takes a replay a piece at a time, as the file grows.
#[derive(Default)]
pub struct Parser {
    buffer: Vec<u8>, // what has been read but not yet used: the start of an event whose end hasn't been written
    sizes: Option<Sizes>, // not known until the header has been read
    over: bool,      // the game data has ended, or this isn't a replay, so nothing more will come
    ports: Vec<u8>,  // who is in the current game, for working out who won when someone quits
}

impl Parser {
    pub fn is_over(&self) -> bool {
        self.over
    }

    /// Takes the next bytes of the file and returns the game events found in them.
    pub fn feed(&mut self, bytes: &[u8]) -> Vec<Event> {
        if self.over {
            return Vec::new();
        }
        self.buffer.extend_from_slice(bytes);

        let mut position = 0;
        if self.sizes.is_none() {
            match read_header(&self.buffer) {
                Header::Incomplete => return Vec::new(),
                Header::NotAReplay => {
                    self.over = true;
                    return Vec::new();
                }
                Header::Read { sizes, length } => {
                    self.sizes = Some(sizes);
                    position = length;
                }
            }
        }
        let sizes = self.sizes.as_ref().expect("the header was read above");

        let mut events = Vec::new();
        while let Some(&kind) = self.buffer.get(position) {
            let Some(&size) = sizes.get(&kind) else {
                self.over = true; // the metadata that follows the game data starts with a byte that isn't an event
                break;
            };
            let end = position + 1 + size as usize;
            let Some(event) = self.buffer.get(position..end) else { break }; // the rest hasn't been written yet
            match kind {
                GAME_START => {
                    if let Some(start) = game_start(event) {
                        self.ports = start.players.iter().map(|player| player.port).collect();
                        events.push(Event::Start(start));
                    }
                }
                GAME_END => events.push(Event::End(game_end(event, &self.ports))),
                _ => {}
            }
            position = end;
        }
        self.buffer.drain(..position);
        events
    }
}

// Each of the four ports has a block of settings in a Game Start event, after the 0x65 bytes of settings for the game.
const PLAYERS_AT: usize = 0x65;
const PLAYER_LEN: usize = 0x24;

fn game_start(event: &[u8]) -> Option<GameStart> {
    let (blocks, _) = event.get(PLAYERS_AT..PLAYERS_AT + 4 * PLAYER_LEN)?.as_chunks::<PLAYER_LEN>();
    let players = blocks
        .iter()
        .enumerate()
        .filter_map(|(index, block)| {
            let &[character, kind, _, costume, ..] = block;
            let playing = kind <= 1; // 0 human, 1 CPU, 2 demo, 3 not in the game
            playing.then(|| Player { port: index as u8 + 1, character, costume })
        })
        .collect();
    Some(GameStart { players })
}

// Game End: byte 1 is how it ended (1 time, 2 game, 3 resolved in older replays, 7 someone quit), byte 2 is the index
// of whoever quit (255 if nobody did), and bytes 3 to 6 are each port's placement, where 0 is first. Placements only
// exist in replays from Slippi 3.13 on.
fn game_end(event: &[u8], ports: &[u8]) -> GameEnd {
    let winner = match (event.get(1), ports) {
        // The placement of a game someone quit comes from who was ahead, so the quitter can come out first. Whoever
        // quit loses, as in a tournament, and in a game between two the other player wins.
        (Some(7), &[first, second]) => match event.get(2).and_then(|&index| index.checked_add(1)) {
            Some(quitter) if quitter == first => Some(second),
            Some(quitter) if quitter == second => Some(first),
            _ => None,
        },
        (Some(1..=3), _) => {
            let placements = event.get(3..7);
            placements.and_then(|places| places.iter().position(|&place| place == 0)).map(|index| index as u8 + 1)
        }
        _ => None,
    };
    GameEnd { winner }
}
