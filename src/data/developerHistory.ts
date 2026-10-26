export interface DeveloperHistoryRecord {
  studioName: string;
  years: string;
  statusLabel: string;
  notes: string;
  sources: Array<{ label: string; url: string }>;
}

type HistoryEntry = { aliases: string[]; record: DeveloperHistoryRecord };

const article = (label: string, slug: string) => ({
  label,
  url: `https://en.wikipedia.org/wiki/${slug}`,
});

// Curated, source-linked historical identities. Keep aliases specific: a
// studio closure must never accidentally memorialize a still-active parent.
const HISTORY: HistoryEntry[] = [
  {
    aliases: ['pacific coast power & light', 'pacific coast power and light', 'locomotive games', 'dt productions'],
    record: {
      studioName: 'Pacific Coast Power & Light → Locomotive Games', years: '1997–2008',
      statusLabel: 'Adquirido, renombrado y cerrado',
      notes: 'El equipo que desarrolló Road Rash 64 fue adquirido por THQ en 1999; trabajó como Pacific Coast Power & Light y luego cambió su nombre a Locomotive Games en 2005. THQ cerró el estudio en 2008. No debe confundirse con Angel Studios, que se convirtió en Rockstar San Diego.',
      sources: [
        { label: 'Video Game History Foundation: identidad y adquisición por THQ', url: 'https://library.gamehistory.org/agents/corporate_entities/887' },
        { label: 'Game Developer: historia de Locomotive Games', url: 'https://en.wikipedia.org/wiki/Locomotive_Games' },
      ],
    },
  },
  {
    aliases: ['magnetic fields / gremlin graphics', 'magnetic fields gremlin graphics', 'magnetic fields (software design)'],
    record: {
      studioName: 'Magnetic Fields · Gremlin Graphics', years: '1982–1999 · 1984–2003',
      statusLabel: 'Desarrollador y editora históricos',
      notes: 'Magnetic Fields (antes Mr Chip Software) desarrolló juegos como Lotus y Super Cars; Gremlin Graphics publicó varios de ellos. No eran el mismo estudio: Magnetic Fields dejó de publicar/desarrollar alrededor de 1999, mientras Gremlin fue adquirida por Infogrames en 1999, renombrada y cerrada como estudio en 2003.',
      sources: [
        { label: 'MobyGames: historia y créditos de Magnetic Fields', url: 'https://www.mobygames.com/company/571/magnetic-fields-software-design-ltd/' },
        { label: 'Historia académica de la industria británica (University of Reading)', url: 'https://centaur.reading.ac.uk/101839/1/innovation-in-the-british-video-game-industry-since-1978.pdf' },
      ],
    },
  },
  {
    aliases: ['visceral games', 'ea redwood shores'],
    record: {
      studioName: 'Visceral Games (antes EA Redwood Shores)', years: '1998–2017', statusLabel: 'Estudio cerrado',
      notes: 'Electronic Arts anunció el cierre del estudio en 2017. Antes se conocía como EA Redwood Shores; EA presentó el nombre Visceral Games en 2009.',
      sources: [
        { label: 'EA: anuncio del cierre', url: 'https://www.ea.com/news/an-update-on-the-visceral-star-wars-project' },
        { label: 'EA: cambio de nombre', url: 'https://news.ea.com/press-releases/press-releases-details/2009/EA-Unveils-Visceral-Games----New-Name-for-Award-Winning-EA-Redwood-Shores-Studio/default.aspx' },
      ],
    },
  },
  {
    aliases: ['monolith productions'],
    record: {
      studioName: 'Monolith Productions', years: '1994–2025', statusLabel: 'Estudio cerrado',
      notes: 'Warner Bros. Games cerró el estudio en febrero de 2025 y canceló Wonder Woman. No debe confundirse con otros estudios que también usan “Monolith” en su nombre.',
      sources: [article('Cobertura y comunicado de Warner Bros. Games', 'Warner_Bros._Games_cancels_Wonder_Woman,_shuts_down_Monolith_Productions,_Player_First_Games,_and_Warner_Bros._Games_San_Diego')],
    },
  },
  {
    aliases: ['hudson soft'],
    record: {
      studioName: 'Hudson Soft', years: '1973–2012', statusLabel: 'Absorbido por Konami',
      notes: 'Konami absorbió Hudson Soft Company en marzo de 2012; la entidad original terminó, aunque sus propiedades y legado continuaron.',
      sources: [{ label: 'Historia corporativa de Konami', url: 'https://www.konami.com/corporate/en/history/' }],
    },
  },
  {
    aliases: ['looking glass studios'],
    record: { studioName: 'LookingGlass Studios', years: '1990–2000', statusLabel: 'Estudio disuelto', notes: 'Influyente creador de Ultima Underworld, System Shock y Thief; cerró en 2000.', sources: [article('LookingGlass Studios', 'LookingGlass_Studios')] },
  },
  {
    aliases: ['westwood studios', 'westwood associates'],
    record: { studioName: 'Westwood Studios', years: '1985–2003', statusLabel: 'Integrado y cerrado', notes: 'EA adquirió Westwood en 1998 y cerró el estudio en 2003; su legado incluye Dune II, Command & Conquer y Red Alert.', sources: [article('Westwood Studios', 'Westwood_Studios')] },
  },
  {
    aliases: ['bullfrog productions', 'bullfrog'],
    record: { studioName: 'Bullfrog Productions', years: '1987–2001', statusLabel: 'Marca retirada / integrada', notes: 'EA adquirió Bullfrog en 1995. La marca dejó de operar como estudio independiente y sus equipos se integraron en EA; no fue una desaparición instantánea tras la compra.', sources: [article('Bullfrog Productions', 'Bullfrog_Productions')] },
  },
  {
    aliases: ['origin systems', 'origin systems inc'],
    record: { studioName: 'Origin Systems', years: '1983–2004', statusLabel: 'Estudio cerrado', notes: 'EA cerró Origin Systems en 2004. Fue responsable de Ultima, Wing Commander y Privateer.', sources: [article('Origin Systems', 'Origin_Systems')] },
  },
  {
    aliases: ['black isle studios', 'black isle'],
    record: { studioName: 'Black Isle Studios', years: '1996–2003', statusLabel: 'Estudio cerrado', notes: 'Estudio de rol conocido por Fallout, Planescape: Torment e Icewind Dale. Interplay lo cerró en 2003; parte del talento fundó otros estudios.', sources: [article('Black Isle Studios', 'Black_Isle_Studios')] },
  },
  {
    aliases: ['ensemble studios'],
    record: { studioName: 'Ensemble Studios', years: '1995–2009', statusLabel: 'Estudio cerrado', notes: 'Microsoft anunció el cierre tras completar Halo Wars. El equipo creó Age of Empires y Age of Mythology.', sources: [article('Ensemble Studios', 'Ensemble_Studios')] },
  },
  {
    aliases: ['pandemic studios', 'pandemic'],
    record: { studioName: 'Pandemic Studios', years: '1998–2009', statusLabel: 'Estudio cerrado', notes: 'EA cerró Pandemic tras adquirirlo; desarrolló Star Wars Battlefront, Mercenaries, Destroy All Humans! y The Saboteur.', sources: [article('Pandemic Studios', 'Pandemic_Studios')] },
  },
  {
    aliases: ['lucasarts', 'lucasfilm games'],
    record: { studioName: 'LucasArts (desarrollo interno)', years: '1982–2013', statusLabel: 'Desarrollo interno cerrado · marca continúa', notes: 'Disney cerró el desarrollo interno en 2013 y pasó a licenciar las franquicias. Lucasfilm Games volvió después como marca editorial, así que no se considera desaparecida por completo.', sources: [article('LucasArts', 'LucasArts')] },
  },
  {
    aliases: ['clover studio', 'clover studio co'],
    record: { studioName: 'Clover Studio', years: '2004–2007', statusLabel: 'Subsidiaria disuelta', notes: 'Capcom disolvió Clover Studio; su legado incluye Ōkami, God Hand y Viewtiful Joe.', sources: [article('Clover Studio', 'Clover_Studio')] },
  },
  {
    aliases: ['psygnosis', 'studio liverpool', 'sce studio liverpool'],
    record: { studioName: 'Psygnosis / Studio Liverpool', years: '1984–2012', statusLabel: 'Renombrado y finalmente cerrado', notes: 'Psygnosis pasó a ser Sony Computer Entertainment Europe y luego Studio Liverpool; Sony cerró el estudio en 2012. No fue un único cambio de nombre, sino una sucesión de identidades.', sources: [article('Psygnosis', 'Psygnosis'), article('Studio Liverpool', 'Studio_Liverpool')] },
  },
  {
    aliases: ['irrational games', 'irrational games llc'],
    record: { studioName: 'Irrational Games', years: '1997–2014', statusLabel: 'Reorganizado', notes: 'En 2014 Ken Levine redujo drásticamente el estudio y anunció un equipo pequeño. No desapareció todo el grupo: parte del equipo continuó posteriormente como Ghost Story Games.', sources: [article('Irrational Games', 'Irrational_Games')] },
  },
  {
    aliases: ['bizarre creations'],
    record: { studioName: 'Bizarre Creations', years: '1988–2011', statusLabel: 'Estudio cerrado', notes: 'Activision cerró el estudio después de no encontrar comprador. Creó Project Gotham Racing, Geometry Wars y Blur.', sources: [article('Bizarre Creations', 'Bizarre_Creations')] },
  },
  {
    aliases: ['team bondi'],
    record: { studioName: 'Team Bondi', years: '2003–2011', statusLabel: 'Estudio cerrado', notes: 'Estudio australiano de L.A. Noire. Cerró en 2011; sus activos fueron adquiridos por Kennedy Miller Mitchell.', sources: [article('Team Bondi', 'Team_Bondi')] },
  },
  {
    aliases: ['evolution studios'],
    record: { studioName: 'Evolution Studios', years: '1999–2016', statusLabel: 'Estudio cerrado', notes: 'Sony cerró el estudio tras una reestructuración. Desarrolló World Rally Championship, MotorStorm y Driveclub.', sources: [article('Evolution Studios', 'Evolution_Studios')] },
  },
  {
    aliases: ['lionhead studios', 'lionhead'],
    record: { studioName: 'Lionhead Studios', years: '1997–2016', statusLabel: 'Estudio cerrado', notes: 'Microsoft anunció su cierre y canceló Fable Legends en 2016. Fue conocido por Fable, Black & White y The Movies.', sources: [article('Lionhead Studios', 'Lionhead_Studios')] },
  },
  {
    aliases: ['telltale games'],
    record: { studioName: 'Telltale Games (encarnación original)', years: '2004–2018', statusLabel: 'Original cerrada · marca resurgida', notes: 'La compañía original inició el cierre en 2018. La marca y algunos activos fueron adquiridos y dieron lugar a una nueva empresa; no es la misma organización ni el mismo equipo completo.', sources: [article('Telltale Games', 'Telltale_Games')] },
  },
  {
    aliases: ['volition', 'volition inc'],
    record: { studioName: 'Volition', years: '1993–2023', statusLabel: 'Estudio cerrado', notes: 'Embracer cerró Volition en 2023 tras una reestructuración. Desarrolló Descent, FreeSpace, Red Faction y Saints Row.', sources: [article('Volition (video game developer)', 'Volition_(video_game_developer)')] },
  },
  {
    aliases: ['free radical design'],
    record: { studioName: 'Free Radical Design', years: '1999–2014 · renacido 2021–2023', statusLabel: 'Cerrado, renacido y cerrado', notes: 'El estudio original cerró en 2014; una nueva encarnación abrió en 2021 y Embracer volvió a cerrarla en 2023. TimeSplitters es parte central de su legado.', sources: [article('Free Radical Design', 'Free_Radical_Design')] },
  },
  {
    aliases: ['arkane austin'],
    record: { studioName: 'Arkane Austin', years: '2010–2024', statusLabel: 'Estudio cerrado · Arkane Lyon continúa', notes: 'Microsoft cerró Arkane Austin en 2024. Este registro se limita a la sede de Austin: Arkane Lyon sigue siendo un estudio distinto y activo.', sources: [article('Arkane Studios', 'Arkane_Studios')] },
  },
  {
    aliases: ['ready at dawn'],
    record: { studioName: 'Ready at Dawn', years: '2003–2024', statusLabel: 'Estudio cerrado', notes: 'Meta cerró el estudio en 2024. Desarrolló Daxter, God of War: Chains of Olympus, The Order: 1886 y Lone Echo.', sources: [article('Ready at Dawn', 'Ready_at_Dawn')] },
  },
  {
    aliases: ['neversoft'],
    record: { studioName: 'Neversoft', years: '1994–2014', statusLabel: 'Integrado en Infinity Ward', notes: 'El estudio dejó de existir de forma independiente al integrarse con Infinity Ward. Su legado incluye Tony Hawk’s Pro Skater y Guitar Hero.', sources: [article('Neversoft', 'Neversoft')] },
  },
  {
    aliases: ['black rock studio', 'black rock studios'],
    record: { studioName: 'Black Rock Studio', years: '1998–2011', statusLabel: 'Estudio cerrado', notes: 'Disney cerró el estudio británico tras Pure y Split/Second.', sources: [{ label: 'Ars Technica: cierre de Black Rock', url: 'https://arstechnica.com/gaming/2011/07/pure-splitsecond-dev-black-rock-closed-by-disney/' }] },
  },
  {
    aliases: ['digital anvil'],
    record: { studioName: 'Digital Anvil', years: '1996–2006', statusLabel: 'Integrado y disuelto', notes: 'Microsoft redistribuyó al equipo y centralizó sus recursos; el estudio fue disuelto. Desarrolló Freelancer, Starlancer y Brute Force.', sources: [{ label: 'Game Developer: Microsoft confirma el cierre', url: 'https://www.gamedeveloper.com/game-platforms/microsoft-confirms-closure-of-digital-anvil' }] },
  },
  {
    aliases: ['human entertainment', 'human corporation'],
    record: { studioName: 'Human Entertainment', years: '1983–2000', statusLabel: 'Compañía disuelta', notes: 'La compañía japonesa quebró y se disolvió. Creó Clock Tower, Fire Pro Wrestling y Twilight Syndrome; varios exintegrantes fundaron nuevos equipos.', sources: [article('Human Entertainment', 'Human_Entertainment')] },
  },
  {
    aliases: ['silicon knights'],
    record: { studioName: 'Silicon Knights', years: '1992–2014', statusLabel: 'Compañía cerrada', notes: 'El estudio canadiense terminó sus operaciones tras su bancarrota. Desarrolló Eternal Darkness, Blood Omen: Legacy of Kain y Too Human.', sources: [article('Silicon Knights', 'Silicon_Knights')] },
  },
  {
    aliases: ['38 studios', '38 studios llc'],
    record: { studioName: '38 Studios', years: '2006–2012', statusLabel: 'Compañía quebrada', notes: 'La compañía quebró en 2012 después del lanzamiento de Kingdoms of Amalur: Reckoning. La franquicia y otros activos se vendieron posteriormente.', sources: [article('38 Studios', '38_Studios')] },
  },
  {
    aliases: ['acclaim entertainment', 'acclaim'],
    record: { studioName: 'Acclaim Entertainment', years: '1987–2004', statusLabel: 'Compañía quebrada · marca reutilizada', notes: 'La editora se declaró en bancarrota y cesó operaciones en 2004. La marca Acclaim reapareció bajo otros propietarios, así que este homenaje corresponde a la compañía original.', sources: [article('Acclaim Entertainment', 'Acclaim_Entertainment')] },
  },
  {
    aliases: ['sierra on-line', 'sierra online', 'sierra entertainment'],
    record: { studioName: 'Sierra On-Line / Sierra Entertainment', years: '1979–2008', statusLabel: 'Editorial cerrada · marca reutilizada', notes: 'Activision Blizzard cerró Sierra como editorial/desarrolladora en 2008; la marca se ha reutilizado desde entonces. No equivale a que todos los estudios que publicó desaparecieran.', sources: [article('Sierra Entertainment', 'Sierra_Entertainment')] },
  },
  {
    aliases: ['midway games', 'midway manufacturing', 'midway studios'],
    record: { studioName: 'Midway Games', years: '1958–2009', statusLabel: 'Compañía quebrada · activos absorbidos', notes: 'Midway solicitó protección por bancarrota en 2009 y vendió la mayor parte de sus activos a Warner Bros., incluido Mortal Kombat. Es una compañía/editora, no un único estudio.', sources: [{ label: 'Comunicado de Midway presentado ante la SEC', url: 'https://www.sec.gov/Archives/edgar/data/1022080/000095012309009497/c51466exv99w1.htm' }] },
  },
];

export function getDeveloperHistory(developer?: string | null): DeveloperHistoryRecord | undefined {
  const normalized = (developer || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return HISTORY.find(({ aliases }) => aliases.some((alias) => normalized.includes(alias)))?.record;
}
