export type MatchStatus =
  | 'VERIFIED'
  | 'RECOGNIZED'
  | 'POSSIBLE_MATCH'
  | 'USER_CONFIRMED'
  | 'UNKNOWN';

export type PortMethod =
  | 'DECOMP_NATIVE'
  | 'STATIC_RECOMP'
  | 'PORT'
  | 'HYBRID'
  | 'UNKNOWN';

export interface SubGame {
  title: string;
  releaseYear?: number;
  synopsis?: string;
  boxArtUrl?: string;
  mediaType?: 'cartridge' | 'disc';
  screenshots?: string[];
}

export interface GameItem {
  id: string;
  title: string;
  originalPlatform: string;
  releaseYear?: number;
  developer?: string;
  synopsis?: string;
  boxArtUrl?: string; // Caja original del juego
  discArtUrl?: string; // Disco óptico o cartucho
  cartridgeArtUrl?: string; // Sticker / Etiqueta de cartucho
  portArtUrl?: string; // Arte / Icono del Port del creador (ej: Midna, OpenGOAL)
  subGames?: SubGame[];

  projectTitle: string;
  /** User-curated availability label; does not imply permission to redistribute. */
  isAbandonware?: boolean;
  /** Whether this entry represents a real community port/recomp/decomp project. */
  hasCommunityPort?: boolean;
  method: PortMethod;
  status: MatchStatus;
  author?: string;
  authorAvatarUrl?: string;
  repositoryUrl?: string;
  features?: string[];
  technicalNotes?: string;

  executablePath: string;
  installPath: string;
  sha256?: string;
  version?: string;
  inMemoriam?: {
    studioName: string;
    years: string;
    notes: string;
    statusLabel?: string;
    sources?: Array<{ label: string; url: string }>;
  };
}

export interface ScanRoot {
  id: string;
  path: string;
  lastScanned?: string;
  totalFound: number;
}

export interface PlatformInfo {
  os: 'windows' | 'linux' | 'macos' | 'android' | 'ios' | 'unknown';
  arch: 'x64' | 'arm64' | 'x86' | 'arm' | 'unknown';
  isSteamDeck?: boolean;
  displayName?: string;
}

export interface AppUpdateAsset {
  name: string;
  downloadUrl: string;
  sizeBytes: number;
  platform: 'windows' | 'linux' | 'android' | 'macos' | 'auxiliary' | 'other';
  isRecommended: boolean;
}

export interface AppUpdateCheckResult {
  status: 'update_available' | 'up_to_date' | 'no_releases' | 'comparison_unavailable' | 'error';
  currentVersion: string;
  latestVersion: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  publishedAt: string | null;
  htmlUrl: string | null;
  platform: PlatformInfo;
  recommendedAsset: AppUpdateAsset | null;
  windowsAssets: AppUpdateAsset[];
  linuxAssets: AppUpdateAsset[];
  androidAssets: AppUpdateAsset[];
  macosAssets: AppUpdateAsset[];
  otherAssets: AppUpdateAsset[];
}

export interface VirusTotalReport {
  sha256: string;
  found: boolean;
  malicious?: number;
  suspicious?: number;
  undetected?: number;
  total?: number;
  positives?: number;
  permalink?: string;
  popular_threat_label?: string;
  popularThreatLabel?: string;
  threat_classification?: string;
  threatClassification?: string;
  defender_clean?: boolean;
  defenderClean?: boolean;
  microsoft_defender_clean?: boolean;
  microsoftDefenderClean?: boolean;
  kaspersky_clean?: boolean;
  kasperskyClean?: boolean;
  bitdefender_clean?: boolean;
  bitdefenderClean?: boolean;
  scan_date?: string;
  message?: string;
}

export interface CatalogSyncResult {
  status: 'updated' | 'already_up_to_date' | 'error';
  localVersion: string;
  remoteVersion: string;
  newGamesCount: number;
  updatedGamesCount: number;
  totalGamesCount: number;
  message: string;
}

export interface CatalogInfo {
  catalogVersion: string;
  totalGames: number;
  officialRepoUrl: string;
}

