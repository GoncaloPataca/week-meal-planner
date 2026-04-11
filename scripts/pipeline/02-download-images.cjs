const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

function parseArgs(argv) {
  const out = {};
  argv.forEach(a => {
    if (!a.startsWith('--')) return;
    const [k, v] = a.slice(2).split('=');
    out[k] = v === undefined ? true : v;
  });
  return out;
}

const opts = parseArgs(process.argv.slice(2));
const DRY = !opts.run && !opts.force;
const BATCH = opts.batch ? Number(opts.batch) : 10;
const SLUG = opts.slug || null;
const ALL = !!opts.all;

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'pipeline', 'manifest.json');
const RECIPES_DIR = path.join(ROOT, 'pipeline', 'recipes');
const OUT_DIR = path.join(ROOT, 'pipeline', 'images');

function readJSON(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function writeJSON(p,obj){ fs.writeFileSync(p, JSON.stringify(obj, null, 2)+'\n', 'utf8'); }

function findImageUrl(recipe){
  if (!recipe || typeof recipe !== 'object') return null;
  if (typeof recipe.image === 'string' && recipe.image) return recipe.image;
  if (typeof recipe.imageUrl === 'string' && recipe.imageUrl) return recipe.imageUrl;
  if (Array.isArray(recipe.images) && recipe.images.length && typeof recipe.images[0]==='string') return recipe.images[0];
  if (typeof recipe.photo === 'string' && recipe.photo) return recipe.photo;
  if (typeof recipe.thumbnail === 'string' && recipe.thumbnail) return recipe.thumbnail;
  return null;
}

function httpGet(url, maxRedirects = 5){
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && maxRedirects>0){
        res.resume();
        return resolve(httpGet(res.headers.location, maxRedirects-1));
      }
      if (res.statusCode !== 200) return reject(new Error('Status '+res.statusCode));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({buf: Buffer.concat(chunks), headers: res.headers}));
    });
    req.on('error', reject);
    req.setTimeout(20000, ()=>{ req.abort(); reject(new Error('Timeout')); });
  });
}

if (!fs.existsSync(MANIFEST_PATH)){
  console.error('manifest not found at', MANIFEST_PATH);
  process.exit(1);
}

const manifest = readJSON(MANIFEST_PATH);
const slugs = Object.keys(manifest).sort();

let candidates = slugs.filter(slug => {
  const entry = manifest[slug] || {};
  const done = entry.stages && entry.stages.downloadImages;
  if (SLUG) return slug === SLUG;
  if (ALL) return true;
  return !done;
});

if (candidates.length === 0){
  console.log('No candidates found (use --all or --slug).');
  process.exit(0);
}

console.log(`Found ${candidates.length} candidate(s) for image download.`);
if (DRY){
  console.log('Dry-run mode (no files will be downloaded). Add `--run` or `--force` to perform downloads.');
  console.log('Sample candidates:', candidates.slice(0, Math.min(10, candidates.length)).join(', '));
  process.exit(0);
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function processSlug(slug){
  try{
    const recipePath = path.join(RECIPES_DIR, slug + '.json');
    if (!fs.existsSync(recipePath)) throw new Error('recipe file missing');
    const recipe = readJSON(recipePath);
    const url = findImageUrl(recipe);
    if (!url) throw new Error('no image url found');
    const res = await httpGet(url);
    let ext = '.jpg';
    const ct = (res.headers['content-type']||'').split(';')[0];
    if (ct==='image/png') ext = '.png';
    else if (ct==='image/webp') ext = '.webp';
    else if (ct==='image/gif') ext = '.gif';
    else if (ct==='image/svg+xml') ext = '.svg';
    else {
      const uext = path.extname(new URL(url).pathname);
      if (uext) ext = uext;
    }
    const outPath = path.join(OUT_DIR, slug + ext);
    fs.writeFileSync(outPath, res.buf);
    recipe.imagePath = path.relative(ROOT, outPath);
    recipe.imageDownloaded = true;
    writeJSON(recipePath, recipe);
    manifest[slug].stages = manifest[slug].stages || {};
    manifest[slug].stages.downloadImages = true;
    console.log('Downloaded:', slug, '->', recipe.imagePath);
    return {slug, ok:true};
  }catch(err){
    console.warn('Failed:', slug, err.message || err);
    return {slug, ok:false, error: String(err)};
  }
}

(async ()=>{
  let processed = 0, succeeded=0, failed=0;
  for (const slug of candidates.slice(0, BATCH)){
    const r = await processSlug(slug);
    processed++;
    if (r.ok) succeeded++; else failed++;
  }
  writeJSON(MANIFEST_PATH, manifest);
  console.log(`Done. processed=${processed} succeeded=${succeeded} failed=${failed}`);
})();
