//! Writes what is on screen to a folder the stream overlay can read. The folder is `shinecast/overlay` in the user's
//! documents, laid out as:
//!
//! - `data.json`: everything in one file, for a browser source or script
//! - `text/<name>.txt`: one plain text file per value, for OBS text sources set to read from a file
//! - `images/<name>.<ext>`: the pictures that go with the values, copied from the app's own `images` resource
//! - `html/`: where the overlay pages (`.html`) go, to add to OBS as local files. Each overlay can have its own folder
//!   inside, and a page reads the data from the `overlay` folder above `html`. The overlays that ship with the app are
//!   copied to `html/default` the first time the folder is created; after that nothing in here is ever touched.
//!
//! Files are only rewritten when their contents change, so OBS isn't told about things that didn't change, and files
//! that are no longer wanted (a player who no longer has a character, say) are removed.

use serde::Deserialize;
use std::{
    collections::HashSet,
    fs,
    path::{Component, Path, PathBuf},
};
use tauri::{AppHandle, Manager, path::BaseDirectory};
use tauri_plugin_opener::OpenerExt;

#[derive(Deserialize)]
pub struct Export {
    data: String,                // the contents of data.json
    texts: Vec<(String, String)>, // file name (without .txt) and what goes in it
    images: Vec<(String, String)>, // file name, and where the picture is under the `images` resource
}

/// Only plain file names: letters, digits, `_`, `-` and `.`, so a name can't point outside its folder.
fn is_plain_name(name: &str) -> bool {
    !name.is_empty() && !name.starts_with('.') && name.chars().all(|c| c.is_ascii_alphanumeric() || "_-.".contains(c))
}

/// Only paths that stay inside the images folder.
fn is_inside(path: &str) -> bool {
    Path::new(path).components().all(|part| matches!(part, Component::Normal(_)))
}

/// One of the folders that ship beside the app as a resource (`images`, `overlay`). In development they are read from the project.
fn resource_folder(app: &AppHandle, name: &str) -> Result<PathBuf, String> {
    let shipped = app.path().resolve(name, BaseDirectory::Resource).map_err(|e| e.to_string())?;
    if shipped.is_dir() {
        return Ok(shipped);
    }
    let project = Path::new(env!("CARGO_MANIFEST_DIR")).join("../static").join(name);
    if cfg!(debug_assertions) && project.is_dir() {
        return Ok(project);
    }
    Err(format!("The app's {name} folder is missing ({})", shipped.display()))
}

/// `shinecast/overlay` in the user's documents: easy to find, writable and the same on every system, unlike the app's own
/// folder (inside a macOS bundle, under Program Files, in a Linux AppImage).
fn overlay_folder(app: &AppHandle) -> Result<PathBuf, String> {
    let documents = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(documents.join("shinecast").join("overlay"))
}

fn write_if_changed(path: &Path, bytes: &[u8]) -> Result<(), String> {
    if fs::read(path).is_ok_and(|existing| existing == bytes) {
        return Ok(());
    }
    fs::write(path, bytes).map_err(|e| format!("Couldn't write {}: {e}", path.display()))
}

/// Copies everything in `from` into `to`, keeping the folders.
fn copy_folder(from: &Path, to: &Path) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|e| format!("Couldn't create {}: {e}", to.display()))?;
    for entry in fs::read_dir(from).map_err(|e| format!("Couldn't read {}: {e}", from.display()))?.flatten() {
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_folder(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), &target).map_err(|e| format!("Couldn't copy {}: {e}", entry.path().display()))?;
        }
    }
    Ok(())
}

/// Creates the overlay folder and its `html` folder if needed, with a marker file in `html` so it's clear where overlay
/// pages go. The first time `html` is created, the overlays that ship with the app are copied into `html/default` for the
/// caster to use and change. After that nothing is copied, so their edits and deletions stick.
fn ensure_overlay_folder(app: &AppHandle) -> Result<PathBuf, String> {
    let overlay = overlay_folder(app)?;
    let html = overlay.join("html");
    let first_time = !html.exists();
    fs::create_dir_all(&html).map_err(|e| format!("Couldn't create {}: {e}", html.display()))?;
    write_if_changed(&html.join("OVERLAY GOES HERE"), b"")?;
    if first_time {
        copy_folder(&resource_folder(app, "overlay")?, &html.join("default"))?;
    }
    Ok(overlay)
}

/// Makes `folder` hold exactly `files` (a name and its contents each): writes the ones that changed and removes the rest.
fn sync_folder(folder: &Path, files: Vec<(String, Vec<u8>)>) -> Result<(), String> {
    fs::create_dir_all(folder).map_err(|e| format!("Couldn't create {}: {e}", folder.display()))?;
    let mut keep = HashSet::new();
    for (name, bytes) in files {
        write_if_changed(&folder.join(&name), &bytes)?;
        keep.insert(name);
    }
    if let Ok(entries) = fs::read_dir(folder) {
        for entry in entries.flatten() {
            if entry.path().is_file() && !keep.contains(entry.file_name().to_string_lossy().as_ref()) {
                let _ = fs::remove_file(entry.path());
            }
        }
    }
    Ok(())
}

/// Writes the overlay folder and returns where it is.
#[tauri::command]
pub fn export_overlay(app: AppHandle, export: Export) -> Result<String, String> {
    let overlay = ensure_overlay_folder(&app)?;
    write_if_changed(&overlay.join("data.json"), export.data.as_bytes())?;

    let mut texts = Vec::new();
    for (name, value) in export.texts {
        if !is_plain_name(&name) {
            return Err(format!("\"{name}\" isn't a usable file name"));
        }
        texts.push((format!("{name}.txt"), value.into_bytes()));
    }
    sync_folder(&overlay.join("text"), texts)?;

    let source = resource_folder(&app, "images")?;
    let mut images = Vec::new();
    for (name, from) in export.images {
        if !is_plain_name(&name) || !is_inside(&from) {
            return Err(format!("\"{name}\" from \"{from}\" isn't a usable image"));
        }
        let bytes = fs::read(source.join(&from)).map_err(|e| format!("Couldn't read the image {from}: {e}"))?;
        images.push((name, bytes));
    }
    sync_folder(&overlay.join("images"), images)?;

    Ok(overlay.to_string_lossy().into_owned())
}

/// Opens the `html` folder, where the overlay pages go, in the file manager.
#[tauri::command]
pub fn open_overlay_folder(app: AppHandle) -> Result<(), String> {
    let html = ensure_overlay_folder(&app)?.join("html");
    app.opener().open_path(html.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}
