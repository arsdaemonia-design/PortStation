use serde::{Deserialize, Serialize};

#[allow(non_camel_case_types)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MatchStatus {
    VERIFIED,
    RECOGNIZED,
    POSSIBLE_MATCH,
    USER_CONFIRMED,
    UNKNOWN,
}

#[allow(non_camel_case_types)]
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum PortMethod {
    DECOMP_NATIVE,
    STATIC_RECOMP,
    PORT,
    HYBRID,
    UNKNOWN,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubGame {
    pub title: String,
    pub release_year: Option<u32>,
    pub synopsis: Option<String>,
    pub box_art_url: Option<String>,
    pub media_type: Option<String>,
    pub screenshots: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub title: String,
    pub original_platforms: Vec<String>,
    pub release_year: Option<u32>,
    pub developer: Option<String>,
    pub synopsis: Option<String>,
    pub box_art_url: Option<String>,
    pub disc_art_url: Option<String>,
    pub sub_games: Option<Vec<SubGame>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryInfo {
    pub provider: String,
    pub url: String,
    pub owner: Option<String>,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DetectionRule {
    #[serde(default)]
    pub executables: Vec<String>,
    #[serde(default)]
    pub folder_patterns: Vec<String>,
    #[serde(default)]
    pub known_hashes: Vec<String>,
    #[serde(default)]
    pub verified: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub game_id: String,
    pub name: String,
    pub method: PortMethod,
    pub repository: Option<RepositoryInfo>,
    pub repository_url: Option<String>,
    pub requires_original_assets: bool,
    pub author: Option<String>,
    pub author_avatar_url: Option<String>,
    pub port_art_url: Option<String>,
    pub features: Vec<String>,
    pub technical_notes: Option<String>,
    #[serde(default)]
    pub detection: DetectionRule,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Installation {
    pub id: String,
    pub game_id: String,
    pub project_id: String,
    pub executable_path: String,
    pub working_dir: String,
    pub status: MatchStatus,
    pub sha256: Option<String>,
    pub detected_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateFile {
    pub path: String,
    pub filename: String,
    pub size: u64,
    pub is_executable: bool,
}
