export type CuriosityCategory =
  | 'game'
  | 'development'
  | 'technology'
  | 'character'
  | 'hardware'
  | 'easter_egg'
  | 'industry';

export interface Curiosity {
  id: string;
  title: string;
  text: string;
  categories: CuriosityCategory[];
  relatedGames?: string[];
  source: { label: string; url: string; kind: 'primary' | 'secondary' };
}

// Editorial seed from PortStation_Datos_Curiosos_v0.1.pdf. Keep this curated
// set distinct from In Memoriam and only expose entries with a cited source.
export const CURIOSITIES: Curiosity[] = [
  {
    id: 'F001', title: 'Mario empezó como Jumpman',
    text: 'Antes de convertirse en Mario, el personaje de Donkey Kong era conocido como Jumpman. Shigeru Miyamoto habló en entrevistas de Nintendo sobre el origen del personaje y las limitaciones gráficas que influyeron en su diseño inicial.',
    categories: ['character', 'game'], relatedGames: ['Donkey Kong', 'Super Mario'],
    source: { label: 'Nintendo — Iwata Asks: New Super Mario Bros. Wii', url: 'https://iwataasks.nintendo.com/interviews/wii/nsmb/0/0/', kind: 'primary' }
  },
  {
    id: 'F002', title: 'Los guantes de Mario ayudaban a leer sus movimientos',
    text: 'Los guantes blancos también cumplían una función visual: ayudaban a distinguir las manos y los movimientos del personaje con los gráficos de la época.',
    categories: ['character', 'development'], relatedGames: ['Super Mario'],
    source: { label: 'Nintendo — Iwata Asks: New Super Mario Bros. Wii', url: 'https://iwataasks.nintendo.com/interviews/wii/nsmb/0/1/', kind: 'primary' }
  },
  {
    id: 'F003', title: 'El overol de Mario separaba visualmente su cuerpo',
    text: 'El diseño del peto y la camisa de colores distintos ayudaba a separar el cuerpo del personaje y a que sus movimientos fueran legibles en pantalla.',
    categories: ['character', 'development'], relatedGames: ['Super Mario'],
    source: { label: 'Nintendo — Iwata Asks: New Super Mario Bros. Wii', url: 'https://iwataasks.nintendo.com/interviews/wii/nsmb/0/1/', kind: 'primary' }
  },
  {
    id: 'F004', title: 'Ocarina of Time se planeó primero para Nintendo 64DD',
    text: 'Durante una etapa inicial, el equipo consideró el 64DD. Las necesidades de almacenamiento y lectura de sus numerosas animaciones contribuyeron a que el juego terminara publicándose en cartucho para Nintendo 64.',
    categories: ['game', 'hardware', 'development'], relatedGames: ['The Legend of Zelda: Ocarina of Time'],
    source: { label: 'Nintendo — Iwata Asks: Ocarina of Time 3D', url: 'https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/4/', kind: 'primary' }
  },
  {
    id: 'F005', title: 'Link llegó a tener alrededor de 500 patrones básicos de movimiento',
    text: 'El equipo de Ocarina of Time creó unos 500 patrones básicos de movimiento para Link, además de combinaciones programadas. Esa cantidad de animaciones fue uno de los factores considerados al elegir el formato de distribución.',
    categories: ['technology', 'game'], relatedGames: ['The Legend of Zelda: Ocarina of Time'],
    source: { label: 'Nintendo — Iwata Asks: Ocarina of Time 3D', url: 'https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/4/', kind: 'primary' }
  },
  {
    id: 'F006', title: 'Ocarina of Time se retrasó respecto al plan inicial',
    text: 'El juego se había previsto inicialmente para finales de 1997. El desarrollo se extendió aproximadamente dos años y medio, y finalmente llegó en noviembre de 1998.',
    categories: ['development'], relatedGames: ['The Legend of Zelda: Ocarina of Time'],
    source: { label: 'Nintendo — Iwata Asks: Ocarina of Time 3D', url: 'https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/4/0/', kind: 'primary' }
  },
  {
    id: 'F007', title: 'La idea de montar a caballo precede a Ocarina of Time',
    text: 'El equipo ya había hablado de incluir un caballo durante el desarrollo de Super Mario 64, aunque la idea no se utilizó en ese juego y más tarde tomó forma en la aventura de Link.',
    categories: ['game', 'development'], relatedGames: ['Super Mario 64', 'The Legend of Zelda: Ocarina of Time'],
    source: { label: 'Nintendo — Iwata Asks: Ocarina of Time 3D', url: 'https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/4/', kind: 'primary' }
  },
  {
    id: 'F008', title: 'Ocarina of Time encontró su escala mientras se construía',
    text: 'Al inicio, el equipo no podía fijar con precisión el tamaño final del juego: la memoria disponible imponía límites. Primero desarrollaron sistemas y exploraron sus posibilidades antes de cerrar la escala de la aventura.',
    categories: ['development', 'technology'], relatedGames: ['The Legend of Zelda: Ocarina of Time'],
    source: { label: 'Nintendo — Iwata Asks: Ocarina of Time 3D', url: 'https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/4/0/', kind: 'primary' }
  },
  {
    id: 'F009', title: 'Super Mario 64 ayudó a explorar la cámara 3D',
    text: 'Mientras el equipo aprendía a construir acción en tres dimensiones, Yoshiaki Koizumi trabajó en aspectos como la cámara y el comportamiento del personaje: problemas de diseño que todavía no tenían una receta establecida.',
    categories: ['technology', 'development'], relatedGames: ['Super Mario 64'],
    source: { label: 'Nintendo — Iwata Asks: Super Mario Developers', url: 'https://iwataasks.nintendo.com/interviews/wii/mario25th/2/0/', kind: 'primary' }
  },
  {
    id: 'F010', title: 'En Super Mario 64 no había una fórmula para la acción 3D',
    text: 'El equipo tuvo que experimentar para descubrir cómo coordinar cámara, personaje y espacios tridimensionales. Varias convenciones de los juegos 3D todavía estaban por inventarse.',
    categories: ['development', 'technology'], relatedGames: ['Super Mario 64'],
    source: { label: 'Nintendo — Iwata Asks: Super Mario Developers', url: 'https://iwataasks.nintendo.com/interviews/wii/mario25th/2/0/', kind: 'primary' }
  },
  {
    id: 'F011', title: 'Splatoon empezó buscando una estructura de juego',
    text: 'El equipo explicó que al principio no intentaba inventar un personaje. Primero exploraba una estructura de juego distinta y luego construyó el concepto visual alrededor de ella.',
    categories: ['development'], relatedGames: ['Splatoon'],
    source: { label: 'Nintendo — Iwata Asks: Splatoon', url: 'https://iwataasks.nintendo.com/interviews/wiiu/splatoon/0/0/', kind: 'primary' }
  },
  {
    id: 'F012', title: 'The Wonderful 101 pasó por varias formas',
    text: 'En una versión temprana, los héroes estaban más dispersos y había elementos de estrategia. La mecánica de dibujar formaciones y convertirlas en ataques todavía no era el centro de la experiencia.',
    categories: ['development'], relatedGames: ['The Wonderful 101'],
    source: { label: 'Nintendo — Iwata Pregunta: The Wonderful 101', url: 'https://www.nintendo.com/es-es/Iwata-pregunta/Iwata-pregunta-The-Wonderful-101-Los-desarrolladores/The-Wonderful-101-Los-desarrolladores/3-Hacerlo-para-romperlo/3-Hacerlo-para-romperlo-798536.html', kind: 'primary' }
  },
  {
    id: 'F013', title: 'Donkey Kong Bananza investiga la destrucción con vóxeles',
    text: 'En su entrevista de desarrollo, Nintendo explicó cómo el equipo investigó tecnología basada en vóxeles para hacer posible la destrucción del entorno del juego.',
    categories: ['technology', 'development'], relatedGames: ['Donkey Kong Bananza'],
    source: { label: 'Nintendo — Ask the Developer: Donkey Kong Bananza', url: 'https://www.nintendo.com/es-es/Noticias/2025/julio/Pregunta-al-desarrollador-volumen-19-Donkey-Kong-Bananza-Capitulo-1-2871377.html', kind: 'primary' }
  },
  {
    id: 'F014', title: 'Battlefield 4 homenajea dos secretos clásicos',
    text: 'El productor David Sirland recordó dos easter eggs que lo habían impresionado: la cabeza oculta de John Romero en Doom II y el Dopefish de Quake.',
    categories: ['easter_egg'], relatedGames: ['Battlefield 4', 'Doom II', 'Quake'],
    source: { label: 'EA — Discover the Hidden Easter Eggs in EA Games', url: 'https://www.ea.com/news/discover-the-hidden-easter-eggs-in-ea-games', kind: 'primary' }
  },
  {
    id: 'F015', title: 'En Battlefield Hardline puedes conducir un sofá',
    text: 'El mapa Dustbowl esconde un sofá que puede usarse como vehículo. EA publicó el secreto como parte de una recopilación de easter eggs descubiertos por la comunidad.',
    categories: ['easter_egg'], relatedGames: ['Battlefield Hardline'],
    source: { label: 'EA — The Hardline Easter Egg Hunt', url: 'https://www.ea.com/games/battlefield/news/the-hardline-easter-egg-hunt', kind: 'primary' }
  },
  {
    id: 'F016', title: 'Hardline esconde recargas extremadamente raras',
    text: 'Algunas animaciones especiales de recarga tienen una probabilidad aproximada de una entre diez mil, según la publicación de EA sobre los secretos del juego.',
    categories: ['easter_egg'], relatedGames: ['Battlefield Hardline'],
    source: { label: 'EA — The Hardline Easter Egg Hunt', url: 'https://www.ea.com/games/battlefield/news/the-hardline-easter-egg-hunt', kind: 'primary' }
  },
  {
    id: 'F017', title: 'Monolith Productions nació en Kirkland en 1994',
    text: 'Fundado en octubre de 1994 en Washington, Monolith desarrolló juegos como F.E.A.R., Condemned y Middle-earth antes de cerrar en 2025. Esta es una referencia histórica; el homenaje editorial vive en In Memoriam.',
    categories: ['industry'], relatedGames: ['F.E.A.R.', 'Condemned', 'Middle-earth'],
    source: { label: 'MobyGames — History of Monolith Productions', url: 'https://www.mobygames.com/company/804/monolith-productions-inc/history/', kind: 'secondary' }
  },
  {
    id: 'F018', title: 'Westwood Studios fue fundada en 1985',
    text: 'Brett Sperry y Louis Castle fundaron Westwood Studios. El equipo se convirtió en una figura influyente en la estrategia en tiempo real y posteriormente fue adquirido por Electronic Arts.',
    categories: ['industry'], relatedGames: ['Command & Conquer', 'Dune II'],
    source: { label: 'MobyGames — History of Westwood Studios', url: 'https://www.mobygames.com/company/65/westwood-studios-inc/history/', kind: 'secondary' }
  }
];

export function getRandomCuriosity(excludeId?: string): Curiosity {
  const choices = CURIOSITIES.filter((item) => item.id !== excludeId);
  return choices[Math.floor(Math.random() * choices.length)] ?? CURIOSITIES[0];
}

export const CURIOSITY_CATEGORY_LABELS: Record<CuriosityCategory, string> = {
  game: 'Juego', development: 'Desarrollo', technology: 'Tecnología',
  character: 'Personaje', hardware: 'Hardware', easter_egg: 'Secreto', industry: 'Industria'
};
