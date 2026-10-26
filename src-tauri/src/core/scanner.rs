use crate::core::models::CandidateFile;
use std::path::Path;
use walkdir::WalkDir;

pub trait Scanner {
    fn scan_directory(&self, root_path: &Path) -> Result<Vec<CandidateFile>, String>;
}

pub struct LocalFileScanner;

impl LocalFileScanner {
    pub fn new() -> Self {
        Self
    }

    fn is_ignored_directory(entry_name: &str) -> bool {
        matches!(
            entry_name.to_lowercase().as_str(),
            ".git"
                | "node_modules"
                | "target"
                | "__pycache__"
                | "logs"
                | "saves"
                | "screenshots"
                | ".venv"
                | "venv"
                | "toolchain"
                | "busybox"
                | "mingw"
                | "clang"
                | "llvm"
                | "obj"
                | "debug"
                | "build"
        )
    }

    fn is_candidate_executable(filename: &str) -> bool {
        let lower = filename.to_lowercase();
        if lower.starts_with("unins")
            || lower.contains("crashpad")
            || lower.contains("xbcompress")
            || lower.contains("xbdecompress")
            || lower.starts_with("defjamsetup-")
            || lower == "tsc.exe"
            || lower.starts_with("pip")
            || lower.starts_with("python")
        {
            return false;
        }

        lower.ends_with(".exe")
            || lower.ends_with(".bat")
            || lower.ends_with(".cmd")
            || lower.ends_with(".appimage")
            || lower.ends_with(".sh")
    }
}

impl Scanner for LocalFileScanner {
    fn scan_directory(&self, root_path: &Path) -> Result<Vec<CandidateFile>, String> {
        if !root_path.exists() {
            return Err(format!("Path does not exist: {}", root_path.display()));
        }

        let mut results = Vec::new();

        let walker = WalkDir::new(root_path)
            .follow_links(false)
            .into_iter()
            .filter_entry(|e| {
                if e.file_type().is_dir() {
                    !Self::is_ignored_directory(e.file_name().to_string_lossy().as_ref())
                } else {
                    true
                }
            });

        for entry in walker.filter_map(|e| e.ok()) {
            if entry.file_type().is_file() {
                let path = entry.path();
                let fname = entry.file_name().to_string_lossy();
                let is_exec = Self::is_candidate_executable(&fname);

                if is_exec {
                    let metadata = entry.metadata().map_err(|e| e.to_string())?;
                    results.push(CandidateFile {
                        path: path.to_string_lossy().to_string(),
                        filename: entry.file_name().to_string_lossy().to_string(),
                        size: metadata.len(),
                        is_executable: true,
                    });
                }
            }
        }

        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{create_dir, File};
    use tempfile::tempdir;

    #[test]
    fn test_scanner_finds_executables_and_ignores_git() {
        let temp = tempdir().expect("Failed to create tempdir");
        let root = temp.path();

        // Create an executable candidate
        let fake_exe = root.join("game.exe");
        File::create(&fake_exe).expect("Failed to create fake exe");

        // Create ignored directory with an exe
        let git_dir = root.join(".git");
        create_dir(&git_dir).expect("Failed to create .git dir");
        let git_exe = git_dir.join("ignored.exe");
        File::create(&git_exe).expect("Failed to create ignored exe");

        let scanner = LocalFileScanner::new();
        let candidates = scanner.scan_directory(root).expect("Scan failed");

        assert_eq!(candidates.len(), 1);
        assert_eq!(candidates[0].filename, "game.exe");
    }

    #[test]
    fn test_scanner_does_not_treat_def_jam_setup_as_installed_game() {
        assert!(!LocalFileScanner::is_candidate_executable(
            "DefJamSetup-0.10.5-windows-x64.exe"
        ));
        assert!(LocalFileScanner::is_candidate_executable("DefJamFFNY.exe"));
        assert!(LocalFileScanner::is_candidate_executable(
            "DefJamLauncher.exe"
        ));
    }
}
