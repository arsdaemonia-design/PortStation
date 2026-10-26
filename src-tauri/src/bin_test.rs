use portstation_lib::core::scanner::{LocalFileScanner, Scanner};
use portstation_lib::core::registry::{EmbeddedSeedRegistry, Registry};
use portstation_lib::core::matcher::{HeuristicMatcher, Matcher};
use std::path::Path;

fn main() {
    let ports_dir = Path::new("E:/Games/Ports");
    let scanner = LocalFileScanner::new();
    let registry = EmbeddedSeedRegistry::new();
    let matcher = HeuristicMatcher::new(registry.list_all_projects());

    let candidates = scanner.scan_directory(ports_dir).expect("Scan failed");
    for cand in candidates {
        let eval = matcher.evaluate_candidate(&cand, None);
        if eval.score >= 30 {
            println!("File: {}, matched: {:?} with score {}", cand.path, eval.matched_project_id, eval.score);
        }
    }
}
