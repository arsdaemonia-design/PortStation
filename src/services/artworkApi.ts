/**
 * PortStation Artwork API Service
 * Conecta con ArcadeArtwork (Piwigo REST API) y SteamGridDB
 */

export interface ArtworkSearchResult {
  id: string | number;
  name: string;
  url: string;
  thumbnailUrl: string;
  category: 'box' | 'disc' | 'cart' | 'banner' | 'advert' | 'port' | 'other';
  provider: 'ArcadeArtwork' | 'Wikipedia' | 'Libretro' | 'GitHub' | 'GameTDB';
}

/**
 * Mapeo de plataforma de PortStation a la carpeta de Libretro Thumbnails
 */
function mapPlatformToLibretroSystem(platform: string): string | null {
  const p = platform.toLowerCase();
  if (p.includes('playstation 2') || p.includes('ps2')) return 'Sony_-_PlayStation_2';
  if (p.includes('playstation 3') || p.includes('ps3')) return 'Sony_-_PlayStation_3';
  if (p.includes('playstation') || p.includes('ps1')) return 'Sony_-_PlayStation';
  if (p.includes('nintendo 64') || p.includes('n64')) return 'Nintendo_-_Nintendo_64';
  if (p.includes('gamecube')) return 'Nintendo_-_GameCube';
  if (p.includes('wii u')) return 'Nintendo_-_Wii_U';
  if (p.includes('wii')) return 'Nintendo_-_Wii';
  if (p.includes('game boy advance') || p.includes('gba')) return 'Nintendo_-_Game_Boy_Advance';
  if (p.includes('game boy color') || p.includes('gbc')) return 'Nintendo_-_Game_Boy_Color';
  if (p.includes('game boy') || p.includes('gb')) return 'Nintendo_-_Game_Boy';
  if (p.includes('super nintendo') || p.includes('snes')) return 'Nintendo_-_Super_Nintendo_Entertainment_System';
  if (p.includes('saturn')) return 'Sega_-_Saturn';
  if (p.includes('dreamcast')) return 'Sega_-_Dreamcast';
  return null;
}

/**
 * Consulta la API de ArcadeArtwork.org con categorización precisa de Discos y Cartuchos
 */
export async function searchArcadeArtwork(rawQuery: string): Promise<ArtworkSearchResult[]> {
  try {
    let query = rawQuery.replace(/[:]/g, '').trim();
    if (rawQuery.includes(':')) {
      const parts = rawQuery.split(':');
      if (parts[1] && parts[1].trim().length > 3) {
        query = parts[1].trim();
      }
    }

    const encoded = encodeURIComponent(query);
    const apiUrl = `https://www.arcadeartwork.org/ws.php?format=json&method=pwg.images.search&query=${encoded}`;

    let json: any = null;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const text = await invoke<string>('fetch_external_api', { url: apiUrl });
      json = JSON.parse(text);
    } catch {
      const res = await fetch(apiUrl);
      if (res.ok) {
        json = await res.json();
      }
    }

    if (!json || !json.result || !Array.isArray(json.result.images)) {
      return [];
    }

    return json.result.images.map((img: any) => {
      const url = img.element_url || '';
      const lowerUrl = url.toLowerCase();
      const lowerName = (img.name || img.file || '').toLowerCase();
      let category: ArtworkSearchResult['category'] = 'other';

      // 1. Discos ópticos (evaluados primero para no confundir con covers)
      if (
        lowerUrl.includes('disc') ||
        lowerUrl.includes('cd-cover') ||
        lowerUrl.includes('cd-covers') ||
        lowerUrl.includes('cd_covers') ||
        lowerUrl.includes('cd-rom') ||
        lowerUrl.includes('dvd') ||
        lowerUrl.includes('umd') ||
        lowerUrl.includes('wii-disc') ||
        lowerUrl.includes('xboxdiscs') ||
        lowerUrl.includes('-cd-') ||
        lowerUrl.includes('-cd.') ||
        lowerName.includes(' cd') ||
        lowerName.includes('disc') ||
        lowerName.includes('disco')
      ) {
        category = 'disc';
      }
      // 2. Cartuchos y etiquetas
      else if (
        lowerUrl.includes('cart') ||
        lowerUrl.includes('carts') ||
        lowerUrl.includes('cartridge') ||
        lowerUrl.includes('gbacarts') ||
        lowerUrl.includes('nes_carts') ||
        lowerUrl.includes('snes_carts') ||
        lowerUrl.includes('gameboycarts') ||
        lowerUrl.includes('label') ||
        lowerName.includes('cart') ||
        lowerName.includes('cartridge') ||
        lowerName.includes('cartucho')
      ) {
        category = 'cart';
      }
      // 3. Cajas y Carátulas comerciales
      else if (
        lowerUrl.includes('box') ||
        lowerUrl.includes('boxes') ||
        lowerUrl.includes('covers') ||
        lowerUrl.includes('cover') ||
        lowerUrl.includes('inlay') ||
        lowerUrl.includes('front') ||
        lowerUrl.includes('custom') ||
        lowerUrl.includes('wiicovers') ||
        lowerUrl.includes('box-art')
      ) {
        category = 'box';
      }
      // 4. Banners, logotipos y marquesinas
      else if (
        lowerUrl.includes('banner') ||
        lowerUrl.includes('logo') ||
        lowerUrl.includes('wheel') ||
        lowerUrl.includes('marquee')
      ) {
        category = 'banner';
      }
      // 5. Publicidad y volantes
      else if (
        lowerUrl.includes('advert') ||
        lowerUrl.includes('flyer') ||
        lowerUrl.includes('poster')
      ) {
        category = 'advert';
      }

      return {
        id: `arcade-${img.id}`,
        name: img.name || img.file || 'Scan ArcadeArtwork',
        url: url,
        thumbnailUrl: img.derivatives?.thumb?.url || url,
        category,
        provider: 'ArcadeArtwork' as const,
      };
    });
  } catch (err) {
    console.error('Error querying ArcadeArtwork API:', err);
    return [];
  }
}

/**
 * Biblioteca verificada de medios físicos directos (Discos Ópticos GameTDB y Cartuchos Oficiales)
 */
function getGameTDBAndDirectMedia(cleanTitle: string, _platform?: string): ArtworkSearchResult[] {
  const t = cleanTitle.toLowerCase();
  const media: ArtworkSearchResult[] = [];

  // ==================== DISCOS GAMECUBE ====================
  if (t.includes('soulcalibur') || t.includes('ring out')) {
    media.push({
      id: 'gametdb-soulcalibur2',
      name: 'SoulCalibur II (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GRSEAF.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GRSEAF.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('twilight princess') || t.includes('dusklight')) {
    media.push({
      id: 'gametdb-twilight',
      name: 'The Legend of Zelda: Twilight Princess (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GZ2E01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GZ2E01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('wind waker')) {
    media.push({
      id: 'gametdb-windwaker',
      name: 'The Legend of Zelda: The Wind Waker (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GZLE01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GZLE01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('strikers')) {
    media.push({
      id: 'gametdb-strikers',
      name: 'Super Mario Strikers (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/G4QE01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/G4QE01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('sunshine')) {
    media.push({
      id: 'gametdb-sunshine',
      name: 'Super Mario Sunshine (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GM4E01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GM4E01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('melee') || (t.includes('smash') && (t.includes('cube') || t.includes('gamecube')))) {
    media.push({
      id: 'gametdb-melee',
      name: 'Super Smash Bros. Melee (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GALE01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GALE01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('metroid prime') && !t.includes('2')) {
    media.push({
      id: 'gametdb-prime1',
      name: 'Metroid Prime (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GM8E01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GM8E01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('metroid prime 2') || t.includes('echoes')) {
    media.push({
      id: 'gametdb-prime2',
      name: 'Metroid Prime 2: Echoes (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/G2ME01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/G2ME01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('f-zero') || t.includes('fzero')) {
    media.push({
      id: 'gametdb-fzerogx',
      name: 'F-Zero GX (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/GFZE01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GFZE01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('thousand-year') || t.includes('thousand year') || (t.includes('paper mario') && t.includes('door'))) {
    media.push({
      id: 'gametdb-pmttyd',
      name: 'Paper Mario: The Thousand-Year Door (Disco GameCube US)',
      url: 'https://art.gametdb.com/wii/disc/US/G8ME01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/G8ME01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('luigi') && t.includes('mansion')) {
    media.push({
      id: 'gametdb-luigi',
      name: "Luigi's Mansion (Disco GameCube US)",
      url: 'https://art.gametdb.com/wii/disc/US/GLME01.png',
      thumbnailUrl: 'https://art.gametdb.com/wii/disc/US/GLME01.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }

  // ==================== DISCOS PLAYSTATION 3 ====================
  if (t.includes("dante's inferno") || t.includes('hells gate') || t.includes('dante')) {
    media.push({
      id: 'gametdb-dante',
      name: "Dante's Inferno (Disco Óptico PS3 US)",
      url: 'https://art.gametdb.com/ps3/disc/US/BLUS30418.png',
      thumbnailUrl: 'https://art.gametdb.com/ps3/disc/US/BLUS30418.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('army of two') && !t.includes('40th')) {
    media.push({
      id: 'gametdb-armyoftwo',
      name: 'Army of Two (Disco Óptico PS3 US)',
      url: 'https://art.gametdb.com/ps3/disc/US/BLUS30113.png',
      thumbnailUrl: 'https://art.gametdb.com/ps3/disc/US/BLUS30113.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('army of two') && t.includes('40th')) {
    media.push({
      id: 'gametdb-armyoftwo40',
      name: 'Army of Two: The 40th Day (Disco Óptico PS3 US)',
      url: 'https://art.gametdb.com/ps3/disc/US/BLUS30414.png',
      thumbnailUrl: 'https://art.gametdb.com/ps3/disc/US/BLUS30414.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('condemned')) {
    media.push({
      id: 'gametdb-condemned',
      name: 'Condemned 2: Bloodshot (Disco Óptico PS3 US)',
      url: 'https://art.gametdb.com/ps3/disc/US/BLUS30115.png',
      thumbnailUrl: 'https://art.gametdb.com/ps3/disc/US/BLUS30115.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes('red dead') || t.includes('redemption')) {
    media.push({
      id: 'gametdb-rdr',
      name: 'Red Dead Redemption (Disco Óptico PS3 US)',
      url: 'https://art.gametdb.com/ps3/disc/US/BLUS30424.png',
      thumbnailUrl: 'https://art.gametdb.com/ps3/disc/US/BLUS30424.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }
  if (t.includes("demon's souls") || t.includes('demons souls')) {
    media.push({
      id: 'gametdb-demonsouls',
      name: "Demon's Souls (Disco Óptico PS3 US)",
      url: 'https://art.gametdb.com/ps3/disc/US/BLUS30443.png',
      thumbnailUrl: 'https://art.gametdb.com/ps3/disc/US/BLUS30443.png',
      category: 'disc',
      provider: 'GameTDB',
    });
  }

  // ==================== DISCOS PLAYSTATION 1 ====================
  if (t.includes('symphony') || t.includes('castlevania')) {
    media.push({
      id: 'arcade-sotn-cd',
      name: 'Castlevania: Symphony of the Night (CD Serigrafiado SLUS-00067)',
      url: 'https://www.arcadeartwork.org/galleries/Sony-Playstation-CD-Covers/Castlevania---Symphony-of-the-Night--U---NTSC-U---SLUS-00067-.jpg',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Sony-Playstation-CD-Covers/Castlevania---Symphony-of-the-Night--U---NTSC-U---SLUS-00067-.jpg',
      category: 'disc',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('bloody roar')) {
    media.push({
      id: 'arcade-bloody-cd',
      name: 'Bloody Roar II (CD Serigrafiado Oficial SLUS-00843)',
      url: 'https://www.arcadeartwork.org/galleries/Sony-Playstation-CD-Covers/Bloody-Roar-II--U---NTSC-U---SLUS-00843-.jpg',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Sony-Playstation-CD-Covers/Bloody-Roar-II--U---NTSC-U---SLUS-00843-.jpg',
      category: 'disc',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('silent hill')) {
    media.push({
      id: 'arcade-sh1-cd',
      name: 'Silent Hill (CD Serigrafiado Oficial SLUS-00972)',
      url: 'https://www.arcadeartwork.org/galleries/Sony-Playstation-CD-Covers/Silent-Hill--U---NTSC-U---SLUS-00972-.jpg',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Sony-Playstation-CD-Covers/Silent-Hill--U---NTSC-U---SLUS-00972-.jpg',
      category: 'disc',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('jak and daxter') || t.includes('jak') || t.includes('open-goal')) {
    media.push({
      id: 'gametdb-jak1',
      name: 'Jak and Daxter: The Precursor Legacy (Disco PS2 US)',
      url: 'https://raw.githubusercontent.com/open-goal/jak-project/master/game/graphics/opengl_renderer/icon.png',
      thumbnailUrl: 'https://raw.githubusercontent.com/open-goal/jak-project/master/game/graphics/opengl_renderer/icon.png',
      category: 'disc',
      provider: 'GitHub',
    });
  }

  // ==================== CARTUCHOS N64 / SNES / GBA ====================
  if (t.includes('mario 64') || t.includes('sm64') || (t.includes('super mario') && t.includes('64'))) {
    media.push({
      id: 'arcade-sm64-cart',
      name: 'Super Mario 64 (Etiqueta Frontal Cartucho USA)',
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Super-Mario-64--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Super-Mario-64--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('ocarina') || t.includes('ship of harkinian')) {
    media.push({
      id: 'arcade-oot-cart',
      name: 'The Legend of Zelda: Ocarina of Time (Cartucho Dorado USA)',
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Legend-of-Zelda--The---Ocarina-of-Time--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Legend-of-Zelda--The---Ocarina-of-Time--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes("majora") || t.includes('2ship2harkinian')) {
    media.push({
      id: 'arcade-mm-cart',
      name: "The Legend of Zelda: Majora's Mask (Cartucho Lenticular Holográfico USA)",
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Legend-of-Zelda--The---Majora-s-Mask--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Legend-of-Zelda--The---Majora-s-Mask--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('banjo-kazooie') || t.includes('banjo kazooie')) {
    media.push({
      id: 'arcade-bk-cart',
      name: 'Banjo-Kazooie (Cartucho N64 USA)',
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Banjo-Kazooie--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Banjo-Kazooie--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('banjo-tooie') || t.includes('banjo tooie')) {
    media.push({
      id: 'arcade-bt-cart',
      name: 'Banjo-Tooie (Cartucho N64 USA)',
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Banjo-Tooie--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Banjo-Tooie--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('perfect dark')) {
    media.push({
      id: 'arcade-pd-cart',
      name: 'Perfect Dark (Cartucho N64 USA)',
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Perfect-Dark--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Perfect-Dark--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('conker')) {
    media.push({
      id: 'arcade-conker-cart',
      name: "Conker's Bad Fur Day (Cartucho N64 USA)",
      url: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Conker-s-Bad-Fur-Day--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Nintendo-64-Cartridges/Conker-s-Bad-Fur-Day--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('aria of sorrow')) {
    media.push({
      id: 'arcade-aria-cart',
      name: 'Castlevania: Aria of Sorrow (Cartucho GBA USA)',
      url: 'https://www.arcadeartwork.org/galleries/gbacarts/Castlevania---Aria-of-Sorrow--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/gbacarts/Castlevania---Aria-of-Sorrow--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('minish cap')) {
    media.push({
      id: 'arcade-minish-cart',
      name: 'The Legend of Zelda: The Minish Cap (Cartucho GBA USA)',
      url: 'https://www.arcadeartwork.org/galleries/gbacarts/Legend-of-Zelda--The---The-Minish-Cap--USA-.png',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/gbacarts/Legend-of-Zelda--The---The-Minish-Cap--USA-.png',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('link to the past') || t.includes('alttp')) {
    media.push({
      id: 'arcade-alttp-cart',
      name: 'The Legend of Zelda: A Link to the Past (Cartucho SNES USA)',
      url: 'https://www.arcadeartwork.org/galleries/Super_Nintendo_carts/Legend-of-Zelda--The---A-Link-to-the-Past--USA-.JPG',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Super_Nintendo_carts/Legend-of-Zelda--The---A-Link-to-the-Past--USA-.JPG',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }
  if (t.includes('super mario world')) {
    media.push({
      id: 'arcade-smw-cart',
      name: 'Super Mario World (Cartucho SNES USA)',
      url: 'https://www.arcadeartwork.org/galleries/Super_Nintendo_carts/Super-Mario-World--USA-.JPG',
      thumbnailUrl: 'https://www.arcadeartwork.org/galleries/Super_Nintendo_carts/Super-Mario-World--USA-.JPG',
      category: 'cart',
      provider: 'ArcadeArtwork',
    });
  }

  return media;
}

/**
 * Buscador Multi-Fuente Inteligente:
 * Consulta simultáneamente ArcadeArtwork (vía proxy Rust sin CORS), Wikipedia REST API, Libretro Thumbnails, GameTDB y GitHub.
 */
export async function searchMultiSourceArtwork(
  gameTitle: string,
  platform?: string,
  repoUrl?: string,
  target?: 'box' | 'media' | 'port'
): Promise<ArtworkSearchResult[]> {
  const cleanTitle = gameTitle
    .replace(/The Legend of Zelda:\s*/i, '')
    .replace(/\s*\(.*\)/, '')
    .replace(/Edición.*/i, '')
    .trim();

  const results: ArtworkSearchResult[] = [];
  const seenUrls = new Set<string>();

  const addUnique = (items: ArtworkSearchResult[]) => {
    for (const item of items) {
      if (item.url && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        results.push(item);
      }
    }
  };

  // Inyectar discos ópticos y cartuchos verificados directos
  addUnique(getGameTDBAndDirectMedia(cleanTitle, platform));

  const promises: Promise<void>[] = [];

  // 1. ArcadeArtwork: consulta general + variantes de medio específicas
  promises.push(
    (async () => {
      const generalHits = await searchArcadeArtwork(cleanTitle);
      addUnique(generalHits);

      // Si buscamos medios (discos/cartuchos) o en pestaña de medios, ejecutamos consultas especializadas
      const p = (platform || '').toLowerCase();
      const extraQueries: string[] = [];
      // Keep normal cover/logo searches to one provider request. Specialized
      // disc/cart queries are only useful when the user explicitly asks for media.
      if (target === 'media') {
        const isDiscPlatform = p.includes('playstation') || p.includes('gamecube') || p.includes('wii') || p.includes('saturn') || p.includes('dreamcast') || p.includes('cd');
        const isCartPlatform = p.includes('64') || p.includes('advance') || p.includes('snes') || p.includes('nes') || p.includes('boy') || p.includes('genesis');
        if (isDiscPlatform) extraQueries.push(`${cleanTitle} CD`, `${cleanTitle} disc`);
        if (isCartPlatform) extraQueries.push(`${cleanTitle} cart`);
      }

      if (extraQueries.length > 0) {
        const extraHitsList = await Promise.allSettled(
          extraQueries.map(q => searchArcadeArtwork(q))
        );
        for (const res of extraHitsList) {
          if (res.status === 'fulfilled') {
            addUnique(res.value);
          }
        }
      }
    })()
  );

  // 2. Wikipedia Official Cover (Sin API Key)
  promises.push(
    (async () => {
      try {
        const wikiSlug = encodeURIComponent(gameTitle.replace(/ /g, '_'));
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${wikiSlug}`);
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          if (wikiData.originalimage?.source) {
            addUnique([{
              id: 'wiki-cover',
              name: `${gameTitle} (Portada Oficial Wikipedia)`,
              url: wikiData.originalimage.source,
              thumbnailUrl: wikiData.thumbnail?.source || wikiData.originalimage.source,
              category: 'box',
              provider: 'Wikipedia',
            }]);
          }
        }
      } catch (e) {
        // Silently skip if not on Wikipedia
      }
    })()
  );

  // 3. Libretro Thumbnails CDN (Sin API Key)
  if (platform) {
    const libretroSystem = mapPlatformToLibretroSystem(platform);
    if (libretroSystem) {
      promises.push(
        (async () => {
          // Prueba variantes con nombre normalizado
          const formattedTitle = cleanTitle.replace(/:/g, ' -').replace(/\s+/g, ' ');
          const encTitle = encodeURIComponent(`${formattedTitle} (USA).png`);
          const boxartUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Boxarts/${encTitle}`;
          const logoUrl = `https://raw.githubusercontent.com/libretro-thumbnails/${libretroSystem}/master/Named_Logos/${encTitle}`;

          try {
            const check = await fetch(boxartUrl, { method: 'HEAD' });
            if (check.ok) {
              addUnique([{
                id: 'libretro-usa-box',
                name: `${cleanTitle} (Carátula Libretro Oficial)`,
                url: boxartUrl,
                thumbnailUrl: boxartUrl,
                category: 'box',
                provider: 'Libretro',
              }]);
            }
          } catch (e) {}

          try {
            const checkLogo = await fetch(logoUrl, { method: 'HEAD' });
            if (checkLogo.ok) {
              addUnique([{
                id: 'libretro-usa-logo',
                name: `${cleanTitle} (Logo Transparente Libretro)`,
                url: logoUrl,
                thumbnailUrl: logoUrl,
                category: 'port',
                provider: 'Libretro',
              }]);
            }
          } catch (e) {}
        })()
      );
    }
  }

  // 4. GitHub Port Assets & OpenGraph (Sin API Key)
  if (repoUrl && repoUrl.includes('github.com/')) {
    const parts = repoUrl.split('github.com/')[1]?.split('/');
    if (parts && parts[0] && parts[1]) {
      const owner = parts[0];
      const repo = parts[1];

      // Avatar del creador
      addUnique([{
        id: 'github-avatar',
        name: `Avatar Oficial de ${owner}`,
        url: `https://github.com/${owner}.png`,
        thumbnailUrl: `https://github.com/${owner}.png`,
        category: 'port',
        provider: 'GitHub',
      }]);

      // Banner social oficial del repositorio
      addUnique([{
        id: 'github-opengraph',
        name: `Banner Oficial de ${repo}`,
        url: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        thumbnailUrl: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        category: 'banner',
        provider: 'GitHub',
      }]);
    }
  }

  await Promise.allSettled(promises);
  return results;
}

/**
 * Busca automáticamente la mejor carátula física (caja comercial) en ArcadeArtwork.
 */
export async function findBestBoxArt(title: string): Promise<string | null> {
  const results = await searchArcadeArtwork(title);
  if (!results.length) return null;

  // Prioridad 1: categoría 'box'
  const boxMatch = results.find(r => r.category === 'box');
  if (boxMatch) return boxMatch.url;

  // Prioridad 2: primera imagen disponible
  return results[0].url;
}

export interface ArtworkRecommendationLink {
  id: string;
  name: string;
  category: 'steamgriddb' | 'thecoverproject' | 'gametdb' | 'libretro' | 'google_images' | 'mobygames' | 'github';
  title: string;
  description: string;
  url: string;
  badge: string;
  color: string;
  rating: number; // 1 to 5
  bestFor: string;
}

/**
 * Genera enlaces recomendados organizados por contexto (Carátula vs Disco vs Port)
 * con calificación de estrellas y propósito específico para guiar al usuario.
 */
export function getRankedRecommendations(
  target: 'box' | 'media' | 'port',
  gameTitle: string,
  platform: string,
  repoUrl?: string
): ArtworkRecommendationLink[] {
  const cleanTitle = gameTitle
    .replace(/The Legend of Zelda:\s*/i, '')
    .replace(/\s*\(.*\)/, '')
    .replace(/Edición.*/i, '')
    .trim();

  const encTitle = encodeURIComponent(cleanTitle);

  if (target === 'box') {
    return [
      {
        id: 'steamgriddb-grids',
        name: 'SteamGridDB',
        category: 'steamgriddb',
        title: 'Portadas Verticales HD (600x900)',
        description: 'La mejor fuente para carátulas modernas, arte vertical oficial y pósters en alta resolución.',
        url: `https://www.steamgriddb.com/search/grids?term=${encTitle}`,
        badge: '600x900 HD',
        color: '#7b2cbf',
        rating: 5,
        bestFor: 'Carátulas frontales modernas y pósters 2:3',
      },
      {
        id: 'thecoverproject',
        name: 'The Cover Project',
        category: 'thecoverproject',
        title: 'Scans de Cajas Físicas a Escala',
        description: 'Cajas comerciales completas escaneadas en alta fidelidad (front, spine y contraportada).',
        url: `https://www.google.com/search?q=${encTitle}+site:thecoverproject.net`,
        badge: 'Cajas Reales',
        color: '#e67e22',
        rating: 5,
        bestFor: 'Scans auténticos de cajas retro',
      },
      {
        id: 'libretro',
        name: 'Libretro Thumbnails',
        category: 'libretro',
        title: 'Miniaturas Oficiales Libretro',
        description: 'Colección de boxarts oficiales del repositorio de RetroArch catalogadas por sistema.',
        url: `https://thumbnails.libretro.com/`,
        badge: 'Retro Oficial',
        color: '#27ae60',
        rating: 4,
        bestFor: 'Miniaturas estandarizadas de emulación',
      },
      {
        id: 'mobygames',
        name: 'MobyGames',
        category: 'mobygames',
        title: 'Archivo Histórico y Regional',
        description: 'Catálogo histórico con todas las variantes por país (NTSC-U, PAL, NTSC-J).',
        url: `https://www.mobygames.com/search/?q=${encTitle}`,
        badge: 'Ediciones USA/JP/EU',
        color: '#8e44ad',
        rating: 4,
        bestFor: 'Ediciones específicas de cada región',
      },
      {
        id: 'google-box',
        name: 'Google Imágenes (Caja)',
        category: 'google_images',
        title: 'Búsqueda Frontal Filtrada',
        description: `Búsqueda exacta con comillas de portada para ${cleanTitle} en ${platform}.`,
        url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"${cleanTitle}" "${platform}" box art cover high resolution`)}`,
        badge: 'Búsqueda Web',
        color: '#c0392b',
        rating: 3,
        bestFor: 'Búsqueda abierta cuando no hay en bases de datos',
      },
    ];
  }

  if (target === 'media') {
    return [
      {
        id: 'gametdb',
        name: 'GameTDB',
        category: 'gametdb',
        title: 'Discos Ópticos y Cajas 3D',
        description: 'La base de datos reina para scans de discos ópticos transparentes (GameCube, Wii, PS1, PS2, PS3).',
        url: `https://www.gametdb.com/`,
        badge: 'Discos PNG',
        color: '#2980b9',
        rating: 5,
        bestFor: 'Discos circulares recortados en PNG transparente',
      },
      {
        id: 'arcadeartwork-media',
        name: 'ArcadeArtwork',
        category: 'thecoverproject',
        title: 'Scans de Discos, Cartuchos & UMD',
        description: 'Impresiones y fotografías a alta resolución de discos serigrafiados y etiquetas de cartuchos.',
        url: `https://www.arcadeartwork.org/`,
        badge: 'Media Scans',
        color: '#f39c12',
        rating: 4,
        bestFor: 'Stickers de cartucho y serigrafías de CD',
      },
      {
        id: 'google-disc',
        name: 'Google Imágenes (Disco / Cartucho)',
        category: 'google_images',
        title: 'Búsqueda de Disco / Sticker Transparente',
        description: `Búsqueda de PNG transparente de disco óptico o etiqueta frontal para ${cleanTitle}.`,
        url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"${cleanTitle}" "${platform}" (disc OR cd OR cartridge label OR sticker) png transparent`)}`,
        badge: 'Disco / Cartucho',
        color: '#d35400',
        rating: 3,
        bestFor: 'Pegatinas y discos PNG sin fondo',
      },
    ];
  }

  // target === 'port'
  return [
    {
      id: 'github-repo',
      name: 'Repositorio GitHub Oficial',
      category: 'github',
      title: 'Assets y Releases del Creador',
      description: 'Iconos oficiales, logotipos del proyecto y capturas publicadas directamente por el autor.',
      url: repoUrl || `https://github.com/search?q=${encTitle}+recomp`,
      badge: 'Fuente Oficial',
      color: '#24292e',
      rating: 5,
      bestFor: 'Logotipo e icono original del port nativo',
    },
    {
      id: 'steamgriddb-heroes',
      name: 'SteamGridDB (Logos & Heroes)',
      category: 'steamgriddb',
      title: 'Banners Horizontales e Iconos',
      description: 'Banners panorámicos (1920x620) y logos PNG sin fondo para encabezados.',
      url: `https://www.steamgriddb.com/search/heroes?term=${encTitle}`,
      badge: 'Banners 1920p',
      color: '#1b2838',
      rating: 4,
      bestFor: 'Banners de fondo y logotipos transparentes',
    },
    {
      id: 'google-port-banner',
      name: 'Google Imágenes (Logo / Fanart)',
      category: 'google_images',
      title: 'Búsqueda de Logotipo / Banner',
      description: `Búsqueda de banner panorámico o logotipo para ${cleanTitle}.`,
      url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`"${cleanTitle}" logo transparent banner`)}`,
      badge: 'Logo / Banner',
      color: '#e74c3c',
      rating: 3,
      bestFor: 'Logotipos vectoriales o fanarts limpios',
    },
  ];
}

/**
 * Mantiene compatibilidad con versiones anteriores
 */
export function getArtworkRecommendationLinks(gameTitle: string, platform: string): ArtworkRecommendationLink[] {
  return getRankedRecommendations('box', gameTitle, platform);
}
