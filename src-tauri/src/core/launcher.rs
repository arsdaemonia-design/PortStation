use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone)]
pub enum LaunchRunner {
    Native,
    Wine {
        wine_binary: String,
        prefix: Option<String>,
    },
    Custom {
        command: String,
    },
}

pub trait Launcher {
    fn launch(
        &self,
        executable_path: &Path,
        working_dir: &Path,
        args: &[String],
        runner: &LaunchRunner,
    ) -> Result<u32, String>;
}

pub struct SafeProcessLauncher;

impl SafeProcessLauncher {
    pub fn new() -> Self {
        Self
    }

    pub fn launch_child(
        &self,
        executable_path: &Path,
        working_dir: &Path,
        args: &[String],
        runner: &LaunchRunner,
    ) -> Result<std::process::Child, String> {
        if !executable_path.exists() {
            return Err(format!(
                "Executable not found at: {}",
                executable_path.display()
            ));
        }

        if !working_dir.exists() {
            return Err(format!(
                "Working directory not found at: {}",
                working_dir.display()
            ));
        }

        let mut cmd = match runner {
            LaunchRunner::Native => {
                let mut c = Command::new(executable_path);
                c.args(args);
                c
            }
            LaunchRunner::Wine {
                wine_binary,
                prefix,
            } => {
                let mut c = Command::new(wine_binary);
                if let Some(p) = prefix {
                    c.env("WINEPREFIX", p);
                }
                c.arg(executable_path);
                c.args(args);
                c
            }
            LaunchRunner::Custom { command } => {
                let mut c = Command::new(command);
                c.arg(executable_path);
                c.args(args);
                c
            }
        };

        // Strict working directory enforcement as required by spec
        cmd.current_dir(working_dir);

        cmd.spawn()
            .map_err(|e| format!("Failed to spawn process: {}", e))
    }
}

impl Launcher for SafeProcessLauncher {
    fn launch(
        &self,
        executable_path: &Path,
        working_dir: &Path,
        args: &[String],
        runner: &LaunchRunner,
    ) -> Result<u32, String> {
        let child = self.launch_child(executable_path, working_dir, args, runner)?;
        Ok(child.id())
    }
}
