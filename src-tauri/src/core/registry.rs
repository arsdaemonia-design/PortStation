use crate::core::models::{DetectionRule, Game, PortMethod, Project, SubGame};
use serde::Deserialize;
use std::collections::HashMap;

pub trait Registry {
    fn find_game(&self, game_id: &str) -> Option<Game>;
    fn find_project(&self, project_id: &str) -> Option<Project>;
    fn list_all_projects(&self) -> Vec<Project>;
}

#[derive(Debug, Deserialize)]
struct PortsDbFile {
    #[allow(dead_code)]
    #[serde(default)]
    pub version: Option<String>,
    #[allow(dead_code)]
    #[serde(default)]
    pub schema_version: Option<u32>,
    #[allow(dead_code)]
    #[serde(default)]
    pub catalog_version: Option<String>,
    pub games: Vec<DbGameEntry>,
}

#[derive(Debug, Deserialize)]
struct DbGameEntry {
    pub id: String,
    pub title: String,
    pub original_platforms: Vec<String>,
    pub release_year: Option<u32>,
    pub developer: Option<String>,
    pub synopsis: Option<String>,
    pub box_art_url: Option<String>,
    #[allow(dead_code)]
    pub disc_art_url: Option<String>,
    pub sub_games: Option<Vec<SubGame>>,
    pub project: DbProjectEntry,
}

#[derive(Debug, Deserialize)]
struct DbProjectEntry {
    pub id: String,
    pub name: String,
    pub method: PortMethod,
    pub repository: Option<crate::core::models::RepositoryInfo>,
    pub repository_url: Option<String>,
    #[serde(default)]
    pub requires_original_assets: bool,
    pub author: Option<String>,
    pub author_avatar_url: Option<String>,
    pub port_art_url: Option<String>,
    #[serde(default)]
    pub features: Vec<String>,
    pub technical_notes: Option<String>,
    #[serde(default)]
    pub detection: DetectionRule,
}

pub struct EmbeddedSeedRegistry {
    games: HashMap<String, Game>,
    projects: HashMap<String, Project>,
}

impl EmbeddedSeedRegistry {
    pub fn new() -> Self {
        let mut games = HashMap::new();
        let mut projects = HashMap::new();

        // Load user data first, then add seed entries that are missing by ID.
        // This lets catalog updates reach existing installs without overwriting
        // user-edited metadata or requiring a destructive profile reset.
        let appdata_json = crate::get_portstation_data_dir()
            .ok()
            .map(|d| d.join("ports_db.json"))
            .and_then(|p| std::fs::read_to_string(p).ok());
        let seed_json = include_str!("../../ports_db.json");
        let json_str = appdata_json
            .map(|user_json| merge_missing_seed_entries(&user_json, seed_json))
            .unwrap_or_else(|| seed_json.to_string());

        match serde_json::from_str::<PortsDbFile>(&json_str) {
            Err(e) => {
                eprintln!("CRITICAL ERROR DESERIALIZING ports_db.json: {}", e);
            }
            Ok(db) => {
                for entry in db.games {
                    let repository_url = entry.project.repository_url.clone().or_else(|| {
                        entry
                            .project
                            .repository
                            .as_ref()
                            .map(|repository| repository.url.clone())
                    });
                    let game = Game {
                        id: entry.id.clone(),
                        title: entry.title,
                        original_platforms: entry.original_platforms,
                        release_year: entry.release_year,
                        developer: entry.developer,
                        synopsis: entry.synopsis,
                        box_art_url: entry.box_art_url,
                        disc_art_url: entry.disc_art_url,
                        sub_games: entry.sub_games,
                    };
                    let project = Project {
                        id: entry.project.id.clone(),
                        game_id: entry.id,
                        name: entry.project.name,
                        method: entry.project.method,
                        repository: entry.project.repository,
                        repository_url,
                        requires_original_assets: entry.project.requires_original_assets,
                        author: entry.project.author,
                        author_avatar_url: entry.project.author_avatar_url,
                        port_art_url: entry.project.port_art_url,
                        features: entry.project.features,
                        technical_notes: entry.project.technical_notes,
                        detection: entry.project.detection,
                    };
                    games.insert(game.id.clone(), game);
                    projects.insert(project.id.clone(), project);
                }
            }
        }

        Self { games, projects }
    }
}

fn merge_missing_seed_entries(user_json: &str, seed_json: &str) -> String {
    let Ok(mut user_catalog) = serde_json::from_str::<serde_json::Value>(user_json) else {
        return user_json.to_string();
    };
    let Ok(seed_catalog) = serde_json::from_str::<serde_json::Value>(seed_json) else {
        return user_json.to_string();
    };
    let (Some(user_games), Some(seed_games)) = (
        user_catalog
            .get_mut("games")
            .and_then(serde_json::Value::as_array_mut),
        seed_catalog
            .get("games")
            .and_then(serde_json::Value::as_array),
    ) else {
        return user_json.to_string();
    };

    for seed_game in seed_games {
        let Some(seed_id) = seed_game.get("id").and_then(serde_json::Value::as_str) else {
            continue;
        };
        let exists = user_games
            .iter()
            .any(|game| game.get("id").and_then(serde_json::Value::as_str) == Some(seed_id));
        if !exists {
            user_games.push(seed_game.clone());
        } else if seed_id == "fable-2" {
            // Repair only exact known bad values previously shipped for this
            // entry. User-selected repositories and artwork remain untouched.
            if let Some(existing) = user_games
                .iter_mut()
                .find(|game| game.get("id").and_then(serde_json::Value::as_str) == Some(seed_id))
            {
                let old_url = existing
                    .pointer("/project/repository/url")
                    .and_then(serde_json::Value::as_str);
                if old_url == Some("https://github.com/himdo/Fable-2-Recomp") {
                    if let (Some(existing_object), Some(seed_project)) =
                        (existing.as_object_mut(), seed_game.get("project"))
                    {
                        existing_object.insert("project".to_string(), seed_project.clone());
                    }
                }

                let old_cover = "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r3k.jpg";
                let has_known_bad_cover = existing
                    .get("box_art_url")
                    .and_then(serde_json::Value::as_str)
                    == Some(old_cover);
                if has_known_bad_cover {
                    if let (Some(existing_object), Some(seed_cover)) =
                        (existing.as_object_mut(), seed_game.get("box_art_url"))
                    {
                        existing_object.insert("box_art_url".to_string(), seed_cover.clone());
                    }
                }
            }
        } else if matches!(seed_id, "bloodborne" | "crash-team-racing-nitro-fueled") {
            // These two catalog entries were previously persisted with empty
            // artwork and disabled, generic scanner rules. Restore only those
            // known stale fields from the embedded catalog; keep user-authored
            // titles, descriptions, artwork, and other metadata intact.
            if let Some(existing) = user_games
                .iter_mut()
                .find(|game| game.get("id").and_then(serde_json::Value::as_str) == Some(seed_id))
            {
                repair_stale_port_entry(existing, seed_game, seed_id);
            }
        } else if matches!(
            seed_id,
            "killzone-shadow-fall"
                | "lost-odyssey"
                | "dragons-crown-pro"
                | "wet"
                | "saints-row"
                | "ico-ps2"
        ) {
            if let Some(existing) = user_games
                .iter_mut()
                .find(|game| game.get("id").and_then(serde_json::Value::as_str) == Some(seed_id))
            {
                let is_known_bad = existing
                    .get("box_art_url")
                    .and_then(serde_json::Value::as_str)
                    .map_or(true, |u| {
                        u.is_empty()
                            || u.contains("mobygames.com")
                            || u.contains("co20se.jpg")
                            || u.contains("co224t.jpg")
                            || u.contains("co1r7n.jpg")
                    });
                if is_known_bad {
                    if let (Some(existing_object), Some(seed_cover)) =
                        (existing.as_object_mut(), seed_game.get("box_art_url"))
                    {
                        existing_object.insert("box_art_url".to_string(), seed_cover.clone());
                    }
                    if let (Some(existing_proj), Some(seed_port_art)) = (
                        existing.get_mut("project").and_then(|p| p.as_object_mut()),
                        seed_game.pointer("/project/port_art_url"),
                    ) {
                        existing_proj.insert("port_art_url".to_string(), seed_port_art.clone());
                    }
                }
            }
        }
    }

    serde_json::to_string(&user_catalog).unwrap_or_else(|_| user_json.to_string())
}

fn repair_stale_port_entry(
    existing: &mut serde_json::Value,
    seed: &serde_json::Value,
    game_id: &str,
) {
    let (Some(existing_obj), Some(seed_obj)) = (existing.as_object_mut(), seed.as_object()) else {
        return;
    };

    for key in ["box_art_url"] {
        let is_empty = existing_obj.get(key).map_or(true, |value| {
            value.is_null() || value.as_str().is_some_and(str::is_empty)
        });
        if is_empty {
            if let Some(seed_value) = seed_obj.get(key).filter(|value| !value.is_null()) {
                existing_obj.insert(key.to_string(), seed_value.clone());
            }
        }
    }

    // Bloodborne was mistakenly recorded as a PS3 title in the old local
    // catalog; repair that exact legacy value without overriding edits.
    if game_id == "bloodborne"
        && existing_obj
            .get("original_platforms")
            .and_then(serde_json::Value::as_array)
            .is_some_and(|platforms| {
                platforms.len() == 1 && platforms[0].as_str() == Some("PlayStation 3")
            })
    {
        if let Some(seed_platforms) = seed_obj.get("original_platforms") {
            existing_obj.insert("original_platforms".to_string(), seed_platforms.clone());
        }
    }

    let (Some(existing_project), Some(seed_project)) = (
        existing_obj
            .get_mut("project")
            .and_then(serde_json::Value::as_object_mut),
        seed_obj
            .get("project")
            .and_then(serde_json::Value::as_object),
    ) else {
        return;
    };

    if game_id == "bloodborne" && existing_project.get("id").and_then(serde_json::Value::as_str) == Some("bloodborne") {
        if let Some(seed_pid) = seed_project.get("id") {
            existing_project.insert("id".to_string(), seed_pid.clone());
        }
    }
    if game_id == "crash-team-racing-nitro-fueled" && existing_project.get("id").and_then(serde_json::Value::as_str) == Some("crash-team-racing-nitro-fueled") {
        if let Some(seed_pid) = seed_project.get("id") {
            existing_project.insert("id".to_string(), seed_pid.clone());
        }
    }

    let port_art_is_empty = existing_project.get("port_art_url").map_or(true, |value| {
        value.is_null() || value.as_str().is_some_and(str::is_empty)
    });
    if port_art_is_empty {
        if let Some(seed_value) = seed_project
            .get("port_art_url")
            .filter(|value| !value.is_null())
        {
            existing_project.insert("port_art_url".to_string(), seed_value.clone());
        }
    }

    let detection = existing_project.get("detection");
    let stale_detection = detection.is_some_and(|rule| {
        rule.get("verified").and_then(serde_json::Value::as_bool) == Some(false)
            && rule
                .get("executables")
                .and_then(serde_json::Value::as_array)
                .is_some_and(Vec::is_empty)
            && rule
                .get("folder_patterns")
                .and_then(serde_json::Value::as_array)
                .is_some_and(|patterns| {
                    let old_pattern = match game_id {
                        "bloodborne" => "*Bloodborne*",
                        "crash-team-racing-nitro-fueled" => "*Crash Team Racing Nitro-Fueled*",
                        _ => return false,
                    };
                    patterns
                        .iter()
                        .any(|pattern| pattern.as_str() == Some(old_pattern))
                })
    });
    if stale_detection {
        if let Some(seed_detection) = seed_project.get("detection") {
            existing_project.insert("detection".to_string(), seed_detection.clone());
        }
        if let Some(seed_project_id) = seed_project.get("id") {
            existing_project.insert("id".to_string(), seed_project_id.clone());
        }
    }
}

impl Registry for EmbeddedSeedRegistry {
    fn find_game(&self, game_id: &str) -> Option<Game> {
        self.games.get(game_id).cloned()
    }

    fn find_project(&self, project_id: &str) -> Option<Project> {
        self.projects.get(project_id).cloned()
    }

    fn list_all_projects(&self) -> Vec<Project> {
        self.projects.values().cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::{merge_missing_seed_entries, PortsDbFile};

    #[test]
    fn embedded_catalog_deserializes_and_contains_new_projects() {
        let catalog: PortsDbFile =
            serde_json::from_str(include_str!("../../ports_db.json")).unwrap();
        let ids: Vec<_> = catalog.games.iter().map(|game| game.id.as_str()).collect();
        assert!(ids.contains(&"super-smash-bros-melee"));
        assert!(ids.contains(&"the-darkness-recomp"));
        assert!(ids.contains(&"shadow-of-the-colossus-ps4"));
        assert!(ids.contains(&"ico-ps2"));
        assert!(ids.contains(&"dead-rising-2-case-zero"));
        for id in [
            "crash-team-racing",
            "crash-bandicoot-2",
            "conkers-bad-fur-day",
            "sly-cooper-thievius-raccoonus",
            "yoshis-story",
            "dark-cloud-2",
        ] {
            let entry = catalog.games.iter().find(|game| game.id == id).unwrap();
            assert!(
                !entry.project.detection.verified,
                "{id} must not auto-match yet"
            );
            assert!(
                entry.project.detection.executables.is_empty(),
                "{id} has no verified executable fingerprint"
            );
            assert!(
                entry.project.detection.folder_patterns.is_empty(),
                "{id} has no verified folder rule"
            );
            assert!(
                entry
                    .project
                    .repository
                    .as_ref()
                    .is_some_and(|repo| repo.url.starts_with("https://github.com/")),
                "{id} must have a GitHub repository to appear in Explore Ports"
            );
        }
    }

    #[test]
    fn installed_library_profiles_have_canonical_exe_and_folder_rules() {
        let catalog: PortsDbFile =
            serde_json::from_str(include_str!("../../ports_db.json")).unwrap();
        let expected = [
            ("bloodborne", "Bloodborne.exe", "Bloodborne-Windows"),
            ("black-xbox-recomp", "BLACK.exe", "BLACK-XBERecomp"),
            (
                "dragon-ball-z-budokai-tenkaichi-3",
                "Tenkaichi3Decomp.exe",
                "Tenkaichi3Decomp-windows-x64",
            ),
            ("the-wind-waker-hd", "Wind Waker HD.exe", "WindWakerHD"),
            (
                "crash-team-racing-nitro-fueled",
                "CTR-NitroFueled-PC.exe",
                "CTR-NitroFueled-PC-portable",
            ),
            (
                "god-of-war-iii-remastered",
                "SpartanPort.exe",
                "spartanport-windows",
            ),
            ("def-jam-fight-for-ny", "DefJamLauncher.exe", "DEF JAM FNY"),
        ];

        for (game_id, executable, folder) in expected {
            let entry = catalog
                .games
                .iter()
                .find(|game| game.id == game_id)
                .unwrap();
            assert!(
                entry.project.detection.verified,
                "{game_id} should be catalog-matchable"
            );
            assert_eq!(
                entry
                    .project
                    .detection
                    .executables
                    .first()
                    .map(String::as_str),
                Some(executable)
            );
            assert!(entry
                .project
                .detection
                .folder_patterns
                .iter()
                .any(|rule| rule.contains(folder)));
        }

        for game_id in [
            "the-wind-waker-hd",
            "crash-team-racing-nitro-fueled",
            "god-of-war-iii-remastered",
        ] {
            let entry = catalog
                .games
                .iter()
                .find(|game| game.id == game_id)
                .unwrap();
            assert!(entry
                .project
                .repository
                .as_ref()
                .is_some_and(|repo| repo.url.starts_with("https://github.com/")));
            assert!(entry
                .box_art_url
                .as_deref()
                .is_some_and(|url| url.starts_with("https://")));
        }
    }

    #[test]
    fn newly_added_projects_have_curated_repositories_artwork_and_safe_match_rules() {
        let catalog: PortsDbFile =
            serde_json::from_str(include_str!("../../ports_db.json")).unwrap();
        for (game_id, executable) in [
            ("shadow-of-the-colossus-ps4", "SotC.exe"),
            ("ico-ps2", "ico_pc_x64.exe"),
            ("the-darkness-recomp", "DarkRecomp.exe"),
        ] {
            let entry = catalog
                .games
                .iter()
                .find(|game| game.id == game_id)
                .unwrap();
            assert!(entry
                .box_art_url
                .as_deref()
                .is_some_and(|url| url.starts_with("https://")));
            assert_eq!(
                entry
                    .project
                    .detection
                    .executables
                    .first()
                    .map(String::as_str),
                Some(executable)
            );
            assert!(
                entry.project.detection.verified,
                "{game_id} should use its reviewed executable rule"
            );
            assert!(entry
                .project
                .repository
                .as_ref()
                .is_some_and(|repo| repo.url.starts_with("https://github.com/")));
        }
    }

    #[test]
    fn appends_new_seed_games_without_overwriting_user_entries() {
        let user = r#"{"games":[{"id":"kept","title":"Título del usuario"}]}"#;
        let seed =
            r#"{"games":[{"id":"kept","title":"Título seed"},{"id":"new","title":"Nuevo"}]}"#;
        let merged: serde_json::Value =
            serde_json::from_str(&merge_missing_seed_entries(user, seed)).unwrap();
        let games = merged["games"].as_array().unwrap();
        assert_eq!(games.len(), 2);
        assert_eq!(games[0]["title"], "Título del usuario");
        assert_eq!(games[1]["id"], "new");
    }

    #[test]
    fn repairs_only_the_known_wrong_fable_repository() {
        let user = r#"{"games":[{"id":"fable-2","project":{"repository":{"url":"https://github.com/himdo/Fable-2-Recomp"},"name":"stale"}}]}"#;
        let seed = r#"{"games":[{"id":"fable-2","project":{"repository":{"url":"https://github.com/Fable2Recomp/Fable2Recomp"},"name":"official"}}]}"#;
        let merged: serde_json::Value =
            serde_json::from_str(&merge_missing_seed_entries(user, seed)).unwrap();
        assert_eq!(
            merged["games"][0]["project"]["repository"]["url"],
            "https://github.com/Fable2Recomp/Fable2Recomp"
        );
        assert_eq!(merged["games"][0]["project"]["name"], "official");
    }

    #[test]
    fn repairs_the_known_wrong_fable_cover_but_keeps_custom_artwork() {
        let old_cover = "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r3k.jpg";
        let user = format!(
            r#"{{"games":[{{"id":"fable-2","box_art_url":"{old_cover}"}},{{"id":"fable-2-custom","box_art_url":"custom.png"}}]}}"#
        );
        let seed = r#"{"games":[{"id":"fable-2","box_art_url":"fable-cover.png"},{"id":"fable-2-custom","box_art_url":"seed.png"}]}"#;
        let merged: serde_json::Value =
            serde_json::from_str(&merge_missing_seed_entries(&user, seed)).unwrap();
        assert_eq!(merged["games"][0]["box_art_url"], "fable-cover.png");
        assert_eq!(merged["games"][1]["box_art_url"], "custom.png");
    }

    #[test]
    fn repairs_stale_bloodborne_and_ctr_profiles_without_overwriting_user_metadata() {
        let user = r#"{"games":[
            {"id":"bloodborne","title":"Mi Bloodborne","original_platforms":["PlayStation 3"],"box_art_url":null,"project":{"id":"bloodborne","detection":{"verified":false,"executables":[],"folder_patterns":["*Bloodborne*"],"known_hashes":[]},"port_art_url":null}},
            {"id":"crash-team-racing-nitro-fueled","title":"CTR personalizado","original_platforms":["PlayStation 4"],"box_art_url":null,"project":{"id":"crash-team-racing-nitro-fueled","detection":{"verified":false,"executables":[],"folder_patterns":["*Crash Team Racing Nitro-Fueled*"],"known_hashes":[]},"port_art_url":null}}
        ]}"#;
        let seed = r#"{"games":[
            {"id":"bloodborne","title":"Bloodborne","original_platforms":["PlayStation 4"],"box_art_url":"bb-cover","project":{"id":"bloodborne-pc-windows","detection":{"verified":true,"executables":["Bloodborne.exe"],"folder_patterns":["Bloodborne-Windows"],"known_hashes":[]},"port_art_url":"bb-port-cover"}},
            {"id":"crash-team-racing-nitro-fueled","title":"Crash Team Racing Nitro-Fueled","original_platforms":["PlayStation 4"],"box_art_url":"ctr-cover","project":{"id":"ctr-nitro-fueled-pc","detection":{"verified":true,"executables":["CTR-NitroFueled-PC.exe"],"folder_patterns":["CTR-NitroFueled-PC-portable"],"known_hashes":[]},"port_art_url":"ctr-port-cover"}}
        ]}"#;

        let merged: serde_json::Value =
            serde_json::from_str(&merge_missing_seed_entries(user, seed)).unwrap();
        let games = merged["games"].as_array().unwrap();

        assert_eq!(games[0]["title"], "Mi Bloodborne");
        assert_eq!(games[0]["original_platforms"][0], "PlayStation 4");
        assert_eq!(games[0]["box_art_url"], "bb-cover");
        assert_eq!(games[0]["project"]["id"], "bloodborne-pc-windows");
        assert_eq!(
            games[0]["project"]["detection"]["executables"][0],
            "Bloodborne.exe"
        );
        assert_eq!(games[0]["project"]["port_art_url"], "bb-port-cover");

        assert_eq!(games[1]["title"], "CTR personalizado");
        assert_eq!(games[1]["box_art_url"], "ctr-cover");
        assert_eq!(games[1]["project"]["id"], "ctr-nitro-fueled-pc");
        assert_eq!(
            games[1]["project"]["detection"]["executables"][0],
            "CTR-NitroFueled-PC.exe"
        );
        assert_eq!(games[1]["project"]["port_art_url"], "ctr-port-cover");
    }

    #[test]
    fn repairs_known_bad_covers_for_portsdr_entries() {
        let user = r#"{"games":[
            {"id":"lost-odyssey","box_art_url":"https://images.igdb.com/igdb/image/upload/t_cover_big/co20se.jpg","project":{"port_art_url":"stale.png"}},
            {"id":"lost-odyssey-custom","box_art_url":"custom.png","project":{"port_art_url":"custom.png"}}
        ]}"#;
        let seed = r#"{"games":[
            {"id":"lost-odyssey","box_art_url":"https://upload.wikimedia.org/wikipedia/en/0/09/Lost_Odyssey_cover.jpg","project":{"port_art_url":"https://upload.wikimedia.org/wikipedia/en/0/09/Lost_Odyssey_cover.jpg"}},
            {"id":"lost-odyssey-custom","box_art_url":"seed.png","project":{"port_art_url":"seed.png"}}
        ]}"#;
        let merged: serde_json::Value =
            serde_json::from_str(&merge_missing_seed_entries(user, seed)).unwrap();
        assert_eq!(
            merged["games"][0]["box_art_url"],
            "https://upload.wikimedia.org/wikipedia/en/0/09/Lost_Odyssey_cover.jpg"
        );
        assert_eq!(
            merged["games"][0]["project"]["port_art_url"],
            "https://upload.wikimedia.org/wikipedia/en/0/09/Lost_Odyssey_cover.jpg"
        );
        assert_eq!(merged["games"][1]["box_art_url"], "custom.png");
    }
}
