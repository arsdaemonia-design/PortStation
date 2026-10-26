const fs = require('fs');
const path = require('path');
const https = require('https');

const gamesDir = path.join(__dirname, '..', 'public', 'games');

const items = [
  {
    folder: 'twilight-princess',
    cover: 'https://art.gametdb.com/wii/cover/US/RZDE01.png',
    disc: 'https://art.gametdb.com/wii/disc/US/RZDE01.png'
  },
  {
    folder: 'jak-1',
    cover: 'https://www.arcadeartwork.org/galleries/SonyPlaystation2boxes/Jak-and-Daxter---The-Precursor-Legacy--USA-.png'
  },
  {
    folder: 'dantes-inferno',
    cover: 'https://art.gametdb.com/ps3/cover/US/BLUS30405.jpg'
  },
  {
    folder: 'bloody-roar-2',
    cover: 'https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation/master/Named_Boxarts/Bloody%20Roar%20II%20(USA).png'
  },
  {
    folder: 'dbz-budokai-3',
    cover: 'https://raw.githubusercontent.com/libretro-thumbnails/Sony_-_PlayStation_2/master/Named_Boxarts/Dragon%20Ball%20Z%20-%20Budokai%203%20(USA).png'
  },
  {
    folder: 'condemned-2',
    cover: 'https://art.gametdb.com/ps3/cover/US/BLUS30114.jpg'
  },
  {
    folder: 'pokemon-gen-1',
    cover: 'https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy/master/Named_Boxarts/Pokemon%20-%20Red%20Version%20(USA%2C%20Europe)%20(SGB%20Enhanced).png'
  }
];

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed ${url}: ${res.statusCode}`));
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', reject);
  });
}

async function run() {
  if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir, { recursive: true });

  for (const item of items) {
    const dir = path.join(gamesDir, item.folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (item.cover) {
      const ext = item.cover.endsWith('.jpg') ? 'cover.jpg' : 'cover.png';
      const dest = path.join(dir, ext);
      try {
        await download(item.cover, dest);
        console.log(`[OK COVER] ${item.folder} -> ${ext}`);
      } catch (e) {
        console.error(`[ERR COVER] ${item.folder}: ${e.message}`);
      }
    }

    if (item.disc) {
      const dest = path.join(dir, 'disc.png');
      try {
        await download(item.disc, dest);
        console.log(`[OK DISC] ${item.folder} -> disc.png`);
      } catch (e) {
        console.error(`[ERR DISC] ${item.folder}: ${e.message}`);
      }
    }
  }
}

run();
