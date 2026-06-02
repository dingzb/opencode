use std::net::TcpListener;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager};

#[derive(Clone, serde::Serialize)]
struct SidecarInfo {
    url: String,
    username: String,
    password: String,
}

struct SidecarState {
    process: Option<Child>,
    info: Option<SidecarInfo>,
}

#[tauri::command]
fn get_sidecar_server(state: tauri::State<'_, Mutex<SidecarState>>) -> Result<SidecarInfo, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .info
        .clone()
        .ok_or_else(|| "Sidecar not started".to_string())
}

fn find_free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .ok()
        .and_then(|l| l.local_addr().ok().map(|a| a.port()))
        .unwrap_or(14096)
}

fn generate_password() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    format!("{:x}", now)
}

fn sidecar_binary_path(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let ext = if cfg!(target_os = "windows") {
        ".exe"
    } else {
        ""
    };
    let target = if cfg!(target_os = "macos") {
        if cfg!(target_arch = "aarch64") {
            "aarch64-apple-darwin"
        } else {
            "x86_64-apple-darwin"
        }
    } else if cfg!(target_os = "windows") {
        if cfg!(target_arch = "aarch64") {
            "aarch64-pc-windows-msvc"
        } else {
            "x86_64-pc-windows-msvc"
        }
    } else if cfg!(target_arch = "aarch64") {
        "aarch64-unknown-linux-gnu"
    } else {
        "x86_64-unknown-linux-gnu"
    };
    let name = format!("opencode-{}{}", target, ext);

    let cargo_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("binaries")
        .join(&name);
    if cargo_dir.exists() {
        return Some(cargo_dir);
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("binaries").join(&name);
        if bundled.exists() {
            return Some(bundled);
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_sidecar_server])
        .setup(|app| {
            let handle = app.handle().clone();
            let binary = sidecar_binary_path(&handle);
            let port = find_free_port();
            let password = generate_password();
            let url = format!("http://localhost:{}", port);

            if let Some(ref binary_path) = binary {
                let child = Command::new(binary_path)
                    .arg("serve")
                    .arg("--hostname")
                    .arg("localhost")
                    .arg("--port")
                    .arg(port.to_string())
                    .env("OPENCODE_SERVER_USERNAME", "opencode")
                    .env("OPENCODE_SERVER_PASSWORD", &password)
                    .spawn();

                match child {
                    Ok(process) => {
                        let info = SidecarInfo {
                            url: url.clone(),
                            username: "opencode".into(),
                            password,
                        };
                        let _ = app.emit("buzi:sidecar-ready", info.clone());
                        app.manage(Mutex::new(SidecarState {
                            process: Some(process),
                            info: Some(info),
                        }));
                        println!("Buzi sidecar started on {}", url);
                    }
                    Err(e) => {
                        eprintln!("Failed to start opencode sidecar: {}", e);
                        app.manage(Mutex::new(SidecarState {
                            process: None,
                            info: None,
                        }));
                    }
                }
            } else {
                eprintln!("opencode sidecar binary not found");
                app.manage(Mutex::new(SidecarState {
                    process: None,
                    info: None,
                }));
            }

            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if window.label() == "main" {
                    if let Some(state) = window.try_state::<Mutex<SidecarState>>() {
                        if let Ok(mut guard) = state.lock() {
                            if let Some(ref mut child) = guard.process {
                                let _ = child.kill();
                            }
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Buzi");
}
