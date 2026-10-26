import { GameItem } from './types';

export const MOCK_GAMES: GameItem[] = [
  {
    id: 'twilight-princess',
    title: 'The Legend of Zelda: Twilight Princess',
    originalPlatform: 'GameCube / Wii',
    releaseYear: 2006,
    developer: 'Nintendo EAD',
    synopsis: 'Link emprende un viaje para salvar Hyrule tras ser engullido por una misteriosa dimensión paralela conocida como el Reino Crepuscular.',
    boxArtUrl: '/games/twilight-princess/cover.png',
    portArtUrl: 'https://raw.githubusercontent.com/TwilitRealm/dusklight/refs/heads/main/res/icon.png',
    projectTitle: 'Dusklight',
    method: 'DECOMP_NATIVE',
    status: 'VERIFIED',
    author: 'TwilitRealm Community',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/161476686?s=200&v=4',
    repositoryUrl: 'https://github.com/TwilitRealm/dusklight',
    features: [
      'Render nativo WebGPU / Vulkan / DirectX',
      'Resolución ultra HD y Widescreen 21:9',
      'Tasa de cuadros desbloqueada (60/120+ FPS)',
      'Inyección de texturas, ReShade y DLSS'
    ],
    technicalNotes: 'Port nativo para PC basado en la decompilación completa de GameCube.',
    executablePath: 'E:\\Games\\Ports\\The Legend of Zelda Twighlight Princess\\Dusklight-v2.0.2-win32-x86_64\\dusklight.exe',
    installPath: 'E:\\Games\\Ports\\The Legend of Zelda Twighlight Princess\\Dusklight-v2.0.2-win32-x86_64'
  },
  {
    id: 'jak-1',
    title: 'Jak and Daxter: The Trilogy',
    originalPlatform: 'PlayStation 2',
    releaseYear: 2001,
    developer: 'Naughty Dog',
    synopsis: 'La legendaria trilogía de plataformas y acción 3D creada por Naughty Dog para PS2, preservada y portada a PC de forma nativa por el equipo de OpenGOAL.',
    boxArtUrl: '/games/jak-1/cover.png',
    portArtUrl: 'https://raw.githubusercontent.com/open-goal/launcher/main/src-tauri/icons/icon.png',
    subGames: [
      {
        title: 'Jak and Daxter: The Precursor Legacy',
        releaseYear: 2001,
        synopsis: 'Jak y su inseparable amigo Daxter (convertido en comadreja por el eco oscuro) viajan a través del archipiélago en busca del sabio Gol para devolver a Daxter a su forma humana. Explora entornos interconectados sin pantallas de carga.',
        boxArtUrl: 'https://raw.githubusercontent.com/open-goal/jak-project/master/game/assets/jak1/app256.png',
        mediaType: 'disc',
        screenshots: [
          'https://raw.githubusercontent.com/open-goal/launcher/main/assets/img/jak1.png'
        ]
      },
      {
        title: 'Jak II: Renegade',
        releaseYear: 2003,
        synopsis: 'Tras ser transportados al futuro distópico de Villa Refugio (Haven City), Jak es apresado durante dos años y sometido a crueles experimentos con Eco Oscuro por el Barón Praxis. Ahora busca venganza, domina armas de fuego y lidera la resistencia.',
        boxArtUrl: 'https://raw.githubusercontent.com/open-goal/jak-project/master/game/assets/jak2/app256.png',
        mediaType: 'disc',
        screenshots: [
          'https://cdn2.steamgriddb.com/thumb/24c0d02ea298ec434479904ae6fa8770.jpg'
        ]
      },
      {
        title: 'Jak 3',
        releaseYear: 2004,
        synopsis: 'Desterrado al implacable Páramo (Wasteland) por el Consejo de Villa Refugio, Jak debe sobrevivir y ganar la confianza del rey Damon de Spargus mientras los Oscuros amenazan con destruir el planeta. Conduce buggies y desbloquea el Eco Luminoso.',
        boxArtUrl: 'https://raw.githubusercontent.com/open-goal/jak-project/master/game/assets/jak3/app256.png',
        mediaType: 'disc',
        screenshots: [
          'https://cdn2.steamgriddb.com/thumb/68032549247ea798150495f50ef2e0aa.jpg'
        ]
      }
    ],
    projectTitle: 'OpenGOAL (Trilogía Completa)',
    method: 'DECOMP_NATIVE',
    status: 'VERIFIED',
    author: 'OpenGOAL Team (water111, et al.)',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/74148564?s=200&v=4',
    repositoryUrl: 'https://github.com/open-goal/jak-project',
    features: [
      'Soporte completo para Jak 1, Jak II y Jak 3',
      'Motor reconstruido en C++ y lenguaje GOAL nativo',
      'Renderizado a 60/120/144 FPS estables',
      'Soporte de monitor panorámico y menú nativo de PC',
      'Carga instantánea sin pantallas de espera'
    ],
    technicalNotes: 'Ingeniería inversa profunda de GOAL (Game Oriented Assembly Lisp) extrayendo assets directamente de los ISOs de PS2.',
    executablePath: 'E:\\Games\\Ports\\Jack and Daxter\\OpenGOAL-Launcher.exe',
    installPath: 'E:\\Games\\Ports\\Jack and Daxter'
  },
  {
    id: 'dantes-inferno',
    title: "Dante's Inferno",
    originalPlatform: 'Xbox 360',
    releaseYear: 2010,
    developer: 'EA Redwood Shores (Visceral Games)',
    synopsis: 'Basado libremente en la Divina Comedia, Dante desciende a través de los nueve círculos del Infierno para rescatar el alma de su amada Beatriz de las garras de Lucifer.',
    boxArtUrl: '/games/dantes-inferno/cover.jpg',
    portArtUrl: 'https://raw.githubusercontent.com/florinp93/hells-gate-recomp/refs/heads/main/launcher/icon.png',
    projectTitle: "Hell's Gate Recomp",
    method: 'STATIC_RECOMP',
    status: 'VERIFIED',
    author: 'florinp93 / ReXGlue Community',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/10185966?s=200&v=4',
    repositoryUrl: 'https://github.com/florinp93/hells-gate-recomp',
    features: [
      'Recompilación estática de Xbox 360 a C++',
      'DirectX 12 en Windows y Vulkan en Linux',
      'Hook automático para instalación de paquetes DLC',
      'Sin emulador de CPU en tiempo de ejecución'
    ],
    technicalNotes: 'Recompilación estática PowerPC utilizando el SDK de ReXGlue con backend gráfico D3D12/Vulkan.',
    executablePath: 'E:\\Games\\Ports\\Dante\'s Inferno\\dantes_inferno.exe',
    installPath: 'E:\\Games\\Ports\\Dante\'s Inferno',
    inMemoriam: {
      studioName: 'Visceral Games (EA Redwood Shores)',
      years: '1998 – 2017',
      notes: 'Legendario estudio californiano creador de Dead Space y Dante\'s Inferno. Clausurado por Electronic Arts en octubre de 2017 tras 19 años de excelencia en horror cinemático.'
    }
  },
  {
    id: 'bloody-roar-2',
    title: 'Bloody Roar 2: The New Breed',
    originalPlatform: 'PlayStation',
    releaseYear: 1999,
    developer: 'Eighting / Raizing',
    synopsis: 'Luchadores que poseen la habilidad única de transformarse en bestias antropomórficas combaten en arenas de batalla tridimensionales.',
    boxArtUrl: '/games/bloody-roar-2/cover.png',
    portArtUrl: 'https://cdn2.steamgriddb.com/icon/b8986b669b32e9726834cc005c9ba8e1/32/256x256.png',
    projectTitle: 'Bloody Roar 2 Recompiled',
    method: 'STATIC_RECOMP',
    status: 'VERIFIED',
    author: 'novapowers0',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/172288339?s=200&v=4',
    repositoryUrl: 'https://github.com/novapowers0/BloodyRoar2Recomp',
    features: [
      'Port nativo para PC con renderizado OpenGL/Vulkan',
      'Resolución 4K y 60 FPS estables',
      'Soporte de controles XInput y DirectInput'
    ],
    technicalNotes: 'Recompilación estática de la arquitectura MIPS R3000 de PlayStation a x86_64 nativo.',
    executablePath: 'E:\\Games\\Ports\\BloodyRoar2\\BloodyRoar2_Recompiled.exe',
    installPath: 'E:\\Games\\Ports\\BloodyRoar2',
  },
  {
    id: 'dbz-budokai-3',
    title: 'Dragon Ball Z: Budokai 3 HD Collection',
    originalPlatform: 'Xbox 360 / PlayStation 2',
    releaseYear: 2012,
    developer: 'Dimps / Bandai Namco',
    synopsis: 'El pináculo de los combates 2.5D de Dragon Ball Z con la plantilla completa desde la saga Saiyan hasta GT y películas.',
    boxArtUrl: '/games/dbz-budokai-3/cover.png',
    portArtUrl: 'https://cdn2.steamgriddb.com/thumb/36245df3a65dcc54d2b9828813913588.jpg',
    projectTitle: 'DBZ Budokai 3 HD Recomp',
    method: 'STATIC_RECOMP',
    status: 'VERIFIED',
    author: 'novapowers0',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/172288339?s=200&v=4',
    repositoryUrl: 'https://github.com/novapowers0/DBZ-Budokai-3-HD-Collection',
    features: [
      'Ejecutable nativo para Windows sin Xenia',
      'Texturas HD y tiempos de carga instantáneos',
      'Integración de Mod Center HD'
    ],
    technicalNotes: 'Recompilación estática de la versión remasterizada de Xbox 360.',
    executablePath: 'E:\\Games\\Ports\\DBZ Budokai 3 HD Collection\\dbz3.exe',
    installPath: 'E:\\Games\\Ports\\DBZ Budokai 3 HD Collection'
  },
  {
    id: 'condemned-2',
    title: 'Condemned 2: Bloodshot',
    originalPlatform: 'Xbox 360',
    releaseYear: 2008,
    developer: 'Monolith Productions',
    synopsis: 'Ethan Thomas vuelve a sumergirse en la violencia urbana, psicosis y horror en primera persona investigando una conspiración sobrenatural.',
    boxArtUrl: '/games/condemned-2/cover.jpg',
    portArtUrl: 'https://cdn2.steamgriddb.com/icon/bd470ca955d9497bbcb808e59952fffc/32/256x256.png',
    projectTitle: 'Condemned 2 Recomp',
    method: 'STATIC_RECOMP',
    status: 'VERIFIED',
    author: 'psxrestore',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/171569483?s=200&v=4',
    repositoryUrl: 'https://github.com/psxrestore/Condemned2Recomp',
    features: [
      'Port nativo Windows vía ReXGlue',
      'Soporte de altas resoluciones y framerate fluido',
      'Mapeo de controles modernos'
    ],
    technicalNotes: 'Recompilación estática de los binarios Xbox 360 Xenon con backend DirectX 12.',
    executablePath: 'E:\\Games\\Ports\\Condemned 2 Bloodshot\\condemned2recomp.exe',
    installPath: 'E:\\Games\\Ports\\Condemned 2 Bloodshot',
  },
  {
    id: 'pokemon-gen1',
    title: 'Pokémon Generation 1 (Red / Blue / Yellow)',
    originalPlatform: 'Game Boy',
    releaseYear: 1996,
    developer: 'Game Freak / Nintendo',
    synopsis: 'El fenómeno mundial que lo inició todo en la región de Kanto: viaja capturando los 151 Pokémon originales, desafía a los 8 líderes de gimnasio y derrota al Alto Mando para ser Campeón.',
    boxArtUrl: '/games/pokemon-gen1/cover.png',
    portArtUrl: 'https://raw.githubusercontent.com/bryanthaboi/gen1recomp/dev/assets/logo/gen1recomp_cover.png',
    subGames: [
      {
        title: 'Pokémon Edición Roja (Red)',
        releaseYear: 1996,
        synopsis: 'Comienza tu viaje en Pueblo Paleta con Charmander, Bulbasaur o Squirtle. Incluye criaturas salvajes exclusivas como Ekans, Arbok, Oddish, Gloom, Vileplume, Mankey, Primeape, Growlithe, Arcanine y Scyther.',
        boxArtUrl: 'https://raw.githubusercontent.com/bryanthaboi/gen1recomp/dev/assets/labels/red.png',
        mediaType: 'cartridge',
        screenshots: [
          'https://cdn2.steamgriddb.com/thumb/24c0d02ea298ec434479904ae6fa8770.jpg'
        ]
      },
      {
        title: 'Pokémon Edición Azul (Blue)',
        releaseYear: 1996,
        synopsis: 'La edición compañera con Pokémon salvajes exclusivos de versión: Sandshrew, Sandslash, Vulpix, Ninetales, Meowth, Persian, Bellsprout, Weepinbell, Victreebel, Magmar y Pinsir.',
        boxArtUrl: 'https://raw.githubusercontent.com/bryanthaboi/gen1recomp/dev/assets/labels/blue.png',
        mediaType: 'cartridge',
        screenshots: [
          'https://cdn2.steamgriddb.com/thumb/68032549247ea798150495f50ef2e0aa.jpg'
        ]
      },
      {
        title: 'Pokémon Edición Amarilla: Edición Especial Pikachu (Yellow)',
        releaseYear: 1998,
        synopsis: 'Edición inspirada en la serie de anime: Pikachu camina a tu lado fuera de su Poké Ball y reacciona con emociones, puedes conseguir a los 3 iniciales de Kanto y combatir al dúo Jessie y James.',
        boxArtUrl: 'https://raw.githubusercontent.com/bryanthaboi/gen1recomp/dev/assets/labels/yellow.png',
        mediaType: 'cartridge',
        screenshots: [
          'https://raw.githubusercontent.com/open-goal/launcher/main/assets/img/jak1.png'
        ]
      }
    ],
    projectTitle: 'Gen1Recomp (Trilogía Kanto)',
    method: 'STATIC_RECOMP',
    status: 'VERIFIED',
    author: 'bryanthaboi',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/147043867?s=200&v=4',
    repositoryUrl: 'https://github.com/bryanthaboi/gen1recomp',
    features: [
      'Motor nativo LÖVE2D / C++ para Red, Blue y Yellow',
      'Renderizado Voxel 3D opcional',
      'Soporte para múltiples resoluciones y pantallas panorámicas',
      'Audio remasterizado y carga instantánea'
    ],
    technicalNotes: 'Reimplementación y recompilación estática nativa del desensamblado de Game Boy Z80.',
    executablePath: 'E:\\Games\\Ports\\Pokemon Gen 1 Recomp\\gen1recomp.exe',
    installPath: 'E:\\Games\\Ports\\Pokemon Gen 1 Recomp'
  },
  {
    id: 'army-of-two',
    title: 'Army of Two',
    originalPlatform: 'Xbox 360',
    releaseYear: 2008,
    developer: 'EA Montreal / Electronic Arts',
    synopsis: 'Tyson Rios y Elliot Salem son dos contratistas militares privados (PMCs) que deben coordinar fuego cruzado, coberturas tácticas y aggro cooperativo para sobrevivir misiones de alto riesgo en zonas de conflicto global.',
    boxArtUrl: '/games/army-of-two/cover.jpg',
    portArtUrl: '/games/army-of-two/cover.jpg',
    projectTitle: 'Army of Two Recomp',
    method: 'STATIC_RECOMP',
    status: 'VERIFIED',
    author: 'ReXGlue Community',
    authorAvatarUrl: 'https://avatars.githubusercontent.com/u/10185966?s=200&v=4',
    repositoryUrl: 'https://github.com/recomp-dev/armyoftworecomp',
    features: [
      'Recompilación estática de PowerPC (Xbox 360) a código C++ nativo de 64 bits',
      'Renderizado D3D12 en Windows y Vulkan en Linux con escalado 2x/4K',
      'Soporte para 60 FPS sin desincronización de física',
      'Soporte nativo para mandos y modo cooperativo'
    ],
    technicalNotes: 'Recompilación binaria nativa ejecutando mediante el runtime REX con backend de GPU Xenos acelerado por hardware.',
    executablePath: 'E:\\Games\\Ports\\ARMY OF TWO\\Ao2-win64\\armyoftworecomp.exe',
    installPath: 'E:\\Games\\Ports\\ARMY OF TWO\\Ao2-win64'
  }
];
