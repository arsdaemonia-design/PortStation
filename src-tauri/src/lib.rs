pub mod core;

use crate::core::launcher::{LaunchRunner, SafeProcessLauncher};
use crate::core::library::DatabaseManager;
use crate::core::matcher::{HeuristicMatcher, Matcher};
use crate::core::models::{CandidateFile, Installation, MatchStatus, PortMethod};
use crate::core::registry::{EmbeddedSeedRegistry, Registry};
use crate::core::scanner::{LocalFileScanner, Scanner};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetectedGameDTO {
    pub id: String,
    pub title: String,
    #[serde(rename = "originalPlatform")]
    pub original_platform: String,
    #[serde(rename = "releaseYear")]
    pub release_year: Option<u32>,
    pub developer: Option<String>,
    pub synopsis: Option<String>,
    #[serde(rename = "boxArtUrl")]
    pub box_art_url: Option<String>,
    #[serde(rename = "discArtUrl")]
    pub disc_art_url: Option<String>,
    #[serde(rename = "subGames")]
    pub sub_games: Option<Vec<crate::core::models::SubGame>>,

    #[serde(rename = "projectTitle")]
    pub project_title: String,
    pub method: PortMethod,
    pub status: MatchStatus,
    pub author: Option<String>,
    #[serde(rename = "authorAvatarUrl")]
    pub author_avatar_url: Option<String>,
    #[serde(rename = "portArtUrl")]
    pub port_art_url: Option<String>,
    #[serde(rename = "repositoryUrl")]
    pub repository_url: Option<String>,
    pub features: Vec<String>,
    #[serde(rename = "technicalNotes")]
    pub technical_notes: Option<String>,

    #[serde(rename = "executablePath")]
    pub executable_path: String,
    #[serde(rename = "installPath")]
    pub install_path: String,
    pub sha256: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogPortDTO {
    pub id: String,
    pub game_id: String,
    pub title: String,
    pub original_platform: String,
    pub release_year: Option<u32>,
    pub developer: Option<String>,
    pub synopsis: Option<String>,
    pub box_art_url: Option<String>,
    pub project_title: String,
    pub method: PortMethod,
    pub author: Option<String>,
    pub repository_url: Option<String>,
    pub features: Vec<String>,
    pub technical_notes: Option<String>,
    pub supported_platforms: Vec<String>,
    pub supported_platforms_complete: bool,
    pub installed: bool,
}

pub struct AppState {
    pub db: Mutex<DatabaseManager>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubReleaseAsset {
    pub name: String,
    pub size: u64,
    #[serde(alias = "browser_download_url")]
    pub download_url: String,
    pub digest: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubReleaseInfo {
    #[serde(rename = "tag_name")]
    pub tag_name: String,
    pub name: Option<String>,
    #[serde(rename = "html_url")]
    pub url: String,
    #[serde(rename = "published_at")]
    pub published_at: Option<String>,
    pub prerelease: bool,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub assets: Vec<GitHubReleaseAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub arch: String,
    pub is_steam_deck: bool,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateAsset {
    pub name: String,
    pub download_url: String,
    pub size_bytes: u64,
    pub platform: String,
    pub is_recommended: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppUpdateCheckResult {
    pub status: String,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_name: Option<String>,
    pub release_notes: Option<String>,
    pub published_at: Option<String>,
    pub html_url: Option<String>,
    pub platform: PlatformInfo,
    pub recommended_asset: Option<AppUpdateAsset>,
    pub windows_assets: Vec<AppUpdateAsset>,
    pub linux_assets: Vec<AppUpdateAsset>,
    pub android_assets: Vec<AppUpdateAsset>,
    pub macos_assets: Vec<AppUpdateAsset>,
    pub other_assets: Vec<AppUpdateAsset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubUpdateCheck {
    pub status: String,
    pub current_version: Option<String>,
    pub latest_version: Option<String>,
    pub releases: Vec<GitHubReleaseInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadedGitHubAsset {
    pub path: String,
    pub bytes: u64,
    pub sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogSyncResult {
    pub status: String,
    pub local_version: String,
    pub remote_version: String,
    pub new_games_count: usize,
    pub updated_games_count: usize,
    pub total_projects_count: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogInfoDTO {
    pub catalog_version: String,
    pub total_projects: usize,
    pub official_repo_url: String,
}

static APP_DATA_DIR_OVERRIDE: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

pub fn get_portstation_data_dir() -> Result<PathBuf, String> {
    if let Ok(custom) = std::env::var("PORTSTATION_DATA_DIR") {
        let p = PathBuf::from(custom);
        let _ = std::fs::create_dir_all(&p);
        return Ok(p);
    }

    if let Some(override_dir) = APP_DATA_DIR_OVERRIDE.get() {
        let _ = std::fs::create_dir_all(override_dir);
        return Ok(override_dir.clone());
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("APPDATA") {
            let p = PathBuf::from(appdata).join("PortStation");
            let _ = std::fs::create_dir_all(&p);
            return Ok(p);
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let p = PathBuf::from(home)
                .join("Library")
                .join("Application Support")
                .join("PortStation");
            let _ = std::fs::create_dir_all(&p);
            return Ok(p);
        }
    }

    if let Ok(xdg) = std::env::var("XDG_DATA_HOME") {
        let p = PathBuf::from(xdg).join("PortStation");
        let _ = std::fs::create_dir_all(&p);
        return Ok(p);
    }
    if let Ok(home) = std::env::var("HOME") {
        let p = PathBuf::from(home)
            .join(".local")
            .join("share")
            .join("PortStation");
        let _ = std::fs::create_dir_all(&p);
        return Ok(p);
    }

    let p = std::env::temp_dir().join("PortStation");
    let _ = std::fs::create_dir_all(&p);
    Ok(p)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VirusTotalAuditResult {
    pub sha256: String,
    pub found: bool,
    pub malicious: u32,
    pub suspicious: u32,
    pub undetected: u32,
    pub total: u32,
    pub popular_threat_label: Option<String>,
    pub defender_clean: bool,
    pub kaspersky_clean: bool,
    pub bitdefender_clean: bool,
    pub permalink: String,
    pub positives: u32,
    pub microsoft_defender_clean: bool,
    pub threat_classification: Option<String>,
}

pub fn compute_sha256_of_file(file_path: &Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| format!("Error al abrir archivo para calcular hash: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let count = file.read(&mut buffer)
            .map_err(|e| format!("Error al leer archivo para hash: {}", e))?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }
    Ok(hex::encode(hasher.finalize()))
}

fn safe_path_component(value: &str) -> String {
    let cleaned: String = value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
                character
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches(|character| matches!(character, '.' | ' ' | '_'));
    if trimmed.is_empty() {
        "port".to_string()
    } else {
        trimmed.to_string()
    }
}

fn github_repo_api_url(repository_url: &str) -> Result<String, String> {
    let path = repository_url
        .trim()
        .strip_prefix("https://github.com/")
        .ok_or_else(|| "El repositorio debe ser una URL de github.com".to_string())?;

    let mut parts = path.split('/');
    let owner = parts.next().unwrap_or_default();
    let repo = parts.next().unwrap_or_default().trim_end_matches(".git");
    if owner.is_empty()
        || repo.is_empty()
        || owner.chars().any(|c| matches!(c, '?' | '#' | '@' | ':'))
        || repo.chars().any(|c| matches!(c, '?' | '#' | '@' | ':'))
    {
        return Err("La URL no contiene un propietario y repositorio válidos".to_string());
    }

    Ok(format!(
        "https://api.github.com/repos/{}/{}/releases?per_page=20",
        owner, repo
    ))
}

fn releases_for_version_display(releases: Vec<GitHubReleaseInfo>) -> Vec<GitHubReleaseInfo> {
    let stable: Vec<_> = releases
        .iter()
        .filter(|release| !release.prerelease)
        .take(5)
        .cloned()
        .collect();
    if stable.is_empty() {
        releases.into_iter().take(5).collect()
    } else {
        stable
    }
}

fn is_explorable_port(method: &PortMethod, repository_url: Option<&str>) -> bool {
    !matches!(method, PortMethod::UNKNOWN)
        && repository_url.is_some_and(|url| github_repo_api_url(url).is_ok())
}

fn is_explorable_catalog_entry(entry: &serde_json::Value) -> bool {
    let Some(project) = entry.get("project") else {
        return false;
    };
    let Some(method) = project
        .get("method")
        .cloned()
        .and_then(|value| serde_json::from_value::<PortMethod>(value).ok())
    else {
        return false;
    };
    let repository_url = project
        .get("repository_url")
        .and_then(serde_json::Value::as_str)
        .or_else(|| {
            project
                .pointer("/repository/url")
                .and_then(serde_json::Value::as_str)
        });
    is_explorable_port(&method, repository_url)
}

fn is_legacy_local_only_entry(entry: &serde_json::Value) -> bool {
    entry
        .get("id")
        .and_then(serde_json::Value::as_str)
        .is_some_and(|id| id.starts_with("unidentified-"))
        && !is_explorable_catalog_entry(entry)
}

#[tauri::command(async)]
fn check_github_updates(
    repository_url: String,
    current_version: Option<String>,
    auth_token: Option<String>,
) -> Result<GitHubUpdateCheck, String> {
    let api_url = github_repo_api_url(&repository_url)?;
    let mut req = ureq::get(&api_url)
        .set("User-Agent", "PortStation")
        .set("Accept", "application/vnd.github+json")
        .timeout(std::time::Duration::from_secs(12));

    if let Some(token) = auth_token.filter(|t| !t.trim().is_empty()) {
        req = req.set("Authorization", &format!("Bearer {}", token.trim()));
    }

    let response = req
        .call()
        .map_err(|e| format!("No se pudieron consultar las releases: {}", e))?
        .into_string()
        .map_err(|e| format!("No se pudo leer la respuesta de GitHub: {}", e))?;
    let releases: Vec<GitHubReleaseInfo> = serde_json::from_str(&response)
        .map_err(|e| format!("GitHub devolvió una respuesta inesperada: {}", e))?;
    let releases = releases_for_version_display(releases);

    let latest_version = releases.first().map(|release| release.tag_name.clone());
    let status = match (current_version.as_deref(), releases.first()) {
        (Some(current), Some(latest)) => {
            let semver_result = compare_semver_strings(&latest.tag_name, current);
            if semver_result != "comparison_unavailable" {
                semver_result
            } else {
                let normalize = |version: &str| {
                    version
                        .trim()
                        .trim_start_matches(|c| c == 'v' || c == 'V')
                        .to_ascii_lowercase()
                };
                let current_normalized = normalize(current);
                let latest_normalized = normalize(&latest.tag_name);
                if current_normalized == latest_normalized {
                    "up_to_date"
                } else if releases
                    .iter()
                    .position(|release| normalize(&release.tag_name) == current_normalized)
                    .is_some_and(|position| position > 0)
                {
                    "update_available"
                } else {
                    "comparison_unavailable"
                }
            }
        }
        (Some(_), None) => "no_releases",
        (None, Some(_)) => "installed_version_unknown",
        (None, None) => "no_releases",
    };

    Ok(GitHubUpdateCheck {
        status: status.to_string(),
        current_version,
        latest_version,
        releases,
    })
}

#[tauri::command]
fn list_catalog_ports(state: State<AppState>) -> Result<Vec<CatalogPortDTO>, String> {
    let registry = EmbeddedSeedRegistry::new();
    let installed_project_ids: std::collections::HashSet<String> = state
        .db
        .lock()
        .map_err(|_| "No se pudo acceder a la biblioteca local".to_string())?
        .list_installations()
        .map_err(|e| format!("No se pudieron leer las instalaciones: {}", e))?
        .into_iter()
        .map(|installation| installation.project_id)
        .collect();

    let ports = registry
        .list_all_projects()
        // The explore view is a GitHub-backed catalog, not a mirror of the
        // user's scanned library. Unknown/local games and ports without a
        // usable GitHub repository stay in the library only.
        .into_iter()
        .filter(|project| {
            let repository_url = project.repository_url.as_deref().or_else(|| {
                project
                    .repository
                    .as_ref()
                    .map(|repository| repository.url.as_str())
            });
            is_explorable_port(&project.method, repository_url)
        })
        .map(|project| {
            let game = registry.find_game(&project.game_id);
            let repository_url = project.repository_url.clone().or_else(|| {
                project
                    .repository
                    .as_ref()
                    .map(|repository| repository.url.clone())
            });
            CatalogPortDTO {
                id: project.id.clone(),
                game_id: project.game_id,
                title: game
                    .as_ref()
                    .map(|item| item.title.clone())
                    .unwrap_or_else(|| project.name.clone()),
                original_platform: game
                    .as_ref()
                    .map(|item| item.original_platforms.join(" / "))
                    .unwrap_or_else(|| "Plataforma no especificada".to_string()),
                release_year: game.as_ref().and_then(|item| item.release_year),
                developer: game.as_ref().and_then(|item| item.developer.clone()),
                synopsis: game.as_ref().and_then(|item| item.synopsis.clone()),
                box_art_url: game.as_ref().and_then(|item| item.box_art_url.clone()),
                project_title: project.name,
                method: project.method,
                author: project.author,
                repository_url,
                features: project.features,
                technical_notes: project.technical_notes,
                supported_platforms: project.supported_platforms,
                supported_platforms_complete: project.supported_platforms_complete,
                installed: installed_project_ids.contains(&project.id),
            }
        })
        .collect();

    Ok(ports)
}

pub fn split_package_stem_and_ext(file_name: &str) -> Option<(&str, &str)> {
    const COMPOUND_EXTENSIONS: [&str; 4] = [".tar.gz", ".tar.xz", ".tar.zst", ".tar.bz2"];
    const SINGLE_EXTENSIONS: [&str; 15] = [
        ".zip",
        ".rar",
        ".7z",
        ".tgz",
        ".exe",
        ".msi",
        ".appimage",
        ".deb",
        ".rpm",
        ".apk",
        ".aab",
        ".dmg",
        ".pkg",
        ".flatpak",
        ".ipa",
    ];

    let lower = file_name.to_ascii_lowercase();
    for ext in COMPOUND_EXTENSIONS {
        if lower.ends_with(ext) && file_name.len() > ext.len() {
            let split_idx = file_name.len() - ext.len();
            return Some((&file_name[..split_idx], &ext[1..]));
        }
    }
    for ext in SINGLE_EXTENSIONS {
        if lower.ends_with(ext) && file_name.len() > ext.len() {
            let split_idx = file_name.len() - ext.len();
            return Some((&file_name[..split_idx], &ext[1..]));
        }
    }
    None
}

fn resolve_catalog_download_dir(
    project_id: &str,
    target_dir: Option<&str>,
) -> Result<PathBuf, String> {
    let safe_id = safe_path_component(project_id);
    if let Some(raw_root) = target_dir {
        let trimmed = raw_root.trim();
        if !trimmed.is_empty() {
            let expanded = expand_tilde_path(trimmed);
            let library_downloads = expanded.join("Descargas").join(&safe_id);
            if std::fs::create_dir_all(&library_downloads).is_ok() {
                return Ok(library_downloads);
            }
        }
    }
    let data_dir = get_portstation_data_dir()?;
    let fallback_dir = data_dir.join("downloads").join(&safe_id);
    std::fs::create_dir_all(&fallback_dir)
        .map_err(|e| format!("No se pudo crear la carpeta de descargas: {}", e))?;
    Ok(fallback_dir)
}

fn open_directory_in_os(directory: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(directory)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el Explorador de archivos: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(directory)
            .spawn()
            .map_err(|e| format!("No se pudo abrir la carpeta: {}", e))?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        if std::process::Command::new("xdg-open")
            .arg(directory)
            .spawn()
            .is_err()
        {
            // Fallback for WSL2 where xdg-open is absent: convert path via wslpath and open Windows Explorer
            let wsl_win_path = std::process::Command::new("wslpath")
                .args(["-w", &directory.to_string_lossy()])
                .output()
                .ok()
                .filter(|o| o.status.success())
                .and_then(|o| String::from_utf8(o.stdout).ok())
                .map(|s| s.trim().to_string());
            if let Some(win_dir) = wsl_win_path {
                if std::process::Command::new("explorer.exe")
                    .arg(&win_dir)
                    .spawn()
                    .is_ok()
                {
                    return Ok(());
                }
            }
            return Err(format!(
                "No se pudo abrir el gestor gráfico. Ruta descargada: {}",
                directory.display()
            ));
        }
    }
    Ok(())
}

#[tauri::command]
async fn download_catalog_zip(
    project_id: String,
    asset_download_url: String,
    asset_name: String,
    expected_sha256: Option<String>,
    target_dir: Option<String>,
) -> Result<DownloadedGitHubAsset, String> {
    tauri::async_runtime::spawn_blocking(move || {
        const MAX_DOWNLOAD_BYTES: u64 = 8 * 1024 * 1024 * 1024;

        let registry = EmbeddedSeedRegistry::new();
        let project = registry
            .find_project(&project_id)
            .ok_or_else(|| "El proyecto no está en el catálogo local".to_string())?;
        let repository_url = project
            .repository_url
            .clone()
            .or_else(|| {
                project
                    .repository
                    .as_ref()
                    .map(|repository| repository.url.clone())
            })
            .ok_or_else(|| "El proyecto no tiene repositorio registrado".to_string())?;
        github_repo_api_url(&repository_url)?;
        let path = repository_url
            .trim()
            .strip_prefix("https://github.com/")
            .ok_or_else(|| "El repositorio debe ser una URL HTTPS de GitHub".to_string())?;
        let mut parts = path.split('/');
        let owner = parts.next().unwrap_or_default();
        let repo = parts.next().unwrap_or_default().trim_end_matches(".git");
        let allowed_prefix = format!("https://github.com/{}/{}/releases/download/", owner, repo);
        let file_name = safe_path_component(&asset_name);
        let Some((stem, ext)) = split_package_stem_and_ext(&file_name) else {
            return Err("Solo se permiten paquetes válidos de releases del repositorio registrado (.zip, .7z, .tar.gz, .AppImage, .apk, etc.)".to_string());
        };

        if !asset_download_url.starts_with(&allowed_prefix)
            || asset_download_url.contains('?')
            || asset_download_url.contains('#')
        {
            return Err("La URL del asset no pertenece a las releases del repositorio registrado".to_string());
        }
        let download_dir = resolve_catalog_download_dir(&project_id, target_dir.as_deref())?;

        let response = ureq::get(&asset_download_url)
            .set("User-Agent", "PortStation")
            .timeout(std::time::Duration::from_secs(120))
            .call()
            .map_err(|e| format!("No se pudo descargar el archivo: {}", e))?;
        if let Some(content_length) = response
            .header("Content-Length")
            .and_then(|value| value.parse::<u64>().ok())
        {
            if content_length > MAX_DOWNLOAD_BYTES {
                return Err("El archivo supera el límite de descarga de 8 GiB".to_string());
            }
        }

        let final_file_name = format!("{}.{}", stem, ext);
        let final_path = download_dir.join(&final_file_name);
        let partial_path = download_dir.join(format!("{}.part", final_file_name));
        let mut file = std::fs::File::create(&partial_path)
            .map_err(|e| format!("No se pudo crear el archivo temporal: {}", e))?;
        let mut limited_reader = response.into_reader().take(MAX_DOWNLOAD_BYTES + 1);
        let bytes = match std::io::copy(&mut limited_reader, &mut file) {
            Ok(bytes) => bytes,
            Err(error) => {
                drop(file);
                let _ = std::fs::remove_file(&partial_path);
                return Err(format!("Falló la escritura del archivo descargado: {}", error));
            }
        };
        drop(file);
        if bytes > MAX_DOWNLOAD_BYTES {
            let _ = std::fs::remove_file(&partial_path);
            return Err("El archivo supera el límite de descarga de 8 GiB".to_string());
        }

        let sha256 = crate::core::fingerprint::FingerprintInspector::compute_sha256(&partial_path)
            .map_err(|e| {
                let _ = std::fs::remove_file(&partial_path);
                format!("No se pudo verificar el archivo descargado: {}", e)
            })?;
        if let Some(expected) = expected_sha256 {
            let expected = expected.strip_prefix("sha256:").unwrap_or(&expected);
            if !expected.eq_ignore_ascii_case(&sha256) {
                let _ = std::fs::remove_file(&partial_path);
                return Err(
                    "El SHA-256 descargado no coincide con el digest publicado por GitHub"
                        .to_string(),
                );
            }
        }
        if final_path.exists() {
            let _ = std::fs::remove_file(&final_path);
        }
        std::fs::rename(&partial_path, &final_path).map_err(|e| {
            let _ = std::fs::remove_file(&partial_path);
            format!("No se pudo finalizar el archivo descargado: {}", e)
        })?;

        Ok(DownloadedGitHubAsset {
            path: final_path.to_string_lossy().to_string(),
            bytes,
            sha256,
        })
    })
    .await
    .map_err(|e| format!("Falló la tarea de descarga: {}", e))?
}

#[tauri::command]
fn open_catalog_download_folder(
    project_id: String,
    target_dir: Option<String>,
) -> Result<(), String> {
    let safe_id = safe_path_component(&project_id);
    if let Some(ref raw_root) = target_dir {
        let trimmed = raw_root.trim();
        if !trimmed.is_empty() {
            let candidate = expand_tilde_path(trimmed).join("Descargas").join(&safe_id);
            if candidate.is_dir() {
                return open_directory_in_os(&candidate);
            }
        }
    }
    let data_dir = get_portstation_data_dir()?;
    let directory = data_dir.join("downloads").join(&safe_id);
    if !directory.is_dir() {
        return Err("Todavía no existe una carpeta de descarga para este port".to_string());
    }
    open_directory_in_os(&directory)
}

#[tauri::command]
fn open_game_folder(executable_path: String) -> Result<(), String> {
    let executable = Path::new(&executable_path);
    let directory = executable
        .parent()
        .filter(|path| path.is_dir())
        .ok_or_else(|| "No se encontró la carpeta del ejecutable asignado".to_string())?;
    open_directory_in_os(directory)
}

pub fn expand_tilde_path(raw_path: &str) -> PathBuf {
    let trimmed = raw_path.trim();
    if trimmed == "~" {
        if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
            return PathBuf::from(home);
        }
    } else if let Some(rest) = trimmed
        .strip_prefix("~/")
        .or_else(|| trimmed.strip_prefix("~\\"))
    {
        if let Ok(home) = std::env::var("HOME").or_else(|_| std::env::var("USERPROFILE")) {
            return PathBuf::from(home).join(rest);
        }
    }
    PathBuf::from(trimmed)
}

#[tauri::command(async)]
fn scan_and_match(
    root_path: String,
    state: State<AppState>,
) -> Result<Vec<DetectedGameDTO>, String> {
    let scanner = LocalFileScanner::new();
    let registry = EmbeddedSeedRegistry::new();
    let matcher = HeuristicMatcher::new(registry.list_all_projects());

    let root_buf = expand_tilde_path(&root_path);
    let root = root_buf.as_path();
    let candidates = scanner.scan_directory(root)?;

    let mut best_matches: HashMap<String, (crate::core::matcher::MatchEvaluation, CandidateFile)> =
        HashMap::new();

    for cand in &candidates {
        let eval = matcher.evaluate_candidate(cand, None);
        if eval.status != MatchStatus::UNKNOWN {
            if let Some(proj_id) = &eval.matched_project_id {
                let should_replace = match best_matches.get(proj_id) {
                    Some((existing_eval, _)) => eval.score > existing_eval.score,
                    None => true,
                };
                if should_replace {
                    best_matches.insert(proj_id.clone(), (eval, cand.clone()));
                }
            }
        }
    }

    let mut detected = Vec::new();

    for (proj_id, (eval, cand)) in &best_matches {
        if let Some(project) = registry.find_project(&proj_id) {
            let game = registry.find_game(&project.game_id);
            let title = game
                .as_ref()
                .map(|g| g.title.clone())
                .unwrap_or_else(|| project.name.clone());
            let platform = game
                .as_ref()
                .map(|g| g.original_platforms.join(" / "))
                .unwrap_or_else(|| "PC".to_string());
            let year = game.as_ref().and_then(|g| g.release_year);
            let developer = game.as_ref().and_then(|g| g.developer.clone());
            let synopsis = game.as_ref().and_then(|g| g.synopsis.clone());
            let box_art_url = game.as_ref().and_then(|g| g.box_art_url.clone());
            let disc_art_url = game.as_ref().and_then(|g| g.disc_art_url.clone());
            let sub_games = game.as_ref().and_then(|g| g.sub_games.clone());

            let exec_path = PathBuf::from(&cand.path);
            let mut final_exec_path = cand.path.clone();
            let mut final_working_dir = exec_path
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| root_path.clone());
            let mut final_status = eval.status.clone();

            // If an existing installation is saved with a valid executable, preserve it
            if let Ok(db) = state.db.lock() {
                if let Ok(saved_list) = db.list_installations() {
                    if let Some(existing) = saved_list.into_iter().find(|i| &i.id == proj_id) {
                        if Path::new(&existing.executable_path).exists() {
                            final_exec_path = existing.executable_path;
                            final_working_dir = existing.working_dir;
                            final_status = existing.status;
                        }
                    }
                }
            }

            let inst = Installation {
                id: proj_id.clone(),
                game_id: project.game_id.clone(),
                project_id: proj_id.clone(),
                executable_path: final_exec_path.clone(),
                working_dir: final_working_dir.clone(),
                status: final_status.clone(),
                sha256: None,
                detected_version: None,
            };

            // Persist to local SQLite
            if let Ok(db) = state.db.lock() {
                let _ = db.save_installation(&inst);
            }

            detected.push(DetectedGameDTO {
                id: project.game_id.clone(),
                title,
                original_platform: platform,
                release_year: year,
                developer,
                synopsis,
                box_art_url,
                disc_art_url,
                sub_games,
                project_title: project.name,
                method: project.method,
                status: final_status,
                author: project.author,
                author_avatar_url: project.author_avatar_url,
                port_art_url: project.port_art_url,
                repository_url: project.repository_url,
                features: project.features,
                technical_notes: project.technical_notes,
                executable_path: final_exec_path,
                install_path: final_working_dir,
                sha256: None,
                version: None,
            });
        }
    }

    // Identify unmatched folders containing candidate executables
    let mut verified_folders: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();
    for (_, (_, cand)) in &best_matches {
        let p = Path::new(&cand.path);
        if let Ok(rel) = p.strip_prefix(root) {
            if let Some(first) = rel.components().next() {
                verified_folders.insert(root.join(first));
            }
        }
    }

    let mut unmatched_by_folder: HashMap<PathBuf, Vec<CandidateFile>> = HashMap::new();
    for cand in candidates {
        let p = Path::new(&cand.path);
        if let Ok(rel) = p.strip_prefix(root) {
            if let Some(first) = rel.components().next() {
                let folder = root.join(first);
                if !verified_folders.contains(&folder) {
                    unmatched_by_folder.entry(folder).or_default().push(cand);
                }
            }
        }
    }

    for (folder, cands) in unmatched_by_folder {
        let folder_name = folder
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Desconocido")
            .to_string();

        let mut best_cand: Option<&CandidateFile> = None;
        let mut best_cand_score = 0;

        for c in &cands {
            let mut score = 10;
            let c_path = Path::new(&c.path);
            if c_path.parent() == Some(&folder) {
                score += 50; // Direct child of the game folder
            }
            let c_lower = c.filename.to_lowercase();
            let f_lower = folder_name.to_lowercase();
            let base_name = c_lower.replace(".exe", "");
            if base_name.len() > 3 && f_lower.contains(&base_name) {
                score += 30; // Matches folder name
            }
            if score > best_cand_score {
                best_cand_score = score;
                best_cand = Some(c);
            }
        }

        if let Some(chosen) = best_cand {
            let slug: String = folder_name
                .to_lowercase()
                .chars()
                .map(|c| if c.is_alphanumeric() { c } else { '-' })
                .collect();
            let unverified_id = format!("unidentified-{}", slug);
            let chosen_path = PathBuf::from(&chosen.path);
            let working_dir = chosen_path
                .parent()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| root_path.clone());

            detected.push(DetectedGameDTO {
                id: unverified_id,
                title: folder_name.clone(),
                original_platform: "Sin Catalogar".to_string(),
                release_year: None,
                developer: None,
                synopsis: Some("Puerto nativo o ejecutable detectado en la carpeta de ports. Puedes vincularlo a un proyecto oficial o registrarlo en GitHub.".to_string()),
                box_art_url: None,
                disc_art_url: None,
                sub_games: None,
                project_title: "Proyecto no catalogado".to_string(),
                method: PortMethod::UNKNOWN,
                status: MatchStatus::UNKNOWN,
                author: Some("Comunidad / No identificado".to_string()),
                author_avatar_url: None,
                port_art_url: None,
                repository_url: None,
                features: vec![
                    "Detectado por escaneo de binario".to_string(),
                    "Listo para vincular o registrar".to_string(),
                ],
                technical_notes: Some(format!("Ruta del ejecutable: {}", chosen.path)),
                executable_path: chosen.path.clone(),
                install_path: working_dir,
                sha256: None,
                version: None,
            });
        }
    }

    Ok(detected)
}

#[tauri::command]
fn list_saved_installations(state: State<AppState>) -> Result<Vec<Installation>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_installations().map_err(|e| e.to_string())
}

#[tauri::command]
fn update_game_executable(
    id: String,
    executable_path: String,
    state: State<AppState>,
) -> Result<(), String> {
    let p = Path::new(&executable_path);
    let working_dir = p
        .parent()
        .map(|d| d.to_string_lossy().to_string())
        .unwrap_or_default();

    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_executable_path(&id, &executable_path, &working_dir)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn launch_game(
    app: tauri::AppHandle,
    executable_path: String,
    working_dir: String,
) -> Result<u32, String> {
    use tauri::Emitter;
    use tauri::Manager;

    let launcher = SafeProcessLauncher::new();
    let mut child = launcher.launch_child(
        Path::new(&executable_path),
        Path::new(&working_dir),
        &[],
        &LaunchRunner::Native,
    )?;

    let pid = child.id();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        let _ = child.wait();
        let _ = app_handle.emit("game-exited", pid);
        #[cfg(desktop)]
        if let Some(window) = app_handle.get_webview_window("main") {
            let _ = window.set_focus();
        }
    });

    Ok(pid)
}

#[tauri::command(async)]
fn pick_folder(
    app: tauri::AppHandle,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    #[cfg(desktop)]
    {
        use tauri_plugin_dialog::DialogExt;
        let mut builder = app.dialog().file();
        if let Some(ref d) = default_path {
            let expanded = expand_tilde_path(d);
            if expanded.is_dir() {
                builder = builder.set_directory(expanded);
            }
        }
        let res = builder.blocking_pick_folder();
        return Ok(res.map(|p| p.to_string()));
    }
    #[cfg(mobile)]
    {
        let _ = (app, default_path);
        Err("En Android puedes escribir o editar la ruta manualmente en Configuración → Carpetas de la Biblioteca.".to_string())
    }
}

#[tauri::command(async)]
fn pick_executable(
    app: tauri::AppHandle,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    #[allow(unused_mut)]
    let mut builder = app
        .dialog()
        .file()
        .add_filter(
            "Ejecutables (*.exe, *.bat, *.cmd, *.AppImage, *.sh, *.elf)",
            &["exe", "bat", "cmd", "AppImage", "appimage", "sh", "bin", "elf"],
        )
        .add_filter("Todos los archivos (incluye binarios ELF sin extensión)", &["*"]);
    #[cfg(desktop)]
    if let Some(ref d) = default_path {
        let expanded = expand_tilde_path(d);
        if expanded.is_dir() {
            builder = builder.set_directory(expanded);
        }
    }
    #[cfg(mobile)]
    let _ = default_path;
    let res = builder.blocking_pick_file();
    Ok(res.map(|p| p.to_string()))
}

#[tauri::command(async)]
fn pick_image_file(
    app: tauri::AppHandle,
    default_path: Option<String>,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    #[allow(unused_mut)]
    let mut builder = app.dialog().file().add_filter(
        "Imágenes (*.png, *.jpg, *.jpeg, *.webp)",
        &["png", "jpg", "jpeg", "webp"],
    );
    #[cfg(desktop)]
    if let Some(ref d) = default_path {
        let expanded = expand_tilde_path(d);
        if expanded.is_dir() {
            builder = builder.set_directory(expanded);
        }
    }
    #[cfg(mobile)]
    let _ = default_path;
    let res = builder.blocking_pick_file();
    Ok(res.map(|p| p.to_string()))
}

#[tauri::command]
fn update_game_artwork(
    game_id: String,
    box_art_url: Option<String>,
    disc_art_url: Option<String>,
    port_art_url: Option<String>,
) -> Result<(), String> {
    let dir = get_portstation_data_dir()?;
    let file_path = dir.join("ports_db.json");

    if !file_path.exists() {
        let _ = std::fs::create_dir_all(&dir);
        let embedded = include_str!("../ports_db.json");
        let _ = std::fs::write(&file_path, embedded);
    }

    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let mut parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(games) = parsed.get_mut("games").and_then(|g| g.as_array_mut()) {
        for entry in games {
            if entry.get("id").and_then(|i| i.as_str()) == Some(&game_id) {
                if let Some(ref b) = box_art_url {
                    entry["box_art_url"] = if b.trim().is_empty() {
                        serde_json::Value::Null
                    } else {
                        serde_json::Value::String(b.trim().to_string())
                    };
                }
                if let Some(ref d) = disc_art_url {
                    entry["disc_art_url"] = if d.trim().is_empty() {
                        serde_json::Value::Null
                    } else {
                        serde_json::Value::String(d.trim().to_string())
                    };
                }
                if let Some(ref p) = port_art_url {
                    if let Some(proj) = entry.get_mut("project").and_then(|pr| pr.as_object_mut()) {
                        let val = if p.trim().is_empty() {
                            serde_json::Value::Null
                        } else {
                            serde_json::Value::String(p.trim().to_string())
                        };
                        proj.insert("port_art_url".to_string(), val);
                    }
                }
            }
        }
    }

    let updated_json = serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())?;
    if file_path.exists() {
        let _ = std::fs::copy(&file_path, dir.join("ports_db.bak"));
    }
    std::fs::write(&file_path, &updated_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn update_game_metadata(
    game_id: String,
    title: String,
    project_title: String,
    original_platform: String,
    release_year: Option<u32>,
    developer: Option<String>,
    author: Option<String>,
    method: String,
    repository_url: Option<String>,
    synopsis: Option<String>,
    technical_notes: Option<String>,
    features: Option<Vec<String>>,
) -> Result<(), String> {
    // Unknown scanned games belong to the user's private library metadata,
    // persisted by the frontend, not to the shared Explore catalog. Only keep
    // an unidentified entry in the local catalog when it is a real community
    // port with a valid GitHub repository.
    let parsed_method = serde_json::from_str::<PortMethod>(&format!("\"{}\"", method))
        .unwrap_or(PortMethod::UNKNOWN);
    if game_id.starts_with("unidentified-")
        && !is_explorable_port(&parsed_method, repository_url.as_deref())
    {
        return Ok(());
    }

    let dir = get_portstation_data_dir()?;
    let file_path = dir.join("ports_db.json");

    if !file_path.exists() {
        let _ = std::fs::create_dir_all(&dir);
        let embedded = include_str!("../ports_db.json");
        let _ = std::fs::write(&file_path, embedded);
    }

    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let mut parsed: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(games) = parsed.get_mut("games").and_then(|g| g.as_array_mut()) {
        let mut found = false;
        for entry in games.iter_mut() {
            if entry.get("id").and_then(|i| i.as_str()) == Some(&game_id) {
                found = true;
                entry["title"] = serde_json::Value::String(title.clone());
                entry["original_platforms"] = serde_json::json!([original_platform]);
                entry["release_year"] = match release_year {
                    Some(y) => serde_json::json!(y),
                    None => serde_json::Value::Null,
                };
                entry["developer"] = match &developer {
                    Some(d) => serde_json::Value::String(d.clone()),
                    None => serde_json::Value::Null,
                };
                entry["synopsis"] = match &synopsis {
                    Some(s) => serde_json::Value::String(s.clone()),
                    None => serde_json::Value::Null,
                };
                if let Some(proj) = entry.get_mut("project").and_then(|pr| pr.as_object_mut()) {
                    proj.insert(
                        "name".to_string(),
                        serde_json::Value::String(project_title.clone()),
                    );
                    proj.insert(
                        "method".to_string(),
                        serde_json::Value::String(method.clone()),
                    );
                    if let Some(ref a) = author {
                        proj.insert("author".to_string(), serde_json::Value::String(a.clone()));
                    }
                    if let Some(ref r) = repository_url {
                        let provider = if r.contains("github.com") {
                            "github"
                        } else {
                            "web"
                        };
                        proj.insert(
                            "repository".to_string(),
                            serde_json::json!({
                                "name": project_title,
                                "owner": author.as_deref().unwrap_or(""),
                                "provider": provider,
                                "url": r
                            }),
                        );
                    }
                    if let Some(ref t) = technical_notes {
                        proj.insert(
                            "technical_notes".to_string(),
                            serde_json::Value::String(t.clone()),
                        );
                    }
                    if let Some(ref f) = features {
                        proj.insert("features".to_string(), serde_json::json!(f));
                    }
                }
                break;
            }
        }

        if !found {
            let provider = if repository_url
                .as_deref()
                .unwrap_or("")
                .contains("github.com")
            {
                "github"
            } else {
                "web"
            };
            let new_entry = serde_json::json!({
                "id": game_id,
                "title": title,
                "original_platforms": [original_platform],
                "release_year": release_year,
                "developer": developer,
                "synopsis": synopsis,
                "box_art_url": null,
                "disc_art_url": null,
                "sub_games": null,
                "project": {
                    "id": game_id,
                    "name": project_title,
                    "method": method,
                    "repository": repository_url.as_ref().map(|url| serde_json::json!({
                        "name": project_title,
                        "owner": author.as_deref().unwrap_or(""),
                        "provider": provider,
                        "url": url
                    })),
                    "requires_original_assets": true,
                    "author": author,
                    "author_avatar_url": null,
                    "port_art_url": null,
                    "features": features.unwrap_or_default(),
                    "technical_notes": technical_notes,
                    "detection": {
                        "executables": [],
                        "folder_patterns": [format!("*{}*", title)],
                        "known_hashes": [],
                        "verified": false
                    }
                }
            });
            games.push(new_entry);
        }
    }

    let updated_json = serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())?;
    if file_path.exists() {
        let _ = std::fs::copy(&file_path, dir.join("ports_db.bak"));
    }
    std::fs::write(&file_path, &updated_json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn open_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command(async)]
fn fetch_external_api(url: String) -> Result<String, String> {
    ureq::get(&url)
        .timeout(std::time::Duration::from_secs(6))
        .call()
        .map_err(|e| e.to_string())?
        .into_string()
        .map_err(|e| e.to_string())
}

#[tauri::command(async)]
fn get_executable_sha256(executable_path: String) -> Result<String, String> {
    let path = Path::new(&executable_path);
    if !path.exists() {
        return Err(format!("El archivo no existe: {}", executable_path));
    }
    compute_sha256_of_file(path)
}

#[tauri::command(async)]
fn check_virustotal_report(
    sha256: String,
    api_key: Option<String>,
) -> Result<VirusTotalAuditResult, String> {
    let permalink = format!("https://www.virustotal.com/gui/file/{}", sha256);
    let key = api_key.filter(|k| !k.trim().is_empty());

    let Some(api_key) = key else {
        return Ok(VirusTotalAuditResult {
            sha256: sha256.clone(),
            found: false,
            malicious: 0,
            suspicious: 0,
            undetected: 0,
            total: 0,
            popular_threat_label: None,
            defender_clean: true,
            kaspersky_clean: true,
            bitdefender_clean: true,
            permalink,
            positives: 0,
            microsoft_defender_clean: true,
            threat_classification: None,
        });
    };

    let url = format!("https://www.virustotal.com/api/v3/files/{}", sha256);
    let response = ureq::get(&url)
        .set("x-apikey", &api_key)
        .set("User-Agent", "PortStation")
        .timeout(std::time::Duration::from_secs(12))
        .call();

    match response {
        Ok(res) => {
            let body = res
                .into_string()
                .map_err(|e| format!("Error leyendo respuesta de VirusTotal: {}", e))?;
            let json: serde_json::Value = serde_json::from_str(&body)
                .map_err(|e| format!("JSON inválido de VirusTotal: {}", e))?;

            let attributes = json.pointer("/data/attributes");
            let stats = attributes.and_then(|a: &serde_json::Value| a.get("last_analysis_stats"));
            let malicious = stats
                .and_then(|s: &serde_json::Value| s.get("malicious"))
                .and_then(|v: &serde_json::Value| v.as_u64())
                .unwrap_or(0) as u32;
            let suspicious = stats
                .and_then(|s: &serde_json::Value| s.get("suspicious"))
                .and_then(|v: &serde_json::Value| v.as_u64())
                .unwrap_or(0) as u32;
            let undetected = stats
                .and_then(|s: &serde_json::Value| s.get("undetected"))
                .and_then(|v: &serde_json::Value| v.as_u64())
                .unwrap_or(0) as u32;
            let harmless = stats
                .and_then(|s: &serde_json::Value| s.get("harmless"))
                .and_then(|v: &serde_json::Value| v.as_u64())
                .unwrap_or(0) as u32;
            let total = malicious + suspicious + undetected + harmless;

            let popular_threat = attributes
                .and_then(|a: &serde_json::Value| a.get("popular_threat_classification"))
                .and_then(|p: &serde_json::Value| p.get("suggested_threat_label"))
                .and_then(|s: &serde_json::Value| s.as_str())
                .map(|s: &str| s.to_string());

            let results = attributes.and_then(|a: &serde_json::Value| a.get("last_analysis_results"));
            let is_clean = |engine: &str| -> bool {
                if let Some(engine_result) = results.and_then(|r: &serde_json::Value| r.get(engine)) {
                    let cat = engine_result.get("category").and_then(|c: &serde_json::Value| c.as_str());
                    cat != Some("malicious") && cat != Some("suspicious")
                } else {
                    true
                }
            };

            let defender_clean = is_clean("Microsoft");
            let kaspersky_clean = is_clean("Kaspersky");
            let bitdefender_clean = is_clean("BitDefender");

            let positives = malicious + suspicious;
            Ok(VirusTotalAuditResult {
                sha256,
                found: true,
                malicious,
                suspicious,
                undetected,
                total,
                popular_threat_label: popular_threat.clone(),
                defender_clean,
                kaspersky_clean,
                bitdefender_clean,
                permalink,
                positives,
                microsoft_defender_clean: defender_clean,
                threat_classification: popular_threat,
            })
        }
        Err(ureq::Error::Status(404, _)) => Ok(VirusTotalAuditResult {
            sha256,
            found: false,
            malicious: 0,
            suspicious: 0,
            undetected: 0,
            total: 0,
            popular_threat_label: None,
            defender_clean: true,
            kaspersky_clean: true,
            bitdefender_clean: true,
            permalink,
            positives: 0,
            microsoft_defender_clean: true,
            threat_classification: None,
        }),
        Err(e) => Err(format!("Error consultando VirusTotal: {}", e)),
    }
}

pub fn get_platform_info_internal() -> PlatformInfo {
    let os = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "android") {
        "android"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "ios") {
        "ios"
    } else {
        "linux"
    };

    let arch = if cfg!(target_arch = "x86_64") {
        "x64"
    } else if cfg!(target_arch = "aarch64") {
        "arm64"
    } else if cfg!(target_arch = "arm") {
        "arm"
    } else {
        "x86"
    };

    let is_steam_deck = if os == "linux" {
        std::env::var("SteamDeck").is_ok()
            || std::fs::read_to_string("/etc/os-release")
                .map(|content| {
                    let lc = content.to_ascii_lowercase();
                    lc.contains("steamdeck") || lc.contains("steamos")
                })
                .unwrap_or(false)
    } else {
        false
    };

    let display_name = match (os, is_steam_deck, arch) {
        ("windows", _, "x64") => "Windows (x86_64)".to_string(),
        ("windows", _, "arm64") => "Windows on ARM (ARM64)".to_string(),
        ("windows", _, _) => "Windows (x86)".to_string(),
        ("linux", true, _) => "SteamOS / Steam Deck (x86_64)".to_string(),
        ("linux", false, "x64") => "Linux Desktop (x86_64)".to_string(),
        ("linux", false, "arm64") => "Linux (ARM64)".to_string(),
        ("linux", false, _) => "Linux".to_string(),
        ("android", _, "arm64") => "Android (ARM64-v8a)".to_string(),
        ("android", _, _) => "Android".to_string(),
        ("macos", _, "arm64") => "macOS (Apple Silicon)".to_string(),
        ("macos", _, _) => "macOS (Intel x64)".to_string(),
        (other, _, _) => other.to_string(),
    };

    PlatformInfo {
        os: os.to_string(),
        arch: arch.to_string(),
        is_steam_deck,
        display_name,
    }
}

pub fn classify_app_asset(name: &str) -> &'static str {
    let lower = name.to_ascii_lowercase();

    if lower.ends_with(".sha256")
        || lower.ends_with(".sha1")
        || lower.ends_with(".md5")
        || lower.ends_with(".sig")
        || lower.ends_with(".blockmap")
        || lower.ends_with(".pdb")
        || lower.ends_with(".json")
        || lower.ends_with(".yml")
        || lower.ends_with(".yaml")
        || lower.contains("checksum")
    {
        return "auxiliary";
    }

    if lower.ends_with(".apk") || lower.ends_with(".aab") || lower.contains("android") {
        return "android";
    }

    if lower.ends_with(".dmg")
        || lower.ends_with(".pkg")
        || lower.contains("darwin")
        || lower.contains("macos")
        || lower.contains("osx")
    {
        return "macos";
    }

    if lower.ends_with(".appimage")
        || lower.ends_with(".deb")
        || lower.ends_with(".rpm")
        || lower.ends_with(".flatpak")
        || lower.contains("linux")
        || lower.contains("steamos")
        || lower.contains("steamdeck")
        || lower.ends_with(".tar.gz")
        || lower.ends_with(".tar.xz")
    {
        return "linux";
    }

    if lower.ends_with(".exe")
        || lower.ends_with(".msi")
        || lower.contains("win64")
        || lower.contains("win32")
        || lower.contains("win-x64")
        || lower.contains("windows")
        || lower.contains("setup")
    {
        return "windows";
    }

    if lower.ends_with(".zip") || lower.ends_with(".7z") {
        return "windows";
    }

    "other"
}

pub fn score_app_asset(name: &str, target_os: &str, target_arch: &str) -> i32 {
    let lower = name.to_ascii_lowercase();
    let mut score = 0;

    match target_os {
        "windows" => {
            if lower.ends_with(".exe") {
                score += 30;
                if lower.contains("setup") || lower.contains("installer") {
                    score += 10;
                }
            } else if lower.ends_with(".msi") {
                score += 25;
            } else if lower.ends_with(".zip") {
                score += 15;
            }

            if target_arch == "x64"
                && (lower.contains("x64")
                    || lower.contains("win64")
                    || lower.contains("x86_64")
                    || lower.contains("amd64"))
            {
                score += 20;
            } else if target_arch == "arm64"
                && (lower.contains("arm64") || lower.contains("aarch64"))
            {
                score += 20;
            }
        }
        "linux" => {
            if lower.ends_with(".appimage") {
                score += 35;
            } else if lower.ends_with(".deb") {
                score += 20;
            } else if lower.ends_with(".tar.gz") || lower.ends_with(".tar.xz") {
                score += 15;
            }

            if target_arch == "x64"
                && (lower.contains("x86_64")
                    || lower.contains("amd64")
                    || lower.contains("x64"))
            {
                score += 20;
            } else if target_arch == "arm64"
                && (lower.contains("aarch64") || lower.contains("arm64"))
            {
                score += 20;
            }
        }
        "android" => {
            if lower.ends_with(".apk") {
                score += 30;
            } else if lower.ends_with(".aab") {
                score += 15;
            }

            if target_arch == "arm64"
                && (lower.contains("arm64")
                    || lower.contains("v8a")
                    || lower.contains("universal"))
            {
                score += 20;
            } else if lower.contains("universal") {
                score += 15;
            }
        }
        "macos" => {
            if lower.ends_with(".dmg") {
                score += 30;
            } else if lower.ends_with(".pkg") {
                score += 20;
            }

            if target_arch == "arm64"
                && (lower.contains("arm64")
                    || lower.contains("apple-silicon")
                    || lower.contains("universal"))
            {
                score += 20;
            } else if target_arch == "x64"
                && (lower.contains("x64")
                    || lower.contains("x86_64")
                    || lower.contains("universal"))
            {
                score += 20;
            }
        }
        _ => {}
    }

    score
}

pub fn pick_best_asset_index(
    assets: &[AppUpdateAsset],
    target_os: &str,
    target_arch: &str,
) -> Option<usize> {
    if assets.is_empty() {
        return None;
    }
    let mut best_idx = 0;
    let mut best_score = i32::MIN;

    for (idx, asset) in assets.iter().enumerate() {
        let s = score_app_asset(&asset.name, target_os, target_arch);
        if s > best_score {
            best_score = s;
            best_idx = idx;
        }
    }
    Some(best_idx)
}

/// Extracts a semantic version from a release tag such as `v0.2.0`,
/// `windows-v2.6.0` or `beta-2026.10.24-88e912f`. Missing minor/patch
/// components are padded so `v0.2` is read as `0.2.0`.
fn parse_release_version(raw: &str) -> Option<semver::Version> {
    let start = raw.find(|c: char| c.is_ascii_digit())?;
    let candidate = raw[start..].trim();
    let (core, rest) = match candidate.find(|c| c == '-' || c == '+') {
        Some(idx) => (&candidate[..idx], &candidate[idx..]),
        None => (candidate, ""),
    };
    let mut parts: Vec<&str> = core.split('.').collect();
    if parts.iter().any(|p| p.is_empty() || !p.chars().all(|c| c.is_ascii_digit())) {
        return None;
    }
    while parts.len() < 3 {
        parts.push("0");
    }
    parts.truncate(3);
    semver::Version::parse(&format!("{}{}", parts.join("."), rest)).ok()
}

/// Compares two release versions following SemVer precedence, so a
/// pre-release (`0.2.0-rc1`) is older than its final release (`0.2.0`).
/// Returns `comparison_unavailable` when either side is not a version.
pub fn compare_semver_strings(latest: &str, current: &str) -> &'static str {
    match (parse_release_version(latest), parse_release_version(current)) {
        (Some(l), Some(c)) if l > c => "update_available",
        (Some(_), Some(_)) => "up_to_date",
        _ => "comparison_unavailable",
    }
}

#[tauri::command]
fn get_platform_info() -> Result<PlatformInfo, String> {
    Ok(get_platform_info_internal())
}

#[tauri::command(async)]
fn check_app_update(
    repository_url: Option<String>,
    auth_token: Option<String>,
) -> Result<AppUpdateCheckResult, String> {
    let repo_url = repository_url
        .filter(|url| !url.trim().is_empty())
        .unwrap_or_else(|| "https://github.com/arsdaemonia-design/PortStation".to_string());

    let platform = get_platform_info_internal();
    let current_version = env!("CARGO_PKG_VERSION").to_string();

    let api_url = match github_repo_api_url(&repo_url) {
        Ok(url) => url,
        Err(e) => {
            return Ok(AppUpdateCheckResult {
                status: "error".to_string(),
                current_version,
                latest_version: None,
                release_name: None,
                release_notes: Some(format!("URL de repositorio inválida: {}", e)),
                published_at: None,
                html_url: None,
                platform,
                recommended_asset: None,
                windows_assets: Vec::new(),
                linux_assets: Vec::new(),
                android_assets: Vec::new(),
                macos_assets: Vec::new(),
                other_assets: Vec::new(),
            });
        }
    };

    let mut req = ureq::get(&api_url)
        .set("User-Agent", "PortStation")
        .set("Accept", "application/vnd.github+json")
        .timeout(std::time::Duration::from_secs(12));

    if let Some(token) = auth_token.filter(|t| !t.trim().is_empty()) {
        req = req.set("Authorization", &format!("Bearer {}", token.trim()));
    }

    let response = match req.call() {
        Ok(resp) => match resp.into_string() {
            Ok(s) => s,
            Err(e) => return Err(format!("No se pudo leer la respuesta de GitHub: {}", e)),
        },
        Err(e) => {
            return Ok(AppUpdateCheckResult {
                status: "no_releases".to_string(),
                current_version,
                latest_version: None,
                release_name: None,
                release_notes: Some(format!("No se encontraron releases publicadas o accesibles: {}", e)),
                published_at: None,
                html_url: Some(repo_url),
                platform,
                recommended_asset: None,
                windows_assets: Vec::new(),
                linux_assets: Vec::new(),
                android_assets: Vec::new(),
                macos_assets: Vec::new(),
                other_assets: Vec::new(),
            });
        }
    };

    let releases: Vec<GitHubReleaseInfo> = match serde_json::from_str(&response) {
        Ok(r) => releases_for_version_display(r),
        Err(_) => {
            return Ok(AppUpdateCheckResult {
                status: "no_releases".to_string(),
                current_version,
                latest_version: None,
                release_name: None,
                release_notes: Some("No se encontraron releases públicas en GitHub.".to_string()),
                published_at: None,
                html_url: Some(repo_url),
                platform,
                recommended_asset: None,
                windows_assets: Vec::new(),
                linux_assets: Vec::new(),
                android_assets: Vec::new(),
                macos_assets: Vec::new(),
                other_assets: Vec::new(),
            });
        }
    };

    if releases.is_empty() {
        return Ok(AppUpdateCheckResult {
            status: "no_releases".to_string(),
            current_version,
            latest_version: None,
            release_name: None,
            release_notes: Some("El repositorio no cuenta con releases públicas publicadas.".to_string()),
            published_at: None,
            html_url: Some(repo_url),
            platform,
            recommended_asset: None,
            windows_assets: Vec::new(),
            linux_assets: Vec::new(),
            android_assets: Vec::new(),
            macos_assets: Vec::new(),
            other_assets: Vec::new(),
        });
    }

    let latest_release = &releases[0];
    let latest_tag = latest_release.tag_name.clone();

    let normalize = |v: &str| {
        v.trim()
            .trim_start_matches(|c| c == 'v' || c == 'V')
            .to_ascii_lowercase()
    };
    let current_norm = normalize(&current_version);
    let latest_norm = normalize(&latest_tag);

    let status = if current_norm == latest_norm {
        "up_to_date"
    } else if releases
        .iter()
        .position(|r| normalize(&r.tag_name) == current_norm)
        .is_some_and(|pos| pos > 0)
    {
        "update_available"
    } else {
        compare_semver_strings(&latest_norm, &current_norm)
    };

    let mut windows_assets = Vec::new();
    let mut linux_assets = Vec::new();
    let mut android_assets = Vec::new();
    let mut macos_assets = Vec::new();
    let mut other_assets = Vec::new();

    for asset in &latest_release.assets {
        let platform_category = classify_app_asset(&asset.name);
        let item = AppUpdateAsset {
            name: asset.name.clone(),
            download_url: asset.download_url.clone(),
            size_bytes: asset.size,
            platform: platform_category.to_string(),
            is_recommended: false,
        };

        match platform_category {
            "windows" => windows_assets.push(item),
            "linux" => linux_assets.push(item),
            "android" => android_assets.push(item),
            "macos" => macos_assets.push(item),
            _ => other_assets.push(item),
        }
    }

    let mut recommended_asset: Option<AppUpdateAsset> = None;
    let target_list = match platform.os.as_str() {
        "windows" => &mut windows_assets,
        "linux" => &mut linux_assets,
        "android" => &mut android_assets,
        "macos" => &mut macos_assets,
        _ => &mut other_assets,
    };

    if !target_list.is_empty() {
        let best_idx = pick_best_asset_index(target_list, &platform.os, &platform.arch);
        if let Some(idx) = best_idx {
            target_list[idx].is_recommended = true;
            recommended_asset = Some(target_list[idx].clone());
        }
    }

    Ok(AppUpdateCheckResult {
        status: status.to_string(),
        current_version,
        latest_version: Some(latest_tag),
        release_name: latest_release.name.clone(),
        release_notes: latest_release.body.clone(),
        published_at: latest_release.published_at.clone(),
        html_url: Some(latest_release.url.clone()),
        platform,
        recommended_asset,
        windows_assets,
        linux_assets,
        android_assets,
        macos_assets,
        other_assets,
    })
}

pub fn resolve_raw_catalog_url(repo_or_raw_url: Option<&str>, branch: Option<&str>) -> String {
    let branch = branch.unwrap_or("main");
    let fallback = format!(
        "https://raw.githubusercontent.com/arsdaemonia-design/PortStation/{}/src-tauri/ports_db.json",
        branch
    );
    let Some(url) = repo_or_raw_url.map(str::trim).filter(|u| !u.is_empty()) else {
        return fallback;
    };
    if url.starts_with("https://raw.githubusercontent.com/") || url.ends_with(".json") {
        return url.to_string();
    }
    if let Some(path) = url.strip_prefix("https://github.com/") {
        let mut parts = path.split('/');
        let owner = parts.next().unwrap_or_default();
        let repo = parts.next().unwrap_or_default().trim_end_matches(".git");
        if !owner.is_empty() && !repo.is_empty() {
            return format!(
                "https://raw.githubusercontent.com/{}/{}/{}/src-tauri/ports_db.json",
                owner, repo, branch
            );
        }
    }
    fallback
}

pub fn merge_remote_catalog_json(
    local_json: &str,
    remote_json: &str,
) -> Result<(String, usize, usize, usize, String, String), String> {
    let mut local_val: serde_json::Value = serde_json::from_str(local_json)
        .map_err(|e| format!("Error parseando catálogo local: {}", e))?;
    let remote_val: serde_json::Value = serde_json::from_str(remote_json)
        .map_err(|e| format!("Error parseando catálogo remoto: {}", e))?;

    let local_version = local_val
        .get("catalog_version")
        .and_then(|v| v.as_str())
        .unwrap_or("0.0.0")
        .to_string();
    let remote_version = remote_val
        .get("catalog_version")
        .and_then(|v| v.as_str())
        .unwrap_or(&local_version)
        .to_string();

    let remote_games = remote_val
        .get("games")
        .and_then(|g| g.as_array())
        .ok_or_else(|| "El catálogo remoto no contiene un array 'games'".to_string())?;

    let mut new_games_count = 0;
    let mut updated_games_count = 0;
    let total_projects;

    {
        let local_games = local_val
            .get_mut("games")
            .and_then(|g| g.as_array_mut())
            .ok_or_else(|| "El catálogo local no contiene un array 'games'".to_string())?;

        // Migrate old scanner-created UNKNOWN entries out of the catalog.
        // The original local file is backed up by sync_remote_catalog before
        // this merged JSON is written; personal metadata remains in the UI's
        // private custom-metadata store.
        local_games.retain(|game| !is_legacy_local_only_entry(game));

        for r_game in remote_games {
            let Some(r_id) = r_game.get("id").and_then(|v| v.as_str()) else {
                continue;
            };
            if is_legacy_local_only_entry(r_game) {
                continue;
            }
            // Skip malformed remote entries so a bad push cannot corrupt local catalogs.
            let has_valid_shape = r_game.get("title").and_then(|v| v.as_str()).is_some()
                && r_game
                    .pointer("/project/id")
                    .and_then(|v| v.as_str())
                    .is_some()
                && r_game.pointer("/project/method").is_some()
                && r_game
                    .get("original_platforms")
                    .and_then(|v| v.as_array())
                    .is_some();
            if !has_valid_shape {
                continue;
            }

            if let Some(l_game) = local_games
                .iter_mut()
                .find(|g| g.get("id").and_then(|v| v.as_str()) == Some(r_id))
            {
                let mut game_updated = false;

                let local_verified = l_game
                    .pointer("/project/detection/verified")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                let remote_verified = r_game
                    .pointer("/project/detection/verified")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                if !local_verified && remote_verified {
                    if let (Some(l_proj), Some(r_det)) = (
                        l_game.get_mut("project").and_then(|p| p.as_object_mut()),
                        r_game.pointer("/project/detection"),
                    ) {
                        l_proj.insert("detection".to_string(), r_det.clone());
                        game_updated = true;
                    }
                }

                let local_box_art_needs_update = l_game
                    .get("box_art_url")
                    .map_or(true, |v| {
                        v.is_null()
                            || v.as_str().is_some_and(|s| {
                                s.is_empty()
                                    || s.contains("mobygames.com")
                                    || s.contains("co20se.jpg")
                                    || s.contains("co224t.jpg")
                                    || s.contains("co1r7n.jpg")
                            })
                    });
                if local_box_art_needs_update {
                    if let Some(r_box_art) = r_game.get("box_art_url").filter(|v| !v.is_null()) {
                        if let Some(l_obj) = l_game.as_object_mut() {
                            l_obj.insert("box_art_url".to_string(), r_box_art.clone());
                            game_updated = true;
                        }
                    }
                    if let (Some(l_proj), Some(r_port_art)) = (
                        l_game.get_mut("project").and_then(|p| p.as_object_mut()),
                        r_game.pointer("/project/port_art_url").filter(|v| !v.is_null()),
                    ) {
                        l_proj.insert("port_art_url".to_string(), r_port_art.clone());
                        game_updated = true;
                    }
                }

                let local_repo_empty = l_game
                    .pointer("/project/repository")
                    .map_or(true, |v| v.is_null());
                if local_repo_empty {
                    if let (Some(l_proj), Some(r_repo)) = (
                        l_game.get_mut("project").and_then(|p| p.as_object_mut()),
                        r_game.pointer("/project/repository").filter(|v| !v.is_null()),
                    ) {
                        l_proj.insert("repository".to_string(), r_repo.clone());
                        game_updated = true;
                    }
                }

                let local_platforms_empty = l_game
                    .pointer("/project/supported_platforms")
                    .and_then(serde_json::Value::as_array)
                    .map_or(true, |platforms| platforms.is_empty());
                let remote_platforms = r_game.pointer("/project/supported_platforms");
                let remote_platforms_known = remote_platforms
                    .and_then(serde_json::Value::as_array)
                    .is_some_and(|platforms| !platforms.is_empty());
                let remote_platforms_complete = r_game
                    .pointer("/project/supported_platforms_complete")
                    .and_then(serde_json::Value::as_bool)
                    == Some(true);
                if local_platforms_empty && remote_platforms_known {
                    if let (Some(local_project), Some(remote_platforms)) = (
                        l_game.get_mut("project").and_then(|project| project.as_object_mut()),
                        remote_platforms,
                    ) {
                        local_project.insert("supported_platforms".to_string(), remote_platforms.clone());
                        if let Some(complete) = r_game.pointer("/project/supported_platforms_complete") {
                            local_project.insert("supported_platforms_complete".to_string(), complete.clone());
                        }
                        game_updated = true;
                    }
                } else if remote_platforms_complete
                    && l_game
                        .pointer("/project/supported_platforms_complete")
                        .and_then(serde_json::Value::as_bool)
                        != Some(true)
                {
                    if let Some(local_project) =
                        l_game.get_mut("project").and_then(|project| project.as_object_mut())
                    {
                        if let Some(remote_platforms) = remote_platforms {
                            local_project.insert("supported_platforms".to_string(), remote_platforms.clone());
                        }
                        local_project.insert(
                            "supported_platforms_complete".to_string(),
                            serde_json::Value::Bool(true),
                        );
                        game_updated = true;
                    }
                }

                if game_updated {
                    updated_games_count += 1;
                }
            } else {
                local_games.push(r_game.clone());
                new_games_count += 1;
            }
        }
        total_projects = local_games
            .iter()
            .filter(|game| is_explorable_catalog_entry(game))
            .count();
    }

    if let Some(obj) = local_val.as_object_mut() {
        obj.insert(
            "catalog_version".to_string(),
            serde_json::Value::String(remote_version.clone()),
        );
    }
    let updated_json = serde_json::to_string_pretty(&local_val)
        .map_err(|e| format!("Error serializando catálogo actualizado: {}", e))?;

    Ok((
        updated_json,
        new_games_count,
        updated_games_count,
        total_projects,
        local_version,
        remote_version,
    ))
}

#[tauri::command]
fn get_catalog_info() -> Result<CatalogInfoDTO, String> {
    let dir = get_portstation_data_dir()?;
    let file_path = dir.join("ports_db.json");
    let content = if file_path.exists() {
        std::fs::read_to_string(&file_path)
            .unwrap_or_else(|_| include_str!("../ports_db.json").to_string())
    } else {
        include_str!("../ports_db.json").to_string()
    };

    let parsed: serde_json::Value = serde_json::from_str(&content)
        .unwrap_or_else(|_| serde_json::json!({ "catalog_version": "2.5.2", "games": [] }));

    let catalog_version = parsed
        .get("catalog_version")
        .and_then(|v| v.as_str())
        .unwrap_or("2.5.2")
        .to_string();

    let total_projects = parsed
        .get("games")
        .and_then(|g| g.as_array())
        .map(|arr| {
            arr.iter()
                .filter(|game| is_explorable_catalog_entry(game))
                .count()
        })
        .unwrap_or(0);

    Ok(CatalogInfoDTO {
        catalog_version,
        total_projects,
        official_repo_url: "https://github.com/arsdaemonia-design/PortStation".to_string(),
    })
}

#[tauri::command(async)]
fn sync_remote_catalog(
    repository_url: Option<String>,
    branch: Option<String>,
    auth_token: Option<String>,
) -> Result<CatalogSyncResult, String> {
    let url = resolve_raw_catalog_url(repository_url.as_deref(), branch.as_deref());

    let mut req = ureq::get(&url)
        .set("User-Agent", "PortStation")
        .set("Accept", "application/json, text/plain, */*")
        .timeout(std::time::Duration::from_secs(15));

    if let Some(token) = auth_token.filter(|t| !t.trim().is_empty()) {
        req = req.set("Authorization", &format!("Bearer {}", token.trim()));
    }

    let remote_json = req
        .call()
        .map_err(|e| format!("No se pudo descargar el catálogo remoto desde {}: {}", url, e))?
        .into_string()
        .map_err(|e| format!("Error leyendo respuesta del catálogo remoto: {}", e))?;

    let dir = get_portstation_data_dir()?;
    let file_path = dir.join("ports_db.json");

    let local_json = if file_path.exists() {
        std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?
    } else {
        let _ = std::fs::create_dir_all(&dir);
        let embedded = include_str!("../ports_db.json");
        embedded.to_string()
    };

    let (merged_json, new_games, updated_games, total_projects, local_ver, remote_ver) =
        merge_remote_catalog_json(&local_json, &remote_json)?;

    let status = if new_games > 0 || updated_games > 0 || local_ver != remote_ver {
        "updated"
    } else {
        "already_up_to_date"
    };

    if file_path.exists() {
        let _ = std::fs::copy(&file_path, dir.join("ports_db.bak"));
    }
    std::fs::write(&file_path, &merged_json)
        .map_err(|e| format!("Error guardando catálogo actualizado: {}", e))?;

    let message = if status == "updated" {
        format!(
            "Catálogo actualizado con éxito a la versión v{} (+{} nuevos, {} actualizados).",
            remote_ver, new_games, updated_games
        )
    } else {
        format!(
            "El catálogo remoto ya está actualizado en la versión v{}.",
            local_ver
        )
    };

    Ok(CatalogSyncResult {
        status: status.to_string(),
        local_version: local_ver,
        remote_version: remote_ver,
        new_games_count: new_games,
        updated_games_count: updated_games,
        total_projects_count: total_projects,
        message,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::Manager;

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            #[cfg(target_os = "android")]
            if let Ok(app_dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(&app_dir);
                let _ = APP_DATA_DIR_OVERRIDE.set(app_dir);
            }

            let db_path = if let Ok(data_dir) = get_portstation_data_dir() {
                data_dir.join("library.db")
            } else if let Ok(app_dir) = app.path().app_data_dir() {
                let _ = std::fs::create_dir_all(&app_dir);
                let _ = APP_DATA_DIR_OVERRIDE.set(app_dir.clone());
                app_dir.join("library.db")
            } else {
                std::env::temp_dir().join("PortStation").join("library.db")
            };

            let db = DatabaseManager::open(&db_path).unwrap_or_else(|e| {
                eprintln!(
                    "Aviso: No se pudo abrir DB en disco ({}), usando memoria.",
                    e
                );
                DatabaseManager::open_in_memory().expect("Failed to initialize SQLite")
            });

            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_and_match,
            list_catalog_ports,
            download_catalog_zip,
            open_catalog_download_folder,
            open_game_folder,
            list_saved_installations,
            update_game_executable,
            update_game_artwork,
            update_game_metadata,
            launch_game,
            pick_folder,
            pick_executable,
            pick_image_file,
            open_browser,
            fetch_external_api,
            check_github_updates,
            get_executable_sha256,
            check_virustotal_report,
            get_platform_info,
            check_app_update,
            get_catalog_info,
            sync_remote_catalog
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn release(tag: &str, prerelease: bool) -> GitHubReleaseInfo {
        GitHubReleaseInfo {
            tag_name: tag.to_string(),
            name: Some(tag.to_string()),
            url: format!("https://github.com/owner/repo/releases/tag/{tag}"),
            published_at: None,
            prerelease,
            body: None,
            assets: Vec::new(),
        }
    }

    #[test]
    fn version_display_prefers_stable_releases_over_newer_test_builds() {
        let selected = releases_for_version_display(vec![
            release("macos-v2.6.0-apple-silicon-test1", true),
            release("windows-v2.6.0", false),
            release("v2.5.0", false),
        ]);
        assert_eq!(selected.len(), 2);
        assert_eq!(selected[0].tag_name, "windows-v2.6.0");
        assert_eq!(selected[1].tag_name, "v2.5.0");
    }

    #[test]
    fn version_display_falls_back_to_prereleases_when_no_stable_release_exists() {
        let selected = releases_for_version_display(vec![
            release("nightly-2", true),
            release("nightly-1", true),
        ]);
        assert_eq!(selected.len(), 2);
        assert_eq!(selected[0].tag_name, "nightly-2");
    }

    #[test]
    fn explore_requires_a_known_port_method_and_github_repository() {
        assert!(is_explorable_port(
            &PortMethod::STATIC_RECOMP,
            Some("https://github.com/owner/project")
        ));
        assert!(!is_explorable_port(
            &PortMethod::UNKNOWN,
            Some("https://github.com/owner/project")
        ));
        assert!(!is_explorable_port(&PortMethod::PORT, None));
        assert!(!is_explorable_port(
            &PortMethod::PORT,
            Some("https://example.com/project")
        ));
    }

    #[test]
    fn test_scan_real_ports_directory() {
        let ports_dir = Path::new("E:/Games/Ports");
        if !ports_dir.exists() {
            return;
        }

        let scanner = LocalFileScanner::new();
        let registry = EmbeddedSeedRegistry::new();
        let matcher = HeuristicMatcher::new(registry.list_all_projects());

        let candidates = scanner.scan_directory(ports_dir).expect("Scan failed");
        let mut matches = Vec::new();

        for cand in candidates {
            let eval = matcher.evaluate_candidate(&cand, None);
            if eval.status != MatchStatus::UNKNOWN {
                if let Some(proj_id) = eval.matched_project_id {
                    if !matches.contains(&proj_id) {
                        matches.push(proj_id);
                    }
                }
            }
        }

        println!("Detected projects in E:/Games/Ports: {:?}", matches);
        assert!(
            matches.contains(&"golden-balloon".to_string()),
            "Golden Balloon should be detected"
        );
        assert!(
            matches.contains(&"road-rash-64-recomp".to_string()),
            "Road Rash 64 should be detected"
        );
        assert!(
            matches.contains(&"ringout".to_string()),
            "RingOut should be detected"
        );
        assert!(
            matches.contains(&"strikers".to_string()),
            "Strikers should be detected"
        );
    }

    #[test]
    fn app_asset_classification_matches_all_target_platforms() {
        assert_eq!(classify_app_asset("PortStation_0.2.0_x64-setup.exe"), "windows");
        assert_eq!(classify_app_asset("PortStation_0.2.0_x64_en-US.msi"), "windows");
        assert_eq!(classify_app_asset("PortStation-windows-x64.zip"), "windows");

        assert_eq!(classify_app_asset("PortStation_0.2.0_amd64.AppImage"), "linux");
        assert_eq!(classify_app_asset("PortStation_0.2.0_amd64.deb"), "linux");
        assert_eq!(classify_app_asset("portstation_0.2.0_x86_64.tar.gz"), "linux");

        assert_eq!(classify_app_asset("PortStation-v0.2.0-arm64-v8a.apk"), "android");
        assert_eq!(classify_app_asset("PortStation-v0.2.0-universal.apk"), "android");
        assert_eq!(classify_app_asset("PortStation.apk"), "android");

        assert_eq!(classify_app_asset("PortStation_0.2.0_aarch64.dmg"), "macos");
        assert_eq!(classify_app_asset("PortStation_0.2.0_x64.dmg"), "macos");

        assert_eq!(classify_app_asset("PortStation.exe.blockmap"), "auxiliary");
        assert_eq!(classify_app_asset("checksums.sha256"), "auxiliary");
    }

    #[test]
    fn semver_comparison_detects_newer_app_releases() {
        assert_eq!(compare_semver_strings("0.2.0", "0.1.0"), "update_available");
        assert_eq!(compare_semver_strings("v0.2.0", "0.1.0"), "update_available");
        assert_eq!(compare_semver_strings("0.1.1", "0.1.0"), "update_available");
        assert_eq!(compare_semver_strings("0.1.0", "0.1.0"), "up_to_date");
        assert_eq!(compare_semver_strings("0.0.9", "0.1.0"), "up_to_date");
    }

    #[test]
    fn semver_orders_prereleases_before_final_releases() {
        // Previously `rc1` was read as an extra numeric component (0.2.0.1).
        assert_eq!(compare_semver_strings("0.2.0-rc1", "0.2.0"), "up_to_date");
        assert_eq!(compare_semver_strings("0.2.0", "0.2.0-rc1"), "update_available");
        assert_eq!(compare_semver_strings("0.2.0-rc2", "0.2.0-rc1"), "update_available");
        assert_eq!(compare_semver_strings("v0.10.0", "0.9.0"), "update_available");
        assert_eq!(compare_semver_strings("v0.2", "0.1.9"), "update_available");
        assert_eq!(compare_semver_strings("windows-v2.6.0", "2.5.0"), "update_available");
    }

    #[test]
    fn semver_reports_unavailable_for_non_version_tags() {
        assert_eq!(compare_semver_strings("nightly", "0.1.0"), "comparison_unavailable");
        assert_eq!(compare_semver_strings("0.2.0", "dev"), "comparison_unavailable");
    }

    #[test]
    fn platform_info_reports_valid_os_and_arch() {
        let platform = get_platform_info_internal();
        assert!(!platform.os.is_empty());
        assert!(!platform.arch.is_empty());
        assert!(!platform.display_name.is_empty());
    }

    #[test]
    fn test_resolve_raw_catalog_url() {
        assert_eq!(
            resolve_raw_catalog_url(None, None),
            "https://raw.githubusercontent.com/arsdaemonia-design/PortStation/main/src-tauri/ports_db.json"
        );
        assert_eq!(
            resolve_raw_catalog_url(Some("https://github.com/arsdaemonia-design/PortStation"), Some("dev")),
            "https://raw.githubusercontent.com/arsdaemonia-design/PortStation/dev/src-tauri/ports_db.json"
        );
        assert_eq!(
            resolve_raw_catalog_url(Some("https://raw.githubusercontent.com/custom/repo/main/ports_db.json"), None),
            "https://raw.githubusercontent.com/custom/repo/main/ports_db.json"
        );
    }

    #[test]
    fn test_merge_remote_catalog_json() {
        let local_json = r#"{
            "catalog_version": "2.5.0",
            "games": [
                {
                    "id": "existing-game",
                    "title": "My Custom Title",
                    "box_art_url": null,
                    "project": {
                        "method": "PORT",
                        "repository": { "url": "https://github.com/example/existing-game" },
                        "detection": {
                            "executables": [],
                            "folder_patterns": [],
                            "known_hashes": [],
                            "verified": false
                        }
                    }
                }
            ]
        }"#;

        let remote_json = r#"{
            "catalog_version": "2.5.3",
            "games": [
                { "id": "broken-entry" },
                {
                    "id": "existing-game",
                    "title": "Remote Title",
                    "original_platforms": ["PC"],
                    "box_art_url": "https://example.com/cover.jpg",
                    "project": {
                        "id": "existing-game",
                        "method": "PORT",
                        "detection": {
                            "executables": ["game.exe"],
                            "folder_patterns": ["*Game*"],
                            "known_hashes": [],
                            "verified": true
                        }
                    }
                },
                {
                    "id": "brand-new-game",
                    "title": "Brand New Game",
                    "original_platforms": ["PC"],
                    "project": {
                        "id": "brand-new-game",
                        "method": "PORT",
                        "repository": { "url": "https://github.com/example/brand-new-game" },
                        "detection": {
                            "executables": ["new.exe"],
                            "folder_patterns": ["*New*"],
                            "known_hashes": [],
                            "verified": true
                        }
                    }
                }
            ]
        }"#;

        let (merged, new_count, updated_count, total_count, local_ver, remote_ver) =
            merge_remote_catalog_json(local_json, remote_json).unwrap();

        assert_eq!(new_count, 1);
        assert_eq!(updated_count, 1);
        assert_eq!(total_count, 2);
        assert_eq!(local_ver, "2.5.0");
        assert_eq!(remote_ver, "2.5.3");

        let val: serde_json::Value = serde_json::from_str(&merged).unwrap();
        assert_eq!(val["catalog_version"], "2.5.3");

        let games = val["games"].as_array().unwrap();
        let existing = games.iter().find(|g| g["id"] == "existing-game").unwrap();
        // Preserves custom user title
        assert_eq!(existing["title"], "My Custom Title");
        // Populated missing cover
        assert_eq!(existing["box_art_url"], "https://example.com/cover.jpg");
        // Upgraded detection to verified
        assert_eq!(existing["project"]["detection"]["verified"], true);
        assert_eq!(existing["project"]["detection"]["executables"][0], "game.exe");

        // Added new game
        assert!(games.iter().any(|g| g["id"] == "brand-new-game"));
    }
    #[test]
    fn test_split_package_stem_and_ext() {
        assert_eq!(
            split_package_stem_and_ext("port-linux-x86_64.tar.gz"),
            Some(("port-linux-x86_64", "tar.gz"))
        );
        assert_eq!(
            split_package_stem_and_ext("release-v1.0.tar.xz"),
            Some(("release-v1.0", "tar.xz"))
        );
        assert_eq!(
            split_package_stem_and_ext("package.tar.zst"),
            Some(("package", "tar.zst"))
        );
        assert_eq!(
            split_package_stem_and_ext("archive.tar.bz2"),
            Some(("archive", "tar.bz2"))
        );
        assert_eq!(
            split_package_stem_and_ext("Game-Win64.zip"),
            Some(("Game-Win64", "zip"))
        );
        assert_eq!(
            split_package_stem_and_ext("Game-Linux.AppImage"),
            Some(("Game-Linux", "appimage"))
        );
        assert_eq!(
            split_package_stem_and_ext("installer.exe"),
            Some(("installer", "exe"))
        );
        assert_eq!(
            split_package_stem_and_ext("metroid-prime2-port-0.6.6-android-arm64.apk"),
            Some(("metroid-prime2-port-0.6.6-android-arm64", "apk"))
        );
        assert_eq!(
            split_package_stem_and_ext("Port-macOS.dmg"),
            Some(("Port-macOS", "dmg"))
        );
        assert_eq!(
            split_package_stem_and_ext("MetroidPrime2Port.flatpak"),
            Some(("MetroidPrime2Port", "flatpak"))
        );
        assert_eq!(split_package_stem_and_ext("readme.txt"), None);
        assert_eq!(split_package_stem_and_ext(".zip"), None);
    }

    #[test]
    fn test_semver_prefix_windows_v() {
        assert_eq!(
            compare_semver_strings("windows-v1.9.2", "1.9.0"),
            "update_available"
        );
    }
}