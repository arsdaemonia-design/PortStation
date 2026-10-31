import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import { GameItem, ScanRoot, PlatformInfo, VirusTotalReport, AppUpdateCheckResult, CatalogSyncResult, CatalogInfo } from './types';
import {
  FileEdit,
  FolderPlus,
  FolderOpen,
  Trash2,
  Gamepad2,
  Disc,
  Save,
  ExternalLink,
  X,
  Calendar,
  Code2,
  Cpu,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Settings,
  Search,
  Compass,
  Download,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  Shield,
  Key,
  Smartphone,
  Monitor,
  Database,
  ArrowUpDown,
  Menu
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useGamepadNavigation, PadAction } from './hooks/useGamepadNavigation';
import { MOCK_GAMES } from './mockData';
import { PhysicalMediaCard } from './components/PhysicalMedia';
import { ArtworkManagerModal } from './components/ArtworkManagerModal';
import { EditGameModal } from './components/EditGameModal';
import { getDeveloperHistory } from './data/developerHistory';
import { CURIOSITIES, getRandomCuriosity, Curiosity } from './data/curiosities';
import { CuriosityCard, CuriosityToast, playCuriosityChime } from './components/CuriosityCard';
import { hasCommunityPort, isAbandonware } from './utils/gameClassification';
import { groupReleaseAssets } from './utils/assetMatcher';

interface GitHubReleaseAsset {
  name: string;
  size: number;
  download_url: string;
  browser_download_url?: string;
  digest?: string | null;
}

interface GitHubReleaseInfo {
  tag_name: string;
  name?: string | null;
  url: string;
  published_at?: string | null;
  prerelease: boolean;
  assets: GitHubReleaseAsset[];
}

interface GitHubUpdateCheck {
  status: 'up_to_date' | 'update_available' | 'comparison_unavailable' | 'installed_version_unknown' | 'no_releases';
  current_version?: string | null;
  latest_version?: string | null;
  releases: GitHubReleaseInfo[];
}

interface CachedRepoReleaseSummary {
  latestVersion: string | null;
  currentVersion: string | null;
  status: GitHubUpdateCheck['status'];
  checkedAt: number;
}

interface CatalogPort {
  id: string;
  gameId: string;
  title: string;
  originalPlatform: string;
  releaseYear?: number | null;
  developer?: string | null;
  synopsis?: string | null;
  boxArtUrl?: string | null;
  projectTitle: string;
  method: GameItem['method'];
  author?: string | null;
  repositoryUrl?: string | null;
  features: string[];
  technicalNotes?: string | null;
  supportedPlatforms: string[];
  supportedPlatformsComplete: boolean;
  installed: boolean;
}

type CatalogSortOption =
  | 'default'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'year-desc'
  | 'year-asc'
  | 'platform'
  | 'installed-first';

type CatalogStatusFilter = 'all' | 'installed' | 'available';
type CatalogTargetFilter =
  | 'all'
  | 'multiplatform'
  | 'windows' | 'android' | 'linux' | 'macos'
  | 'windows-only' | 'android-only' | 'linux-only' | 'macos-only'
  | 'unknown';

interface DownloadedCatalogZip {
  path: string;
  bytes: number;
  sha256: string;
}

// Missing box art for locally added abandonware only. Metadata remains untouched.
const ABANDONWARE_COVERS: Record<string, string> = {
  'unidentified-jet-set-radio': 'https://cdn.wikimg.net/en/strategywiki/images/thumb/c/c4/Jet_Set_Radio_JP_box.jpg/1200px-Jet_Set_Radio_JP_box.jpg',
  'unidentified-true-crime---nyc': 'https://cdn.mobygames.com/covers/8018564-true-crime-new-york-city-windows-front-cover.jpg',
  'unidentified-true-crime---streets-of-la': 'https://cdn.wikimg.net/en/strategywiki/images/7/7e/True_Crime_Streets_of_LA_Box.jpg',
  'unidentified-scarface---the-world-is-yours': 'https://bdjogos.com.br/capas/15110-scarface-the-world-is-yours-pc-capa-1.jpg',
  'unidentified-reservoir-dogs': 'https://cdn.mobygames.com/covers/5283911-reservoir-dogs-windows-front-cover.jpg',
  'unidentified-legend---hand-of-god': 'https://cdn.mobygames.com/covers/6129479-legend-hand-of-god-windows-front-cover.jpg',
  'unidentified-the-godfather-ii': 'https://images.launchbox-app.com/37242899-ed38-439a-a4d3-f8bccad01483.jpg',
};

const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

// HowLongToBeat does not offer an official public API. Keep this empty instead
// Optional, source-backed preservation metadata. Unknown values are omitted.
const HLTB_DATA: Record<string, { main: string; extra: string; comp: string; size: string; region: string; genre: string; publisher: string }> = {};

interface ConsoleDefinition {
  name: string;
  logo: string;
}

interface BrandDefinition {
  id: string;
  name: string;
  companyLogo: string;
  brandLogo: string;
  accentColor: string;
  glowColor: string;
  consoles: ConsoleDefinition[];
}

const BRANDS: BrandDefinition[] = [
  {
    id: 'sony',
    name: 'Sony PlayStation',
    companyLogo: '/assets/logos/sony.svg',
    brandLogo: '/assets/logos/playstation.png',
    accentColor: '#0070d1',
    glowColor: 'rgba(0, 112, 209, 0.45)',
    consoles: [
      { name: 'PlayStation', logo: '/assets/logos/ps1.svg' },
      { name: 'PlayStation 2', logo: '/assets/logos/playstation2.svg' },
      { name: 'PlayStation 3', logo: '/assets/logos/playstation3.svg' },
      { name: 'PlayStation 4', logo: '/assets/logos/playstation.png' }
    ]
  },
  {
    id: 'nintendo',
    name: 'Nintendo',
    companyLogo: '/assets/logos/nintendo.svg',
    brandLogo: '/assets/logos/nintendo.svg',
    accentColor: '#e60012',
    glowColor: 'rgba(230, 0, 18, 0.35)',
    consoles: [
      { name: 'Game Boy', logo: '/assets/logos/gameboy.svg' },
      { name: 'GameCube', logo: '/assets/logos/gamecube.svg' },
      { name: 'Wii', logo: '/assets/logos/wii.svg' },
      { name: 'Nintendo 64', logo: '/assets/logos/n64.svg' },
      { name: 'SNES', logo: '/assets/logos/nintendo.svg' },
      { name: 'GBA', logo: '/assets/logos/gameboy.svg' }
    ]
  },
  {
    id: 'xbox',
    name: 'Microsoft Xbox',
    companyLogo: '/assets/logos/microsoft.svg',
    brandLogo: '/assets/logos/xbox.png',
    accentColor: '#107c41',
    glowColor: 'rgba(16, 124, 65, 0.45)',
    consoles: [
      { name: 'Xbox 360', logo: '/assets/logos/xbox360.svg' },
      { name: 'Xbox', logo: '/assets/logos/xbox.png' }
    ]
  },
  {
    id: 'pc',
    name: 'PC & Lost Media',
    companyLogo: '/assets/logos/pc.svg',
    brandLogo: '/assets/logos/pc.svg',
    accentColor: '#00adef',
    glowColor: 'rgba(0, 173, 239, 0.35)',
    consoles: [
      { name: 'PC / Windows', logo: '/assets/logos/pc.svg' },
      { name: 'DOS', logo: '/assets/logos/pc.svg' },
      { name: 'Amiga', logo: '/assets/logos/pc.svg' },
      { name: 'Arcade', logo: '/assets/logos/pc.svg' },
      { name: 'Sega Genesis', logo: '/assets/logos/pc.svg' }
    ]
  }
];

function getPhysicalMedia(platform: string): { type: 'cartridge' | 'disc'; label: string } {
  // Match the same primary platform used by the 3D box profile. Checking the
  // entire joined list would classify Amiga/DOS Lotus as a cartridge just
  // because a later entry mentions Sega Genesis.
  const p = (platform.split(/[,/|;]/, 1)[0] || '').trim().toLowerCase();
  if (/\b(game boy|nintendo 64|n64|gba|snes|nes|genesis|mega drive|megadrive)\b/.test(p)) {
    return { type: 'cartridge', label: 'Cartucho Físico' };
  }
  if (p.includes('amiga') || p.includes('dos')) {
    return { type: 'disc', label: 'Disquete / CD-ROM' };
  }
  if (p.includes('pc') || p.includes('windows')) {
    return { type: 'disc', label: 'Caja PC / DVD' };
  }
  return { type: 'disc', label: 'Disco Óptico' };
}

function formatMethodName(method: string): string {
  switch (method) {
    case 'DECOMP_NATIVE':
      return 'Decompilación Nativa C/C++';
    case 'STATIC_RECOMP':
      return 'Recompilación Estática';
    case 'PORT':
      return 'Port Nativo de PC';
    case 'HYBRID':
      return 'Motor Híbrido';
    default:
      return method;
  }
}

export const App: React.FC = () => {
  const [games, setGames] = useState<GameItem[]>([]);
  const [activeView, setActiveView] = useState<'library' | 'explore'>('library');
  const [activeCuriosity, setActiveCuriosity] = useState<Curiosity | null>(null);
  const [curiosityToast, setCuriosityToast] = useState<Curiosity | null>(null);
  const curiosityOpenCount = useRef(0);
  const curiosityHoverCount = useRef(0);
  const lastCuriosityId = useRef<string | undefined>();
  const [catalogPorts, setCatalogPorts] = useState<CatalogPort[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReleaseChecks, setCatalogReleaseChecks] = useState<Record<string, GitHubUpdateCheck>>({});
  const [catalogReleaseLoading, setCatalogReleaseLoading] = useState<string | null>(null);
  const [downloadingCatalogAsset, setDownloadingCatalogAsset] = useState<string | null>(null);
  const [catalogDownloadMessages, setCatalogDownloadMessages] = useState<Record<string, string>>({});
  const [catalogDownloaded, setCatalogDownloaded] = useState<Record<string, boolean>>({});
  const [coverErrors, setCoverErrors] = useState<Record<string, boolean>>({});
  const [catalogSort, setCatalogSort] = useState<CatalogSortOption>(() => {
    try {
      const saved = localStorage.getItem('portstation_catalog_sort') as CatalogSortOption;
      if (['default', 'alpha-asc', 'alpha-desc', 'year-desc', 'year-asc', 'platform', 'installed-first'].includes(saved)) {
        return saved;
      }
    } catch {}
    return 'alpha-asc';
  });
  const [catalogPlatformFilter, setCatalogPlatformFilter] = useState<string>('all');
  const [catalogTargetFilter, setCatalogTargetFilter] = useState<CatalogTargetFilter>('all');
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<CatalogStatusFilter>('all');
  const [roots, setRoots] = useState<ScanRoot[]>(() => {
    try {
      const saved = localStorage.getItem('portstation_scan_roots');
      const parsed = saved ? JSON.parse(saved) as ScanRoot[] : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch { /* use the legacy/default root */ }
    return [{ id: 'default-root', path: 'E:\\Games\\Ports', totalFound: 0 }];
  });
  const [scanning, setScanning] = useState<boolean>(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);

  // Gamepad Console Navigation State
  const [isGameRunning, setIsGameRunning] = useState<boolean>(false);
  const [focusZone, setFocusZone] = useState<'grid' | 'sidebar' | 'search'>('grid');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [sidebarIndex, setSidebarIndex] = useState<number>(0);
  const [catalogFocusedIndex, setCatalogFocusedIndex] = useState<number>(0);
  const [modalActionIndex, setModalActionIndex] = useState<number>(0);
  const [gameToolsOpen, setGameToolsOpen] = useState<boolean>(false);
  const [gameToolsIndex, setGameToolsIndex] = useState<number>(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // PortCave Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<{
    type: 'all' | 'brand' | 'console';
    id: string;
    name: string;
  }>({
    type: 'all',
    id: 'all',
    name: 'Todos los Juegos'
  });
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({
    sony: true,
    nintendo: true,
    xbox: true,
    pc: true
  });

  // Settings & Legal Modal State
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showLegalModal, setShowLegalModal] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [dismissedPortraitWarning, setDismissedPortraitWarning] = useState<boolean>(false);
  const [newFolderDraft, setNewFolderDraft] = useState<string>('');
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('portstation_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.appRepositoryUrl || parsed.appRepositoryUrl.includes('Aldo/PortStation')) {
          parsed.appRepositoryUrl = 'https://github.com/arsdaemonia-design/PortStation';
        }
        return {
          libraryPath: 'E:\\Games\\Ports',
          enable3dHover: true,
          autoArtwork: true,
          hideDividersOnHover: false,
          curiosityDurationSeconds: 40,
          curiositySize: 'medium' as 'small' | 'medium' | 'large',
          curiosityAnimationMs: 400,
          wallpaperTheme: 'treasure' as 'treasure' | 'clean',
          virusTotalApiKey: '',
          githubToken: '',
          appRepositoryUrl: 'https://github.com/arsdaemonia-design/PortStation',
          ...parsed
        };
      }
    } catch {
      // ignore
    }
    return {
      libraryPath: 'E:\\Games\\Ports',
      enable3dHover: true,
      autoArtwork: true,
      hideDividersOnHover: false,
      curiosityDurationSeconds: 40,
      curiositySize: 'medium' as 'small' | 'medium' | 'large',
      curiosityAnimationMs: 400,
      wallpaperTheme: 'treasure' as 'treasure' | 'clean',
      virusTotalApiKey: '',
      githubToken: '',
      appRepositoryUrl: 'https://github.com/arsdaemonia-design/PortStation'
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('portstation_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('portstation_scan_roots', JSON.stringify(roots));
    } catch { /* keep the in-memory roots for this session */ }
  }, [roots]);

  // Modal Game Selection
  const [selectedGameForModal, setSelectedGameForModal] = useState<GameItem | null>(null);
  const [selectedCatalogPort, setSelectedCatalogPort] = useState<CatalogPort | null>(null);
  const [showOtherCatalogAssets, setShowOtherCatalogAssets] = useState<Record<string, boolean>>({});
  const [activeModalTab, setActiveModalTab] = useState<'original' | 'port'>('original');
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [updateCheck, setUpdateCheck] = useState<{ projectId: string; checkedAt: number; result: GitHubUpdateCheck } | null>(null);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [installedVersionDraft, setInstalledVersionDraft] = useState('');
  const [showReleaseHistory, setShowReleaseHistory] = useState(false);
  const [repoReleaseSummaries, setRepoReleaseSummaries] = useState<Record<string, CachedRepoReleaseSummary>>({});
  const autoVersionScanKey = useRef('');
  const autoVersionScanGeneration = useRef(0);

  // Multiplatform & Security State
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({ os: 'windows', arch: 'x64' });
  const [exeHashes, setExeHashes] = useState<Record<string, string>>({});
  const [vtReports, setVtReports] = useState<Record<string, VirusTotalReport>>({});
  const [vtLoading, setVtLoading] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [batchCheckingUpdates, setBatchCheckingUpdates] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentTitle?: string } | null>(null);
  const [showOtherPlatformAssets, setShowOtherPlatformAssets] = useState<boolean>(false);
  const [showAuxiliaryAssets, setShowAuxiliaryAssets] = useState<boolean>(false);

  // PortStation Launcher Updates State (Multiplatform Git Update Scan)
  const [appUpdateResult, setAppUpdateResult] = useState<AppUpdateCheckResult | null>(null);
  const [checkingAppUpdate, setCheckingAppUpdate] = useState<boolean>(false);
  const [appUpdateError, setAppUpdateError] = useState<string | null>(null);
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<'windows' | 'linux' | 'android' | 'macos'>('windows');
  const [showAppChangelog, setShowAppChangelog] = useState<boolean>(false);

  // Remote Port Catalog Synchronization State
  const [catalogInfo, setCatalogInfo] = useState<CatalogInfo | null>(null);
  const [catalogSyncing, setCatalogSyncing] = useState<boolean>(false);
  const [catalogSyncResult, setCatalogSyncResult] = useState<CatalogSyncResult | null>(null);
  const [catalogSyncError, setCatalogSyncError] = useState<string | null>(null);

  useEffect(() => {
    const summaries: Record<string, CachedRepoReleaseSummary> = {};
    for (const game of games) {
      try {
        const cached = localStorage.getItem(`portstation_repo_release_summary_${game.id}`);
        if (cached) summaries[game.id] = JSON.parse(cached) as CachedRepoReleaseSummary;
      } catch {
        // Ignore invalid local cache entries.
      }
    }
    setRepoReleaseSummaries(summaries);
  }, [games]);

  // Artwork Manager Dedicated Modal
  const [artworkModalGame, setArtworkModalGame] = useState<GameItem | null>(null);
  // Edit Game Metadata Modal
  const [editingGame, setEditingGame] = useState<GameItem | null>(null);

  const toggleBrandExpand = (brandId: string) => {
    setExpandedBrands((prev) => ({
      ...prev,
      [brandId]: !prev[brandId]
    }));
  };

  const showRandomCuriosity = () => {
    const next = getRandomCuriosity(lastCuriosityId.current);
    lastCuriosityId.current = next.id;
    setActiveCuriosity(next);
    setCuriosityToast(null);
  };

  const showAnotherAutoCuriosity = () => {
    const next = getRandomCuriosity(lastCuriosityId.current);
    lastCuriosityId.current = next.id;
    setCuriosityToast(next);
  };

  const triggerAutoCuriosity = () => {
    const next = getRandomCuriosity(lastCuriosityId.current);
    lastCuriosityId.current = next.id;
    setCuriosityToast(next);
    playCuriosityChime();
  };

  const countCardHover = () => {
    if (activeCuriosity || curiosityToast) return;
    curiosityHoverCount.current += 1;
    if (curiosityHoverCount.current % 10 === 0) triggerAutoCuriosity();
  };

  const openGameDetails = (game: GameItem) => {
    setSelectedGameForModal(game);
    setActiveModalTab('original');
    setModalActionIndex(0);
    curiosityOpenCount.current += 1;
    if (curiosityOpenCount.current % 6 === 0) {
      triggerAutoCuriosity();
    }
  };

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeCuriosity) {
          setActiveCuriosity(null);
        } else if (curiosityToast) {
          setCuriosityToast(null);
        } else if (editingGame) {
          setEditingGame(null);
        } else if (artworkModalGame) {
          setArtworkModalGame(null);
        } else if (showLegalModal) {
          setShowLegalModal(false);
        } else if (showSettingsModal) {
          setShowSettingsModal(false);
        } else if (selectedCatalogPort) {
          setSelectedCatalogPort(null);
        } else if (selectedGameForModal) {
          setSelectedGameForModal(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedGameForModal, selectedCatalogPort, showSettingsModal, showLegalModal, artworkModalGame, editingGame, activeCuriosity, curiosityToast]);

  // Automatically scan on load to guarantee freshest seed metadata
  useEffect(() => {
    handleScanReal();
  }, []);

  const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

  const handleScanReal = async (_targetPath?: string, rootsOverride?: ScanRoot[]) => {
    const rootsToScan = rootsOverride?.length ? rootsOverride : roots;
    setScanning(true);
    setLaunchMessage(null);

    try {
      let detectedGames: GameItem[];
      const foundByRoot = new Map<string, number>();
      const scanErrors: string[] = [];
      if (isTauri) {
        const uniqueGames = new Map<string, GameItem>();
        for (const root of rootsToScan) {
          try {
            const found = await invoke<GameItem[]>('scan_and_match', { rootPath: root.path });
            foundByRoot.set(root.id, found.length);
            for (const game of found) {
              const previous = uniqueGames.get(game.id);
              if (!previous || (previous.status === 'UNKNOWN' && game.status !== 'UNKNOWN')) {
                uniqueGames.set(game.id, game);
              }
            }
          } catch (error) {
            console.warn(`No se pudo escanear ${root.path}:`, error);
            scanErrors.push(root.path);
          }
        }
        detectedGames = [...uniqueGames.values()];
        if (!detectedGames.length && scanErrors.length) {
          throw new Error(`No se pudieron escanear las carpetas: ${scanErrors.join(', ')}`);
        }
      } else {
        detectedGames = MOCK_GAMES;
        rootsToScan.forEach((root) => foundByRoot.set(root.id, MOCK_GAMES.length));
      }

      // Merge saved custom artwork overrides
      try {
        const customArtStr = localStorage.getItem('portstation_custom_artwork');
        if (customArtStr) {
          const customArt = JSON.parse(customArtStr);
          detectedGames = detectedGames.map((g) => {
            if (customArt[g.id]) {
              return {
                ...g,
                boxArtUrl: customArt[g.id].boxArtUrl ?? g.boxArtUrl,
                discArtUrl: customArt[g.id].discArtUrl ?? g.discArtUrl,
                cartridgeArtUrl: customArt[g.id].cartridgeArtUrl ?? g.cartridgeArtUrl,
                portArtUrl: customArt[g.id].portArtUrl ?? g.portArtUrl,
              };
            }
            return g;
          });
        }
      } catch (e) {
        console.warn('Error applying custom artwork:', e);
      }

      // Merge saved custom metadata overrides
      try {
        const customMetaStr = localStorage.getItem('portstation_custom_metadata');
        if (customMetaStr) {
          const customMeta = JSON.parse(customMetaStr);
          detectedGames = detectedGames.map((g) => {
            if (customMeta[g.id]) {
              return {
                ...g,
                ...customMeta[g.id],
              };
            }
            return g;
          });
        }
      } catch (e) {
        console.warn('Error applying custom metadata:', e);
      }

      // Add only missing box art to the user's locally marked abandonware games.
      try {
        let customArt: Record<string, Record<string, string | undefined>> = {};
        try {
          customArt = JSON.parse(localStorage.getItem('portstation_custom_artwork') || '{}');
        } catch { /* malformed old artwork overrides are ignored */ }
        let addedCover = false;

        detectedGames = detectedGames.map((game) => {
          const cover = ABANDONWARE_COVERS[game.id];
          if (!cover || game.boxArtUrl || customArt[game.id]?.boxArtUrl) return game;
          customArt[game.id] = { ...(customArt[game.id] || {}), boxArtUrl: cover };
          addedCover = true;
          return { ...game, boxArtUrl: cover };
        });

        if (addedCover) {
          localStorage.setItem('portstation_custom_artwork', JSON.stringify(customArt));
        }
      } catch (e) {
        console.warn('Error applying abandonware cover art:', e);
      }

      setGames(detectedGames);
      setRoots((prev) =>
        prev.map((r) => foundByRoot.has(r.id)
          ? { ...r, lastScanned: new Date().toLocaleTimeString(), totalFound: foundByRoot.get(r.id) || 0 }
          : r)
      );
      if (scanErrors.length) {
        setLaunchMessage(`No se pudieron leer ${scanErrors.length} carpeta(s). Las demás sí se escanearon.`);
      }

      if (selectedGameForModal) {
        const updated = detectedGames.find((g) => g.id === selectedGameForModal.id);
        if (updated) setSelectedGameForModal(updated);
      }
    } catch (err) {
      console.warn('Scan notice:', err);
      if (!isTauri) setGames(MOCK_GAMES);
      setLaunchMessage('No se pudieron escanear las carpetas configuradas. Revisa las rutas en Configuración.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddManualFolder = async (rawPath: string) => {
    const trimmed = rawPath.trim();
    if (!trimmed) return;
    const nextRoots = roots.some((r) => r.path.toLowerCase() === trimmed.toLowerCase())
      ? roots
      : [...roots, { id: `root-${Date.now()}`, path: trimmed, totalFound: 0 }];
    setRoots(nextRoots);
    setNewFolderDraft('');
    await handleScanReal(undefined, nextRoots);
  };

  const handleAddFolder = async () => {
    if (!isTauri) {
      alert('En modo web remoto, la ruta local activa es E:\\Games\\Ports. Para añadir carpetas en tu sistema de archivos de Windows se ejecuta la app de escritorio nativa.');
      return;
    }
    if (platformInfo.os === 'android') {
      setShowSettingsModal(true);
      setLaunchMessage('En Android puedes escribir o editar la ruta manualmente en Carpetas de la Biblioteca.');
      return;
    }
    try {
      const defaultDir = roots[0]?.path || (platformInfo.os === 'windows' ? 'E:\\Games\\Ports' : '~/Games/Ports');
      const selected = await invoke<string | null>('pick_folder', {
        defaultPath: defaultDir,
      });

      if (selected) {
        const nextRoots = roots.some((r) => r.path.toLowerCase() === selected.toLowerCase())
          ? roots
          : [...roots, { id: `root-${Date.now()}`, path: selected, totalFound: 0 }];
        setRoots(nextRoots);
        await handleScanReal(undefined, nextRoots);
      }
    } catch (err) {
      console.error('Error picking folder:', err);
      setShowSettingsModal(true);
      setLaunchMessage('Usa el campo de ruta manual en Configuración → Carpetas de la Biblioteca.');
    }
  };

  const handleLaunch = async (game: GameItem) => {
    try {
      setLaunchMessage(`Iniciando ${game.title}...`);
      setIsGameRunning(true);
      if (isTauri) {
        const pid = await invoke<number>('launch_game', {
          executablePath: game.executablePath,
          workingDir: game.installPath,
        });
        setLaunchMessage(`¡${game.title} iniciado con éxito (PID ${pid})! El mando se ha transferido al juego.`);
      } else {
        setLaunchMessage(`[Vista Remota] Simulación de lanzamiento para "${game.title}". En tu PC local arranca el ejecutable directamente.`);
        setTimeout(() => setIsGameRunning(false), 5000);
      }
      setTimeout(() => setLaunchMessage(null), 4000);
    } catch (err) {
      alert(`Error al lanzar ${game.title}: ${err}`);
      setLaunchMessage(null);
      setIsGameRunning(false);
    }
  };

  // Listen for game process termination from Tauri backend
  useEffect(() => {
    if (!isTauri) return;
    let unlisten: (() => void) | undefined;
    listen<{ pid: number }>('game-exited', (event) => {
      console.log('Proceso de juego finalizado:', event.payload);
      setIsGameRunning(false);
      setLaunchMessage('Juego cerrado. Control restaurado en PortStation.');
      setTimeout(() => setLaunchMessage(null), 3500);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [isTauri]);

  const handleCheckGitHubUpdates = async (game: GameItem, forceRefresh = false) => {
    if (!game.repositoryUrl) return;
    if (!isTauri) {
      setLaunchMessage('La consulta de releases está disponible en la aplicación de escritorio.');
      return;
    }

    let savedVersion: string | null = null;
    try {
      savedVersion = localStorage.getItem(`portstation_installed_version_${game.id}`);
    } catch {
      // User may have disabled local storage; catalog version remains usable.
    }
    const currentVersion = savedVersion || game.version || null;
    const cacheKey = `portstation_release_check_${game.id}_${currentVersion || 'unknown'}`;
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as { checkedAt: number; result: GitHubUpdateCheck };
          if (Date.now() - parsed.checkedAt < 24 * 60 * 60 * 1000) {
            setUpdateCheck({ projectId: game.id, ...parsed });
            const summary: CachedRepoReleaseSummary = {
              latestVersion: parsed.result.latest_version || null,
              currentVersion: parsed.result.current_version || null,
              status: parsed.result.status,
              checkedAt: parsed.checkedAt,
            };
            setRepoReleaseSummaries((previous) => ({ ...previous, [game.id]: summary }));
            try {
              localStorage.setItem(`portstation_repo_release_summary_${game.id}`, JSON.stringify(summary));
            } catch {
              // Keep the summary in memory when storage is unavailable.
            }
            setInstalledVersionDraft(currentVersion || '');
            return;
          }
        }
      } catch {
        // Ignore invalid or stale cache and query GitHub.
      }
    }

    setCheckingUpdates(true);
    try {
      const result = await invoke<GitHubUpdateCheck>('check_github_updates', {
        repositoryUrl: game.repositoryUrl,
        currentVersion,
        authToken: settings.githubToken ? settings.githubToken.trim() : null,
      });
      const checkedAt = Date.now();
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ checkedAt, result }));
      } catch {
        // Keep the live result even when browser storage is unavailable.
      }
      setUpdateCheck({ projectId: game.id, checkedAt, result });
      const summary: CachedRepoReleaseSummary = {
        latestVersion: result.latest_version || null,
        currentVersion: result.current_version || null,
        status: result.status,
        checkedAt,
      };
      setRepoReleaseSummaries((previous) => ({ ...previous, [game.id]: summary }));
      try {
        localStorage.setItem(`portstation_repo_release_summary_${game.id}`, JSON.stringify(summary));
      } catch {
        // Keep the result in memory if local storage is unavailable.
      }
      setInstalledVersionDraft(currentVersion || '');
    } catch (err) {
      setLaunchMessage(`No se pudieron consultar las releases: ${err}`);
    } finally {
      setCheckingUpdates(false);
    }
  };

  const handleCheckAppUpdate = useCallback(async (manual = false) => {
    setCheckingAppUpdate(true);
    setAppUpdateError(null);
    try {
      const result = await invoke<AppUpdateCheckResult>('check_app_update', {
        repositoryUrl: settings.appRepositoryUrl || 'https://github.com/arsdaemonia-design/PortStation',
        authToken: settings.githubToken ? settings.githubToken.trim() : null,
      });
      setAppUpdateResult(result);
      if (result.platform?.os && ['windows', 'linux', 'android', 'macos'].includes(result.platform.os)) {
        setSelectedPlatformTab(result.platform.os as 'windows' | 'linux' | 'android' | 'macos');
      }
      if (manual) {
        if (result.status === 'up_to_date') {
          setLaunchMessage(`✓ PortStation está en su versión más reciente (${result.currentVersion}).`);
        } else if (result.status === 'update_available') {
          setLaunchMessage(`🚀 ¡Nueva versión ${result.latestVersion} disponible para ${result.platform.displayName}!`);
        } else if (result.status === 'no_releases') {
          setLaunchMessage('ℹ️ Aún no hay releases públicas en el repositorio configurado.');
        }
      }
    } catch (err) {
      console.error('Error al comprobar actualizaciones de PortStation:', err);
      setAppUpdateError(String(err));
    } finally {
      setCheckingAppUpdate(false);
    }
  }, [settings.appRepositoryUrl, settings.githubToken]);

  // Detect runtime platform and CPU architecture + a single silent update check at startup.
  // Deliberately NOT keyed on settings: typing in the repository/token fields must never
  // fire a network request per keystroke (unauthenticated GitHub quota is 60 requests/hour).
  // Later checks are explicit, via the "Escanear Actualización" button.
  const startupUpdateCheckDone = useRef(false);
  useEffect(() => {
    if (!isTauri) return;
    void handleLoadCatalogInfo();
    invoke<PlatformInfo>('get_platform_info')
      .then((info) => {
        setPlatformInfo(info);
        if (info.os && ['windows', 'linux', 'android', 'macos'].includes(info.os)) {
          setSelectedPlatformTab(info.os as 'windows' | 'linux' | 'android' | 'macos');
        }
        if (info.os && info.os !== 'windows') {
          const osDefaultPath = info.os === 'android' ? '/storage/emulated/0/Download' : '~/Games/Ports';
          setRoots((prev) => {
            if (prev.length === 1 && prev[0].id === 'default-root' && prev[0].path === 'E:\\Games\\Ports') {
              return [{ ...prev[0], path: osDefaultPath }];
            }
            return prev;
          });
        }
        if (info.os === 'android') {
          void handleLoadPortCatalog();
        }
      })
      .catch((err) => console.warn('No se pudo obtener información de la plataforma:', err));

    if (startupUpdateCheckDone.current) return;
    startupUpdateCheckDone.current = true;
    invoke<AppUpdateCheckResult>('check_app_update', {
      repositoryUrl: settings.appRepositoryUrl || 'https://github.com/arsdaemonia-design/PortStation',
      authToken: settings.githubToken ? settings.githubToken.trim() : null,
    })
      .then((res) => setAppUpdateResult(res))
      .catch(() => {
        // Silent: the manual button reports errors explicitly.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTauri]);

  // Compute executable SHA-256 for integrity auditing
  useEffect(() => {
    if (!selectedGameForModal || !isTauri) return;
    const gameId = selectedGameForModal.id;
    if (selectedGameForModal.executablePath && !exeHashes[gameId]) {
      invoke<string>('get_executable_sha256', { executablePath: selectedGameForModal.executablePath })
        .then((hash) => {
          setExeHashes((prev) => ({ ...prev, [gameId]: hash }));
        })
        .catch((err) => {
          console.warn(`No se pudo obtener SHA-256 para ${selectedGameForModal.title}:`, err);
          setExeHashes((prev) => ({ ...prev, [gameId]: 'ERROR' }));
        });
    }
  }, [selectedGameForModal, isTauri, exeHashes]);

  // VirusTotal scan check
  const handleCheckVirusTotal = async (sha: string, gameId: string) => {
    if (!isTauri) {
      window.open(`https://www.virustotal.com/gui/file/${sha}`, '_blank');
      return;
    }
    setVtLoading(true);
    try {
      const report = await invoke<VirusTotalReport>('check_virustotal_report', {
        sha256: sha,
        apiKey: settings.virusTotalApiKey ? settings.virusTotalApiKey.trim() : null,
      });
      setVtReports((prev) => ({ ...prev, [gameId]: report }));
    } catch (err) {
      console.error('Error al consultar VirusTotal:', err);
      setVtReports((prev) => ({
        ...prev,
        [gameId]: {
          sha256: sha,
          found: false,
          permalink: `https://www.virustotal.com/gui/file/${sha}`,
          message: String(err),
        },
      }));
    } finally {
      setVtLoading(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    }).catch(() => {});
  };

  // Batch updates check for all library repositories
  const handleBatchCheckUpdates = async () => {
    if (!isTauri) return;
    const reposToScan = games.filter((g) => Boolean(g.repositoryUrl));
    if (reposToScan.length === 0) {
      setLaunchMessage('No hay juegos con repositorio de GitHub configurado en tu biblioteca.');
      return;
    }

    setBatchCheckingUpdates(true);
    setBatchProgress({ current: 0, total: reposToScan.length });

    for (let i = 0; i < reposToScan.length; i++) {
      const game = reposToScan[i];
      setBatchProgress({
        current: i + 1,
        total: reposToScan.length,
        currentTitle: game.projectTitle || game.title,
      });

      let currentVersion: string | null = game.version || null;
      try {
        currentVersion = localStorage.getItem(`portstation_installed_version_${game.id}`) || currentVersion;
      } catch {}

      try {
        const result = await invoke<GitHubUpdateCheck>('check_github_updates', {
          repositoryUrl: game.repositoryUrl,
          currentVersion,
          authToken: settings.githubToken ? settings.githubToken.trim() : null,
        });
        const checkedAt = Date.now();
        const summary: CachedRepoReleaseSummary = {
          latestVersion: result.latest_version || null,
          currentVersion: result.current_version || null,
          status: result.status,
          checkedAt,
        };
        setRepoReleaseSummaries((prev) => ({ ...prev, [game.id]: summary }));
        try {
          const cacheKey = `portstation_release_check_${game.id}_${currentVersion || 'unknown'}`;
          localStorage.setItem(cacheKey, JSON.stringify({ checkedAt, result }));
          localStorage.setItem(`portstation_repo_release_summary_${game.id}`, JSON.stringify(summary));
        } catch {}
      } catch (err) {
        console.warn(`No se pudo comprobar ${game.title}:`, err);
      }

      // Small delay to respect GitHub rate limits
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    setBatchCheckingUpdates(false);
    setBatchProgress(null);
  };

  useEffect(() => {
    if (!isTauri || games.length === 0) return;

    const scanKey = games
      .filter((game) => Boolean(game.repositoryUrl))
      .map((game) => `${game.id}:${game.repositoryUrl}`)
      .sort()
      .join('|');
    if (!scanKey || autoVersionScanKey.current === scanKey) return;
    autoVersionScanKey.current = scanKey;
    const generation = ++autoVersionScanGeneration.current;

    const checkInstalledPorts = async () => {
      for (const game of games) {
        if (generation !== autoVersionScanGeneration.current) return;
        if (!game.repositoryUrl) continue;

        let installedVersion: string | null = game.version || null;
        try {
          installedVersion = localStorage.getItem(`portstation_installed_version_${game.id}`) || installedVersion;
        } catch {
          // Continue with the catalog version, if one exists.
        }

        const cacheKey = `portstation_release_check_${game.id}_${installedVersion || 'unknown'}`;
        try {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached) as { checkedAt: number; result: GitHubUpdateCheck };
            if (Date.now() - parsed.checkedAt < 24 * 60 * 60 * 1000) {
              const summary: CachedRepoReleaseSummary = {
                latestVersion: parsed.result.latest_version || null,
                currentVersion: parsed.result.current_version || null,
                status: parsed.result.status,
                checkedAt: parsed.checkedAt,
              };
              setRepoReleaseSummaries((previous) => ({ ...previous, [game.id]: summary }));
              continue;
            }
          }
        } catch {
          // Invalid cache falls through to a fresh request.
        }

        try {
          const result = await invoke<GitHubUpdateCheck>('check_github_updates', {
            repositoryUrl: game.repositoryUrl,
            currentVersion: installedVersion,
            authToken: settings.githubToken ? settings.githubToken.trim() : null,
          });
          if (generation !== autoVersionScanGeneration.current) return;
          const checkedAt = Date.now();
          const summary: CachedRepoReleaseSummary = {
            latestVersion: result.latest_version || null,
            currentVersion: result.current_version || null,
            status: result.status,
            checkedAt,
          };
          setRepoReleaseSummaries((previous) => ({ ...previous, [game.id]: summary }));
          try {
            localStorage.setItem(cacheKey, JSON.stringify({ checkedAt, result }));
            localStorage.setItem(`portstation_repo_release_summary_${game.id}`, JSON.stringify(summary));
          } catch {
            // Keep the live summary in memory when storage is unavailable.
          }
        } catch (error) {
          console.warn(`No se pudo revisar la release de ${game.projectTitle}:`, error);
        }
      }
    };

    void checkInstalledPorts();
  }, [games, isTauri]);

  const handleChangeExe = async (game: GameItem) => {
    if (!isTauri) {
      alert(`[Vista Remota] Ejecutable asignado:\n${game.executablePath}\n\nEl explorador de archivos nativo de Windows se abre directamente en tu PC local.`);
      return;
    }
    try {
      const selected = await invoke<string | null>('pick_executable', {
        defaultPath: game.installPath,
      });

      if (selected) {
        const lastSep = Math.max(selected.lastIndexOf('\\'), selected.lastIndexOf('/'));
        const workingDir = lastSep >= 0 ? selected.substring(0, lastSep) : game.installPath;
        await invoke('update_game_executable', {
          id: game.id,
          executablePath: selected,
        });

        const updatedGame = { ...game, executablePath: selected, installPath: workingDir };

        setGames((prev) =>
          prev.map((g) => (g.id === game.id ? updatedGame : g))
        );

        if (selectedGameForModal?.id === game.id) {
          setSelectedGameForModal(updatedGame);
        }

        setLaunchMessage(`Ejecutable de ${game.title} actualizado`);
        setTimeout(() => setLaunchMessage(null), 3000);
      }
    } catch (err) {
      console.error('Error changing executable:', err);
    }
  };

  const handleOpenGameFolder = async (game: GameItem) => {
    if (!isTauri) {
      alert(`[Vista Remota] Carpeta del juego:\n${game.installPath || game.executablePath}`);
      return;
    }
    try {
      await invoke('open_game_folder', { executablePath: game.executablePath });
    } catch (err) {
      setLaunchMessage(`No se pudo abrir la carpeta: ${err}`);
      setTimeout(() => setLaunchMessage(null), 3500);
    }
  };

  const handleSaveArtwork = async (
    gameId: string,
    updated: {
      boxArtUrl?: string;
      discArtUrl?: string;
      cartridgeArtUrl?: string;
      portArtUrl?: string;
    }
  ) => {
    // 1. Update React state for games list (explicit empty strings mapped to undefined)
    setGames((prev) =>
      prev.map((g) => {
        if (g.id === gameId) {
          return {
            ...g,
            boxArtUrl: updated.boxArtUrl !== undefined ? (updated.boxArtUrl || undefined) : g.boxArtUrl,
            discArtUrl: updated.discArtUrl !== undefined ? (updated.discArtUrl || undefined) : g.discArtUrl,
            cartridgeArtUrl: updated.cartridgeArtUrl !== undefined ? (updated.cartridgeArtUrl || undefined) : g.cartridgeArtUrl,
            portArtUrl: updated.portArtUrl !== undefined ? (updated.portArtUrl || undefined) : g.portArtUrl,
          };
        }
        return g;
      })
    );

    // 2. Update selectedGameForModal if open
    if (selectedGameForModal?.id === gameId) {
      setSelectedGameForModal((prev) =>
        prev
          ? {
              ...prev,
              boxArtUrl: updated.boxArtUrl !== undefined ? (updated.boxArtUrl || undefined) : prev.boxArtUrl,
              discArtUrl: updated.discArtUrl !== undefined ? (updated.discArtUrl || undefined) : prev.discArtUrl,
              cartridgeArtUrl: updated.cartridgeArtUrl !== undefined ? (updated.cartridgeArtUrl || undefined) : prev.cartridgeArtUrl,
              portArtUrl: updated.portArtUrl !== undefined ? (updated.portArtUrl || undefined) : prev.portArtUrl,
            }
          : null
      );
    }

    // 3. Persist to localStorage (prune deleted fields to prevent resurrection on rescan)
    try {
      const customArtStr = localStorage.getItem('portstation_custom_artwork');
      const customArt = customArtStr ? JSON.parse(customArtStr) : {};
      const gameArt = { ...(customArt[gameId] || {}) };
      if (updated.boxArtUrl !== undefined) {
        if (updated.boxArtUrl) gameArt.boxArtUrl = updated.boxArtUrl;
        else delete gameArt.boxArtUrl;
      }
      if (updated.discArtUrl !== undefined) {
        if (updated.discArtUrl) gameArt.discArtUrl = updated.discArtUrl;
        else delete gameArt.discArtUrl;
      }
      if (updated.cartridgeArtUrl !== undefined) {
        if (updated.cartridgeArtUrl) gameArt.cartridgeArtUrl = updated.cartridgeArtUrl;
        else delete gameArt.cartridgeArtUrl;
      }
      if (updated.portArtUrl !== undefined) {
        if (updated.portArtUrl) gameArt.portArtUrl = updated.portArtUrl;
        else delete gameArt.portArtUrl;
      }
      customArt[gameId] = gameArt;
      localStorage.setItem('portstation_custom_artwork', JSON.stringify(customArt));
    } catch (err) {
      console.warn('Failed to save custom artwork to localStorage:', err);
    }

    // 4. Persist to ports_db.json via Tauri command (preserve empty string so Rust sets Value::Null)
    if (isTauri) {
      try {
        const discOrCart = updated.discArtUrl !== undefined ? updated.discArtUrl : updated.cartridgeArtUrl;
        await invoke('update_game_artwork', {
          gameId,
          boxArtUrl: updated.boxArtUrl,
          discArtUrl: discOrCart,
          portArtUrl: updated.portArtUrl,
        });
      } catch (err) {
        console.warn('Failed to persist artwork in ports_db.json via Tauri:', err);
      }
    }
  };

  const getVirusTotalUrlSearch = (targetUrl: string): string => {
    if (!targetUrl) return 'https://www.virustotal.com/gui/home/url';
    try {
      // VirusTotal URL format: https://www.virustotal.com/gui/url/[URL_ID]
      // where URL_ID is URL-safe Base64 without '=' padding (RFC 4648 §3.2)
      const base64 = btoa(unescape(encodeURIComponent(targetUrl)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return `https://www.virustotal.com/gui/url/${base64}`;
    } catch {
      return 'https://www.virustotal.com/gui/home/url';
    }
  };

  const handleOpenBrowser = async (url?: string | null) => {
    if (!url) return;
    try {
      if (isTauri) {
        await invoke('open_browser', { url });
      } else {
        window.open(url, '_blank');
      }
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleOpenCatalogPortModal = (port: CatalogPort) => {
    setSelectedCatalogPort(port);
    if (!catalogReleaseChecks[port.id] && port.repositoryUrl) {
      void handleLoadCatalogReleases(port);
    }
  };

  const handleLoadCatalogInfo = useCallback(async () => {
    if (!isTauri) return;
    try {
      const info = await invoke<CatalogInfo>('get_catalog_info');
      setCatalogInfo(info);
    } catch {
      // Ignore if unavailable
    }
  }, [isTauri]);

  const handleSyncCatalog = async () => {
    if (!isTauri || catalogSyncing) return;
    setCatalogSyncing(true);
    setCatalogSyncError(null);
    try {
      const result = await invoke<CatalogSyncResult>('sync_remote_catalog', {
        repositoryUrl: settings.appRepositoryUrl || null,
        branch: 'main',
        authToken: settings.githubToken ? settings.githubToken.trim() : null,
      });
      setCatalogSyncResult(result);
      void handleLoadCatalogInfo();
      const refreshedPorts = await invoke<CatalogPort[]>('list_catalog_ports');
      setCatalogPorts(refreshedPorts);
    } catch (err) {
      setCatalogSyncError(String(err));
    } finally {
      setCatalogSyncing(false);
    }
  };

  const handleLoadPortCatalog = async () => {
    setActiveView('explore');
    void handleLoadCatalogInfo();
    if (catalogPorts.length > 0 || catalogLoading) return;
    if (!isTauri) {
      setCatalogError('El catálogo de ports requiere la aplicación de escritorio.');
      return;
    }
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const ports = await invoke<CatalogPort[]>('list_catalog_ports');
      setCatalogPorts(ports);
    } catch (error) {
      setCatalogError(`No se pudo cargar el catálogo: ${error}`);
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleLoadCatalogReleases = async (port: CatalogPort) => {
    if (!port.repositoryUrl || catalogReleaseLoading) return;
    setCatalogReleaseLoading(port.id);
    setCatalogDownloadMessages((previous) => ({ ...previous, [port.id]: '' }));
    try {
      const result = await invoke<GitHubUpdateCheck>('check_github_updates', {
        repositoryUrl: port.repositoryUrl,
        currentVersion: null,
        authToken: settings.githubToken ? settings.githubToken.trim() : null,
      });
      setCatalogReleaseChecks((previous) => ({ ...previous, [port.id]: result }));
    } catch (error) {
      setCatalogDownloadMessages((previous) => ({ ...previous, [port.id]: `No se pudieron cargar las releases: ${error}` }));
    } finally {
      setCatalogReleaseLoading(null);
    }
  };

  const handleDownloadCatalogZip = async (port: CatalogPort, asset: GitHubReleaseAsset) => {
    const downloadKey = `${port.id}:${asset.name}`;
    if (downloadingCatalogAsset) return;
    setDownloadingCatalogAsset(downloadKey);
    setCatalogDownloadMessages((previous) => ({ ...previous, [port.id]: '' }));
    try {
      const downloadUrl = asset.download_url || (asset as any).browser_download_url || '';
      const result = await invoke<DownloadedCatalogZip>('download_catalog_zip', {
        projectId: port.id,
        assetDownloadUrl: downloadUrl,
        assetName: asset.name,
        expectedSha256: asset.digest || null,
      });
      const message = `${result.path}\nSHA-256: ${result.sha256}`;
      setCatalogDownloadMessages((previous) => ({ ...previous, [port.id]: message }));
      setCatalogDownloaded((previous) => ({ ...previous, [port.id]: true }));
    } catch (error) {
      setCatalogDownloadMessages((previous) => ({ ...previous, [port.id]: `Falló la descarga: ${error}` }));
      setCatalogDownloaded((previous) => ({ ...previous, [port.id]: false }));
    } finally {
      setDownloadingCatalogAsset(null);
    }
  };

  const handleOpenCatalogDownloadFolder = async (port: CatalogPort) => {
    try {
      await invoke('open_catalog_download_folder', { projectId: port.id });
    } catch (error) {
      setCatalogDownloadMessages((previous) => ({ ...previous, [port.id]: `No se pudo abrir la carpeta: ${error}` }));
    }
  };

  // Helper counts
  const checkConsoleMatch = (platform: string, consoleName: string): boolean => {
    const p = platform.toLowerCase();
    const c = consoleName.toLowerCase();
    if (c === 'playstation') {
      return (p.includes('playstation') || p.includes('ps1') || p.includes('psx')) && !p.includes('playstation 2') && !p.includes('playstation 3') && !p.includes('ps2') && !p.includes('ps3');
    }
    if (c === 'playstation 2') {
      return p.includes('playstation 2') || p.includes('ps2');
    }
    if (c === 'playstation 3') {
      return p.includes('playstation 3') || p.includes('ps3');
    }
    if (c === 'xbox') {
      return (p.includes('xbox') || p.includes('original xbox')) && !p.includes('xbox 360') && !p.includes('360');
    }
    if (c === 'xbox 360') {
      return p.includes('xbox 360') || p.includes('360');
    }
    if (c === 'game boy') {
      return (p.includes('game boy') || p.includes('gb')) && !p.includes('advance') && !p.includes('gba');
    }
    if (c === 'gba') {
      return p.includes('game boy advance') || p.includes('gba');
    }
    if (c === 'pc / windows' || c === 'pc') {
      return p.includes('pc') || p.includes('windows');
    }
    if (c === 'dos') {
      return p.includes('dos');
    }
    if (c === 'amiga') {
      return p.includes('amiga');
    }
    if (c === 'arcade') {
      return p.includes('arcade') || p.includes('mame');
    }
    if (c === 'sega genesis') {
      return /\b(genesis|mega drive|megadrive)\b/.test(p) || /\bsega\s+(genesis|mega drive)\b/.test(p);
    }
    return p.includes(c);
  };

  const getBrandGamesCount = (brand: BrandDefinition) => {
    return games.filter((g) =>
      brand.consoles.some((c) => checkConsoleMatch(g.originalPlatform, c.name))
    ).length;
  };

  const getConsoleGamesCount = (consoleName: string) => {
    return games.filter((g) => checkConsoleMatch(g.originalPlatform, consoleName)).length;
  };

  // Filtered games list
  const filteredGames = games.filter((game) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        game.title.toLowerCase().includes(q) ||
        game.originalPlatform.toLowerCase().includes(q) ||
        (game.developer && game.developer.toLowerCase().includes(q)) ||
        game.projectTitle.toLowerCase().includes(q) ||
        (game.author && game.author.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (activeFilter.type === 'all') return true;

    if (activeFilter.type === 'brand') {
      const brand = BRANDS.find((b) => b.id === activeFilter.id);
      if (!brand) return true;
      return brand.consoles.some((c) => checkConsoleMatch(game.originalPlatform, c.name));
    }

    if (activeFilter.type === 'console') {
      return checkConsoleMatch(game.originalPlatform, activeFilter.name);
    }

    return true;
  });

  const availableCatalogPlatforms = React.useMemo(() => {
    const map = new Map<string, number>();
    catalogPorts.forEach((p) => {
      p.originalPlatform.split('/').forEach((part) => {
        const plat = part.trim();
        if (plat) {
          map.set(plat, (map.get(plat) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'es'));
  }, [catalogPorts]);

  const catalogTargetFilterCounts = React.useMemo(() => {
    const supported = (os: string) => catalogPorts.filter((port) => port.supportedPlatforms?.includes(os)).length;
    const only = (os: string) => catalogPorts.filter((port) =>
      port.supportedPlatformsComplete &&
      port.supportedPlatforms?.length === 1 &&
      port.supportedPlatforms[0] === os
    ).length;
    return {
      multiplatform: catalogPorts.filter((port) => (port.supportedPlatforms?.length ?? 0) > 1).length,
      windows: supported('windows'),
      android: supported('android'),
      linux: supported('linux'),
      macos: supported('macos'),
      windowsOnly: only('windows'),
      androidOnly: only('android'),
      linuxOnly: only('linux'),
      macosOnly: only('macos'),
      unknown: catalogPorts.filter((port) => !port.supportedPlatforms?.length).length,
    };
  }, [catalogPorts]);

  const filteredCatalogPorts = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const result = catalogPorts.filter((port) => {
      // 1. Search Query
      if (query) {
        const matchesQuery = [
          port.title,
          port.projectTitle,
          port.originalPlatform,
          port.author || '',
          port.developer || ''
        ].some((value) => value.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      // 2. Platform filter
      if (catalogPlatformFilter !== 'all') {
        const matchesPlat = port.originalPlatform
          .split('/')
          .map((s) => s.trim().toLowerCase())
          .includes(catalogPlatformFilter.toLowerCase());
        if (!matchesPlat) return false;
      }

      // 2b. Target OS filter. "Only" categories require a complete platform list;
      // unknown or partial metadata must never be presented as Windows-only, etc.
      const supportedPlatforms = port.supportedPlatforms ?? [];
      if (catalogTargetFilter === 'multiplatform' && supportedPlatforms.length < 2) return false;
      if (catalogTargetFilter === 'unknown' && supportedPlatforms.length > 0) return false;
      if (['windows', 'android', 'linux', 'macos'].includes(catalogTargetFilter)
        && !supportedPlatforms.includes(catalogTargetFilter)) return false;
      if (catalogTargetFilter.endsWith('-only')) {
        const onlyOs = catalogTargetFilter.slice(0, -5);
        if (!port.supportedPlatformsComplete || supportedPlatforms.length !== 1 || supportedPlatforms[0] !== onlyOs) return false;
      }

      // 3. Status filter
      if (catalogStatusFilter === 'installed' && !port.installed) return false;
      if (catalogStatusFilter === 'available' && port.installed) return false;

      return true;
    });

    // 4. Sorting
    switch (catalogSort) {
      case 'alpha-asc':
        result.sort((a, b) => a.title.localeCompare(b.title, 'es', { numeric: true, sensitivity: 'base' }));
        break;
      case 'alpha-desc':
        result.sort((a, b) => b.title.localeCompare(a.title, 'es', { numeric: true, sensitivity: 'base' }));
        break;
      case 'year-desc':
        result.sort((a, b) => {
          const ya = a.releaseYear ?? 0;
          const yb = b.releaseYear ?? 0;
          if (yb !== ya) return yb - ya;
          return a.title.localeCompare(b.title, 'es');
        });
        break;
      case 'year-asc':
        result.sort((a, b) => {
          const ya = a.releaseYear ?? 9999;
          const yb = b.releaseYear ?? 9999;
          if (ya !== yb) return ya - yb;
          return a.title.localeCompare(b.title, 'es');
        });
        break;
      case 'platform':
        result.sort((a, b) => {
          const platCmp = a.originalPlatform.localeCompare(b.originalPlatform, 'es');
          if (platCmp !== 0) return platCmp;
          return a.title.localeCompare(b.title, 'es');
        });
        break;
      case 'installed-first':
        result.sort((a, b) => {
          if (a.installed !== b.installed) return a.installed ? -1 : 1;
          return a.title.localeCompare(b.title, 'es');
        });
        break;
      case 'default':
      default:
        break;
    }

    return result;
  }, [catalogPorts, searchQuery, catalogPlatformFilter, catalogTargetFilter, catalogStatusFilter, catalogSort]);

  // Find banner hero info for active filter (both corporate + console logos)
  const getActiveBannerInfo = () => {
    if (activeFilter.type === 'brand') {
      const brand = BRANDS.find((b) => b.id === activeFilter.id);
      if (!brand) return null;
      return {
        companyLogo: brand.companyLogo,
        consoleLogo: brand.brandLogo,
        showBoth: brand.companyLogo !== brand.brandLogo,
        accentColor: brand.accentColor,
        glowColor: brand.glowColor,
        title: brand.name,
        subtitle: `${filteredGames.length} ${filteredGames.length === 1 ? 'juego / port preservado' : 'juegos y ports preservados'}`
      };
    }
    if (activeFilter.type === 'console') {
      const brand = BRANDS.find((b) =>
        b.consoles.some((c) => c.name.toLowerCase() === activeFilter.name.toLowerCase())
      );
      const consoleItem = brand?.consoles.find(
        (c) => c.name.toLowerCase() === activeFilter.name.toLowerCase()
      );
      const companyLogo = brand?.companyLogo || null;
      const consoleLogo = consoleItem?.logo || brand?.brandLogo || null;
      return {
        companyLogo,
        consoleLogo,
        showBoth: Boolean(companyLogo && consoleLogo && companyLogo !== consoleLogo),
        accentColor: brand?.accentColor || '#38bdf8',
        glowColor: brand?.glowColor || 'rgba(56, 189, 248, 0.35)',
        title: activeFilter.name,
        subtitle: `${filteredGames.length} ${filteredGames.length === 1 ? 'port y recompilación preservada' : 'ports y recompilaciones preservadas'}`
      };
    }
    return null;
  };

  const bannerInfo = getActiveBannerInfo();

  // Dedicated helper to measure real visual grid columns from the DOM
  const getGridColumns = useCallback(() => {
    const cards = document.querySelectorAll<HTMLElement>('.games-grid > .game-card');
    if (cards.length < 2) return 1;
    const firstTop = cards[0].offsetTop;
    let cols = 0;
    for (let i = 0; i < cards.length; i++) {
      if (Math.abs(cards[i].offsetTop - firstTop) < 15) {
        cols++;
      } else {
        break;
      }
    }
    return Math.max(1, cols);
  }, []);

  // Gamepad Action Dispatcher
  const handleGamepadAction = useCallback(
    (action: PadAction) => {
      // 1. Secondary Modals (highest priority)
      if (editingGame) {
        if (action === 'back') setEditingGame(null);
        return;
      }
      if (artworkModalGame) {
        if (action === 'back') setArtworkModalGame(null);
        return;
      }
      if (showLegalModal) {
        if (action === 'back') setShowLegalModal(false);
        return;
      }
      if (showSettingsModal) {
        if (action === 'back') setShowSettingsModal(false);
        return;
      }
      if (selectedCatalogPort) {
        if (action === 'back') setSelectedCatalogPort(null);
        return;
      }
      if (activeCuriosity) {
        if (action === 'back') setActiveCuriosity(null);
        else if (action === 'confirm' || action === 'action_x') showRandomCuriosity();
        return;
      }
      if (curiosityToast) {
        if (action === 'back') setCuriosityToast(null);
        else if (action === 'confirm' || action === 'action_x') showAnotherAutoCuriosity();
        return;
      }

      // 2. Ficha Técnica Modal
      if (selectedGameForModal) {
        if (action === 'back') {
          setSelectedGameForModal(null);
          return;
        }
        if (action === 'lb' || action === 'rb') {
          setActiveModalTab((prev) => (prev === 'original' && hasCommunityPort(selectedGameForModal) ? 'port' : 'original'));
          return;
        }
        if (action === 'up') {
          if (gameToolsOpen) setGameToolsIndex((prev) => (prev > 0 ? prev - 1 : 3));
          else setModalActionIndex((prev) => (prev > 0 ? prev - 1 : 1));
          return;
        }
        if (action === 'down') {
          if (gameToolsOpen) setGameToolsIndex((prev) => (prev < 3 ? prev + 1 : 0));
          else setModalActionIndex((prev) => (prev < 1 ? prev + 1 : 0));
          return;
        }
        if (action === 'action_x') {
          if (gameToolsOpen) {
            setGameToolsOpen(false);
            return;
          }
          handleLaunch(selectedGameForModal);
          return;
        }
        if (action === 'confirm') {
          if (gameToolsOpen) {
            setGameToolsOpen(false);
            if (gameToolsIndex === 0) setArtworkModalGame(selectedGameForModal);
            else if (gameToolsIndex === 1) setEditingGame(selectedGameForModal);
            else if (gameToolsIndex === 2) handleChangeExe(selectedGameForModal);
            else handleOpenGameFolder(selectedGameForModal);
            return;
          }
          if (modalActionIndex === 0) {
            handleLaunch(selectedGameForModal);
          } else {
            setGameToolsOpen(true);
            setGameToolsIndex(0);
          }
          return;
        }
        return;
      }

      // 3. Global Trigger & Face Button Shortcuts
      if (action === 'action_y') {
        // Y / Triangle -> Jump to Search
        setFocusZone('search');
        setTimeout(() => searchInputRef.current?.focus(), 60);
        return;
      }
      if (action === 'lt') {
        // LT -> Jump to Sidebar
        setFocusZone('sidebar');
        return;
      }
      if (action === 'rt') {
        // RT -> Jump back to Grid
        setFocusZone('grid');
        searchInputRef.current?.blur();
        return;
      }
      if (action === 'lb') {
        if (activeView === 'explore') setActiveView('library');
        return;
      }
      if (action === 'rb') {
        if (activeView === 'library') handleLoadPortCatalog();
        return;
      }
      if (action === 'menu') {
        setShowSettingsModal(true);
        return;
      }

      // 4. Zone: SEARCH BAR
      if (focusZone === 'search') {
        if (action === 'down') {
          setFocusZone('grid');
          searchInputRef.current?.blur();
          return;
        }
        if (action === 'left') {
          setFocusZone('sidebar');
          searchInputRef.current?.blur();
          return;
        }
        if (action === 'back') {
          if (searchQuery) setSearchQuery('');
          setFocusZone('grid');
          searchInputRef.current?.blur();
          return;
        }
        if (action === 'confirm') {
          searchInputRef.current?.focus();
          return;
        }
        return;
      }

      // 5. Zone: SIDEBAR MENU
      if (focusZone === 'sidebar') {
        if (action === 'right' || action === 'back') {
          setFocusZone('grid');
          return;
        }
        if (action === 'up') {
          setSidebarIndex((prev) => Math.max(0, prev - 1));
          return;
        }
        if (action === 'down') {
          setSidebarIndex((prev) => Math.min(8, prev + 1));
          return;
        }
        if (action === 'confirm') {
          if (sidebarIndex === 0) {
            setActiveFilter({ type: 'all', id: 'all', name: 'Todos los Juegos' });
            setActiveView('library');
            setFocusZone('grid');
          } else if (sidebarIndex === 1) {
            void handleLoadPortCatalog();
            setFocusZone('grid');
          } else if (sidebarIndex === 2) {
            showRandomCuriosity();
            setFocusZone('grid');
          } else if (sidebarIndex >= 3 && sidebarIndex <= 6) {
            const brand = BRANDS[sidebarIndex - 3];
            if (brand) {
              setActiveFilter({ type: 'brand', id: brand.id, name: brand.name });
              setActiveView('library');
              setFocusZone('grid');
            }
          } else if (sidebarIndex === 7) {
            setShowSettingsModal(true);
          } else if (sidebarIndex === 8) {
            setShowLegalModal(true);
          }
          return;
        }
        return;
      }

      // 6. Zone: GRID (Main Content Navigation)
      if (activeView === 'library') {
        if (filteredGames.length === 0) {
          if (action === 'left') setFocusZone('sidebar');
          if (action === 'up') {
            setFocusZone('search');
            setTimeout(() => searchInputRef.current?.focus(), 60);
          }
          return;
        }

        const cols = getGridColumns();

        if (action === 'left') {
          if (focusedIndex % cols === 0) {
            // Left edge -> Enter sidebar!
            setFocusZone('sidebar');
          } else {
            setFocusedIndex((prev) => Math.max(0, prev - 1));
          }
        } else if (action === 'right') {
          setFocusedIndex((prev) => Math.min(filteredGames.length - 1, prev + 1));
        } else if (action === 'up') {
          if (focusedIndex < cols) {
            // Top row -> Enter search bar!
            setFocusZone('search');
            setTimeout(() => searchInputRef.current?.focus(), 60);
          } else {
            setFocusedIndex((prev) => Math.max(0, prev - cols));
          }
        } else if (action === 'down') {
          setFocusedIndex((prev) => Math.min(filteredGames.length - 1, prev + cols));
        } else if (action === 'confirm') {
          const game = filteredGames[focusedIndex];
          if (game) {
            openGameDetails(game);
          }
        } else if (action === 'action_x') {
          const game = filteredGames[focusedIndex];
          if (game) {
            handleLaunch(game);
          }
        }
      } else if (activeView === 'explore') {
        if (filteredCatalogPorts.length === 0) {
          if (action === 'left') setFocusZone('sidebar');
          return;
        }

        if (action === 'left') {
          setFocusZone('sidebar');
        } else if (action === 'up') {
          if (catalogFocusedIndex === 0) {
            setFocusZone('search');
            setTimeout(() => searchInputRef.current?.focus(), 60);
          } else {
            setCatalogFocusedIndex((prev) => Math.max(0, prev - 1));
          }
        } else if (action === 'down' || action === 'right') {
          setCatalogFocusedIndex((prev) => Math.min(filteredCatalogPorts.length - 1, prev + 1));
        } else if (action === 'confirm') {
          const port = filteredCatalogPorts[catalogFocusedIndex];
          if (port) {
            handleOpenCatalogPortModal(port);
          }
        }
      }
    },
    [
      editingGame,
      artworkModalGame,
      showLegalModal,
      showSettingsModal,
      activeCuriosity,
      curiosityToast,
      selectedGameForModal,
      modalActionIndex,
      gameToolsOpen,
      gameToolsIndex,
      activeView,
      filteredGames,
      focusedIndex,
      filteredCatalogPorts,
      catalogFocusedIndex,
      focusZone,
      sidebarIndex,
      searchQuery,
      getGridColumns,
      handleLoadPortCatalog,
      handleLaunch,
      handleChangeExe,
      handleOpenGameFolder,
      handleLoadCatalogReleases,
      showAnotherAutoCuriosity,
    ]
  );

  const padState = useGamepadNavigation({
    enabled: true,
    isGameRunning,
    onAction: handleGamepadAction,
  });

  // Clamp indices if filters or items change
  useEffect(() => {
    if (focusedIndex >= filteredGames.length && filteredGames.length > 0) {
      setFocusedIndex(filteredGames.length - 1);
    }
  }, [filteredGames.length, focusedIndex]);

  useEffect(() => {
    if (catalogFocusedIndex >= filteredCatalogPorts.length && filteredCatalogPorts.length > 0) {
      setCatalogFocusedIndex(filteredCatalogPorts.length - 1);
    }
  }, [filteredCatalogPorts.length, catalogFocusedIndex]);

  // Auto-scroll focused elements into view when navigating via gamepad
  useEffect(() => {
    if (!padState.activated || focusZone !== 'grid') return;
    if (activeView === 'library' && !selectedGameForModal) {
      const el = document.querySelector(`[data-game-index="${focusedIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [focusedIndex, activeView, selectedGameForModal, focusZone, padState.activated]);

  useEffect(() => {
    if (!padState.activated || focusZone !== 'grid') return;
    if (activeView === 'explore' && !selectedGameForModal) {
      const el = document.querySelector(`[data-catalog-index="${catalogFocusedIndex}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [catalogFocusedIndex, activeView, selectedGameForModal, focusZone, padState.activated]);

  useEffect(() => {
    if (!padState.activated || focusZone !== 'sidebar') return;
    const el = document.querySelector(`[data-sidebar-index="${sidebarIndex}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [sidebarIndex, focusZone, padState.activated]);

  return (
    <div className="portcave-layout">
      {!dismissedPortraitWarning && (
        <div className="portrait-orientation-overlay">
          <div className="portrait-orientation-card">
            <div className="portrait-icon-wrap">
              <Smartphone size={44} className="rotate-phone-icon" />
            </div>
            <h3>Gira tu pantalla en horizontal</h3>
            <p>
              PortStation está diseñado como interfaz de consola portátil (modo horizontal / mando conectado) para explorar la bóveda y el catálogo con comodidad.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setDismissedPortraitWarning(true)}
            >
              Continuar en vertical de todos modos
            </button>
          </div>
        </div>
      )}
      {mobileSidebarOpen && (
        <div
          className="mobile-sidebar-backdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* ============================================================
          LEFT SIDEBAR (PortCave Navigation)
          ============================================================ */}
      <aside
        className={`portcave-sidebar ${settings.hideDividersOnHover ? 'hide-dividers-on-hover' : ''} ${
          mobileSidebarOpen ? 'mobile-open' : ''
        }`}
      >
        <div>
          {/* Brand Header with Pixel Portal Mascot */}
          <div className="sidebar-brand">
            <button
              type="button"
              className="mobile-sidebar-close"
              onClick={() => setMobileSidebarOpen(false)}
              title="Cerrar menú"
            >
              <X size={18} />
            </button>
            <img
              src="/assets/branding/portal-controller.png"
              alt="PortStation"
              className="portal-brand-icon"
            />
            <div className="brand-text">
              <span className="brand-title">PortStation</span>
              <span className="brand-subtitle">PortCave Launcher</span>
            </div>
          </div>

          {/* Stone Divider Bar under Brand Mascot */}
          <div className="sidebar-stone-divider" title="Divisor de piedra tallada">
            <img src="/assets/branding/ui/stone-divider-bar.png" alt="" />
          </div>

          {/* Navigation Section */}
          <nav className="sidebar-nav">
            <div className="nav-section-title">Biblioteca</div>

            <button
              data-sidebar-index={0}
              className={`nav-item ${activeView === 'library' && activeFilter.type === 'all' ? 'active' : ''} ${
                padState.activated && focusZone === 'sidebar' && sidebarIndex === 0 ? 'gamepad-focused' : ''
              }`}
              onClick={() => {
                setActiveView('library');
                setActiveFilter({ type: 'all', id: 'all', name: 'Todos los Juegos' });
                setMobileSidebarOpen(false);
              }}
            >
              <div className="nav-item-left">
                <Layers size={16} />
                <span>Todos los Juegos</span>
              </div>
              <span className="nav-item-count">{games.length}</span>
            </button>

            <button
              data-sidebar-index={1}
              className={`nav-item ${activeView === 'explore' ? 'active' : ''} ${
                padState.activated && focusZone === 'sidebar' && sidebarIndex === 1 ? 'gamepad-focused' : ''
              }`}
              onClick={() => {
                void handleLoadPortCatalog();
                setMobileSidebarOpen(false);
              }}
              title="Explora proyectos registrados, incluso si aún no están instalados"
            >
              <div className="nav-item-left">
                <Compass size={16} />
                <span>Explorar Ports</span>
              </div>
              {catalogPorts.length > 0 && <span className="nav-item-count">{catalogPorts.length}</span>}
            </button>

            <button
              data-sidebar-index={2}
              className={`nav-item ${padState.activated && focusZone === 'sidebar' && sidebarIndex === 2 ? 'gamepad-focused' : ''}`}
              onClick={() => {
                showRandomCuriosity();
                setMobileSidebarOpen(false);
              }}
              title="Abre una historia o curiosidad con fuente"
            >
              <div className="nav-item-left"><Sparkles size={16} /><span>Dato de la bóveda</span></div>
              <span className="nav-item-count">{CURIOSITIES.length}</span>
            </button>

            {/* Consoles & Systems Section */}
            <div className="nav-section-title" style={{ marginTop: '0.85rem' }}>
              Consolas & Sistemas
            </div>

            {BRANDS.map((brand, brandIdx) => {
              const brandTotal = getBrandGamesCount(brand);
              const isExpanded = expandedBrands[brand.id];
              const isBrandActive = activeFilter.type === 'brand' && activeFilter.id === brand.id;

              return (
                <div key={brand.id} className="nav-brand-group">
                  <div
                    data-sidebar-index={brandIdx + 3}
                    className={`nav-brand-header ${isBrandActive ? 'active' : ''} ${
                      padState.activated && focusZone === 'sidebar' && sidebarIndex === brandIdx + 3 ? 'gamepad-focused' : ''
                    }`}
                    onClick={() => {
                      setActiveView('library');
                      setActiveFilter({ type: 'brand', id: brand.id, name: brand.name });
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <div className="nav-brand-left">
                      <img src={brand.brandLogo} alt="" className="nav-brand-logo" />
                      <span>{brand.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span className="nav-item-count">{brandTotal}</span>
                      <button
                        className="btn-link"
                        style={{ padding: 0, color: '#64748b' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBrandExpand(brand.id);
                        }}
                        title={isExpanded ? 'Contraer' : 'Expandir'}
                      >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="nav-sub-list">
                      {brand.consoles.map((consoleItem) => {
                        const count = getConsoleGamesCount(consoleItem.name);
                        const isConsoleActive =
                          activeFilter.type === 'console' && activeFilter.name === consoleItem.name;

                        return (
                          <button
                            key={consoleItem.name}
                            className={`nav-sub-item ${isConsoleActive ? 'active' : ''}`}
                            onClick={() => {
                              setActiveView('library');
                              setActiveFilter({
                                type: 'console',
                                id: consoleItem.name,
                                name: consoleItem.name,
                              });
                              setMobileSidebarOpen(false);
                            }}
                          >
                            <div className="nav-sub-left">
                              <span className="nav-sub-dot" />
                              <span className="nav-sub-name">{consoleItem.name}</span>
                            </div>
                            <span className="sub-count">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Stone Divider Bar above Footer */}
        <div className="sidebar-stone-divider" style={{ padding: '0.4rem 0' }}>
          <img src="/assets/branding/ui/stone-divider-bar.png" alt="" />
        </div>

        {/* Sidebar Footer: Settings & Legal Buttons */}
        <div className="sidebar-footer">
          <button
            data-sidebar-index={7}
            className={`btn-sidebar-settings ${
              padState.activated && focusZone === 'sidebar' && sidebarIndex === 7 ? 'gamepad-focused' : ''
            }`}
            onClick={() => {
              setShowSettingsModal(true);
              setMobileSidebarOpen(false);
            }}
            title="Abrir configuración de PortStation"
          >
            <Settings size={16} />
            <span>Configuración</span>
          </button>
          <button
            data-sidebar-index={8}
            className={`btn-sidebar-legal ${
              padState.activated && focusZone === 'sidebar' && sidebarIndex === 8 ? 'gamepad-focused' : ''
            }`}
            onClick={() => {
              setShowLegalModal(true);
              setMobileSidebarOpen(false);
            }}
            title="Aviso Legal, Marcas Registradas y Preservación"
          >
            <ShieldCheck size={14} />
            <span>Aviso Legal & Marcas</span>
          </button>
        </div>
      </aside>

      {/* ============================================================
          VERTICAL STONE PILLAR DIVIDER (Green Line requested by user)
          ============================================================ */}
      <div className="portcave-vertical-stone-divider" title="Pilar de piedra divisor" />

      {/* ============================================================
          MAIN AREA (PortCave Content)
          ============================================================ */}
      <main
        className="portcave-main"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8, 13, 20, 0.4) 0%, rgba(6, 10, 16, 0.6) 45%, rgba(4, 7, 12, 0.82) 100%), url(${
            settings.wallpaperTheme === 'clean'
              ? '/assets/branding/portcave-clean-1080.jpg'
              : '/assets/branding/portcave-treasure-2k.jpg'
          })`
        }}
      >
        {/* Top bar with Breadcrumb, Search, and Actions */}
        <header className="portcave-topbar">
          <div className="portcave-breadcrumb">
            <button
              type="button"
              className="mobile-menu-toggle"
              onClick={() => setMobileSidebarOpen((prev) => !prev)}
              title="Abrir menú lateral"
            >
              <Menu size={20} />
            </button>
            <img
              src="/assets/branding/portal-controller.png"
              alt=""
              style={{ height: '20px', width: 'auto', imageRendering: 'pixelated' }}
            />
            <span>PortCave</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-current">{activeView === 'explore' ? 'Explorar Ports' : activeFilter.name}</span>
          </div>

          <div className="header-actions">
            {appUpdateResult?.status === 'update_available' && (
              <button
                className="btn-app-update-pill"
                onClick={() => setShowSettingsModal(true)}
                title={`¡Nueva versión ${appUpdateResult.latestVersion} disponible! Clic para descargar.`}
              >
                <Sparkles size={14} className="sparkle-pulse" />
                <span>Actualización v{appUpdateResult.latestVersion}</span>
              </button>
            )}
            <div className={`portcave-search-wrap ${padState.activated && focusZone === 'search' ? 'gamepad-focused' : ''}`}>
              <Search size={15} className="portcave-search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                className="portcave-search-input"
                placeholder="Buscar juego, port, consola..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button className="btn btn-secondary curiosity-trigger" onClick={showRandomCuriosity} title="Abrir un dato curioso al azar">
              <Sparkles size={16} /> <span>Sorpréndeme</span><small>{CURIOSITIES.length}</small>
            </button>

            <button
              className="btn-crystal-action btn-crystal-anadir"
              onClick={handleAddFolder}
              title="Añadir carpeta de ports a la biblioteca"
            >
              <img
                src="/assets/branding/buttons/2k/btn_2k_anadir_normal.png"
                alt="Añadir Carpeta"
                className="crystal-btn-img normal"
              />
              <img
                src="/assets/branding/buttons/2k/btn_2k_anadir_hover.png"
                alt="Añadir Carpeta"
                className="crystal-btn-img hover"
              />
            </button>
            <button
              className={`btn-crystal-action btn-crystal-escanear ${scanning ? 'is-scanning' : ''}`}
              onClick={() => handleScanReal()}
              disabled={scanning}
              title={scanning ? 'Escaneando biblioteca...' : 'Escanear ahora y vincular ejecutables'}
            >
              <img
                src="/assets/branding/buttons/2k/btn_2k_escanear_normal.png"
                alt="Escanear Ahora"
                className="crystal-btn-img normal"
              />
              <img
                src="/assets/branding/buttons/2k/btn_2k_escanear_hover.png"
                alt="Escanear Ahora"
                className="crystal-btn-img hover"
              />
            </button>
          </div>
        </header>

        {launchMessage && (
          <div className="alert-banner" style={{ margin: '1rem 2rem 0' }}>
            {launchMessage}
          </div>
        )}

        {/* Active Console/Brand Hero Banner with Dual Corporate & Console Logos */}
        {activeView === 'library' && activeFilter.type !== 'all' && bannerInfo && (
          <div
            className="active-console-banner"
            style={{
              ['--brand-accent' as any]: bannerInfo.accentColor,
              background: `radial-gradient(circle at 14% 50%, ${bannerInfo.glowColor} 0%, rgba(10, 16, 26, 0.98) 100%)`
            }}
          >
            <div className="active-banner-left">
              <div className="active-banner-logos-wrap">
                {bannerInfo.companyLogo && (
                  <img
                    src={bannerInfo.companyLogo}
                    alt=""
                    className="active-banner-logo-company"
                  />
                )}
                {bannerInfo.showBoth && bannerInfo.consoleLogo && (
                  <>
                    <div className="active-banner-logo-divider" />
                    <img
                      src={bannerInfo.consoleLogo}
                      alt=""
                      className="active-banner-logo-console"
                    />
                  </>
                )}
                {!bannerInfo.showBoth && !bannerInfo.companyLogo && bannerInfo.consoleLogo && (
                  <img
                    src={bannerInfo.consoleLogo}
                    alt=""
                    className="active-banner-logo-console"
                  />
                )}
              </div>

              <div className="active-banner-info">
                <h2>{bannerInfo.title}</h2>
                <p>{bannerInfo.subtitle}</p>
              </div>
            </div>

            <button
              className="btn-clear-filter"
              onClick={() => {
                setActiveView('library');
                setActiveFilter({ type: 'all', id: 'all', name: 'Todos los Juegos' });
              }}
            >
              ✕ Ver Todos los Juegos
            </button>
          </div>
        )}

        {/* Games Library Grid */}
        <div style={{ padding: '1.5rem 2rem 2.5rem' }}>
          {activeView === 'explore' ? (
            catalogLoading ? (
              <div className="empty-state"><h2 className="empty-title">Cargando catálogo de ports…</h2></div>
            ) : catalogError ? (
              <div className="empty-state"><h2 className="empty-title">No se pudo abrir Explorar Ports</h2><p className="empty-desc">{catalogError}</p></div>
            ) : filteredCatalogPorts.length === 0 ? (
              <div className="empty-state">
                <Compass className="empty-icon" />
                <h2 className="empty-title">No hay ports en esta búsqueda</h2>
                <p className="empty-desc">El catálogo contiene proyectos registrados, incluidos los que todavía no están instalados.</p>
              </div>
            ) : (
              <>
                <div className="explore-controls-panel">
                  {/* Top Header / Sync Bar */}
                  <div className="explore-catalog-toolbar" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.65rem 1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <Database size={15} color="#34d399" />
                      <span style={{ fontSize: '0.82rem', color: '#e2e8f0', fontWeight: 600 }}>
                        Catálogo Oficial PortStation: <span style={{ color: '#34d399' }}>v{catalogInfo?.catalogVersion ?? '2.6.2'}</span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        ({catalogPorts.length} proyectos registrados en GitHub)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      {catalogSyncResult && (
                        <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 500 }}>
                          {catalogSyncResult.message}
                        </span>
                      )}
                      <button
                        className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                        disabled={catalogSyncing}
                        onClick={() => void handleSyncCatalog()}
                        title="Consultar GitHub y añadir nuevos ports registrados"
                      >
                        <RefreshCw size={13} className={catalogSyncing ? 'spin' : ''} />
                        <span>{catalogSyncing ? 'Sincronizando...' : 'Sincronizar Catálogo'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter & Sort Controls Bar */}
                  <div className="explore-filter-bar">
                    <div className="explore-filter-row">
                      {/* Sort Selector */}
                      <div className="explore-filter-item">
                        <ArrowUpDown size={14} color="#58a6ff" />
                        <label htmlFor="catalog-sort-select" style={{ fontWeight: 600, color: '#e2e8f0' }}>Ordenar:</label>
                        <select
                          id="catalog-sort-select"
                          className="explore-select"
                          value={catalogSort}
                          onChange={(e) => {
                            const val = e.target.value as CatalogSortOption;
                            setCatalogSort(val);
                            try {
                              localStorage.setItem('portstation_catalog_sort', val);
                            } catch {}
                          }}
                        >
                          <option value="alpha-asc">Alfabético (A → Z)</option>
                          <option value="alpha-desc">Alfabético (Z → A)</option>
                          <option value="year-desc">Año: Más Nuevos / Recientes</option>
                          <option value="year-asc">Año: Más Clásicos / Retro</option>
                          <option value="platform">Por Plataforma Original</option>
                          <option value="installed-first">Instalados Primero</option>
                          <option value="default">Orden por Defecto (Catálogo)</option>
                        </select>
                      </div>

                      {/* Platform Filter */}
                      <div className="explore-filter-item">
                        <Layers size={14} color="#bc8cff" />
                          <label htmlFor="catalog-platform-select" style={{ fontWeight: 600, color: '#e2e8f0' }}>Consola original:</label>
                        <select
                          id="catalog-platform-select"
                          className="explore-select"
                          value={catalogPlatformFilter}
                          onChange={(e) => setCatalogPlatformFilter(e.target.value)}
                        >
                          <option value="all">Todas ({catalogPorts.length})</option>
                          {availableCatalogPlatforms.map(([plat, count]) => (
                            <option key={plat} value={plat}>
                              {plat} ({count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Target OS filter */}
                      <div className="explore-filter-item">
                        <Monitor size={14} color="#7ee787" />
                        <label htmlFor="catalog-target-select" style={{ fontWeight: 600, color: '#e2e8f0' }}>Corre en:</label>
                        <select
                          id="catalog-target-select"
                          className="explore-select"
                          value={catalogTargetFilter}
                          onChange={(e) => setCatalogTargetFilter(e.target.value as CatalogTargetFilter)}
                          title="Filtra por sistemas de destino declarados para el port"
                        >
                          <option value="all">Todos los sistemas</option>
                          <option value="multiplatform">Multiplataforma ({catalogTargetFilterCounts.multiplatform})</option>
                          <option value="windows">Compatible con Windows ({catalogTargetFilterCounts.windows})</option>
                          <option value="windows-only">Solo Windows ({catalogTargetFilterCounts.windowsOnly})</option>
                          <option value="android">Compatible con Android ({catalogTargetFilterCounts.android})</option>
                          <option value="android-only">Solo Android ({catalogTargetFilterCounts.androidOnly})</option>
                          <option value="linux">Compatible con Linux / SteamOS ({catalogTargetFilterCounts.linux})</option>
                          <option value="linux-only">Solo Linux ({catalogTargetFilterCounts.linuxOnly})</option>
                          <option value="macos">Compatible con macOS ({catalogTargetFilterCounts.macos})</option>
                          <option value="macos-only">Solo macOS ({catalogTargetFilterCounts.macosOnly})</option>
                          <option value="unknown">Sin datos de sistema ({catalogTargetFilterCounts.unknown})</option>
                        </select>
                      </div>

                      {/* Status Pills */}
                      <div className="explore-pills-group">
                        <button
                          type="button"
                          className={`explore-pill-btn ${catalogStatusFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setCatalogStatusFilter('all')}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className={`explore-pill-btn ${catalogStatusFilter === 'installed' ? 'active' : ''}`}
                          onClick={() => setCatalogStatusFilter('installed')}
                        >
                          Instalados ({catalogPorts.filter((p) => p.installed).length})
                        </button>
                        <button
                          type="button"
                          className={`explore-pill-btn ${catalogStatusFilter === 'available' ? 'active' : ''}`}
                          onClick={() => setCatalogStatusFilter('available')}
                        >
                          Por Instalar ({catalogPorts.filter((p) => !p.installed).length})
                        </button>
                      </div>
                    </div>

                    {/* Results Count & Reset */}
                    <div className="explore-results-badge">
                      <span>Mostrando <strong style={{ color: '#f0f6fc' }}>{filteredCatalogPorts.length}</strong> de {catalogPorts.length} ports</span>
                      {(catalogSort !== 'alpha-asc' || catalogPlatformFilter !== 'all' || catalogTargetFilter !== 'all' || catalogStatusFilter !== 'all' || searchQuery.trim()) && (
                        <button
                          type="button"
                          className="explore-reset-btn"
                          onClick={() => {
                            setCatalogSort('alpha-asc');
                            setCatalogPlatformFilter('all');
                            setCatalogTargetFilter('all');
                            setCatalogStatusFilter('all');
                            setSearchQuery('');
                            try {
                              localStorage.setItem('portstation_catalog_sort', 'alpha-asc');
                            } catch {}
                          }}
                          title="Restablecer filtros a la vista por defecto"
                        >
                          (Restablecer)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="games-grid catalog-ports-grid">
                {filteredCatalogPorts.map((port, idx) => (
                  <article
                    className={`catalog-port-card ${
                      padState.activated &&
                      focusZone === 'grid' &&
                      activeView === 'explore' &&
                      !selectedGameForModal &&
                      !selectedCatalogPort &&
                      !editingGame &&
                      !artworkModalGame &&
                      !showSettingsModal &&
                      !showLegalModal &&
                      catalogFocusedIndex === idx
                        ? 'gamepad-focused'
                        : ''
                    }`}
                    key={port.id}
                    data-catalog-index={idx}
                    onMouseEnter={countCardHover}
                    onClick={() => {
                      setCatalogFocusedIndex(idx);
                      handleOpenCatalogPortModal(port);
                    }}
                  >
                    <div className="catalog-port-cover">
                      {port.boxArtUrl && !coverErrors[port.id] ? (
                        <img
                          src={port.boxArtUrl}
                          alt={`Carátula de ${port.title}`}
                          onError={() => setCoverErrors((prev) => ({ ...prev, [port.id]: true }))}
                        />
                      ) : (
                        <div className="catalog-port-cover-placeholder">
                          <Gamepad2 size={42} />
                          <span>{port.title}</span>
                        </div>
                      )}
                      <span className={`catalog-install-badge ${port.installed ? 'is-installed' : ''}`}>
                        {port.installed ? 'INSTALADO' : 'DISPONIBLE'}
                      </span>
                    </div>
                    <div className="catalog-port-content">
                      <small>{port.originalPlatform}{port.releaseYear ? ` · ${port.releaseYear}` : ''}</small>
                      <h3 title={port.title}>{port.title}</h3>
                      <p className="catalog-project-title">{port.projectTitle}</p>
                      {port.synopsis && <p className="catalog-port-synopsis">{port.synopsis}</p>}
                      <div className="catalog-port-meta">
                        <span>{formatMethodName(port.method)}</span>
                        {port.author && <span>{port.author}</span>}
                      </div>
                      {port.repositoryUrl ? (
                        <div className="catalog-card-actions">
                          <button
                            className="catalog-explore-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCatalogPortModal(port);
                            }}
                            title={`Ver ficha, releases y descargas de ${port.title}`}
                          >
                            <Download size={14} />
                            <span>{port.installed ? 'Ver releases & descargas' : 'Explorar releases & descargas'}</span>
                          </button>
                          <button
                            className="btn btn-secondary catalog-repo-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBrowser(port.repositoryUrl);
                            }}
                            title="Ver repositorio oficial en GitHub"
                          >
                            <GithubIcon size={14} /> Ver en GitHub
                            <ExternalLink size={12} />
                          </button>
                        </div>
                      ) : (
                        <span className="catalog-no-repo">Repositorio aún no registrado</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              </>
            )
          ) : filteredGames.length === 0 ? (
            <div className="empty-state">
              <Gamepad2 className="empty-icon" />
              <h2 className="empty-title">Sin Juegos en Esta Vista</h2>
              <p className="empty-desc">
                No hay ports que coincidan con el filtro &quot;{activeFilter.name}&quot;
                {searchQuery ? ` y la búsqueda "${searchQuery}"` : ''}.
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setActiveFilter({ type: 'all', id: 'all', name: 'Todos los Juegos' });
                  setSearchQuery('');
                }}
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <div className="games-grid">
              {filteredGames.map((game, idx) => (
                <div
                  key={game.id}
                  data-game-index={idx}
                  className={`game-card ${
                    padState.activated &&
                    focusZone === 'grid' &&
                    activeView === 'library' &&
                    !selectedGameForModal &&
                    !selectedCatalogPort &&
                    !editingGame &&
                    !artworkModalGame &&
                    !showSettingsModal &&
                    !showLegalModal &&
                    focusedIndex === idx
                      ? 'gamepad-focused'
                      : ''
                  }`}
                  onMouseEnter={countCardHover}
                  onClick={() => {
                    setFocusedIndex(idx);
                    openGameDetails(game);
                  }}
                >
                  {/* Card Cover 3D Physical Media (Opens on hover) */}
                  <PhysicalMediaCard
                    game={game}
                    repoVersion={repoReleaseSummaries[game.id]?.latestVersion}
                    hasRepoUpdate={repoReleaseSummaries[game.id]?.status === 'update_available'}
                  />

                  {/* Card Details (Compact PortCave Style) */}
                  <div className="card-body-compact">
                    <h3 className="card-title-compact" title={game.title}>
                      {game.title}
                    </h3>
                    <div className="card-footer-actions" onClick={(e) => e.stopPropagation()}>
                      {isAbandonware(game) ? (
                        <span className="card-status-badge-text is-abandonware" title="Juego descatalogado; la comunidad lo considera abandonware">ABANDON</span>
                      ) : (
                        <img
                          src={game.method === 'DECOMP_NATIVE' ? '/assets/branding/buttons/2k/tag_2k_completo.png' : '/assets/branding/buttons/2k/tag_2k_recompilado.png'}
                          alt={game.method === 'DECOMP_NATIVE' ? 'COMPLETO' : 'RECOMPILADO'}
                          className="card-status-badge"
                          title={game.method === 'DECOMP_NATIVE' ? 'Port Nativo Completo' : 'Recompilación Binaria'}
                        />
                      )}

                      <button
                        className="btn-launch-stone"
                        onClick={() => handleLaunch(game)}
                        title={`Jugar ${game.title}`}
                      >
                        <img
                          src="/assets/branding/buttons/2k/btn_2k_jugar_normal.png"
                          alt="JUGAR"
                          className="btn-stone-img normal"
                        />
                        <img
                          src="/assets/branding/buttons/2k/btn_2k_jugar_hover.png"
                          alt="JUGAR"
                          className="btn-stone-img hover"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PortCave Footer with Legal & Preservation Disclaimer */}
        <footer className="portcave-footer">
          <div className="portcave-footer-inner">
            {curiosityToast ? (
              <CuriosityToast
                curiosity={curiosityToast}
                onAnother={showAnotherAutoCuriosity}
                onDismiss={() => setCuriosityToast(null)}
                durationMs={(settings.curiosityDurationSeconds ?? 40) * 1000}
                size={settings.curiositySize ?? 'medium'}
                transitionMs={settings.curiosityAnimationMs ?? 400}
              />
            ) : <p className="disclaimer-text">
              <strong>Aviso de Propiedad Intelectual & Uso Legítimo:</strong> PortStation es un gestor personal de software enfocado en la preservación histórica y archivo cultural de proyectos de ingeniería inversa y ports de código abierto.
              Todos los nombres comerciales, marcas registradas, logotipos e imagotipos (incluyendo PlayStation, Nintendo, Xbox y sus respectivas consolas) son propiedad exclusiva de sus respectivos titulares (Sony Interactive Entertainment, Nintendo Co., Ltd., Microsoft Corporation, etc.) y se utilizan únicamente con fines organizativos y de identificación bajo la doctrina de <em>Uso Legítimo Nominativo (Nominative Fair Use)</em>. PortStation no almacena, distribuye ni comercializa software con copyright ni copias de videojuegos (ROMs/ISOs).
            </p>}
            <button className="btn-link-legal" onClick={() => setShowLegalModal(true)}>
              <ShieldAlert size={13} /> Ver Declaración Legal Completa de Marcas & Preservación
            </button>
          </div>
        </footer>
      </main>

      {/* ============================================================
          FICHA TÉCNICA MODAL
          ============================================================ */}
      {selectedGameForModal && (
        <div className="modal-backdrop" onClick={() => setSelectedGameForModal(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 className="modal-title">{selectedGameForModal.title}</h2>
                <div className="modal-subtitle">
                  <span>{hasCommunityPort(selectedGameForModal) ? selectedGameForModal.projectTitle : (isAbandonware(selectedGameForModal) ? 'Abandonware' : 'Obra original')}</span>
                  <span className="dot-divider">•</span>
                  <span>{selectedGameForModal.originalPlatform}</span>
                  {selectedGameForModal.releaseYear && (
                    <>
                      <span className="dot-divider">•</span>
                      <span>{selectedGameForModal.releaseYear}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                className="btn-close"
                onClick={() => setSelectedGameForModal(null)}
                title="Cerrar (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="modal-body">
              {/* Left Column: Cover & Physical Vault Container */}
              <div className="modal-left-col">
                {(() => {
                  const isPortTab = activeModalTab === 'port';
                  const currentVisualUrl = isPortTab
                    ? (selectedGameForModal.portArtUrl || selectedGameForModal.boxArtUrl)
                    : (selectedGameForModal.boxArtUrl || selectedGameForModal.portArtUrl);
                  const currentVisualKey = isPortTab
                    ? `port-${selectedGameForModal.id}`
                    : `game-${selectedGameForModal.id}`;

                  return (
                    <div className={`boxart-vault-container ${isPortTab ? 'mode-port' : 'mode-original'}`}>
                      {currentVisualUrl && !brokenImages[currentVisualKey] ? (
                        <img
                          key={currentVisualUrl}
                          src={currentVisualUrl}
                          alt=""
                          className={`boxart-vault-img ${isPortTab ? 'is-port-art' : 'is-box-art'}`}
                          referrerPolicy="no-referrer"
                          onError={() => {
                            setBrokenImages((prev) => ({ ...prev, [currentVisualKey]: true }));
                          }}
                        />
                      ) : (
                        <div className="boxart-vault-placeholder">
                          <Gamepad2 size={64} opacity={0.3} />
                          <span className="cover-fallback-title">{selectedGameForModal.title}</span>
                        </div>
                      )}

                      <div className={`vault-media-tag ${isPortTab ? 'tag-port' : ''}`}>
                        {isPortTab ? (
                          <>
                            <Cpu size={14} />
                            <span>Arte del Port · {selectedGameForModal.projectTitle}</span>
                          </>
                        ) : (
                          <>
                            {getPhysicalMedia(selectedGameForModal.originalPlatform).type === 'cartridge' ? (
                              <Save size={14} />
                            ) : (
                              <Disc size={14} />
                            )}
                            <span>Caja Original · {getPhysicalMedia(selectedGameForModal.originalPlatform).label}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Less-frequent actions live under one compact tools menu. */}
                <div className="game-tools-menu-wrap">
                  <button
                    className={`btn btn-secondary game-tools-trigger ${padState.activated && modalActionIndex === 1 ? 'modal-action-gamepad-focused' : ''}`}
                    onClick={() => {
                      setGameToolsOpen((open) => !open);
                      setGameToolsIndex(0);
                    }}
                    aria-expanded={gameToolsOpen}
                    aria-haspopup="menu"
                  >
                    <Settings size={16} />
                    <span>Opciones del juego</span>
                    <ChevronDown size={14} />
                  </button>
                  {gameToolsOpen && (
                    <div className="game-tools-menu" role="menu" aria-label="Opciones del juego">
                      <button className={padState.activated && gameToolsIndex === 0 ? 'modal-action-gamepad-focused' : ''} role="menuitem" onClick={() => { setGameToolsOpen(false); setArtworkModalGame(selectedGameForModal); }}>
                        <Sparkles size={15} /> Personalizar carátula y medios
                      </button>
                      <button className={padState.activated && gameToolsIndex === 1 ? 'modal-action-gamepad-focused' : ''} role="menuitem" onClick={() => { setGameToolsOpen(false); setEditingGame(selectedGameForModal); }}>
                        <FileEdit size={15} /> Editar ficha y metadatos
                      </button>
                      <button className={padState.activated && gameToolsIndex === 2 ? 'modal-action-gamepad-focused' : ''} role="menuitem" onClick={() => { setGameToolsOpen(false); handleChangeExe(selectedGameForModal); }}>
                        <FileEdit size={15} /> Cambiar ejecutable (.exe)
                      </button>
                      <button className={padState.activated && gameToolsIndex === 3 ? 'modal-action-gamepad-focused' : ''} role="menuitem" onClick={() => { setGameToolsOpen(false); handleOpenGameFolder(selectedGameForModal); }}>
                        <FolderOpen size={15} /> Abrir carpeta del juego
                      </button>
                    </div>
                  )}
                </div>

                {/* Primary Launch & Executable Manager */}
                <div className="modal-actions-box">
                  <button
                    className={`btn-crystal-launch-hero ${padState.activated && modalActionIndex === 0 ? 'modal-action-gamepad-focused' : ''}`}
                    onClick={() => handleLaunch(selectedGameForModal)}
                    title="Ejecutar port nativo"
                  >
                    <img
                      src="/assets/branding/buttons/2k/btn_2k_jugar_active.png"
                      alt="JUGAR AHORA"
                      className="crystal-btn-img normal"
                    />
                    <img
                      src="/assets/branding/buttons/2k/btn_2k_jugar_hover.png"
                      alt="JUGAR AHORA"
                      className="crystal-btn-img hover"
                    />
                  </button>

                  <div className="exe-info-card">
                    <div className="exe-info-header">
                      <span className="exe-label">Ejecutable asignado</span>
                    </div>
                    <div className="exe-path" title={selectedGameForModal.executablePath}>
                      {selectedGameForModal.executablePath}
                    </div>
                  </div>

                  {/* Security & Integrity Card (Multiplatform + VirusTotal) */}
                  <div className="security-audit-card">
                    <div className="security-audit-header">
                      <span className="security-label">
                        <Shield size={13} /> Integridad & Seguridad
                      </span>
                      {platformInfo && (
                        <span style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 600 }}>
                          {platformInfo.os} · {platformInfo.arch}
                        </span>
                      )}
                    </div>

                    <div className="security-hash-row" title={exeHashes[selectedGameForModal.id] || 'Calculando hash...'}>
                      <span className="security-hash-code">
                        {exeHashes[selectedGameForModal.id] === 'ERROR'
                          ? 'No disponible (ejecutable no encontrado)'
                          : exeHashes[selectedGameForModal.id]
                          ? `${exeHashes[selectedGameForModal.id].slice(0, 16)}...${exeHashes[selectedGameForModal.id].slice(-8)}`
                          : 'Calculando SHA-256...'}
                      </span>
                      {exeHashes[selectedGameForModal.id] && exeHashes[selectedGameForModal.id] !== 'ERROR' && (
                        <button
                          className="security-btn-copy"
                          onClick={() => handleCopyHash(exeHashes[selectedGameForModal.id])}
                          title={copiedHash === exeHashes[selectedGameForModal.id] ? 'Copiado al portapapeles' : 'Copiar SHA-256'}
                        >
                          {copiedHash === exeHashes[selectedGameForModal.id] ? (
                            <Check size={13} color="#3fb950" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      )}
                    </div>

                    {/* VirusTotal status or verify trigger */}
                    {(() => {
                      const hash = exeHashes[selectedGameForModal.id];
                      const report = vtReports[selectedGameForModal.id];

                      if (vtLoading) {
                        return (
                          <div className="btn-vt-verify" style={{ opacity: 0.7 }}>
                            <RefreshCw size={13} className="spin" />
                            <span>Auditando en VirusTotal...</span>
                          </div>
                        );
                      }

                      if (report) {
                        // If no API key was provided or VT report was not found in API:
                        if (!report.found) {
                          return (
                            <div className="security-vt-badge is-clean" style={{ background: 'rgba(56, 139, 253, 0.1)', borderColor: 'rgba(56, 139, 253, 0.35)', color: '#79c0ff' }}>
                              <div className="security-vt-badge-title">
                                <span>🛡️ Análisis VirusTotal (Web)</span>
                                {report.permalink && (
                                  <button
                                    className="btn-vt-link"
                                    onClick={() => handleOpenBrowser(report.permalink!)}
                                    title="Ver o solicitar análisis completo en VirusTotal"
                                  >
                                    Abrir en web ↗
                                  </button>
                                )}
                              </div>
                              <div className="security-vt-badge-sub" style={{ color: '#c9d1d9' }}>
                                Consulta directa del binario por SHA-256 en VirusTotal. Haz clic en &quot;Abrir en web&quot; para ver los 70+ motores o solicitar un re-escaneo.
                              </div>
                            </div>
                          );
                        }

                        const positives = report.positives ?? report.malicious ?? 0;
                        const total = report.total || 71;
                        const defenderClean = report.microsoft_defender_clean ?? report.defender_clean ?? true;
                        const kasperskyClean = report.kaspersky_clean ?? report.kasperskyClean ?? true;
                        const bitdefenderClean = report.bitdefender_clean ?? report.bitdefenderClean ?? true;
                        const tier1Clean = defenderClean && kasperskyClean && bitdefenderClean;

                        // Low heuristic false positive (common in ports / recompilations)
                        const isHeuristicFalsePositive = positives > 0 && positives <= 3 && tier1Clean;
                        const isSafeInGreen = positives === 0 || isHeuristicFalsePositive;

                        return (
                          <div
                            className={`security-vt-badge ${
                              isSafeInGreen ? 'is-clean' : 'is-warning'
                            }`}
                          >
                            <div className="security-vt-badge-title">
                              <span>
                                {positives === 0
                                  ? `🛡️ 0/${total} Detecciones · Seguro`
                                  : isHeuristicFalsePositive
                                  ? `🛡️ ${positives}/${total} Falso Positivo · Seguro (Defender Limpio)`
                                  : `⚠️ ${positives}/${total} Detecciones · Precaución`}
                              </span>
                              {report.permalink && (
                                <button
                                  className="btn-vt-link"
                                  onClick={() => handleOpenBrowser(report.permalink!)}
                                  title="Ver análisis completo en VirusTotal"
                                >
                                  Reporte ↗
                                </button>
                              )}
                            </div>
                            <div className="security-vt-badge-sub">
                              {positives === 0 ? (
                                'El ejecutable está verificado y no contiene amenazas registradas en los motores globales.'
                              ) : isHeuristicFalsePositive ? (
                                'Microsoft Defender y antivirus principales limpios. La detección es un falso positivo heurístico común en ports recompilados.'
                              ) : (
                                report.threat_classification || report.popular_threat_label || 'Se detectaron firmas activas. Revisa el reporte detallado en VirusTotal.'
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (hash === 'ERROR') {
                        return (
                          <div style={{ fontSize: '0.74rem', color: '#f85149', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <AlertTriangle size={13} />
                            <span>No se encontró el ejecutable en disco para calcular su SHA-256.</span>
                          </div>
                        );
                      }

                      return (
                        <button
                          className="btn-vt-verify"
                          disabled={!hash}
                          onClick={() => hash && handleCheckVirusTotal(hash, selectedGameForModal.id)}
                          title="Compara el SHA-256 de este binario con 70+ motores antivirus en VirusTotal"
                        >
                          <ShieldCheck size={14} />
                          <span>Auditar con VirusTotal</span>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Tabbed Technical Sheet */}
              <div className="modal-right-col">
                {/* Tabs Switcher */}
                <div className="tabs-header">
                  <button
                    className={`tab-btn ${activeModalTab === 'original' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('original')}
                  >
                    <Gamepad2 size={16} /> La Obra Original {padState.activated && <kbd className="pad-tab-hint">LB</kbd>}
                  </button>
                  {hasCommunityPort(selectedGameForModal) && <button
                    className={`tab-btn ${activeModalTab === 'port' ? 'active' : ''}`}
                    onClick={() => setActiveModalTab('port')}
                  >
                    <Cpu size={16} /> El Port (Recomp / Decomp) {padState.activated && <kbd className="pad-tab-hint">RB</kbd>}
                  </button>}
                </div>

                {/* Tab 1: Obra Original */}
                {activeModalTab === 'original' && (
                  <div className="tab-pane">
                    <div className="info-grid">
                      <div className="info-card">
                        <div className="info-card-label">
                          <Code2 size={14} /> Desarrollador Original
                        </div>
                        <div className="info-card-value">
                          {selectedGameForModal.developer || 'No especificado'}
                        </div>
                      </div>

                      <div className="info-card">
                        <div className="info-card-label">
                          <Calendar size={14} /> Año de Lanzamiento
                        </div>
                        <div className="info-card-value">
                          {selectedGameForModal.releaseYear || 'Desconocido'}
                        </div>
                      </div>

                      <div className="info-card">
                        <div className="info-card-label">
                          <Layers size={14} /> Plataformas Originales
                        </div>
                        <div className="info-card-value">
                          {selectedGameForModal.originalPlatform}
                        </div>
                      </div>
                    </div>

                    <div className="synopsis-card">
                      <h4 className="section-title">Sinopsis & Contexto Histórico</h4>
                      <p className="synopsis-text">
                        {selectedGameForModal.synopsis ||
                          'Sinopsis no disponible en el registro base de datos local.'}
                      </p>
                    </div>

                    {/* Preservation Dossier Table */}
                    {(() => {
                      const hltb = HLTB_DATA[selectedGameForModal.id];
                      const memorial = getDeveloperHistory(selectedGameForModal.developer) || selectedGameForModal.inMemoriam;
                      return (
                        <>
                          <div className="preservation-table-wrap">
                            <table className="preservation-table">
                              <tbody>
                                <tr>
                                  <th>Archivo / Ejecutable</th>
                                  <td>{selectedGameForModal.executablePath.split(/[\\/]/).pop()}</td>
                                </tr>
                                <tr>
                                  <th>Tamaño del Medio</th>
                                  <td>{hltb?.size ?? 'Sin dato'}</td>
                                </tr>
                                <tr>
                                  <th>Consola de Origen</th>
                                  <td>{selectedGameForModal.originalPlatform}</td>
                                </tr>
                                <tr>
                                  <th>Región</th>
                                  <td>{hltb?.region ?? 'Sin dato'}</td>
                                </tr>
                                <tr>
                                  <th>Género</th>
                                  <td>{hltb?.genre ?? 'Sin dato'}</td>
                                </tr>
                                <tr>
                                  <th>Publisher / Editorial</th>
                                  <td>{hltb?.publisher ?? 'Sin dato'}</td>
                                </tr>
                                <tr>
                                  <th>Desarrollador</th>
                                  <td>{selectedGameForModal.developer || 'No especificado'}</td>
                                </tr>
                                <tr>
                                  <th>Año de Lanzamiento</th>
                                  <td>{selectedGameForModal.releaseYear || 'Desconocido'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* In Memoriam Tribute (Defunct Studio) */}
                          {memorial && (
                            <div className="in-memoriam-card">
                              <div className="in-memoriam-header">
                                <span className="in-memoriam-candle">🕯️</span>
                                <div className="in-memoriam-title-group">
                                  <span className="in-memoriam-badge">In Memoriam · {memorial.statusLabel || 'Legado del estudio'}</span>
                                  <h4 className="in-memoriam-studio">
                                    {memorial.studioName}
                                    <span className="in-memoriam-years">({memorial.years})</span>
                                  </h4>
                                </div>
                              </div>
                              <p className="in-memoriam-notes">{memorial.notes}</p>
                              {memorial.sources?.length ? (
                                <div className="in-memoriam-sources">
                                  {memorial.sources.map((source) => (
                                    <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                                      {source.label} <ExternalLink size={12} />
                                    </a>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* SubGames Collection */}
                    {selectedGameForModal.subGames && selectedGameForModal.subGames.length > 0 && (
                      <div className="subgames-container">
                        <div className="subgames-header-bar">
                          <h4 className="section-title">
                            Colección Incluida ({selectedGameForModal.subGames.length} Títulos)
                          </h4>
                          <span className="subgames-hint">
                            Preservación histórica unificada en este port
                          </span>
                        </div>
                        <div className="subgames-list">
                          {selectedGameForModal.subGames.map((sub, idx) => {
                            const subMediaType =
                              sub.mediaType ||
                              getPhysicalMedia(selectedGameForModal.originalPlatform).type;
                            return (
                              <div key={idx} className="subgame-card">
                                <div className="subgame-card-main">
                                  <div className={`subgame-cover-wrapper media-${subMediaType}`}>
                                    {sub.boxArtUrl && !brokenImages[`sub-${selectedGameForModal.id}-${idx}`] ? (
                                      <img
                                        src={sub.boxArtUrl}
                                        alt=""
                                        className="subgame-cover-img"
                                        referrerPolicy="no-referrer"
                                        onError={() => {
                                          setBrokenImages((prev) => ({
                                            ...prev,
                                            [`sub-${selectedGameForModal.id}-${idx}`]: true,
                                          }));
                                        }}
                                      />
                                    ) : (
                                      <div className="subgame-cover-fallback">
                                        {subMediaType === 'cartridge' ? (
                                          <Save size={24} opacity={0.6} />
                                        ) : (
                                          <Disc size={24} opacity={0.6} />
                                        )}
                                      </div>
                                    )}
                                    <div
                                      className="subgame-media-pill"
                                      title={subMediaType === 'cartridge' ? 'Cartucho Original' : 'Disco Óptico'}
                                    >
                                      {subMediaType === 'cartridge' ? <Save size={10} /> : <Disc size={10} />}
                                      <span>{subMediaType === 'cartridge' ? 'Cartucho' : 'Disco'}</span>
                                    </div>
                                  </div>

                                  <div className="subgame-content">
                                    <div className="subgame-header">
                                      <span className="subgame-badge">Volumen {idx + 1}</span>
                                      <h5 className="subgame-title">{sub.title}</h5>
                                      {sub.releaseYear && (
                                        <span className="subgame-year">({sub.releaseYear})</span>
                                      )}
                                    </div>
                                    {sub.synopsis && (
                                      <p className="subgame-synopsis">{sub.synopsis}</p>
                                    )}
                                  </div>
                                </div>

                                {sub.screenshots && sub.screenshots.length > 0 && (
                                  <div className="subgame-screenshots-section">
                                    <div className="subgame-screenshots-header">
                                      <ImageIcon size={12} />
                                      <span>Vistas del Juego & Capturas</span>
                                    </div>
                                    <div className="subgame-screenshots-strip">
                                      {sub.screenshots.map((sUrl, sIdx) => (
                                        <div key={sIdx} className="subgame-screenshot-item">
                                          <img
                                            src={sUrl}
                                            alt={`${sub.title} screenshot ${sIdx + 1}`}
                                            className="subgame-screenshot-img"
                                            referrerPolicy="no-referrer"
                                            loading="lazy"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: El Port (Recomp) */}
                {activeModalTab === 'port' && hasCommunityPort(selectedGameForModal) && (
                  <div className="tab-pane">
                    {/* Creator & Open-Source Credit Box */}
                    <div className="creator-credit-card">
                      <div className="creator-credit-header">
                        <div className="creator-avatar-wrap">
                          {selectedGameForModal.authorAvatarUrl ? (
                            <img
                              src={selectedGameForModal.authorAvatarUrl}
                              alt={selectedGameForModal.author || 'Author'}
                              className="creator-avatar-img"
                            />
                          ) : (
                            <div className="creator-avatar-fallback">
                              <GithubIcon size={24} />
                            </div>
                          )}
                          <span className="creator-github-badge" title="Creador verificado en GitHub">
                            <GithubIcon size={12} />
                          </span>
                        </div>
                        <div className="creator-meta">
                          <span className="creator-role-tag">Creador & Comunidad Open Source</span>
                          <h4 className="creator-name">
                            {selectedGameForModal.author || 'Comunidad Open Source'}
                          </h4>
                          <span className="creator-project-tag">
                            Proyecto: {selectedGameForModal.projectTitle}
                          </span>
                        </div>
                      </div>
                      <p className="creator-manifesto">
                        Este port nativo es el resultado del trabajo de ingeniería inversa, decompilación y preservación liderado por sus autores. PortStation reconoce su esfuerzo y proporciona enlaces directos a sus repositorios oficiales.
                      </p>
                      {selectedGameForModal.repositoryUrl && (
                        <div className="creator-actions">
                          <button
                            className="btn btn-github"
                            onClick={() => handleOpenBrowser(selectedGameForModal.repositoryUrl)}
                          >
                            <GithubIcon size={16} /> Ver Repositorio Oficial en GitHub <ExternalLink size={14} />
                          </button>
                        </div>
                      )}
                      {selectedGameForModal.repositoryUrl && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                          <button
                            className="btn btn-secondary"
                            disabled={checkingUpdates}
                            onClick={() => handleCheckGitHubUpdates(selectedGameForModal)}
                            title="Consulta las cinco releases recientes del repositorio; no descarga archivos"
                          >
                            <RefreshCw size={15} className={checkingUpdates ? 'spin' : ''} />
                            {checkingUpdates ? 'Consultando GitHub…' : 'Comprobar actualizaciones'}
                          </button>

                          {updateCheck?.projectId === selectedGameForModal.id && (
                            <div style={{ marginTop: '0.85rem', color: '#d8dee9', fontSize: '0.9rem' }}>
                              {updateCheck.result.status !== 'no_releases' && (
                                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                                  <div style={{ flex: '1 1 180px', padding: '0.6rem 0.7rem', borderRadius: 6, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.35)' }}>
                                    <small style={{ display: 'block', color: '#86efac', marginBottom: '0.2rem' }}>VERSIÓN INSTALADA</small>
                                    <strong style={{ color: updateCheck.result.current_version ? '#86efac' : '#b6c0ce' }}>
                                      {updateCheck.result.current_version || 'No registrada'}
                                    </strong>
                                  </div>
                                  <div style={{ flex: '1 1 180px', padding: '0.6rem 0.7rem', borderRadius: 6, background: 'rgba(250,204,21,0.10)', border: '1px solid rgba(250,204,21,0.35)' }}>
                                    <small style={{ display: 'block', color: '#fde047', marginBottom: '0.2rem' }}>ÚLTIMA RELEASE</small>
                                    <strong style={{ color: '#fde047' }}>{updateCheck.result.latest_version || 'Sin releases'}</strong>
                                  </div>
                                </div>
                              )}
                              <p style={{ margin: '0 0 0.4rem', fontWeight: 700, color: updateCheck.result.status === 'up_to_date' ? '#86efac' : updateCheck.result.status === 'update_available' ? '#fde047' : '#d8dee9' }}>
                                {updateCheck.result.status === 'up_to_date' && 'Estás al día'}
                                {updateCheck.result.status === 'update_available' && 'Hay una versión más reciente'}
                                {updateCheck.result.status === 'comparison_unavailable' && 'No se pudo comparar con las releases recientes'}
                                {updateCheck.result.status === 'installed_version_unknown' && 'Registra la versión instalada para compararla'}
                                {updateCheck.result.status === 'no_releases' && 'El repositorio no tiene releases publicadas'}
                              </p>
                              {updateCheck.result.status === 'installed_version_unknown' && (
                                <p style={{ margin: '0 0 0.6rem', color: '#aab4c3' }}>
                                  No se conoce la versión instalada; puede haber una actualización, pero no se puede confirmar todavía.
                                </p>
                              )}
                              {updateCheck.result.status === 'comparison_unavailable' && (
                                <p style={{ margin: '0 0 0.6rem', color: '#aab4c3' }}>
                                  La versión instalada no aparece entre las cinco releases consultadas. Revisa el historial del proyecto.
                                </p>
                              )}
                              {(updateCheck.result.status === 'installed_version_unknown' || updateCheck.result.status === 'comparison_unavailable') && (
                                <div style={{ display: 'flex', gap: '0.5rem', margin: '0.6rem 0', flexWrap: 'wrap' }}>
                                  <input
                                    value={installedVersionDraft}
                                    onChange={(event) => setInstalledVersionDraft(event.target.value)}
                                    placeholder="Versión instalada (ej. v0.5.6)"
                                    aria-label="Versión instalada del port"
                                    style={{ flex: '1 1 220px', minWidth: 0, padding: '0.55rem', borderRadius: 5 }}
                                  />
                                  <button
                                    className="btn btn-secondary"
                                    disabled={!installedVersionDraft.trim() || checkingUpdates}
                                    onClick={() => {
                                      try {
                                        localStorage.setItem(`portstation_installed_version_${selectedGameForModal.id}`, installedVersionDraft.trim());
                                      } catch {
                                        // Continue with this comparison for the current session.
                                      }
                                      void handleCheckGitHubUpdates(selectedGameForModal, true);
                                    }}
                                  >
                                    Guardar y comparar
                                  </button>
                                </div>
                              )}
                              {updateCheck.result.releases.slice(0, showReleaseHistory ? 5 : 1).map((release) => (
                                <div key={release.tag_name} style={{ marginTop: '0.65rem', padding: '0.65rem', background: 'rgba(0,0,0,0.18)', borderRadius: 6 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                                    <span><strong>{release.name || release.tag_name}</strong>{release.prerelease ? ' · Pre-release' : ''}</span>
                                    <button className="btn-link" onClick={() => handleOpenBrowser(release.url)}>Ver release ↗</button>
                                  </div>
                                  {release.published_at && (
                                    <small style={{ color: '#9aa6b5' }}>{new Date(release.published_at).toLocaleDateString()}</small>
                                  )}
                                  {release.assets.length > 0 && (() => {
                                    const targetOs: 'windows' | 'linux' | 'macos' | 'android' =
                                      platformInfo.os === 'linux' || platformInfo.os === 'macos' || platformInfo.os === 'android'
                                        ? platformInfo.os
                                        : 'windows';
                                    const grouped = groupReleaseAssets(
                                      release.assets,
                                      targetOs,
                                      platformInfo.arch
                                    );
                                    return (
                                      <div className="release-assets-box">
                                        {/* Recommended assets for user's OS */}
                                        {grouped.recommended.length > 0 && (
                                          <div>
                                            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7ee787', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                              <Sparkles size={12} /> RECOMENDADO PARA TU SISTEMA ({platformInfo.os.toUpperCase()} {platformInfo.arch})
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                              {grouped.recommended.map((asset) => (
                                                <div key={asset.name} className="release-asset-card is-recommended">
                                                  <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div className="release-asset-name">{asset.name}</div>
                                                    <div className="release-asset-meta">{(asset.size / 1024 / 1024).toFixed(1)} MB</div>
                                                  </div>
                                                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    <button
                                                      className="btn-link"
                                                      style={{ fontSize: '0.72rem', color: '#58a6ff' }}
                                                      onClick={() => handleOpenBrowser(asset.download_url)}
                                                      title="Descargar este archivo"
                                                    >
                                                      <Download size={12} /> Descargar
                                                    </button>
                                                    <button
                                                      className="btn-vt-link"
                                                      onClick={() => handleOpenBrowser(getVirusTotalUrlSearch(asset.download_url || (asset as any).browser_download_url || ''))}
                                                      title="Analizar la URL de descarga de este archivo en VirusTotal"
                                                    >
                                                      <Shield size={12} /> Escanear URL
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Other platform assets (collapsible) */}
                                        {grouped.otherPlatforms.length > 0 && (
                                          <div>
                                            <button
                                              className="release-collapsible-trigger"
                                              onClick={() => setShowOtherPlatformAssets((prev) => !prev)}
                                            >
                                              <ChevronRight size={13} style={{ transform: showOtherPlatformAssets ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                                              <span>{showOtherPlatformAssets ? 'Ocultar' : 'Ver'} otros sistemas ({grouped.otherPlatforms.length})</span>
                                            </button>
                                            {showOtherPlatformAssets && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.35rem' }}>
                                                {grouped.otherPlatforms.map((asset) => (
                                                  <div key={asset.name} className="release-asset-card">
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                      <div className="release-asset-name" style={{ color: '#c9d1d9' }}>{asset.name}</div>
                                                      <div className="release-asset-meta">{(asset.size / 1024 / 1024).toFixed(1)} MB</div>
                                                    </div>
                                                    <button
                                                      className="btn-link"
                                                      style={{ fontSize: '0.72rem' }}
                                                      onClick={() => handleOpenBrowser(asset.download_url)}
                                                    >
                                                      <Download size={12} /> Descargar
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Auxiliary / Checksum / Source assets (collapsible) */}
                                        {grouped.auxiliary.length > 0 && (
                                          <div>
                                            <button
                                              className="release-collapsible-trigger"
                                              onClick={() => setShowAuxiliaryAssets((prev) => !prev)}
                                            >
                                              <ChevronRight size={13} style={{ transform: showAuxiliaryAssets ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
                                              <span>{showAuxiliaryAssets ? 'Ocultar' : 'Ver'} archivos auxiliares / checksums ({grouped.auxiliary.length})</span>
                                            </button>
                                            {showAuxiliaryAssets && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', opacity: 0.75 }}>
                                                {grouped.auxiliary.map((asset) => (
                                                  <div key={asset.name} style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', color: '#8b949e' }}>
                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
                                                    <span>{(asset.size / 1024 / 1024).toFixed(1)} MB</span>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                              {updateCheck.result.releases.length > 1 && (
                                <button
                                  className="btn-link"
                                  style={{ marginTop: '0.5rem' }}
                                  onClick={() => setShowReleaseHistory((show) => !show)}
                                >
                                  {showReleaseHistory ? 'Ocultar releases anteriores' : `Ver ${Math.min(updateCheck.result.releases.length - 1, 4)} releases anteriores`}
                                </button>
                              )}
                              <small style={{ display: 'block', marginTop: '0.6rem', color: '#8d99a9' }}>
                                Consultado {new Date(updateCheck.checkedAt).toLocaleString()}. La respuesta se conserva localmente durante 24 horas.
                              </small>
                              <button
                                className="btn-link"
                                style={{ marginTop: '0.35rem' }}
                                disabled={checkingUpdates}
                                onClick={() => handleCheckGitHubUpdates(selectedGameForModal, true)}
                              >
                                Consultar ahora
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="info-grid">
                      <div className="info-card">
                        <div className="info-card-label">
                          <Cpu size={14} /> Método de Preservación
                        </div>
                        <div className="info-card-value">
                          <span className="badge-method">
                            {formatMethodName(selectedGameForModal.method)}
                          </span>
                        </div>
                      </div>

                      <div className="info-card">
                        <div className="info-card-label">
                          <Sparkles size={14} /> Equipo Responsable
                        </div>
                        <div className="info-card-value">
                          {selectedGameForModal.author || 'Comunidad Open Source'}
                        </div>
                      </div>
                    </div>

                    {selectedGameForModal.technicalNotes && (
                      <div className="notes-card">
                        <h4 className="section-title">Arquitectura y Notas Técnicas</h4>
                        <p className="notes-text">{selectedGameForModal.technicalNotes}</p>
                      </div>
                    )}

                    {selectedGameForModal.features && selectedGameForModal.features.length > 0 && (
                      <div className="features-card">
                        <h4 className="section-title">Mejoras y Características del Port</h4>
                        <ul className="features-list">
                          {selectedGameForModal.features.map((feat, idx) => (
                            <li key={idx} className="feature-item">
                              <span className="feature-bullet">✓</span>
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          CATALOG PORT DETAILS & RELEASES MODAL
          ============================================================ */}
      {selectedCatalogPort && (
        <div className="modal-backdrop" onClick={() => setSelectedCatalogPort(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-title-group">
                <h2 className="modal-title">{selectedCatalogPort.title}</h2>
                <div className="modal-subtitle">
                  <span>{selectedCatalogPort.projectTitle}</span>
                  <span className="dot-divider">•</span>
                  <span>{selectedCatalogPort.originalPlatform}</span>
                  {selectedCatalogPort.releaseYear && (
                    <>
                      <span className="dot-divider">•</span>
                      <span>{selectedCatalogPort.releaseYear}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                className="btn-close"
                onClick={() => setSelectedCatalogPort(null)}
                title="Cerrar (Esc)"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="modal-body">
              {/* Left Column: Cover & Actions */}
              <div className="modal-left-col">
                <div className="boxart-vault-container mode-port">
                  {selectedCatalogPort.boxArtUrl && !brokenImages[`catalog-${selectedCatalogPort.id}`] ? (
                    <img
                      src={selectedCatalogPort.boxArtUrl}
                      alt={selectedCatalogPort.title}
                      className="boxart-vault-img is-box-art"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [`catalog-${selectedCatalogPort.id}`]: true }))}
                    />
                  ) : (
                    <div className="boxart-vault-placeholder">
                      <Gamepad2 size={64} opacity={0.3} />
                      <span className="cover-fallback-title">{selectedCatalogPort.title}</span>
                    </div>
                  )}
                  <div className="vault-media-tag tag-port">
                    <Cpu size={14} />
                    <span>{formatMethodName(selectedCatalogPort.method)}</span>
                  </div>
                </div>

                {/* Status & Quick Action Box */}
                <div className="modal-actions-box">
                  {(() => {
                    const matchingGame = games.find((g) => g.id === selectedCatalogPort.gameId || g.id === selectedCatalogPort.id);
                    if (matchingGame) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', width: '100%' }}>
                          <button
                            className="btn-crystal-launch-hero"
                            onClick={() => {
                              setSelectedCatalogPort(null);
                              handleLaunch(matchingGame);
                            }}
                            title="Ejecutar port nativo"
                          >
                            <img
                              src="/assets/branding/buttons/2k/btn_2k_jugar_active.png"
                              alt="JUGAR AHORA"
                              className="crystal-btn-img normal"
                            />
                            <img
                              src="/assets/branding/buttons/2k/btn_2k_jugar_hover.png"
                              alt="JUGAR AHORA"
                              className="crystal-btn-img hover"
                            />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                            onClick={() => {
                              setSelectedCatalogPort(null);
                              openGameDetails(matchingGame);
                            }}
                          >
                            <Gamepad2 size={14} /> Abrir en Biblioteca
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                        <div className="settings-platform-badge" style={{ justifyContent: 'center', width: '100%' }}>
                          <Sparkles size={14} /> Port Disponible para Descarga
                        </div>
                        {catalogDownloaded[selectedCatalogPort.id] && (
                          <button
                            className="btn btn-secondary"
                            style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem' }}
                            onClick={() => handleOpenCatalogDownloadFolder(selectedCatalogPort)}
                          >
                            <FolderOpen size={14} /> Abrir carpeta de descargas
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {selectedCatalogPort.repositoryUrl && (
                  <button
                    className="btn btn-github"
                    style={{ width: '100%' }}
                    onClick={() => handleOpenBrowser(selectedCatalogPort.repositoryUrl)}
                  >
                    <GithubIcon size={16} /> Repositorio en GitHub <ExternalLink size={14} />
                  </button>
                )}
              </div>

              {/* Right Column: Details & Releases */}
              <div className="modal-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Project Overview */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <span className="creator-role-tag">Proyecto Port</span>
                    <span style={{ fontSize: '0.82rem', color: '#8b949e' }}>por {selectedCatalogPort.author || 'Comunidad'}</span>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#f0f6fc', fontSize: '1.15rem' }}>
                    {selectedCatalogPort.projectTitle}
                  </h3>
                  {selectedCatalogPort.synopsis && (
                    <p style={{ color: '#c9d1d9', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                      {selectedCatalogPort.synopsis}
                    </p>
                  )}
                  {selectedCatalogPort.technicalNotes && (
                    <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(56, 139, 253, 0.08)', border: '1px solid rgba(56, 139, 253, 0.25)', borderRadius: 6, fontSize: '0.8rem', color: '#79c0ff' }}>
                      <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Notas técnicas:</strong>
                      {selectedCatalogPort.technicalNotes}
                    </div>
                  )}
                </div>

                {/* GitHub Releases & Downloads Section */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Download size={16} /> Releases Oficiales & Descargas
                    </h4>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                      disabled={catalogReleaseLoading === selectedCatalogPort.id}
                      onClick={() => handleLoadCatalogReleases(selectedCatalogPort)}
                    >
                      <RefreshCw size={13} className={catalogReleaseLoading === selectedCatalogPort.id ? 'spin' : ''} />
                      <span>{catalogReleaseLoading === selectedCatalogPort.id ? 'Consultando…' : 'Refrescar'}</span>
                    </button>
                  </div>

                  {/* Feedback Message */}
                  {catalogDownloadMessages[selectedCatalogPort.id] && (
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 6,
                        marginBottom: '0.75rem',
                        fontSize: '0.8rem',
                        background: catalogDownloaded[selectedCatalogPort.id] ? 'rgba(46, 160, 67, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                        border: `1px solid ${catalogDownloaded[selectedCatalogPort.id] ? 'rgba(46, 160, 67, 0.35)' : 'rgba(248, 81, 73, 0.35)'}`,
                        color: catalogDownloaded[selectedCatalogPort.id] ? '#7ee787' : '#ff7b72',
                        wordBreak: 'break-all'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{catalogDownloadMessages[selectedCatalogPort.id]}</span>
                        {catalogDownloaded[selectedCatalogPort.id] && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', flexShrink: 0, marginLeft: '0.5rem' }}
                            onClick={() => handleOpenCatalogDownloadFolder(selectedCatalogPort)}
                          >
                            <FolderOpen size={12} /> Abrir carpeta
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Releases Content */}
                  {catalogReleaseLoading === selectedCatalogPort.id && !catalogReleaseChecks[selectedCatalogPort.id] ? (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#8b949e' }}>
                      <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.65rem auto', display: 'block', color: '#58a6ff' }} />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>Consultando las releases y binarios en GitHub…</p>
                    </div>
                  ) : catalogReleaseChecks[selectedCatalogPort.id] ? (
                    catalogReleaseChecks[selectedCatalogPort.id].releases.length === 0 ? (
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center', color: '#8b949e', fontSize: '0.85rem' }}>
                        Este repositorio no tiene releases binarias publicadas aún.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        {catalogReleaseChecks[selectedCatalogPort.id].releases.map((release) => {
                          const targetOs: 'windows' | 'linux' | 'macos' | 'android' =
                            platformInfo.os === 'linux' || platformInfo.os === 'macos' || platformInfo.os === 'android'
                              ? platformInfo.os
                              : 'windows';
                          const grouped = groupReleaseAssets(
                            release.assets,
                            targetOs,
                            platformInfo.arch
                          );
                          const osLabel =
                            platformInfo.os === 'windows'
                              ? 'Windows'
                              : platformInfo.os === 'linux'
                              ? 'Linux / SteamOS'
                              : platformInfo.os === 'android'
                              ? 'Android'
                              : 'macOS';

                          return (
                            <div key={release.tag_name} style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.85rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                                  <strong style={{ color: '#f0f6fc', fontSize: '0.88rem' }}>{release.name || release.tag_name}</strong>
                                  {release.prerelease && (
                                    <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.35rem', borderRadius: 4, background: 'rgba(210, 153, 34, 0.2)', color: '#d29922', border: '1px solid rgba(210, 153, 34, 0.4)' }}>
                                      Pre-release
                                    </span>
                                  )}
                                  {release.published_at && (
                                    <small style={{ color: '#8b949e', fontSize: '0.72rem' }}>
                                      {new Date(release.published_at).toLocaleDateString()}
                                    </small>
                                  )}
                                </div>
                                <button
                                  className="btn-link"
                                  style={{ fontSize: '0.75rem', color: '#58a6ff' }}
                                  onClick={() => handleOpenBrowser(release.url)}
                                >
                                  Ver en GitHub <ExternalLink size={11} />
                                </button>
                              </div>

                              {/* Recommended Binaries for active OS */}
                              {grouped.recommended.length > 0 ? (
                                <div>
                                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#7ee787', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    <Sparkles size={12} /> RECOMENDADO PARA {osLabel.toUpperCase()} ({platformInfo.arch})
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                    {grouped.recommended.map((asset) => {
                                      const assetUrl = asset.download_url || (asset as any).browser_download_url || '';
                                      const isDownloading = downloadingCatalogAsset === `${selectedCatalogPort.id}:${asset.name}`;

                                      return (
                                        <div key={asset.name} className="release-asset-card is-recommended">
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <div className="release-asset-name">{asset.name}</div>
                                            <div className="release-asset-meta">{(asset.size / 1024 / 1024).toFixed(1)} MB</div>
                                          </div>
                                          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexShrink: 0 }}>
                                            <button
                                              className="catalog-zip-download catalog-zip-windows"
                                              style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.78rem', fontWeight: 600 }}
                                              disabled={downloadingCatalogAsset !== null}
                                              onClick={() => void handleDownloadCatalogZip(selectedCatalogPort, asset as GitHubReleaseAsset)}
                                              title={`Descargar ${asset.name}`}
                                            >
                                              <Download size={13} />
                                              <span>{isDownloading ? 'Descargando…' : 'Descargar'}</span>
                                            </button>
                                            <button
                                              className="btn-vt-verify"
                                              style={{ width: 'auto', padding: '0.4rem 0.65rem', fontSize: '0.75rem' }}
                                              onClick={() => handleOpenBrowser(getVirusTotalUrlSearch(assetUrl))}
                                              title="Auditar o escanear la URL de descarga directa en VirusTotal"
                                            >
                                              <Shield size={13} />
                                              <span>Escanear URL</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: '0.55rem 0.75rem', background: 'rgba(210, 153, 34, 0.08)', border: '1px solid rgba(210, 153, 34, 0.25)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#d29922', fontSize: '0.78rem' }}>
                                    <AlertTriangle size={13} />
                                    <span>Sin binario directo empaquetado para {osLabel} en esta versión.</span>
                                  </div>
                                  <button
                                    className="btn-link"
                                    style={{ fontSize: '0.74rem' }}
                                    onClick={() => handleOpenBrowser(release.url)}
                                  >
                                    Revisar GitHub ↗
                                  </button>
                                </div>
                              )}

                              {/* Other platform assets */}
                              {grouped.otherPlatforms.length > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <button
                                    className="release-collapsible-trigger"
                                    onClick={() => setShowOtherCatalogAssets((prev) => ({ ...prev, [release.tag_name]: !prev[release.tag_name] }))}
                                  >
                                    <ChevronDown size={13} style={{ transform: showOtherCatalogAssets[release.tag_name] ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                                    <span>Otros sistemas operativos y plataformas ({grouped.otherPlatforms.length})</span>
                                  </button>

                                  {showOtherCatalogAssets[release.tag_name] && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.4rem' }}>
                                      {grouped.otherPlatforms.map((asset) => {
                                        const assetUrl = asset.download_url || (asset as any).browser_download_url || '';
                                        return (
                                          <div key={asset.name} className="release-asset-card" style={{ opacity: 0.85 }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                              <div className="release-asset-name" style={{ fontSize: '0.75rem' }}>{asset.name}</div>
                                              <div className="release-asset-meta">{(asset.size / 1024 / 1024).toFixed(1)} MB</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexShrink: 0 }}>
                                              <button
                                                className="catalog-zip-download"
                                                style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                                                disabled={downloadingCatalogAsset !== null}
                                                onClick={() => void handleDownloadCatalogZip(selectedCatalogPort, asset as GitHubReleaseAsset)}
                                              >
                                                <Download size={11} /> Descargar
                                              </button>
                                              <button
                                                className="btn-vt-verify"
                                                style={{ width: 'auto', padding: '0.3rem 0.5rem', fontSize: '0.7rem' }}
                                                onClick={() => handleOpenBrowser(getVirusTotalUrlSearch(assetUrl))}
                                                title="Escanear en VirusTotal"
                                              >
                                                <Shield size={11} />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#8b949e', fontSize: '0.85rem' }}>
                      <p>Haz clic en &quot;Refrescar&quot; para consultar las releases oficiales.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSettingsModal && (
        <div className="modal-backdrop" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">
                <Settings size={18} /> Configuración de PortStation
              </h3>
              <button className="btn-close" onClick={() => setShowSettingsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="settings-modal-body">
              {/* Multiplatform System Indicator */}
              <div className="settings-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div className="settings-label">Plataforma y Arquitectura Activa</div>
                    <p className="settings-desc">PortStation opera de forma multi-plataforma con rutas independientes para Windows, Linux / Steam Deck, Android y macOS.</p>
                  </div>
                  <div className="settings-platform-badge">
                    <Cpu size={14} />
                    <span>{platformInfo.displayName || `${platformInfo.os.toUpperCase()} (${platformInfo.arch})`}</span>
                  </div>
                </div>
              </div>

              {/* PortStation Launcher Update Section (Multiplatform Git Update Scan) */}
              <div className="settings-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <label className="settings-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Sparkles size={15} color="#38bdf8" /> Actualización de PortStation (Launcher)
                    </label>
                    <p className="settings-desc">
                      Escanea releases oficiales en GitHub filtrando instaladores y binarios nativos para Windows, Linux / Steam Deck, Android y macOS.
                    </p>
                  </div>
                  <div className="app-update-version-chips">
                    <span className="chip-current">Instalado: v{appUpdateResult?.currentVersion ?? '…'}</span>
                    {appUpdateResult?.latestVersion && (
                      <span className="chip-latest">Último: {appUpdateResult.latestVersion}</span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      className="settings-input"
                      style={{ flex: '1 1 280px' }}
                      value={settings.appRepositoryUrl || ''}
                      placeholder="https://github.com/arsdaemonia-design/PortStation"
                      onChange={(e) => setSettings({ ...settings, appRepositoryUrl: e.target.value })}
                    />
                    <button
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap' }}
                      disabled={checkingAppUpdate}
                      onClick={() => void handleCheckAppUpdate(true)}
                    >
                      <RefreshCw size={14} className={checkingAppUpdate ? 'spin' : ''} />
                      <span>{checkingAppUpdate ? 'Escaneando Git...' : 'Escanear Actualización'}</span>
                    </button>
                  </div>

                  {appUpdateError && (
                    <div className="app-update-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(30, 15, 15, 0.7)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                        <AlertTriangle size={16} /> Error al escanear: {appUpdateError}
                      </div>
                    </div>
                  )}

                  {appUpdateResult && (
                    <div className={`app-update-card ${appUpdateResult.status === 'update_available' ? 'is-available' : appUpdateResult.status === 'up_to_date' ? 'is-clean' : ''}`}>
                      {appUpdateResult.status === 'update_available' ? (
                        <>
                          <div className="app-update-meta-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Sparkles size={18} color="#38bdf8" />
                              <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>
                                ¡Nueva versión {appUpdateResult.latestVersion} disponible!
                              </strong>
                            </div>
                            {appUpdateResult.publishedAt && (
                              <small style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                Publicado: {new Date(appUpdateResult.publishedAt).toLocaleDateString()}
                              </small>
                            )}
                          </div>

                          {/* Recommended Asset for Active OS */}
                          {appUpdateResult.recommendedAsset ? (
                            <div className="app-update-recommended-card">
                              <div className="app-update-recommended-info">
                                <span className="app-update-recommended-badge">
                                  <Sparkles size={11} /> Recomendado para tu sistema ({appUpdateResult.platform.displayName})
                                </span>
                                <span className="app-update-recommended-filename">
                                  {appUpdateResult.recommendedAsset.name}
                                </span>
                                <span className="app-update-recommended-size">
                                  {(appUpdateResult.recommendedAsset.sizeBytes / (1024 * 1024)).toFixed(1)} MB · Binario nativo verificado
                                </span>
                              </div>
                              <button
                                className="app-update-download-btn"
                                onClick={() => handleOpenBrowser(appUpdateResult.recommendedAsset!.downloadUrl)}
                                title={`Descargar ${appUpdateResult.recommendedAsset.name}`}
                              >
                                <Download size={15} />
                                <span>Descargar</span>
                              </button>
                            </div>
                          ) : (
                            <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: 0 }}>
                              Revisa la lista inferior para descargar el binario para tu arquitectura.
                            </p>
                          )}

                          {/* Release Notes Collapsible */}
                          {appUpdateResult.releaseNotes && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setShowAppChangelog(!showAppChangelog)}
                                style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '0.75rem', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                              >
                                {showAppChangelog ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                <span>{showAppChangelog ? 'Ocultar notas de la versión' : 'Ver notas de la versión (Changelog)'}</span>
                              </button>
                              {showAppChangelog && (
                                <div className="app-update-changelog-preview">
                                  {appUpdateResult.releaseNotes}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Multiplatform Tab Selector */}
                          <div style={{ marginTop: '0.4rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                              Descargas para Otras Plataformas
                            </div>
                            <div className="app-update-tabs-header">
                              <button
                                className={`app-update-tab ${selectedPlatformTab === 'windows' ? 'is-active' : ''}`}
                                onClick={() => setSelectedPlatformTab('windows')}
                              >
                                <Monitor size={13} /> Windows <span className="app-update-tab-count">{appUpdateResult.windowsAssets.length}</span>
                              </button>
                              <button
                                className={`app-update-tab ${selectedPlatformTab === 'linux' ? 'is-active' : ''}`}
                                onClick={() => setSelectedPlatformTab('linux')}
                              >
                                <Cpu size={13} /> Linux / Steam Deck <span className="app-update-tab-count">{appUpdateResult.linuxAssets.length}</span>
                              </button>
                              <button
                                className={`app-update-tab ${selectedPlatformTab === 'android' ? 'is-active' : ''}`}
                                onClick={() => setSelectedPlatformTab('android')}
                              >
                                <Smartphone size={13} /> Android <span className="app-update-tab-count">{appUpdateResult.androidAssets.length}</span>
                              </button>
                              <button
                                className={`app-update-tab ${selectedPlatformTab === 'macos' ? 'is-active' : ''}`}
                                onClick={() => setSelectedPlatformTab('macos')}
                              >
                                <Sparkles size={13} /> macOS <span className="app-update-tab-count">{appUpdateResult.macosAssets.length}</span>
                              </button>
                            </div>

                            <div className="app-update-assets-list">
                              {(() => {
                                const currentTabAssets =
                                  selectedPlatformTab === 'windows'
                                    ? appUpdateResult.windowsAssets
                                    : selectedPlatformTab === 'linux'
                                    ? appUpdateResult.linuxAssets
                                    : selectedPlatformTab === 'android'
                                    ? appUpdateResult.androidAssets
                                    : appUpdateResult.macosAssets;

                                if (currentTabAssets.length === 0) {
                                  return (
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', padding: '0.5rem 0' }}>
                                      No hay paquetes compilados para esta plataforma en la release {appUpdateResult.latestVersion}.
                                    </div>
                                  );
                                }

                                return currentTabAssets.map((asset) => (
                                  <div className="app-update-asset-item" key={asset.downloadUrl}>
                                    <div className="app-update-asset-details">
                                      <span className="app-update-asset-name">{asset.name}</span>
                                      <div className="app-update-asset-meta">
                                        <span>{(asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                                        {asset.isRecommended && (
                                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>· RECOMENDADO</span>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      className="app-update-asset-download"
                                      onClick={() => handleOpenBrowser(asset.downloadUrl)}
                                      title={`Descargar ${asset.name}`}
                                    >
                                      <Download size={13} /> Descargar
                                    </button>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        </>
                      ) : appUpdateResult.status === 'up_to_date' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Check size={18} color="#34d399" />
                          <div style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>
                            <strong>PortStation está actualizado</strong> a la última versión (<strong>v{appUpdateResult.currentVersion}</strong>) para {appUpdateResult.platform.displayName}.
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                          <Shield size={18} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.45 }}>
                            <strong style={{ color: '#e2e8f0', display: 'block', marginBottom: '0.2rem' }}>
                              Repositorio conectado: {settings.appRepositoryUrl || 'GitHub'}
                            </strong>
                            No se encontraron releases publicadas aún. Cuando compiles y publiques tu release en GitHub con etiquetas como <code>v0.2.0</code> y subas los archivos para Windows (<code>.exe</code>/<code>.msi</code>), Linux (<code>.AppImage</code>) o Android (<code>.apk</code>), PortStation los ofrecerá aquí en un clic.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Remote Port Catalog Sync Section */}
              <div className="settings-section" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <label className="settings-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                      <Database size={15} color="#34d399" /> Catálogo Remoto de Ports (ports_db.json)
                    </label>
                    <p className="settings-desc">
                      Sincroniza nuevos juegos y reglas de escaneo directamente desde GitHub sin requerir una nueva versión de la aplicación.
                    </p>
                  </div>
                  <div className="app-update-version-chips">
                    <span className="chip-current" style={{ borderColor: 'rgba(52, 211, 153, 0.4)', color: '#34d399' }}>
                      Catálogo: v{catalogInfo?.catalogVersion ?? '2.5.2'}
                    </span>
                    <span className="chip-latest" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#a7f3d0' }}>
                      {catalogInfo?.totalProjects ?? catalogPorts.length ?? 0} proyectos en Explorar
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', whiteSpace: 'nowrap' }}
                      disabled={catalogSyncing}
                      onClick={() => void handleSyncCatalog()}
                    >
                      <RefreshCw size={14} className={catalogSyncing ? 'spin' : ''} />
                      <span>{catalogSyncing ? 'Sincronizando catálogo...' : 'Sincronizar Catálogo desde GitHub'}</span>
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>
                      Rama: <code>main</code> · Repositorio: <code>{settings.appRepositoryUrl || 'arsdaemonia-design/PortStation'}</code>
                    </span>
                  </div>

                  {catalogSyncError && (
                    <div className="app-update-card" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(30, 15, 15, 0.7)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontSize: '0.8rem', fontWeight: 600 }}>
                        <AlertTriangle size={16} /> Error al sincronizar catálogo: {catalogSyncError}
                      </div>
                    </div>
                  )}

                  {catalogSyncResult && !catalogSyncError && (
                    <div className="app-update-card is-clean" style={{ padding: '0.65rem 0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontSize: '0.82rem' }}>
                        <Check size={16} />
                        <span>{catalogSyncResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Updates Checker (Pending Task #2) */}
              <div className="settings-section">
                <label className="settings-label">🔄 Actualizaciones de la Biblioteca (GitHub Releases)</label>
                <p className="settings-desc">
                  Comprueba en lote las versiones más recientes de todos los puertos y descompilaciones que tengan repositorio configurado.
                </p>
                <div className="batch-update-panel">
                  <button
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: 'fit-content' }}
                    disabled={batchCheckingUpdates}
                    onClick={handleBatchCheckUpdates}
                  >
                    <RefreshCw size={14} className={batchCheckingUpdates ? 'spin' : ''} />
                    <span>{batchCheckingUpdates ? 'Comprobando biblioteca...' : 'Comprobar actualizaciones de todos los repositorios'}</span>
                  </button>
                  {batchProgress && (
                    <div style={{ marginTop: '0.4rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.25rem' }}>
                        <span>{batchProgress.currentTitle ? `Consultando: ${batchProgress.currentTitle}` : 'Consultando...'}</span>
                        <span>{batchProgress.current} / {batchProgress.total}</span>
                      </div>
                      <div className="batch-progress-track">
                        <div className="batch-progress-fill" style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Carpetas de la Biblioteca</label>
                <p className="settings-desc">
                  Añade o edita una o varias carpetas. PortCave las escanea juntas (soporta rutas de Windows, Linux/WSL como <code>/mnt/e/Games</code> o <code>~/Games</code>, y Android).
                </p>
                <div className="settings-roots-list">
                  {roots.map((root) => (
                    <div className="settings-input-group settings-root-row" key={root.id}>
                      <input
                        type="text"
                        className="settings-input"
                        value={root.path}
                        title={root.path}
                        onChange={(e) => {
                          const newVal = e.target.value;
                          setRoots((prev) =>
                            prev.map((item) => (item.id === root.id ? { ...item, path: newVal } : item))
                          );
                        }}
                      />
                      <span className="settings-root-count">{root.totalFound} juegos</span>
                      <button
                        className="btn btn-secondary settings-root-remove"
                        disabled={roots.length <= 1}
                        title={roots.length <= 1 ? 'Debe quedar al menos una carpeta' : 'Quitar carpeta de la biblioteca'}
                        onClick={() => {
                          if (roots.length <= 1) return;
                          const remainingRoots = roots.filter((item) => item.id !== root.id);
                          setRoots(remainingRoots);
                          void handleScanReal(undefined, remainingRoots);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="settings-input-group" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  <input
                    type="text"
                    className="settings-input"
                    style={{ flex: '1 1 200px' }}
                    placeholder={
                      platformInfo.os === 'android'
                        ? 'Ej: /storage/emulated/0/Download'
                        : platformInfo.os === 'windows'
                          ? 'Ej: D:\\Games\\Ports'
                          : 'Ej: ~/Games/Ports o /mnt/e/Games/Ports'
                    }
                    value={newFolderDraft}
                    onChange={(e) => setNewFolderDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newFolderDraft.trim()) {
                        e.preventDefault();
                        void handleAddManualFolder(newFolderDraft);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={!newFolderDraft.trim()}
                    onClick={() => void handleAddManualFolder(newFolderDraft)}
                  >
                    <FolderPlus size={14} /> Añadir ruta
                  </button>
                  {platformInfo.os !== 'android' && (
                    <button type="button" className="btn btn-secondary" onClick={handleAddFolder}>
                      <FolderOpen size={14} /> Explorar carpeta...
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <label className="settings-label">Fondo de la Caverna (PortCave Wallpaper)</label>
                <p className="settings-desc">Selecciona la atmósfera visual del fondo de la caverna en alta definición.</p>
                <select
                  className="settings-select"
                  value={settings.wallpaperTheme}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      wallpaperTheme: e.target.value as 'treasure' | 'clean'
                    })
                  }
                >
                  <option value="treasure">⚔️ Caverna del Tesoro (Espada Rúnica, Cofre de Oro & Cristales)</option>
                  <option value="clean">🎮 Caverna Templo (Estandarte Gamer & Suelo Despejado)</option>
                </select>
              </div>

              <div className="settings-section curiosity-settings">
                <label className="settings-label">✨ Datos curiosos de la bóveda</label>
                <p className="settings-desc">Siempre activos. El aviso se oculta solo y pausa su cuenta mientras tienes el cursor encima.</p>
                <label className="curiosity-setting-control">
                  <span>Tiempo visible <strong>{settings.curiosityDurationSeconds} s</strong></span>
                  <input type="range" min="20" max="90" step="5" value={settings.curiosityDurationSeconds}
                    onChange={(e) => setSettings({ ...settings, curiosityDurationSeconds: Number(e.target.value) })} />
                </label>
                <label className="curiosity-setting-control">
                  <span>Tamaño del aviso</span>
                  <select className="settings-select" value={settings.curiositySize}
                    onChange={(e) => setSettings({ ...settings, curiositySize: e.target.value as 'small' | 'medium' | 'large' })}>
                    <option value="small">Compacto</option>
                    <option value="medium">Mediano</option>
                    <option value="large">Grande</option>
                  </select>
                </label>
                <label className="curiosity-setting-control">
                  <span>Entrada y salida <strong>{settings.curiosityAnimationMs} ms</strong></span>
                  <input type="range" min="150" max="900" step="50" value={settings.curiosityAnimationMs}
                    onChange={(e) => setSettings({ ...settings, curiosityAnimationMs: Number(e.target.value) })} />
                </label>
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div className="settings-label">Apertura 3D de Estuches en Hover</div>
                  <p className="settings-desc">
                    Abre la caja física y expulsa el disco o cartucho al posar el cursor sobre el juego.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enable3dHover}
                  onChange={(e) => setSettings({ ...settings, enable3dHover: e.target.checked })}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div className="settings-label">Integración con ArcadeArtwork API</div>
                  <p className="settings-desc">
                    Habilita la búsqueda de carátulas y scans oficiales en alta resolución desde la nube.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoArtwork}
                  onChange={(e) => setSettings({ ...settings, autoArtwork: e.target.checked })}
                />
              </div>

              <div className="settings-toggle-row">
                <div>
                  <div className="settings-label">Ocultar Divisores de Piedra al Mouse-Over</div>
                  <p className="settings-desc">
                    Desvanece automáticamente los divisores de piedra del menú lateral cuando interactúas con las opciones.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.hideDividersOnHover}
                  onChange={(e) => setSettings({ ...settings, hideDividersOnHover: e.target.checked })}
                />
              </div>

              {/* Artwork Manager in Settings */}
              <div className="settings-section">
                <label className="settings-label">🎨 Gestor Rápido de Artwork & Carátulas</label>
                <p className="settings-desc">
                  Personaliza carátulas, discos o cartuchos de cualquiera de tus juegos instalados sin tener que salir del panel.
                </p>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '0.5rem',
                  maxHeight: '190px',
                  overflowY: 'auto',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '0.65rem',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                  {games.map((g) => (
                    <div
                      key={g.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.45rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setShowSettingsModal(false);
                        setArtworkModalGame(g);
                      }}
                      title={`Personalizar carátula y disco de ${g.title}`}
                    >
                      <img
                        src={g.boxArtUrl || `/games/${g.id}/cover.png`}
                        alt=""
                        style={{ width: '28px', height: '36px', objectFit: 'cover', borderRadius: '3px' }}
                      />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6fc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {g.title}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#8b949e' }}>
                          {g.originalPlatform}
                        </div>
                      </div>
                      <Sparkles size={13} color="#58a6ff" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Security & API Keys Section */}
              <div className="settings-section">
                <label className="settings-label">🛡️ Seguridad & Credenciales de API (Opcional)</label>
                <p className="settings-desc">
                  Claves personales para auditorías directas en VirusTotal y consultas de releases en GitHub sin límites de tasa. Se guardan localmente en tu equipo.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.65rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9d1d9', marginBottom: '0.25rem', fontWeight: 600 }}>
                      <Key size={12} style={{ display: 'inline', marginRight: '0.3rem' }} /> Clave API de VirusTotal (v3)
                    </label>
                    <input
                      type="password"
                      className="settings-input"
                      value={settings.virusTotalApiKey || ''}
                      placeholder="Pega tu clave gratuita de VirusTotal (4 peticiones/min)"
                      onChange={(e) => setSettings({ ...settings, virusTotalApiKey: e.target.value })}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <small style={{ color: '#8b949e', fontSize: '0.7rem' }}>
                        Permite consultar detecciones y motores antivirus directamente en la ficha del juego.
                      </small>
                      <button
                        type="button"
                        onClick={() => handleOpenBrowser('https://www.virustotal.com/gui/my-apikey')}
                        style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
                      >
                        <span>Obtener clave en VirusTotal</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: '#c9d1d9', marginBottom: '0.25rem', fontWeight: 600 }}>
                      <GithubIcon size={12} className="inline mr-1" /> Token Personal de GitHub (PAT)
                    </label>
                    <input
                      type="password"
                      className="settings-input"
                      value={settings.githubToken || ''}
                      placeholder="ghp_... (Opcional, sin permisos especiales)"
                      onChange={(e) => setSettings({ ...settings, githubToken: e.target.value })}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', flexWrap: 'wrap', gap: '0.25rem' }}>
                      <small style={{ color: '#8b949e', fontSize: '0.7rem' }}>
                        Aumenta el límite de comprobación de 60 a 5,000 peticiones por hora.
                      </small>
                      <button
                        type="button"
                        onClick={() => handleOpenBrowser('https://github.com/settings/tokens/new?description=PortStation+Releases&scopes=')}
                        style={{ background: 'none', border: 'none', color: '#58a6ff', fontSize: '0.72rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
                      >
                        <span>Generar token en GitHub</span>
                        <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button
                className="btn btn-secondary"
                style={{ marginRight: 'auto' }}
                onClick={() => {
                  setShowSettingsModal(false);
                  setShowLegalModal(true);
                }}
              >
                <ShieldCheck size={14} /> Aviso Legal & Marcas
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const trimmed = newFolderDraft.trim();
                  let nextRoots = roots.filter((r) => r.path.trim().length > 0);
                  if (trimmed && !nextRoots.some((r) => r.path.toLowerCase() === trimmed.toLowerCase())) {
                    nextRoots = [...nextRoots, { id: `root-${Date.now()}`, path: trimmed, totalFound: 0 }];
                  }
                  if (nextRoots.length === 0) {
                    const fallback = platformInfo.os === 'android' ? '/storage/emulated/0/Download' : platformInfo.os === 'windows' ? 'E:\\Games\\Ports' : '~/Games/Ports';
                    nextRoots = [{ id: 'default-root', path: fallback, totalFound: 0 }];
                  }
                  setRoots(nextRoots);
                  setNewFolderDraft('');
                  setShowSettingsModal(false);
                  void handleScanReal(undefined, nextRoots);
                }}
              >
                Guardar & Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          LEGAL & TRADEMARK NOTICE MODAL (Aviso Legal & Marcas)
          ============================================================ */}
      {showLegalModal && (
        <div className="modal-backdrop" onClick={() => setShowLegalModal(false)}>
          <div className="legal-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h3 className="settings-modal-title">
                <ShieldCheck size={20} color="#38bdf8" /> Aviso Legal y Uso de Marcas Registradas
              </h3>
              <button className="btn-close" onClick={() => setShowLegalModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="legal-modal-body">
              <div className="legal-section">
                <h4 className="legal-section-title">
                  <ShieldAlert size={15} color="#38bdf8" /> 1. Titularidad de Marcas Comerciales
                </h4>
                <p>
                  PortStation reconoce y respeta plenamente los derechos de propiedad industrial e intelectual de los titulares originales. Ninguna marca comercial, logotipo o imagotipo mostrado en esta aplicación pertenece a PortStation:
                </p>
                <div className="legal-brand-pill-grid">
                  <div className="legal-brand-pill">
                    <strong>Sony Interactive Entertainment Inc.</strong>
                    PlayStation, PS1, PS2, PS3, PSP, PS Vita y sus respectivos logotipos e imagotipos.
                  </div>
                  <div className="legal-brand-pill">
                    <strong>Nintendo Co., Ltd.</strong>
                    Nintendo, Game Boy, GameCube, Wii, Nintendo 64, SNES, NES y sus respectivos logotipos.
                  </div>
                  <div className="legal-brand-pill">
                    <strong>Microsoft Corporation</strong>
                    Xbox, Xbox 360, Xbox One, Xbox Series y sus respectivos logotipos.
                  </div>
                  <div className="legal-brand-pill">
                    <strong>Desarrolladores & Editores</strong>
                    Nombres de videojuegos, artes y carátulas pertenecen a sus creadores (Nintendo, Sony, EA, SEGA, Bandai Namco, Konami, Hudson Soft, Monolith, etc.).
                  </div>
                </div>
              </div>

              <div className="legal-section">
                <h4 className="legal-section-title">
                  ⚖️ 2. Doctrina de Uso Legítimo Nominativo (Nominative Fair Use)
                </h4>
                <p>
                  La inclusión y visualización de logotipos, nombres de plataformas y carátulas se realiza bajo la doctrina legal de <strong>Uso Legítimo Nominativo (Nominative Fair Use)</strong> reconocida a nivel internacional:
                </p>
                <ul style={{ margin: '0.45rem 0 0 1.25rem', padding: 0 }}>
                  <li>
                    Se utilizan <strong>exclusivamente para identificar y organizar</strong> el sistema o consola original para el cual fue concebida la obra técnica preservada.
                  </li>
                  <li>
                    No se sugiere ni se pretende dar a entender ningún tipo de patrocinio, respaldo, licencia oficial o afiliación comercial por parte de Sony, Nintendo, Microsoft u otras empresas.
                  </li>
                  <li>
                    PortStation es una herramienta sin fines comerciales destinada al archivo cultural y gestión personal en entornos de escritorio.
                  </li>
                </ul>
              </div>

              <div className="legal-section">
                <h4 className="legal-section-title">
                  🛡️ 3. Política Anti-Piratería y Preservación de Software
                </h4>
                <p>
                  PortStation es una interfaz gráfica (frontend) y lanzador local. <strong>No distribuye, no aloja, no suministra ni facilita enlaces de descarga</strong> de imágenes ROM, copias de disco ISO, BIOS ni material protegido por derechos de autor.
                </p>
                <p style={{ marginTop: '0.4rem' }}>
                  Los ports compatibles (de proyectos comunitarios como OpenGOAL, Dusklight, ReXGlue, Gen1Recomp, etc.) son motores y recompilaciones de código abierto que requieren que cada usuario posea su propia copia legítima del juego original para compilar o extraer los recursos de audio y texturas.
                </p>
              </div>
            </div>

            <div className="settings-modal-footer">
              <button className="btn btn-primary" onClick={() => setShowLegalModal(false)}>
                Entendido & Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Artwork & Physical Media Customizer Modal */}
      {artworkModalGame && (
        <ArtworkManagerModal
          game={artworkModalGame}
          isOpen={!!artworkModalGame}
          onClose={() => setArtworkModalGame(null)}
          onSaveArtwork={(updated) => handleSaveArtwork(artworkModalGame.id, updated)}
          isTauri={isTauri}
        />
      )}

      {/* Edit Game Metadata Modal */}
      {editingGame && (
        <EditGameModal
          game={editingGame}
          isOpen={!!editingGame}
          onClose={() => setEditingGame(null)}
          onSave={(updatedGame) => {
            setGames((prev) => prev.map((g) => (g.id === updatedGame.id ? updatedGame : g)));
            if (selectedGameForModal && selectedGameForModal.id === updatedGame.id) {
              setSelectedGameForModal(updatedGame);
              if (!hasCommunityPort(updatedGame)) setActiveModalTab('original');
            }
          }}
          isTauri={isTauri}
        />
      )}

      {activeCuriosity && (
        <CuriosityCard
          curiosity={activeCuriosity}
          onClose={() => setActiveCuriosity(null)}
          onAnother={showRandomCuriosity}
        />
      )}

      {/* Gamepad Console HUD Pill */}
      {padState.connected && (
        <aside
          className={`gamepad-hud-pill ${padState.activated ? (isGameRunning ? 'is-running' : 'is-active') : 'is-standby'}`}
          aria-live="polite"
        >
          <span className="gamepad-hud-icon">🎮</span>
          <span className="gamepad-hud-text">
            {padState.activated
              ? isGameRunning
                ? 'Mando cedido al juego en ejecución'
                : `${padState.gamepadName?.slice(0, 24) || 'Mando Activo'}`
              : 'Mando detectado — Pulsa cualquier botón para activar'}
          </span>
          {padState.activated && !isGameRunning && (
            <div className="gamepad-shortcuts-legend">
              {activeCuriosity || curiosityToast ? (
                <><span className="pad-badge"><kbd>A</kbd> Otro dato</span><span className="pad-badge"><kbd>B</kbd> Cerrar</span></>
              ) : selectedGameForModal ? (
                <>
                  <span className="pad-badge"><kbd>A</kbd> Ejecutar Acción</span>
                  <span className="pad-badge"><kbd>X</kbd> Jugar Directo</span>
                  <span className="pad-badge"><kbd>B</kbd> Cerrar Ficha</span>
                  <span className="pad-badge"><kbd>LB/RB</kbd> Subfichas</span>
                </>
              ) : showSettingsModal || showLegalModal || editingGame || artworkModalGame ? (
                <>
                  <span className="pad-badge"><kbd>B</kbd> Cerrar</span>
                </>
              ) : focusZone === 'sidebar' ? (
                <>
                  <span className="pad-badge"><kbd>A</kbd> {sidebarIndex === 2 ? 'Abrir dato curioso' : 'Filtrar'}</span>
                  <span className="pad-badge"><kbd>→</kbd> o <kbd>B</kbd> Ir a Juegos</span>
                  <span className="pad-badge"><kbd>↑/↓</kbd> Moverse</span>
                </>
              ) : focusZone === 'search' ? (
                <>
                  <span className="pad-badge"><kbd>A</kbd> Escribir</span>
                  <span className="pad-badge"><kbd>↓</kbd> o <kbd>B</kbd> Ir a Juegos</span>
                </>
              ) : (
                <>
                  <span className="pad-badge"><kbd>A</kbd> Ficha</span>
                  <span className="pad-badge"><kbd>X</kbd> Jugar</span>
                  <span className="pad-badge"><kbd>Y</kbd> Buscar</span>
                  <span className="pad-badge"><kbd>LT</kbd> Menú lateral</span>
                  <span className="pad-badge"><kbd>LB/RB</kbd> Vistas</span>
                  <span className="pad-badge"><kbd>Start</kbd> Ajustes</span>
                </>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
};

export default App;
