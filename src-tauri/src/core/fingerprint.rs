use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

pub struct FingerprintInspector;

impl FingerprintInspector {
    /// Computes the SHA-256 hex string of a given file path.
    pub fn compute_sha256<P: AsRef<Path>>(path: P) -> io::Result<String> {
        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let result = hasher.finalize();
        Ok(hex::encode(result))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_sha256_synthetic_file() {
        let mut temp_file = NamedTempFile::new().expect("Failed to create temp file");
        write!(temp_file, "PortStation Synthetic Binary Test").expect("Failed to write fixture");

        let hash = FingerprintInspector::compute_sha256(temp_file.path())
            .expect("Failed to compute SHA-256");

        assert_eq!(hash.len(), 64);
        // SHA-256 of "PortStation Synthetic Binary Test" is reproducible
        let mut hasher = Sha256::new();
        hasher.update(b"PortStation Synthetic Binary Test");
        let expected = hex::encode(hasher.finalize());
        assert_eq!(hash, expected);
    }
}
