import React, { useEffect, useRef } from 'react';
import './PhysicalMedia.css';
import { GameItem } from '../types';

/* ============================================================
   1. RESOLVER DE IMÁGENES
   ============================================================ */
const esc = (s?: string | null) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c)
  );

/* ============================================================
   2. BASES POR KIND
   ============================================================ */
const DISC_BASE = {
  kind: 'disc' as const,
  rx: '9deg',
  ry: '-21deg',
  sit: 20,
  lidAngle: '-116deg',
  ejectZ: '118px',
  ejectY: '-14px',
};

const CART_BASE = { kind: 'cart' as const, rx: '-7deg', ry: '-23deg', sit: 16 };

/* ============================================================
   3. PERFILES FÍSICOS
   ============================================================ */
interface Profile {
  kind: 'disc' | 'cart';
  short: string;
  w: number;
  h: number;
  d: number;
  rx: string;
  ry: string;
  sit: number;
  disc?: number;
  lidAngle?: string;
  ejectZ?: string;
  ejectY?: string;
  tray?: string;
  spine?: string;
  accent?: string;
  boxInside?: string;
  boxTop?: string;
  boxSpine?: string;
  boxBottom?: string;
  cw?: number;
  ch?: number;
  cd?: number;
  lift?: number;
  cartBody?: string;
  cartTop?: string;
  cartSide?: string;
  cartBack?: string;
  cartBottom?: string;
  cartRadius?: string;
  labelRect?: { x: string; y: string; w: string; h: string };
  brandStrip?: { w: string; bg: string };
}

export const PROFILES: Record<string, Profile> = {
  /* ---------- JEWEL CASE (PS1) ---------- */
  ps1: {
    ...DISC_BASE,
    short: 'PS1',
    w: 198,
    h: 174,
    d: 14,
    disc: 154,
    tray: '#161d14',
    spine: 'linear-gradient(180deg,#2c3d28,#131a11)',
    accent: '#5a8a3f',
  },
  saturn: {
    ...DISC_BASE,
    short: 'SAT',
    w: 198,
    h: 174,
    d: 14,
    disc: 154,
    tray: '#1b1720',
    spine: 'linear-gradient(180deg,#3a2c48,#161020)',
    accent: '#8a5fd0',
  },
  dreamcast: {
    ...DISC_BASE,
    short: 'DC',
    w: 198,
    h: 174,
    d: 14,
    disc: 154,
    tray: '#1a1a1f',
    spine: 'linear-gradient(180deg,#2f3a44,#12161b)',
    accent: '#4a9fd6',
  },

  /* ---------- DVD / BLU-RAY (PS2, PS3, XBOX 360, WII, GC) ---------- */
  ps2: {
    ...DISC_BASE,
    short: 'PS2',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0c1220',
    spine: 'linear-gradient(180deg,#1f3a78,#07102a)',
    accent: '#4a7fd6',
  },
  ps3: {
    ...DISC_BASE,
    short: 'PS3',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0e0e12',
    spine: 'linear-gradient(180deg,#2b2b33,#0a0a0e)',
    accent: '#e6e6e6',
  },
  ps4: {
    ...DISC_BASE,
    short: 'PS4',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0b1220',
    spine: 'linear-gradient(180deg,#1a3a7a,#060c1c)',
    accent: '#3a6fd6',
  },
  ps5: {
    ...DISC_BASE,
    short: 'PS5',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0e1622',
    spine: 'linear-gradient(180deg,#1b3f6e,#08111c)',
    accent: '#5a8fd6',
  },
  xbox: {
    ...DISC_BASE,
    short: 'XB',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0f1a12',
    spine: 'linear-gradient(180deg,#1f5a2c,#0a1a10)',
    accent: '#7ad14a',
  },
  xbox360: {
    ...DISC_BASE,
    short: '360',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0d1a14',
    spine: 'linear-gradient(180deg,#2a6a44,#0c1a14)',
    accent: '#9fe07a',
  },
  wii: {
    ...DISC_BASE,
    short: 'WII',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#1a1c22',
    spine: 'linear-gradient(180deg,#e6ecf2,#c8d0d8)',
    accent: '#4a9fd6',
  },
  gamecube: {
    ...DISC_BASE,
    short: 'GC',
    w: 168,
    h: 236,
    d: 17,
    disc: 104,
    tray: '#171326',
    spine: 'linear-gradient(180deg,#3b2c6e,#140f26)',
    accent: '#8a6fe0',
  },
  psp: {
    ...DISC_BASE,
    short: 'PSP',
    w: 206,
    h: 122,
    d: 17,
    disc: 82,
    tray: '#141821',
    spine: 'linear-gradient(180deg,#2a3550,#0e131e)',
    accent: '#4a7fd6',
  },

  /* ---------- CARTUCHOS ---------- */
  snes: {
    ...CART_BASE,
    short: 'SNES',
    w: 290,
    h: 200,
    d: 54,
    boxInside: '#3a2a1a',
    boxTop: 'linear-gradient(180deg,#dcd8d0,#b8b4ac)',
    boxSpine: 'linear-gradient(180deg,#b8b4ac,#8a867e)',
    boxBottom: '#4a423a',
    cw: 200,
    ch: 126,
    cd: 28,
    cartBody: 'linear-gradient(180deg,#ccd0d7,#9aa0aa)',
    cartTop: '#b9bec6',
    cartSide: '#8f959f',
    cartBack: '#7b818b',
    labelRect: { x: '8%', y: '7%', w: '84%', h: '66%' },
    brandStrip: { w: '22%', bg: 'linear-gradient(180deg,#c8203a,#7a1530)' },
    lift: 65,
  },
  n64: {
    ...CART_BASE,
    short: 'N64',
    w: 260,
    h: 186,
    d: 48,
    boxInside: '#2a1f1a',
    boxTop: 'linear-gradient(180deg,#3a3a44,#25252c)',
    boxSpine: 'linear-gradient(180deg,#2c2c35,#1a1a22)',
    boxBottom: '#141418',
    cw: 160,
    ch: 132,
    cd: 30,
    cartBody: 'linear-gradient(180deg,#3c3c46,#1d1d25)',
    cartTop: '#494954',
    cartSide: '#2a2a34',
    cartBack: '#212129',
    labelRect: { x: '10%', y: '8%', w: '80%', h: '60%' },
    lift: 65,
  },
  nes: {
    ...CART_BASE,
    short: 'NES',
    w: 186,
    h: 240,
    d: 44,
    boxInside: '#2a2018',
    boxTop: 'linear-gradient(180deg,#1a1a1a,#0a0a0a)',
    boxSpine: 'linear-gradient(180deg,#1a1a1a,#0a0a0a)',
    boxBottom: '#0a0a0a',
    cw: 150,
    ch: 172,
    cd: 26,
    cartBody: 'linear-gradient(180deg,#d9d6ce,#a9a69e)',
    cartTop: '#c9c6bd',
    cartSide: '#8e8b84',
    cartBack: '#7d7a74',
    labelRect: { x: '9%', y: '9%', w: '82%', h: '58%' },
    lift: 70,
  },
  gb: {
    ...CART_BASE,
    short: 'GB',
    w: 152,
    h: 176,
    d: 34,
    sit: 24,
    boxInside: '#1a1a22',
    boxTop: 'linear-gradient(180deg,#3a3a44,#1d1d25)',
    boxSpine: 'linear-gradient(180deg,#2c2c36,#16161e)',
    boxBottom: '#101018',
    cw: 112,
    ch: 126,
    cd: 16,
    cartBody: 'linear-gradient(180deg,#d2d6dc,#a6aab2)',
    cartTop: '#c2c6cd',
    cartSide: '#92969e',
    cartBack: '#82868e',
    labelRect: { x: '9%', y: '16%', w: '82%', h: '56%' },
    lift: 55,
  },
  gba: {
    ...CART_BASE,
    short: 'GBA',
    w: 172,
    h: 154,
    d: 32,
    boxInside: '#1a1a1a',
    boxTop: 'linear-gradient(180deg,#3a3a3a,#1a1a1a)',
    boxSpine: 'linear-gradient(180deg,#2a2a2a,#111)',
    boxBottom: '#0a0a0a',
    cw: 150,
    ch: 96,
    cd: 16,
    cartBody: 'linear-gradient(180deg,#3d3d48,#1d1d26)',
    cartTop: '#4a4a56',
    cartSide: '#2b2b36',
    cartBack: '#22222b',
    labelRect: { x: '8%', y: '11%', w: '84%', h: '62%' },
    lift: 50,
  },

  /* ---------- PC / RETRO COMPUTERS / VINTAGE ---------- */
  pc: {
    ...DISC_BASE,
    short: 'PC',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#0e1724',
    spine: 'linear-gradient(180deg,#1b324f,#0a1320)',
    accent: '#00adef',
  },
  dos: {
    ...DISC_BASE,
    short: 'DOS',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#1c1b18',
    spine: 'linear-gradient(180deg,#3d382d,#1a1813)',
    accent: '#d4a34b',
  },
  amiga: {
    ...DISC_BASE,
    short: 'AMIGA',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#181b22',
    spine: 'linear-gradient(180deg,#303a48,#14171d)',
    accent: '#e64a19',
  },
  arcade: {
    ...DISC_BASE,
    short: 'ARCADE',
    w: 170,
    h: 238,
    d: 17,
    disc: 150,
    tray: '#14141c',
    spine: 'linear-gradient(180deg,#2d1f42,#110c1c)',
    accent: '#ff007f',
  },
  genesis: {
    ...CART_BASE,
    short: 'GENESIS',
    w: 180,
    h: 230,
    d: 36,
    boxInside: '#151515',
    boxTop: 'linear-gradient(180deg,#222,#111)',
    boxSpine: 'linear-gradient(180deg,#1e1e1e,#0a0a0a)',
    boxBottom: '#0a0a0a',
    cw: 140,
    ch: 110,
    cd: 22,
    cartBody: 'linear-gradient(180deg,#262626,#121212)',
    cartTop: '#303030',
    cartSide: '#202020',
    cartBack: '#181818',
    labelRect: { x: '10%', y: '10%', w: '80%', h: '65%' },
    lift: 55,
  },
};

/* ============================================================
   4. WEB COMPONENT <physical-media>
   ============================================================ */
class PhysicalMediaElement extends HTMLElement {
  static resolveSrc = (p: string) => p || '';
  private _wired = false;

  static get observedAttributes() {
    return ['platform', 'cover', 'media', 'label', 'title'];
  }

  connectedCallback() {
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    if (!this._wired) {
      this._wired = true;
      this.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle();
        }
      });
    }
    this._render();
  }

  attributeChangedCallback(_: string, o: string, n: string) {
    if (this.isConnected && o !== n) this._render();
  }

  toggle() {
    const open = this.classList.toggle('open');
    this.setAttribute('aria-expanded', String(open));
  }

  _render() {
    const platform = this.getAttribute('platform') || 'ps1';
    const p = PROFILES[platform] || PROFILES.ps1;
    const cover = this.getAttribute('cover') || '';
    const media = this.getAttribute('media') || '';
    const label = this.getAttribute('label') || '';
    const title = this.getAttribute('title') || p.short || platform;
    const R = PhysicalMediaElement.resolveSrc;
    const s = this.style;

    /* geometría base */
    s.setProperty('--w', p.w + 'px');
    s.setProperty('--h', p.h + 'px');
    s.setProperty('--d', p.d + 'px');
    s.setProperty('--rx', p.rx);
    s.setProperty('--ry', p.ry);
    s.setProperty('--sit', p.sit + 'px');
    this.setAttribute('aria-label', title);

    /* DISC */
    if (p.kind === 'disc') {
      s.setProperty('--disc', (p.disc || 150) + 'px');
      s.setProperty('--lid-angle', p.lidAngle || '-116deg');
      s.setProperty('--eject-z', p.ejectZ || '112px');
      s.setProperty('--eject-y', p.ejectY || '-16px');
      s.setProperty('--tray', p.tray || '#111');
      s.setProperty('--spine', p.spine || '#222');
      s.setProperty('--accent', p.accent || 'transparent');

      const discFallback = generateDiscArt(title);
      const discSrc = media || discFallback;
      const coverFallback = generateCoverArt(title, p.short);
      const coverSrc = cover || coverFallback;

      this.innerHTML = `
        <div class="pm-shadow"></div>
        <div class="pm-obj pm-disc">
          <div class="pm-face pm-back"></div>
          <div class="pm-tray"></div>
          <div class="pm-disc-media">
            <img src="${esc(R(discSrc))}" alt="" draggable="false" onerror="if(this.src!=='${esc(discFallback)}'){this.src='${esc(discFallback)}';}">
            <div class="pm-sheen"></div>
            <div class="pm-hub"></div>
          </div>
          <div class="pm-face pm-spine"></div>
          <div class="pm-face pm-edge"></div>
          <div class="pm-lid">
            <div class="pm-lid-face pm-lid-front">
              <img src="${esc(R(coverSrc))}" alt="" draggable="false" onerror="if(this.src!=='${esc(coverFallback)}'){this.src='${esc(coverFallback)}';}">
            </div>
            <div class="pm-lid-face pm-lid-back"></div>
          </div>
        </div>`;
      return;
    }

    /* CART */
    s.setProperty('--box-inside', p.boxInside || '#222');
    s.setProperty('--box-top', p.boxTop || '#333');
    s.setProperty('--box-spine', p.boxSpine || '#222');
    s.setProperty('--box-bottom', p.boxBottom || '#111');
    s.setProperty('--cw', (p.cw || 150) + 'px');
    s.setProperty('--ch', (p.ch || 130) + 'px');
    s.setProperty('--cd', (p.cd || 25) + 'px');
    s.setProperty('--lift', (p.lift || 150) + 'px');
    s.setProperty('--cart-body', p.cartBody || '#ccc');
    s.setProperty('--cart-top', p.cartTop || '#aaa');
    s.setProperty('--cart-side', p.cartSide || '#999');
    s.setProperty('--cart-back', p.cartBack || '#888');
    s.setProperty('--cart-radius', p.cartRadius || '4px');

    if (p.brandStrip) {
      s.setProperty('--brand-w', p.brandStrip.w);
      s.setProperty('--brand-bg', p.brandStrip.bg);
    }

    const r = p.labelRect || { x: '10%', y: '10%', w: '80%', h: '60%' };
    const labelHtml = label
      ? `<img src="${esc(R(label))}" alt="" draggable="false">`
      : `<div class="pm-default">${esc(p.short)}</div>`;
    const coverFallback = generateCoverArt(title, p.short);
    const coverSrc = cover || coverFallback;

    this.innerHTML = `
      <div class="pm-shadow"></div>
      <div class="pm-obj pm-cart-kind">
        <div class="pm-box">
          <div class="pm-box-back"></div>
          <div class="pm-box-spine"></div>
          <div class="pm-box-edge"></div>
          <div class="pm-box-top"></div>
          <div class="pm-box-bottom"></div>
          <div class="pm-box-front">
            <div class="pm-bf-art">
              <img src="${esc(R(coverSrc))}" alt="" draggable="false" onerror="if(this.src!=='${esc(coverFallback)}'){this.src='${esc(coverFallback)}';}">
            </div>
            <div class="pm-bf-back"></div>
          </div>
        </div>
        <div class="pm-cart">
          <div class="pm-cface pm-cfront">
            <div class="pm-clabel ${p.brandStrip ? 'branded' : ''}"
                 style="left:${r.x};top:${r.y};width:${r.w};height:${r.h}">
              ${labelHtml}
            </div>
          </div>
          <div class="pm-cface pm-cback"></div>
          <div class="pm-cface pm-cleft"></div>
          <div class="pm-cface pm-cright"></div>
          <div class="pm-cface pm-ctop"></div>
          <div class="pm-cface pm-cbottom"></div>
        </div>
      </div>`;
  }
}

if (typeof window !== 'undefined' && !customElements.get('physical-media')) {
  customElements.define('physical-media', PhysicalMediaElement);
}

/* ============================================================
   5. HELPERS PARA CREAR DISCOS SVG Y MAPEO DE PLATAFORMAS
   ============================================================ */
export function generateCoverArt(title: string, platformShort = 'PORT', c1 = '#131c28', c2 = '#080d14') {
  const shortTitle = title.length > 24 ? title.substring(0, 22) + '...' : title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 270">
    <defs>
      <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
      <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#0284c7" stop-opacity="0.04"/>
      </linearGradient>
    </defs>
    <rect width="200" height="270" fill="url(#bgGrad)"/>
    <rect x="6" y="6" width="188" height="258" rx="6" fill="url(#glowGrad)" stroke="rgba(56,189,248,0.35)" stroke-width="1.5"/>
    <rect x="14" y="14" width="46" height="18" rx="4" fill="rgba(56,189,248,0.2)" stroke="rgba(56,189,248,0.5)" stroke-width="1"/>
    <text x="37" y="27" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="9" font-weight="900" fill="#38bdf8" letter-spacing="1">${esc(platformShort)}</text>
    <circle cx="100" cy="108" r="36" fill="rgba(255,255,255,0.03)" stroke="rgba(56,189,248,0.25)" stroke-width="1.5"/>
    <path d="M85 108 h30 M100 93 v30" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>
    <text x="100" y="176" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="12" font-weight="800" fill="#f8fafc">${esc(shortTitle)}</text>
    <text x="100" y="195" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="8" font-weight="700" fill="rgba(148,163,184,0.7)" letter-spacing="2.5">PORTSTATION</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function generateDiscArt(title: string, c1 = '#2c3e50', c2 = '#0f171e') {
  const shortTitle = title.length > 20 ? title.substring(0, 18) + '...' : title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="d" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/>
        <stop offset="1" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#d)"/>
    <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>
    <text x="100" y="93" text-anchor="middle" font-family="system-ui,sans-serif"
      font-size="14" font-weight="800" fill="#ffffff">${esc(shortTitle)}</text>
    <text x="100" y="115" text-anchor="middle" font-family="system-ui,sans-serif"
      font-size="9" fill="rgba(255,255,255,.65)" letter-spacing="3">PORTSTATION</text>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function mapPlatformToProfile(originalPlatform: string): string {
  if (!originalPlatform) return 'pc';
  const segments = originalPlatform.split(/[,/|;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);

  const matchSegment = (p: string): string | null => {
    if (p.includes('gamecube') || /\bgc\b/.test(p)) return 'gamecube';
    if (p.includes('wii')) return 'wii';
    if (p.includes('xbox 360') || p.includes('360')) return 'xbox360';
    if (p.includes('playstation 4') || p === 'ps4') return 'ps4';
    if (p.includes('playstation 3') || p === 'ps3') return 'ps3';
    if (p.includes('playstation 2') || p.includes('ps2')) return 'ps2';
    if (p.includes('playstation') || p.includes('ps1') || p.includes('psx')) return 'ps1';
    if (p.includes('game boy advance') || p.includes('gba')) return 'gba';
    if (p.includes('game boy') || p.includes('gb')) return 'gb';
    if (p.includes('nintendo 64') || p.includes('n64')) return 'n64';
    if (p.includes('snes') || p.includes('super nintendo')) return 'snes';
    if (p.includes('saturn')) return 'saturn';
    if (p.includes('dreamcast') || /\bdc\b/.test(p)) return 'dreamcast';
    if (/\b(genesis|mega drive|megadrive)\b/.test(p) || /\bsega\s+(genesis|mega drive)\b/.test(p)) return 'genesis';
    if (/\bnes\b/.test(p) || p.includes('famicom') || p.includes('nintendo entertainment system')) return 'nes';
    if (p.includes('amiga')) return 'amiga';
    if (p.includes('dos') || p.includes('ms-dos')) return 'dos';
    if (p.includes('arcade') || p.includes('mame') || p.includes('neogeo') || p.includes('neo geo')) return 'arcade';
    if (p.includes('psp')) return 'psp';
    if (p.includes('pc') || p.includes('windows')) return 'pc';
    return null;
  };

  for (const seg of segments) {
    const matched = matchSegment(seg);
    if (matched) return matched;
  }

  const fullMatch = matchSegment(originalPlatform.toLowerCase());
  return fullMatch || 'pc';
}

/* ============================================================
   6. COMPONENTE REACT: PhysicalMediaCard (Completamente Genérico)
   ============================================================ */
interface PhysicalMediaCardProps {
  game: GameItem;
  repoVersion?: string | null;
  hasRepoUpdate?: boolean;
}

export const PhysicalMediaCard: React.FC<PhysicalMediaCardProps> = ({ game, repoVersion, hasRepoUpdate = false }) => {
  const mediaRef = useRef<HTMLElement>(null);

  const platform = mapPlatformToProfile(game.originalPlatform || '');
  const cover = game.boxArtUrl || `/games/${game.id}/cover.png`;
  const isDisc = PROFILES[platform]?.kind === 'disc';
  const media = isDisc ? (game.discArtUrl || `/games/${game.id}/disc.png`) : '';
  const label = !isDisc ? (game.cartridgeArtUrl || game.discArtUrl || `/games/${game.id}/label.png`) : '';

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.setAttribute('platform', platform);
      mediaRef.current.setAttribute('cover', cover);
      mediaRef.current.setAttribute('media', media);
      mediaRef.current.setAttribute('label', label);
      mediaRef.current.setAttribute('title', game.title);
    }
  }, [platform, cover, media, label, game.title]);

  return (
    <div className="card-media-3d-wrap">
      {repoVersion && (
        <div className={`card-repo-version-overlay ${hasRepoUpdate ? 'has-update' : ''}`} title={hasRepoUpdate ? 'Hay una versión más reciente en el repositorio' : 'Última versión consultada del repositorio'}>
          <span>{repoVersion}</span>
          {hasRepoUpdate && <span className="card-update-indicator">Actualización</span>}
        </div>
      )}
      <div className="card-media-badge">
        <span>{PROFILES[platform]?.short || platform.toUpperCase()}</span>
      </div>
      <div className="card-media-hover-hint">
        <span>🔍 Ver Ficha Técnica</span>
      </div>
      {/* @ts-expect-error Custom element */}
      <physical-media
        ref={mediaRef}
        platform={platform}
        cover={cover}
        media={media}
        label={label}
        title={game.title}
      />
    </div>
  );
};
