use crate::core::models::{Installation, MatchStatus};
use rusqlite::{params, Connection, Result};
use std::path::Path;

pub struct DatabaseManager {
    conn: Connection,
}

impl DatabaseManager {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        let manager = Self { conn };
        manager.init_schema()?;
        Ok(manager)
    }

    pub fn open_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        let manager = Self { conn };
        manager.init_schema()?;
        Ok(manager)
    }

    fn init_schema(&self) -> Result<()> {
        self.conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS scan_roots (
                id TEXT PRIMARY KEY,
                path TEXT NOT NULL UNIQUE,
                last_scanned TEXT
            );

            CREATE TABLE IF NOT EXISTS installations (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                executable_path TEXT NOT NULL,
                working_dir TEXT NOT NULL,
                status TEXT NOT NULL,
                sha256 TEXT,
                detected_version TEXT
            );
            ",
        )?;
        Ok(())
    }

    pub fn add_scan_root(&self, id: &str, path: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO scan_roots (id, path, last_scanned) VALUES (?1, ?2, datetime('now'))",
            params![id, path],
        )?;
        Ok(())
    }

    pub fn save_installation(&self, inst: &Installation) -> Result<()> {
        let status_str = match inst.status {
            MatchStatus::VERIFIED => "VERIFIED",
            MatchStatus::RECOGNIZED => "RECOGNIZED",
            MatchStatus::POSSIBLE_MATCH => "POSSIBLE_MATCH",
            MatchStatus::USER_CONFIRMED => "USER_CONFIRMED",
            MatchStatus::UNKNOWN => "UNKNOWN",
        };

        self.conn.execute(
            "INSERT OR REPLACE INTO installations 
             (id, game_id, project_id, executable_path, working_dir, status, sha256, detected_version)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                inst.id,
                inst.game_id,
                inst.project_id,
                inst.executable_path,
                inst.working_dir,
                status_str,
                inst.sha256,
                inst.detected_version
            ],
        )?;
        Ok(())
    }

    pub fn update_executable_path(
        &self,
        id: &str,
        executable_path: &str,
        working_dir: &str,
    ) -> Result<()> {
        self.conn.execute(
            "UPDATE installations SET executable_path = ?1, working_dir = ?2 WHERE id = ?3",
            params![executable_path, working_dir, id],
        )?;
        Ok(())
    }

    pub fn list_installations(&self) -> Result<Vec<Installation>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, game_id, project_id, executable_path, working_dir, status, sha256, detected_version FROM installations",
        )?;

        let rows = stmt.query_map([], |row| {
            let status_str: String = row.get(5)?;
            let status = match status_str.as_str() {
                "VERIFIED" => MatchStatus::VERIFIED,
                "RECOGNIZED" => MatchStatus::RECOGNIZED,
                "POSSIBLE_MATCH" => MatchStatus::POSSIBLE_MATCH,
                "USER_CONFIRMED" => MatchStatus::USER_CONFIRMED,
                _ => MatchStatus::UNKNOWN,
            };

            Ok(Installation {
                id: row.get(0)?,
                game_id: row.get(1)?,
                project_id: row.get(2)?,
                executable_path: row.get(3)?,
                working_dir: row.get(4)?,
                status,
                sha256: row.get(6)?,
                detected_version: row.get(7)?,
            })
        })?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        Ok(results)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sqlite_in_memory_persistence() {
        let db = DatabaseManager::open_in_memory().expect("Failed to open DB");
        let fake_inst = Installation {
            id: "fake-1".to_string(),
            game_id: "twilight-princess".to_string(),
            project_id: "dusklight".to_string(),
            executable_path: "E:/Games/Dusklight.exe".to_string(),
            working_dir: "E:/Games".to_string(),
            status: MatchStatus::VERIFIED,
            sha256: Some("fakehash".to_string()),
            detected_version: Some("v2.0.2".to_string()),
        };

        db.save_installation(&fake_inst).expect("Failed to save");
        let list = db.list_installations().expect("Failed to list");

        assert_eq!(list.len(), 1);
        assert_eq!(list[0].id, "fake-1");
        assert_eq!(list[0].status, MatchStatus::VERIFIED);
    }
}
