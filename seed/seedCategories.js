/**
 * Category Seeder (single-file flow with verbose logs)
 *
 * What it does:
 * - For each category (exact taxonomy), try ../uploads/temp/<ExactFile>.jpeg
 * - Compress -> upload a single JPEG to S3 -> set image_url on Category -> delete local temp(s)
 * - Upsert by 'name' (safe to re-run)
 * - Skips upload if image_url already exists AND no temp image present
 *
 * Usage:
 *  MONGODB_URI="mongodb://127.0.0.1:27017/royal_furnishings" node seed/seedCategories.js
 * Optional:
 *  VERBOSE=true  (prints per-step details)
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dotenv=require('dotenv').config();
const Product = require('../models/Product')
const Category = require('../models/Category');              // <-- adjust path if needed
const ImageProcessor = require('../utils/imageProcessor'); // <-- adjust path if needed
const S3Service = require('../utils/s3Service');           // <-- adjust path if needed

const VERBOSE = String(process.env.VERBOSE || 'false').toLowerCase() === 'true';
function log(...args) { if (VERBOSE) console.log(...args); }

// ---- Exact taxonomy (order preserved) ----
const TAXONOMY = [
  { name: 'Curtain', subcategories: ['Ring Curtain', 'American Pleat Curtains'], display_order: 1 },
  { name: 'Window Blinds', subcategories: ['Venetian Blinds',"Roller Blinds",'Roman Blinds',], display_order: 2 },
  { name: 'Wallpaper', subcategories: ['Regular', 'Roll Form Wallpaper','Textured'], display_order: 3 },
  {
  name: 'Mattresses',
  subcategories: [
    'Single Bed Mattress',
    'Double Bed Mattress',
    'Queen Bed Mattress',
    'King Bed Mattress',
    'Foam Mattress',
    'Coir Mattress',
    'Latex Mattress',
    'Spring Mattress',
    'Orthopedic Mattress',
    'Memory Foam Mattress',
    'Anti Sagging Mattress',
    'MSI Technology Mattress',
    'Back Support Mattress',
    'Innerspring Mattress',
    'Spine Comfort Mattress',

  ],
  display_order: 4
}
,
  { name: 'sofas', subcategories: [], display_order: 5 },
  {
  name: 'bedbacks',
  subcategories: [
    'Upholstered Bed Back',
    'Wooden Bed Back',
    'Tufted Bed Back',
    'Panel Bed Back',
    'Wingback Bed Back',
    'Leather / Leatherette Bed Back',
    'Fabric Bed Back'
  ],
  display_order: 6
}
,
  { name: 'Flooring', subcategories: ['Wooden Flooring', 'Vinyl Flooring'], display_order: 7 },{
  name: 'Bedsheet',
  subcategories: [
    'Cotton Bedsheets',
    'Linen',
    'Printed',
    'Embroidered'
  ],
  display_order: 8
},

  {
  name: 'Towel',
  subcategories: [
    'Bath Towels',
    'Hand Towels',
    'Face Towels',
    'Bath Sheets',
    'Gym Towels',
    'Kitchen Towels',
    'Beach Towels',
    'Hair Towels',
    'Guest Towels',
    'Microfiber Towels',
    'Baby Towels'
  ],
  display_order: 9
}
,
 {
  name: 'Comforters',
  subcategories: [
    'Cotton Comforter',
    'Microfibre Comforter',
    'Down Alternative Comforter', 
    'Reversible Comforter',
    'Printed Comforter',
    'Solid Comforter',
    'Single Size Comforter',
    'Double Size Comforter',
    'King Size Comforter',
    'Mild Winter Comforter',
    'All Season Comforter'
  ],
  display_order: 10
}
,
  { name: 'Mattress Protector', subcategories: ['Waterproof Mattress Protector'], display_order: 11 },
  { name: 'Doormat', subcategories: ['rubber door mat'], display_order: 12 },
  {
  name: 'Bedrunner',
  subcategories: [
    'cotton bedrunner',
    'polyester bedrunner',
    'acrylic bedrunner',
    'polypropylene bedrunner'
  ],
  display_order: 13
}
,{
  name: 'Pillow',
  subcategories: [
    'Memory Foam Pillow',
    'Hosta Pillow',
    'Chimera Pillow',
    'Petalz Pillow',
    'Sleepzz Pillow'
  ],
  display_order: 14
}
,
  { name: 'Chik Blinds', subcategories: ['Bamboo Blinds','Wooden Blinds'], display_order: 15 },
  {
  name: 'Blankets',
  subcategories: [
    'Microfiber Blanket',
    'Polyester Blanket',
    'Double Layered Blanket',
    'Sherpa Blanket',
    'Flannel Blanket'
  ],
  display_order: 16
},
{
  name: 'PVL Table Covers',
  subcategories: [
    'Textured',
    'Matte Finish',
    'Waterproof & Oil-Proof',
    'Anti-Slip PVC',
    'Heat-Resistant'
  ],
  display_order: 17
},
{
  name: 'Cushions',
  subcategories: [
    'Throw Cushions',
    'Sofa Cushions',
    'Chair Cushions',
    'Floor Cushions',
    'Printed Cushions',
    'Solid Cushions',
    'Velvet Cushions',
    'Cotton Cushions',
    'Microfiber Cushions',
    'Decorative Cushions'
  ],
  display_order: 18
}
,{
  name: 'Rugs',
  subcategories: [
    'Plains',
    'Abstract',
    'Classical',
    'Floral',
    'Stripes',
    'Ombre',
    'Geometric'
  ],
  display_order: 19
},{
  name: 'Yoga Mats',
  subcategories: [
    'PVC Yoga Mat',
    'TPE Yoga Mat',
    'Rubber Yoga Mat',
    'Cork Yoga Mat'
  ],
  display_order: 20
}
];

// ---- Name -> exact source filename in ../uploads/temp ----
const FILENAME_MAP = {
  'Curtain': 'cutain.jpg',
  'Window Blinds': 'window_blinds.jpg',
  'Wallpaper': 'wallpaper.jpg',
  'Mattresses': 'mattress.jpg',
  'sofas': 'sofas.jpg',
  'bedbacks': 'bedbacks.jpg',
  'Flooring': 'flooring.jpg',
  'Bedsheet': 'bedsheet.jpg',
  'Towel': 'towels.jpg',
  'Comforters': 'comforters.jpg',
  'Mattress Protector': 'matress_proctector.jpg',
  'Doormat': 'doormat.jpg',
  'Bedrunner': 'bedrunners.jpg',
  'Pillow': 'pillow.jpg',
  'Chik Blinds': 'chick_blinds.jpg',
  'Blankets': 'blankets.jpg',
  'PVL Table Covers': 'table_cover.jpg',
  'Cushions': 'cusions.jpg',
  'Rugs': 'rugs.jpg',
  'Yoga Mats': 'yoga_mat.jpg'
};



const INPUT_DIR = path.resolve(__dirname, '../uploads/temp');
const TMP_OUT_DIR = path.join(INPUT_DIR, '_processed');

// ---------- helpers ----------
function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function uploadCategoryImageSingle(catName) {
  const filename = FILENAME_MAP[catName];
  if (!filename) {
    log(`[img] ${catName}: no filename mapping`);
    return { url: null, reason: 'no-mapping' };
  }

  const srcPath = path.join(INPUT_DIR, filename);
  if (!fs.existsSync(srcPath)) {
    log(`[img] ${catName}: source not found at ${srcPath}`);
    return { url: null, reason: 'not-found', srcPath };
  }

  ensureDir(TMP_OUT_DIR);
  const keyBase = slugify(catName);
  const compressedPath = path.join(TMP_OUT_DIR, `${keyBase}.jpeg`);

  log(`[img] ${catName}: compress -> ${compressedPath}`);
  await ImageProcessor.compressImage(srcPath, compressedPath, { quality: 80, maxWidth: 1200, maxHeight: 1200 });

  // Upload single file to S3
  const s3Key = `categories/${keyBase}.jpeg`;
  log(`[img] ${catName}: S3 upload -> ${s3Key}`);
  const { url } = await S3Service.uploadFile(compressedPath, s3Key, 'image/jpeg');

  // Delete temp files after URL obtained
  try { fs.unlinkSync(srcPath); log(`[img] ${catName}: deleted source ${srcPath}`); } catch (_) {}
  try { fs.unlinkSync(compressedPath); log(`[img] ${catName}: deleted temp ${compressedPath}`); } catch (_) {}

  return { url };
}

// Mongoose result normalizer (because return shape changes by versions)
function normalizeUpdateResult(res) {
  const upserted = res.upsertedCount ?? res.upserted?.length ?? res.result?.nUpserted ?? 0;
  const modified = res.modifiedCount ?? res.nModified ?? res.result?.nModified ?? 0;
  const matched  = res.matchedCount ?? res.nMatched ?? res.result?.nMatched ?? 0;
  return { upserted, modified, matched };
}

// ---------- main ----------
(async function main() {
  try {
    console.log('Starting Category Seeder (single-file)…');
    console.log('Mongo URI:', process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/royal_furnishings');
    console.log('Input temp dir:', INPUT_DIR);

    // 1) Pre-flight checks
    if (!fs.existsSync(INPUT_DIR)) {
      console.warn(`⚠️ Temp dir not found: ${INPUT_DIR}`);
    } else {
      const seen = fs.readdirSync(INPUT_DIR);
      console.log(`Temp dir OK: found ${seen.length} file(s)`);
      if (VERBOSE) console.log('Files:', seen.join(', '));
    }

    // S3 bucket access check
    const bucketOk = await S3Service.checkBucketExists();
    if (!bucketOk) {
      console.error('❌ S3 bucket not accessible. Check AWS creds, region, and S3_BUCKET_NAME.');
      process.exit(1);
    }

    // 2) DB connect
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/royal_furnishings';
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // 3) Process each category
    let upserted = 0, modified = 0, skipped = 0;
    const missingImages = [];

    for (const item of TAXONOMY) {
      console.log(`\n→ Processing: ${item.name}`);

      // Check existing record first
      const existing = await Category.findOne({ name: item.name }).lean();
      log(`[db] existing?`, !!existing);

      // Only upload if we have a temp image OR existing has no image_url
      let image_url = existing?.image_url || null;

      // If there's a temp file present, we will upload a new one and overwrite image_url
      const expectedSrc = FILENAME_MAP[item.name] ? path.join(INPUT_DIR, FILENAME_MAP[item.name]) : null;
      const hasTemp = expectedSrc ? fs.existsSync(expectedSrc) : false;

      if (hasTemp) {
        const up = await uploadCategoryImageSingle(item.name);
        if (up.url) {
          image_url = up.url;
          log(`[img] ${item.name}: uploaded -> ${image_url}`);
        } else {
          log(`[img] ${item.name}: upload skipped/reason=${up.reason}`);
          if (up.reason === 'not-found' || up.reason === 'no-mapping') {
            missingImages.push(`${item.name} -> ${FILENAME_MAP[item.name] || '(no mapping)'}`);
          }
        }
      } else if (!image_url) {
        // No temp and no existing image_url
        log(`[img] ${item.name}: no temp image & no existing image_url`);
        if (!FILENAME_MAP[item.name]) {
          missingImages.push(`${item.name} -> (no mapping)`);
        } else {
          missingImages.push(`${item.name} -> ${FILENAME_MAP[item.name]} (not found)`);
        }
      }

      // Upsert category
      const update = {
        name: item.name,
        description: '',
        subcategories: item.subcategories,
        display_order: item.display_order,
        is_active: true
      };
      if (image_url) update.image_url = image_url;

      const res = await Category.updateOne(
        { name: item.name },
        { $set: update },
        { upsert: true }
      );

      const norm = normalizeUpdateResult(res);
      upserted += norm.upserted;
      modified += norm.modified;
      if (!norm.upserted && !norm.modified) skipped++;

      log(`[db] upserted:${norm.upserted} modified:${norm.modified} matched:${norm.matched}`);
    }

    // 4) Summary
    console.log('\n✅ Category seed complete.');
    console.log('Upserted:', upserted, '| Modified:', modified, '| Unchanged:', skipped);
    if (missingImages.length) {
      console.warn('\n⚠️ Missing image files (check spelling/case & location):');
      for (const line of missingImages) console.warn(' -', line);
    }

    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (err) {
    console.error('\n❌ FATAL:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
