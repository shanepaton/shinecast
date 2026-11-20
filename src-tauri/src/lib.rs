mod overlay;
mod redirect;
mod slippi;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(slippi::Watching::default())
        .invoke_handler(tauri::generate_handler![overlay::export_overlay, overlay::open_overlay_folder, redirect::wait_for_redirect, slippi::watch_slippi, slippi::stop_slippi])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
