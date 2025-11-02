// seed/seedBanners.js
// Usage:
//   node seed/seedBanners.js
//   INPUT_DIR="D:\lavella-final-backend\uploads\temp" node seed/seedBanners.js  (Windows PowerShell: $env:INPUT_DIR="..."; node seed/seedBanners.js)

const path = require('path');
const fs = require('fs');
require('dotenv').config();

const mongoose = require('mongoose');

// your project modules
const dbConnect = require('../config/DBConnect');
const S3Service = require('../utils/s3Service');           // << moved to utils/
const ImageProcessor = require('../utils/imageProcessor'); // << moved to utils/
const Banner = require('../models/Banner');

// --- CONFIG ---
const INPUT_DIR = process.env.INPUT_DIR
  ? path.resolve(process.env.INPUT_DIR)
  : path.resolve(__dirname, '../uploads/temp'); // << default corrected
const TMP_OUT_DIR = path.resolve(__dirname, '../.tmp-banners');
const S3_PREFIX = 'banners';

if (!fs.existsSync(TMP_OUT_DIR)) fs.mkdirSync(TMP_OUT_DIR, { recursive: true });

// exact category IDs (yours)
const CATEGORY = {
  CURTAIN:       '69041cbd2d6caf07cf4fcb11',
  WINDOW_BLINDS: '69041cbe2d6caf07cf4fcb12',
  WALLPAPER:     '69041cbf2d6caf07cf4fcb13',
  MATTRESSES:    '69041ccb2d6caf07cf4fcb14',
  SOFAS:         '69041cd02d6caf07cf4fcb15',
  BEDBACKS:      '69041cd12d6caf07cf4fcb16',
  FLOORING:      '69041cd22d6caf07cf4fcb17',
  BEDSHEET:      '69041cd32d6caf07cf4fcb18',
  TOWEL:         '69041cd32d6caf07cf4fcb19',
  COMFORTER:     '69041cd42d6caf07cf4fcb1a',
  MATTRESS_PROT: '69041cd42d6caf07cf4fcb1b',
  DOORMAT:       '69041cd52d6caf07cf4fcb1c',
  BEDRUNNER:     '69041cd62d6caf07cf4fcb1d',
  PILLOW:        '69041cd72d6caf07cf4fcb1e',
};

// plan (regex matches handle spaces/case)
const PLAN = [
  { want: 'CURTAIN', title: 'Ring Curtains That Fall Perfectly', subtitle: 'Clean lines. Breezy drape. Your room, instantly calmer.', match: [/ring.*curtain/i, /curtain.*ring/i, /^curtain/i], slug: 'curtain-ring-hero' },
  { want: 'WALLPAPER', title: 'Wallpapers That Set the Mood', subtitle: 'From subtle textures to bold statements—start with your feature wall.', match: [/wallpaper/i], slug: 'wallpaper-regular-hero' },
  { want: 'SOFAS', title: 'Make the Sofa the Star', subtitle: 'Shape, fabric, and comfort that anchor your living room.', match: [/^sofa[s]?/i, /couch/i], slug: 'sofa-designer-hero' },
  { want: 'FLOORING', title: 'Wood Underfoot, Warmth Everywhere', subtitle: 'Durable finishes, timeless grains—designed to age beautifully.', match: [/floor/i, /flooring/i], slug: 'flooring-wood-hero' },
  { want: 'BEDSHEET', title: 'Cotton Sheets That Breathe', subtitle: 'Soft to touch, crisp to look—sleep the way you want.', match: [/bedsheet/i, /bed[-\s]?sheet/i], slug: 'bedsheet-cotton-hero' },
  { want: 'WINDOW_BLINDS', title: 'Light Control, Done Right', subtitle: 'Tilt, filter, and frame daylight with sleek Venetian blinds.', match: [/window.*blind/i, /^blind/i, /venetian/i], slug: 'blinds-venetian-hero' },
];

const VALID_EXT = /\.(jpe?g|png|webp)$/i;

function listDir(dir) {
  try { return fs.readdirSync(dir); } catch { return []; }
}
function findFileByPatterns(files, patterns) {
  const imgs = files.filter(f => VALID_EXT.test(f));
  return imgs.find(f => patterns.some(rx => rx.test(f)));
}
const slugify = s => String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)+/g,'');

async function ensureMongo() {
  if (typeof dbConnect === 'function') { await dbConnect(); return; }
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  await mongoose.connect(uri);
}

async function main() {
  console.log('▶ INPUT_DIR:', INPUT_DIR);
  const files = listDir(INPUT_DIR);
  if (!files.length) {
    console.log('⚠️  No files found in INPUT_DIR. Is the path correct?');
    return;
  }
  console.log('📂 Files:', files.join(', '));

  console.log('▶ Checking S3 bucket access…');
  const ok = await S3Service.checkBucketExists();
  if (!ok) throw new Error('S3 bucket not accessible');

  console.log('▶ Connecting to Mongo…');
  await ensureMongo();
  console.log('✅ Mongo connected');

  if (!fs.existsSync(TMP_OUT_DIR)) fs.mkdirSync(TMP_OUT_DIR, { recursive: true });

  const results = [];

  for (const item of PLAN) {
    const categoryId = CATEGORY[item.want];
    const matched = findFileByPatterns(files, item.match);
    if (!matched) {
      console.warn(`⚠️  Skipping: no file matched for ${item.want} (${item.match.map(r=>r.toString()).join(', ')})`);
      continue;
    }

    const inputPath = path.join(INPUT_DIR, matched);
    const outName = `compressed-${slugify(item.slug)}.jpg`;
    const outPath = path.join(TMP_OUT_DIR, outName);

    console.log(`→ Compressing "${matched}" → ${outName}`);
    await ImageProcessor.compressImage(inputPath, outPath, { maxWidth: 3840, maxHeight: 1600, quality: 82 });

    const s3Key = `${S3_PREFIX}/${slugify(item.slug)}.jpg`;
    console.log(`→ Uploading to S3: ${s3Key}`);
    const upload = await S3Service.uploadFile(outPath, s3Key, 'image/jpeg');

    const doc = {
      title: item.title,
      subtitle: item.subtitle,
      category: categoryId,       // exact ID
      image_url: upload.url,
      is_active: true,
    };

    console.log('→ Inserting banner doc');
    const saved = await Banner.create(doc);
    results.push(saved);
  }

  console.log(`\n✅ Seeded ${results.length} banner(s)`);
  results.forEach(b => console.log(`- ${b.title} (${b.category}) -> ${b.image_url}`));
}

main()
  .then(() => { console.log('Done.'); process.exit(0); })
  .catch(err => { console.error('Seeder error:', err); process.exit(1); });
