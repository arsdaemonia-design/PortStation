use std::env;
use std::path::Path;

fn main() {
    // Ensure rc.exe from Windows Kits is available if not in PATH
    if env::var("RC").is_err() {
        let kit_path = r"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64";
        if Path::new(kit_path).join("rc.exe").exists() {
            if let Ok(current_path) = env::var("PATH") {
                let new_path = format!("{};{}", kit_path, current_path);
                env::set_var("PATH", new_path);
            }
        }
    }

    tauri_build::build()
}
