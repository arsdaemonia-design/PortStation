use crate::core::models::{CandidateFile, MatchStatus, Project};

#[derive(Debug, Clone)]
pub struct MatchEvaluation {
    pub status: MatchStatus,
    pub score: u32,
    pub matched_project_id: Option<String>,
    pub matched_game_id: Option<String>,
    pub evidence: Vec<String>,
}

pub trait Matcher {
    fn evaluate_candidate(
        &self,
        candidate: &CandidateFile,
        file_hash: Option<&str>,
    ) -> MatchEvaluation;
}

pub struct HeuristicMatcher {
    projects: Vec<Project>,
}

fn is_safe_partial_exe_match(candidate_stem: &str, rule_stem: &str) -> bool {
    if rule_stem.len() < 4 || candidate_stem == rule_stem {
        return false;
    }
    if rule_stem.len() >= 6 {
        return candidate_stem.contains(rule_stem);
    }
    for (idx, _) in candidate_stem.match_indices(rule_stem) {
        let before_ok = idx == 0
            || candidate_stem[..idx]
                .chars()
                .next_back()
                .is_some_and(|c| !c.is_ascii_alphanumeric());
        let after_idx = idx + rule_stem.len();
        let after_ok = after_idx == candidate_stem.len()
            || candidate_stem[after_idx..]
                .chars()
                .next()
                .is_some_and(|c| !c.is_ascii_alphanumeric());
        if before_ok && after_ok {
            return true;
        }
    }
    false
}

fn strip_executable_suffix(lower_name: &str) -> Option<&str> {
    for suffix in [".exe", ".appimage", ".elf", ".bin", ".sh", ".bat", ".cmd"] {
        if let Some(stem) = lower_name.strip_suffix(suffix) {
            return Some(stem);
        }
    }
    if !lower_name.contains('.') {
        return Some(lower_name);
    }
    None
}

impl HeuristicMatcher {
    pub fn new(projects: Vec<Project>) -> Self {
        Self { projects }
    }
}

impl Default for HeuristicMatcher {
    fn default() -> Self {
        let registry = crate::core::registry::EmbeddedSeedRegistry::new();
        Self::new(crate::core::registry::Registry::list_all_projects(
            &registry,
        ))
    }
}

impl Matcher for HeuristicMatcher {
    fn evaluate_candidate(
        &self,
        candidate: &CandidateFile,
        file_hash: Option<&str>,
    ) -> MatchEvaluation {
        let mut best_score = 0u32;
        let mut best_evidence = Vec::new();
        let mut matched_project_id = None;
        let mut matched_game_id = None;

        let lower_filename = candidate.filename.to_lowercase();
        let lower_path = candidate.path.to_lowercase();

        for proj in &self.projects {
            // Unverified catalog entries are not automatically matched by the scanner
            if !proj.detection.verified {
                continue;
            }

            let mut current_score = 0u32;
            let mut current_evidence = Vec::new();
            let mut is_match = false;

            // 1. Structural / Name checks against registered executables
            let candidate_stem_opt = if candidate.is_executable {
                strip_executable_suffix(&lower_filename)
            } else {
                None
            };

            for (idx, exe) in proj.detection.executables.iter().enumerate() {
                let lower_exe = exe.to_lowercase();
                let base_exe = lower_exe.strip_suffix(".exe").unwrap_or(&lower_exe);
                if lower_filename == lower_exe
                    || candidate_stem_opt
                        .is_some_and(|stem| !base_exe.is_empty() && stem == base_exe)
                {
                    let exe_score = if idx == 0 { 85 } else { 70 };
                    current_score += exe_score;
                    current_evidence
                        .push(format!("Exact executable match '{}' (+{})", exe, exe_score));
                    is_match = true;
                    break;
                } else if let Some(candidate_stem) = candidate_stem_opt {
                    if is_safe_partial_exe_match(candidate_stem, base_exe) {
                        current_score += 60;
                        current_evidence.push(format!("Partial executable match '{}' (+60)", exe));
                        is_match = true;
                        break;
                    }
                }
            }

            // 2. Folder patterns check
            if is_match {
                for pattern in &proj.detection.folder_patterns {
                    let clean_pat = pattern.trim_matches('*').to_lowercase();
                    let os_neutral_pat = clean_pat
                        .strip_suffix("-windows")
                        .or_else(|| clean_pat.strip_suffix("_windows"))
                        .filter(|s| s.len() >= 4);
                    if lower_path.contains(&clean_pat)
                        || os_neutral_pat.is_some_and(|neutral| lower_path.contains(neutral))
                    {
                        current_score += 15;
                        current_evidence.push(format!(
                            "Directory path matches folder pattern '{}' (+15)",
                            pattern
                        ));
                        break;
                    }
                }
            }

            // 3. Hash checks
            if let Some(hash) = file_hash {
                if proj.detection.known_hashes.contains(&hash.to_string()) {
                    current_score += 100;
                    current_evidence
                        .push("Exact SHA-256 match found in database (+100)".to_string());
                    is_match = true;
                }
            }

            if is_match && current_score > best_score {
                best_score = current_score;
                best_evidence = current_evidence;
                matched_project_id = Some(proj.id.clone());
                matched_game_id = Some(proj.game_id.clone());
            }
        }

        let status = if best_score >= 100 {
            MatchStatus::VERIFIED
        } else if best_score >= 60 {
            MatchStatus::RECOGNIZED
        } else if best_score >= 30 {
            MatchStatus::POSSIBLE_MATCH
        } else {
            MatchStatus::UNKNOWN
        };

        MatchEvaluation {
            status,
            score: best_score,
            matched_project_id,
            matched_game_id,
            evidence: best_evidence,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_matcher_recognizes_dusklight_by_name() {
        let matcher = HeuristicMatcher::default();
        let candidate = CandidateFile {
            path: "E:/Games/Dusklight.exe".to_string(),
            filename: "Dusklight.exe".to_string(),
            size: 15_000_000,
            is_executable: true,
        };

        let result = matcher.evaluate_candidate(&candidate, None);
        assert_eq!(result.status, MatchStatus::VERIFIED);
        assert_eq!(result.matched_project_id.as_deref(), Some("dusklight"));
    }

    #[test]
    fn test_matcher_catalogs_the_users_new_port_folders() {
        let matcher = HeuristicMatcher::default();
        let cases = [
            (
                "E:/Games/Ports/Bloodborne-Windows/bbport-windows/Bloodborne.exe",
                "Bloodborne.exe",
                "bloodborne-pc-windows",
                "bloodborne",
            ),
            (
                "E:/Games/Ports/BLACK-XBERecomp/BLACK.exe",
                "BLACK.exe",
                "black-xberecomp",
                "black-xbox-recomp",
            ),
            (
                "E:/Games/Ports/Tenkaichi3Decomp-windows-x64/Tenkaichi3Decomp/Tenkaichi3Decomp.exe",
                "Tenkaichi3Decomp.exe",
                "tenkaichi-3-decomp",
                "dragon-ball-z-budokai-tenkaichi-3",
            ),
            (
                "E:/Games/Ports/WindWakerHD-v0.3.0-devel/Wind Waker HD.exe",
                "Wind Waker HD.exe",
                "wind-waker-hd-recomp",
                "the-wind-waker-hd",
            ),
            (
                "E:/Games/Ports/CTR-NitroFueled-PC-portable-windows/CTR-NitroFueled-PC.exe",
                "CTR-NitroFueled-PC.exe",
                "ctr-nitro-fueled-pc",
                "crash-team-racing-nitro-fueled",
            ),
            (
                "E:/Games/Ports/spartanport-windows/spartanport-windows/SpartanPort.exe",
                "SpartanPort.exe",
                "spartanport-gow3",
                "god-of-war-iii-remastered",
            ),
            (
                "E:/Games/Ports/DEF JAM FNY/Install/DefJamLauncher.exe",
                "DefJamLauncher.exe",
                "def-jam-fight-for-ny-recompiled",
                "def-jam-fight-for-ny",
            ),
        ];

        for (path, filename, project_id, game_id) in cases {
            let result = matcher.evaluate_candidate(
                &CandidateFile {
                    path: path.to_string(),
                    filename: filename.to_string(),
                    size: 1,
                    is_executable: true,
                },
                None,
            );
            assert_eq!(result.status, MatchStatus::VERIFIED, "{path}");
            assert_eq!(result.matched_project_id.as_deref(), Some(project_id));
            assert_eq!(result.matched_game_id.as_deref(), Some(game_id));
        }
    }

    /// Paths below mirror the real contents of the GitHub release archives
    /// (inspected on 2026-10-25), so detection rules stay tied to actual files.
    #[test]
    fn test_matcher_recognizes_portsdr_releases_by_real_executables() {
        let matcher = HeuristicMatcher::default();
        let cases = [
            ("E:/Games/Ports/CoD3Recomp/CoD3SP_s.exe", "CoD3SP_s.exe", "cod3-recomp"),
            (
                "E:/Games/Ports/DragonsCrownProPC-v0.7.1-windows-x64/dragons_crown_pro.exe",
                "dragons_crown_pro.exe",
                "dragons-crown-pro-pc",
            ),
            (
                "E:/Games/Ports/tlg-windows-x86_64/The Last Guardian.exe",
                "The Last Guardian.exe",
                "tlg-pc",
            ),
            (
                "E:/Games/Ports/tlg-windows-x86_64/Play The Last Guardian.exe",
                "Play The Last Guardian.exe",
                "tlg-pc",
            ),
            (
                "E:/Games/Ports/infamous-windows-x86_64/inFAMOUS Second Son.exe",
                "inFAMOUS Second Son.exe",
                "infamous-second-son-pc",
            ),
            (
                "E:/Games/Ports/Killzone Shadow Fall/Killzone Shadow Fall.exe",
                "Killzone Shadow Fall.exe",
                "killzone-shadowfall-pc",
            ),
            (
                "E:/Games/Ports/Killzone Shadow Fall/bin/KillzoneShadowFall.exe",
                "KillzoneShadowFall.exe",
                "killzone-shadowfall-pc",
            ),
            ("E:/Games/Ports/Killzone/killzone.exe", "killzone.exe", "killzone-recomp"),
        ];

        for (path, filename, project_id) in cases {
            let result = matcher.evaluate_candidate(
                &CandidateFile {
                    path: path.to_string(),
                    filename: filename.to_string(),
                    size: 1,
                    is_executable: true,
                },
                None,
            );
            assert_eq!(
                result.matched_project_id.as_deref(),
                Some(project_id),
                "{path} -> {:?}",
                result.evidence
            );
            assert!(result.status != MatchStatus::UNKNOWN, "{path}");
        }
    }

    #[test]
    fn test_matcher_ignores_helper_executables_and_removed_entries() {
        let matcher = HeuristicMatcher::default();
        for (path, filename) in [
            ("E:/Games/Ports/tlg-windows-x86_64/out/tlg-probe.exe", "tlg-probe.exe"),
            ("E:/Games/Ports/DragonsCrownProPC-v0.7.1-windows-x64/trg-updater.exe", "trg-updater.exe"),
            // inFAMOUS 1 entry was removed: its repository does not exist.
            ("E:/Games/Ports/inFamous-PC-Enhanced/inFamous.exe", "inFamous.exe"),
        ] {
            let result = matcher.evaluate_candidate(
                &CandidateFile {
                    path: path.to_string(),
                    filename: filename.to_string(),
                    size: 1,
                    is_executable: true,
                },
                None,
            );
            assert_eq!(result.status, MatchStatus::UNKNOWN, "{path} -> {:?}", result.matched_project_id);
        }
    }
    #[test]
    fn test_short_executable_names_do_not_false_positive_on_unrelated_games() {
        let matcher = HeuristicMatcher::default();
        for (path, filename) in [
            ("E:/Games/Ports/BlackMesa/BlackMesa.exe", "BlackMesa.exe"),
            ("E:/Games/Ports/Pokemon/PokemonBlack.exe", "PokemonBlack.exe"),
            ("E:/Games/Ports/GBA/BanjoPilotGBA.exe", "BanjoPilotGBA.exe"),
        ] {
            let result = matcher.evaluate_candidate(
                &CandidateFile {
                    path: path.to_string(),
                    filename: filename.to_string(),
                    size: 1,
                    is_executable: true,
                },
                None,
            );
            assert_eq!(
                result.status,
                MatchStatus::UNKNOWN,
                "{path} -> {:?}",
                result.matched_project_id
            );
        }

        let valid_black = matcher.evaluate_candidate(
            &CandidateFile {
                path: "E:/Games/Ports/BLACK/BLACK-win64.exe".to_string(),
                filename: "BLACK-win64.exe".to_string(),
                size: 1,
                is_executable: true,
            },
            None,
        );
        assert_eq!(
            valid_black.matched_project_id.as_deref(),
            Some("black-xberecomp")
        );
    }

    #[test]
    fn test_matcher_recognizes_linux_elf_and_appimage_binaries() {
        let matcher = HeuristicMatcher::default();
        let elf_candidate = CandidateFile {
            path: "/home/deck/Games/Ports/SpartanPort/SpartanPort".to_string(),
            filename: "SpartanPort".to_string(),
            size: 10_000_000,
            is_executable: true,
        };
        let eval_elf = matcher.evaluate_candidate(&elf_candidate, None);
        assert_eq!(eval_elf.status, MatchStatus::VERIFIED);
        assert_eq!(
            eval_elf.matched_project_id.as_deref(),
            Some("spartanport-gow3")
        );

        let appimage_candidate = CandidateFile {
            path: "/home/deck/Games/Ports/Ghostship/Ghostship-x86_64.AppImage".to_string(),
            filename: "Ghostship-x86_64.AppImage".to_string(),
            size: 25_000_000,
            is_executable: true,
        };
        let eval_appimage = matcher.evaluate_candidate(&appimage_candidate, None);
        assert_eq!(
            eval_appimage.matched_project_id.as_deref(),
            Some("ghostship")
        );
    }
}