//! Tells the page when Slippi games start and end, by watching the replay folder.

mod parser;
mod watcher;

use std::{
    path::PathBuf,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    thread,
};
use tauri::{AppHandle, Emitter, State};

const EVENT: &str = "slippi"; // the page listens for this, see `src/lib/slippi/watch.ts`

/// The stop flag of the folder being watched, if one is.
#[derive(Default)]
pub struct Watching(Mutex<Option<Arc<AtomicBool>>>);

impl Watching {
    /// Makes `stop` the current watch and ends the one before it.
    fn replace(&self, stop: Option<Arc<AtomicBool>>) {
        let earlier = std::mem::replace(&mut *self.0.lock().unwrap(), stop);
        if let Some(earlier) = earlier {
            earlier.store(true, Ordering::Relaxed);
        }
    }
}

/// Starts watching `folder`, replacing any earlier watch. The page hears about each game as it starts and ends.
#[tauri::command]
pub fn watch_slippi(app: AppHandle, watching: State<Watching>, folder: String) -> Result<(), String> {
    let folder = PathBuf::from(folder);
    if !folder.is_dir() {
        return Err("That replay folder doesn't exist".to_string());
    }
    let stop = Arc::new(AtomicBool::new(false));
    watching.replace(Some(stop.clone()));
    thread::spawn(move || {
        watcher::watch(&folder, &stop, |event| {
            let _ = app.emit(EVENT, event);
        });
    });
    Ok(())
}

#[tauri::command]
pub fn stop_slippi(watching: State<Watching>) {
    watching.replace(None);
}
