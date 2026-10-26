// Smart GitHub release asset matcher inspired by Quiver Launcher's PlatformAssetMatcher and DownloadAssetPolicy.
// Accurately categorizes and recommends assets for Windows, Linux (SteamOS/Steam Deck), and macOS.

export interface ReleaseAssetInfo {
  name: string;
  size: number;
  download_url?: string;
  browser_download_url?: string;
  digest?: string | null;
}

export type PlatformType = 'windows' | 'linux' | 'macos' | 'android' | 'console' | 'auxiliary' | 'unknown';

const NON_WINDOWS_MARKERS = [
  'linux', 'macos', 'osx', 'darwin', 'apple',
  '.deb', '.rpm', 'appimage', 'flatpak', '.dmg', '.pkg',
  'android', 'arm64-v8a', '.apk', 'switch', 'psvita', 'vita', 'portmaster'
];

/**
 * Checks whether an asset is auxiliary (checksums, signatures, debug symbols, or build descriptors).
 */
export function isAuxiliaryAsset(name: string): boolean {
  const lower = name.toLowerCase();

  // Descriptors and update feeds
  if (/\.(?:json|ya?ml|blockmap|zsync)$/i.test(lower)) return true;

  // Checksums, hashes, and signatures
  if (/(?:\.(?:sha(?:1|224|256|384|512)?|md5|sig|asc|minisig|signature)(?:\.txt)?$)/i.test(lower)) return true;
  if (/(?:^|[._-])(?:checksums?|sha(?:1|224|256|384|512)?sums?|md5sums?)(?:$|[._-])/i.test(lower)) return true;

  // Debug symbols and PDB packages
  if (/(?:^|[._-])(?:pdb|dsym|symbols|debugsymbols|debug[._-]symbols)(?:$|[._-])/i.test(lower)) return true;

  // Pure source code archives
  if (/(?:^|[._\s-])(?:notices?|sources?|source[._\s-]code|src)\.(?:zip|7z|rar|tar(?:\.(?:gz|xz|bz2|zst))?|tgz|tbz2|txz)$/i.test(lower)) return true;

  return false;
}

/**
 * Checks if asset is suitable for Android.
 */
export function isAndroidAsset(name: string): boolean {
  const lower = name.toLowerCase();
  if (isAuxiliaryAsset(lower)) return false;
  return /\.apk$/i.test(lower) || /\.aab$/i.test(lower) || /(?:^|[^a-z0-9])(?:android|arm64-v8a)\b/i.test(lower);
}

/**
 * Checks if asset targets dedicated consoles (Switch, PS Vita, PortMaster) or non-Android mobile (iOS).
 */
export function isDedicatedDeviceOrMobile(name: string): boolean {
  const lower = name.toLowerCase();
  if (/(?:^|[^a-z0-9])(?:ios|ipados|iphone|ipad)\b|\.ipa(?:$|[._-])/i.test(lower)) return true;
  if (/(?:^|[^a-z0-9])(?:xbox|switch|nro|psvita|vpk|portmaster|stockos|rg\d{2,3}|trimui|miyoo)\b/i.test(lower)) return true;
  return false;
}

/**
 * Checks if asset is suitable for Windows.
 */
export function isWindowsAsset(name: string): boolean {
  const lower = name.toLowerCase();
  if (isAuxiliaryAsset(lower) || isDedicatedDeviceOrMobile(lower) || isAndroidAsset(lower)) return false;

  // Rejects explicit non-windows platform markers
  for (const marker of NON_WINDOWS_MARKERS) {
    if (lower.includes(marker)) return false;
  }

  // Matches explicit windows markers
  const explicitWin = /(?:windows|win64|win32|win-x64|win-x86|[._-]win[._-]|[._-]win\d|^win[._-]|\.exe$|\.msi$|msvc|mingw)/i.test(lower);
  if (explicitWin) return true;

  // Unlabeled zip/7z/rar with no other platform markers
  return /\.(?:zip|7z|rar)$/i.test(lower);
}

/**
 * Checks if asset is suitable for Linux (including SteamOS & Steam Deck).
 */
export function isLinuxAsset(name: string): boolean {
  const lower = name.toLowerCase();
  if (isAuxiliaryAsset(lower) || isDedicatedDeviceOrMobile(lower) || isAndroidAsset(lower)) return false;

  if (/(?:windows|win32|win64|\.exe|\.msi|macos|osx|darwin|\.dmg|\.pkg|\.apk|android)/i.test(lower)) {
    return false;
  }

  return /(?:linux|appimage|flatpak|\.deb|\.rpm|\.tar\.(?:gz|xz|zst|bz2)|\.tgz|\.sh$|\.bin$)/i.test(lower);
}

/**
 * Checks if asset is suitable for macOS.
 */
export function isMacAsset(name: string): boolean {
  const lower = name.toLowerCase();
  if (isAuxiliaryAsset(lower) || isDedicatedDeviceOrMobile(lower) || isAndroidAsset(lower)) return false;

  if (/(?:windows|win32|win64|linux|\.exe|\.msi|appimage|\.deb|\.rpm|\.apk|android)/i.test(lower)) {
    return false;
  }

  return /(?:macos|osx|darwin|\.dmg|\.pkg|apple|\bmac\b)/i.test(lower);
}

/**
 * Determines whether the asset matches a specific target platform ('windows', 'linux', 'macos', or 'android').
 */
export function matchesPlatform(name: string, targetOs: 'windows' | 'linux' | 'macos' | 'android'): boolean {
  switch (targetOs) {
    case 'windows':
      return isWindowsAsset(name);
    case 'linux':
      return isLinuxAsset(name);
    case 'macos':
      return isMacAsset(name);
    case 'android':
      return isAndroidAsset(name);
    default:
      return false;
  }
}

/**
 * Scores an asset's relevance for the user's OS and processor architecture (higher is better).
 */
export function scoreAsset(name: string, targetOs: 'windows' | 'linux' | 'macos' | 'android', arch: string = 'x64'): number {
  if (!matchesPlatform(name, targetOs)) return -100;

  const lower = name.toLowerCase();
  let score = 10;

  // Platform specific preference boosts
  if (targetOs === 'windows') {
    if (lower.includes('win64') || lower.includes('x64') || lower.includes('win-x64')) score += 20;
    if (lower.endsWith('.exe') || lower.endsWith('.msi')) score += 15;
    if (lower.includes('windows')) score += 10;
    if (lower.endsWith('.zip') || lower.endsWith('.7z') || lower.endsWith('.rar')) score += 5;
  } else if (targetOs === 'linux') {
    if (lower.endsWith('.appimage')) score += 25; // AppImages run out of the box on SteamOS/Linux!
    if (lower.includes('x64') || lower.includes('x86_64') || lower.includes('amd64')) score += 20;
    if (lower.includes('linux')) score += 10;
    if (lower.endsWith('.tar.gz') || lower.endsWith('.tar.xz')) score += 5;
  } else if (targetOs === 'android') {
    if (lower.endsWith('.apk')) score += 30;
    if (arch === 'arm64' && (lower.includes('arm64') || lower.includes('v8a') || lower.includes('universal'))) score += 20;
    if (lower.includes('universal')) score += 15;
    if (lower.endsWith('.aab')) score += 5;
  } else if (targetOs === 'macos') {
    if (lower.endsWith('.dmg')) score += 25;
    if (lower.endsWith('.pkg')) score += 20;
    if (arch === 'arm64' && (lower.includes('arm64') || lower.includes('apple-silicon') || lower.includes('universal'))) score += 20;
  }

  // Architecture penalties
  const isArmTarget = arch === 'arm64' || arch === 'arm';
  const hasArmMarker = /(?:arm64|aarch64|armv8)/i.test(lower);
  const hasX64Marker = /(?:x64|x86[_-]64|amd64)/i.test(lower);

  if (isArmTarget && hasX64Marker && !hasArmMarker) {
    score -= 10;
  } else if (!isArmTarget && hasArmMarker && targetOs !== 'android') {
    score -= 30; // Won't run natively on Intel/AMD PC
  }

  return score;
}

export interface GroupedReleaseAssets<T extends ReleaseAssetInfo = ReleaseAssetInfo> {
  recommended: T[];
  otherPlatforms: T[];
  auxiliary: T[];
}

/**
 * Organizes a release's assets into Recommended for the active OS, Other Platforms, and Auxiliary/Symbols.
 */
export function groupReleaseAssets<T extends ReleaseAssetInfo>(
  assets: T[],
  targetOs: 'windows' | 'linux' | 'macos' | 'android' = 'windows',
  arch: string = 'x64'
): GroupedReleaseAssets<T> {
  const recommended: T[] = [];
  const otherPlatforms: T[] = [];
  const auxiliary: T[] = [];

  for (const asset of assets) {
    if (isAuxiliaryAsset(asset.name)) {
      auxiliary.push(asset);
    } else if (matchesPlatform(asset.name, targetOs)) {
      recommended.push(asset);
    } else {
      otherPlatforms.push(asset);
    }
  }

  // Sort recommended assets by score descending
  recommended.sort((a, b) => scoreAsset(b.name, targetOs, arch) - scoreAsset(a.name, targetOs, arch));

  return { recommended, otherPlatforms, auxiliary };
}
