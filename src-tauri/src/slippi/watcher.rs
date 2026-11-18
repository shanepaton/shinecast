//! Follows the newest replay in a folder. Slippi writes each game to a new `.slp` file as it is played.

use super::parser::{Event, Parser};
use std::{
    collections::HashSet,
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    sync::atomic::{AtomicBool, Ordering},
    thread::sleep,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

const POLL_INTERVAL: Duration = Duration::from_millis(500);

/// A file or folder and when it last changed.
struct Entry {
    path: PathBuf,
    modified: SystemTime,
}

#[derive(Default)]
struct Contents {
    replays: Vec<Entry>,
    folders: Vec<Entry>,
}

/// What is directly inside `directory`. Anything that isn't a replay or a folder is left out.
fn list(directory: &Path) -> Contents {
    let mut contents = Contents::default();
    for entry in fs::read_dir(directory).into_iter().flatten().flatten() {
        let Ok(meta) = entry.metadata() else { continue };
        let path = entry.path();
        let modified = meta.modified().unwrap_or(UNIX_EPOCH);
        if meta.is_dir() {
            contents.folders.push(Entry { path, modified });
        } else if path.extension().is_some_and(|extension| extension.eq_ignore_ascii_case("slp")) {
            contents.replays.push(Entry { path, modified });
        }
    }
    contents
}

/// The replays in `folder`. Slippi can sort games into a folder per month, so the newest folder inside is included too.
fn replays_in(folder: &Path) -> Vec<Entry> {
    let Contents { mut replays, folders } = list(folder);
    if let Some(newest) = folders.into_iter().max_by_key(|folder| folder.modified) {
        replays.extend(list(&newest.path).replays);
    }
    replays
}

/// Follows the games played in a folder, one replay after another.
struct Replays<'a> {
    folder: &'a Path,
    known: HashSet<PathBuf>, // every replay found so far. Only one that wasn't here before is a new game
    file: Option<File>,      // the replay being followed. Reading carries on from where it stopped
    parser: Parser,          // for that replay
}

impl<'a> Replays<'a> {
    fn new(folder: &'a Path) -> Self {
        Replays { folder, known: HashSet::new(), file: None, parser: Parser::default() }
    }

    /// The game events in whatever has been written to the replay since last time.
    fn read_new(&mut self) -> Vec<Event> {
        let Some(file) = self.file.as_mut() else { return Vec::new() };
        let mut added = Vec::new();
        if self.parser.is_over() || file.read_to_end(&mut added).is_err() {
            return Vec::new();
        }
        self.parser.feed(&added)
    }

    /// The newest replay that wasn't in the folder on the last look. Slippi touches the replay before this one after the
    /// next game has begun, which mustn't play that game back.
    fn newest_new(&mut self) -> Option<PathBuf> {
        let mut found = replays_in(self.folder);
        found.retain(|replay| !self.known.contains(&replay.path));
        self.known.extend(found.iter().map(|replay| replay.path.clone()));
        found.into_iter().max_by_key(|replay| replay.modified).map(|replay| replay.path)
    }

    /// Finishes reading the replay being followed, then moves on to a new one if a game has begun.
    fn poll(&mut self) -> Vec<Event> {
        let mut events = self.read_new();
        if let Some(file) = self.newest_new().and_then(|path| File::open(path).ok()) {
            self.file = Some(file);
            self.parser = Parser::default();
            events.extend(self.read_new());
        }
        events
    }
}

/// Watches `folder` until `stop` is set, passing each game event to `report`.
pub fn watch(folder: &Path, stop: &AtomicBool, mut report: impl FnMut(Event)) {
    let mut replays = Replays::new(folder);

    // A game that is already over is only caught up on, so yesterday's game doesn't fill in today's players. One that
    // is still being played is reported from its start.
    let events = replays.poll();
    if !replays.parser.is_over() {
        events.into_iter().for_each(&mut report);
    }

    loop {
        sleep(POLL_INTERVAL);
        if stop.load(Ordering::Relaxed) {
            return; // checked after waiting, so a watch that has been replaced says nothing more
        }
        replays.poll().into_iter().for_each(&mut report);
    }
}
