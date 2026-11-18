use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    thread::sleep,
    time::{Duration, Instant},
};
use tauri_plugin_opener::OpenerExt;

const LOGIN_TIMEOUT: Duration = Duration::from_secs(120);
const POLL_INTERVAL: Duration = Duration::from_millis(100);
const READ_TIMEOUT: Duration = Duration::from_secs(2);
const MAX_REQUEST_SIZE: usize = 16 * 1024; // start.gg's login codes are long

const DONE_PAGE: &str = "<!doctype html><title>shinecast</title>\
    <body style=\"font:1.25rem sans-serif;text-align:center;margin-top:20vh\">\
    Connected. You can close this tab and go back to shinecast.";

/// Reads one request from the browser and returns its query string if it's the redirect for this sign-in. Anything
/// else (a favicon, another web page) has the wrong path or state and is ignored.
fn callback_query(mut stream: TcpStream, state: &str) -> Option<String> {
    stream.set_nonblocking(false).ok()?; // on some systems the accepted stream inherits the listener's non-blocking mode
    stream.set_read_timeout(Some(READ_TIMEOUT)).ok()?;

    let mut buffer = [0; MAX_REQUEST_SIZE];
    let size = stream.read(&mut buffer).ok()?;
    let request = String::from_utf8_lossy(&buffer[..size]);

    // The first line looks like "GET /callback?code=abc&state=xyz HTTP/1.1".
    let query = request.split_whitespace().nth(1)?.strip_prefix("/callback?")?.to_string();
    let expected = format!("state={state}");
    if !query.split('&').any(|pair| pair == expected) {
        return None;
    }
    write!(stream, "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nConnection: close\r\n\r\n{DONE_PAGE}").ok()?;
    Some(query)
}

/// Waits for the redirect to arrive, giving up after `LOGIN_TIMEOUT`.
fn wait_for_callback(listener: TcpListener, state: &str) -> Result<String, String> {
    let deadline = Instant::now() + LOGIN_TIMEOUT;
    while Instant::now() < deadline {
        match listener.accept() {
            Ok((stream, _)) => {
                if let Some(query) = callback_query(stream, state) {
                    return Ok(query);
                }
            }
            Err(_) => sleep(POLL_INTERVAL), // nobody has connected yet
        }
    }
    Err("Timed out waiting for start.gg".to_string())
}

/// Opens `url` in the browser, then waits for it to redirect to `http://localhost:<port>/callback` with our `state`.
/// Returns that request's query string (`code=...&state=...`).
#[tauri::command]
async fn wait_for_redirect(app: tauri::AppHandle, url: String, port: u16, state: String) -> Result<String, String> {
    // Listen before opening the browser so the redirect can't arrive too early.
    let listener = TcpListener::bind(("127.0.0.1", port)).map_err(|e| format!("port {port} is busy: {e}"))?;
    listener.set_nonblocking(true).map_err(|e| e.to_string())?;
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())?;

    tauri::async_runtime::spawn_blocking(move || wait_for_callback(listener, &state))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![wait_for_redirect])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
