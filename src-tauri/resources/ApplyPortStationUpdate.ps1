param(
  [Parameter(Mandatory = $true)][int]$ProcessId,
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][string]$UpdatePath,
  [Parameter(Mandatory = $true)][string]$LogPath
)

$ErrorActionPreference = 'Stop'

function Write-UpdateLog([string]$Message) {
  $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
  Add-Content -LiteralPath $LogPath -Value "[$stamp] $Message"
}

try {
  Write-UpdateLog 'Waiting for PortStation to close.'
  $runningApp = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
  if ($runningApp) {
    if (-not $runningApp.WaitForExit(90000)) {
      throw 'PortStation did not close within 90 seconds.'
    }
  }

  if (-not (Test-Path -LiteralPath $UpdatePath -PathType Leaf)) {
    throw 'The verified update file is missing.'
  }

  $targetDirectory = Split-Path -Parent $TargetPath
  $stagedPath = "$TargetPath.update"
  $backupPath = "$TargetPath.previous"
  Copy-Item -LiteralPath $UpdatePath -Destination $stagedPath -Force
  if (Test-Path -LiteralPath $TargetPath -PathType Leaf) {
    Copy-Item -LiteralPath $TargetPath -Destination $backupPath -Force
  }

  try {
    Move-Item -LiteralPath $stagedPath -Destination $TargetPath -Force
    Write-UpdateLog 'Installed the new executable.'
    Start-Process -FilePath $TargetPath -WorkingDirectory $targetDirectory
    Write-UpdateLog 'Restarted PortStation.'
    Remove-Item -LiteralPath $UpdatePath -Force -ErrorAction SilentlyContinue
  } catch {
    if (Test-Path -LiteralPath $backupPath -PathType Leaf) {
      Copy-Item -LiteralPath $backupPath -Destination $TargetPath -Force
      Write-UpdateLog 'Restored the previous executable.'
    }
    throw
  }
} catch {
  $failure = $_.Exception.Message
  try { Write-UpdateLog "Update failed: $failure" } catch {}
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show(
    "No se pudo completar la actualización de PortStation.`n`n$failure`n`nEl ejecutable anterior se conserva como PortStation.exe.previous cuando fue posible.",
    'Actualización de PortStation',
    [System.Windows.MessageBoxButton]::OK,
    [System.Windows.MessageBoxImage]::Error
  ) | Out-Null
  exit 1
}
