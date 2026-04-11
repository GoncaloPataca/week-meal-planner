#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');
const RECIPES_DIR = path.join(ROOT, 'pipeline/recipes');
const MANIFEST_PATH = path.join(ROOT, 'pipeline/manifest.json');

const UNIT_SET = new Set(['g','kg','ml','l','tsp','tbsp','cup','oz','lb','bunch','handful','sprig','pinch','knob','can','jar','tin','pouch','block','fillet','stalk','head']);

function convertUnicodeFraction(s){
  if(!s) return s;
  return s.replace(/[½]/g,'0.5').replace(/[¼]/g,'0.25').replace(/[¾]/g,'0.75').replace(/[⅓]/g,'0.33').replace(/[⅔]/g,'0.67');
}

function extractParen(noteStr){
  const m = noteStr.match(/\(([^)]+)\)/);
  if(!m) return {text: noteStr, note: null, optional:false};
  const inside = m[1].trim();
  const optional = /optional/i.test(inside);
  const note = inside.replace(/\boptional\b\s*,?\s*/i,'').trim() || null;
  const cleaned = (noteStr.replace(m[0],'').trim()).replace(/\s+\s+/g,' ');
  return {text: cleaned, note, optional};
}

function parseIngredient(raw){
  let s = raw.trim();
  const {text, note, optional} = extractParen(s);
  s = text;
  s = convertUnicodeFraction(s);
  if(/\b(to taste|q\.?b\.?|season to taste|a pinch)\b/i.test(raw)){
    return { amount: null, unit: null, item: s.replace(/\s+$/,'').trim(), ...(note?{note}:{}), ...(optional?{optional}:{}) };
  }
  let m = s.match(/^([0-9]+(?:\.[0-9]+)?)x\s*([0-9]+(?:\.[0-9]+)?)(g|ml)\b\s*(?:([A-Za-z]+)\s+)?(.*)$/i);
  if(m){
    const count = parseFloat(m[1]);
    const weight = parseFloat(m[2]);
    const unit = m[3].toLowerCase();
    const item = (m[5] || '').trim();
    return { amount: count * weight, unit, item: item || raw, ...(note?{note}:{}), ...(optional?{optional}:{}) };
  }
  m = s.match(/^([0-9]+(?:\.[0-9]+)?|0?\.[0-9]+)\s*([a-zA-Z]+)?\b\s*(.*)$/);
  if(m){
    let num = parseFloat(m[1]);
    const maybeUnit = (m[2] || '').toLowerCase();
    let rest = (m[3] || '').trim();
    if(UNIT_SET.has(maybeUnit)){
      return { amount: num, unit: maybeUnit, item: rest || raw.replace(m[0],'').trim() || rest, ...(note?{note}:{}), ...(optional?{optional}:{}) };
    }
    const r2 = rest.match(/^([a-zA-Z]+)\b\s*(.*)$/);
    if(r2 && UNIT_SET.has(r2[1].toLowerCase())){
      return { amount: num, unit: r2[1].toLowerCase(), item: (r2[2]||'').trim() || raw.replace(m[0],'').trim(), ...(note?{note}:{}), ...(optional?{optional}:{}) };
    }
    return { amount: num, unit: null, item: (maybeUnit + ' ' + rest).trim() || raw, ...(note?{note}:{}), ...(optional?{optional}:{}) };
  }
  m = s.match(/^\.(\d+)\s*([a-zA-Z]+)?\b\s*(.*)$/);
  if(m){
    const num = parseFloat('0.' + m[1]);
    const maybeUnit = (m[2]||'').toLowerCase();
    const rest = (m[3]||'').trim();
    if(UNIT_SET.has(maybeUnit)) return { amount: num, unit: maybeUnit, item: rest || raw, ...(note?{note}:{}), ...(optional?{optional}:{}) };
    return { amount: num, unit: null, item: ((maybeUnit+' '+rest).trim()||raw), ...(note?{note}:{}), ...(optional?{optional}:{}) };
  }
  m = s.match(/^([0-9\.]+)\s*([a-zA-Z]+)?\s*(.*)$/);
  if(m && !isNaN(parseFloat(m[1]))){
    const num = parseFloat(m[1]);
    const maybeUnit = (m[2]||'').toLowerCase();
    const rest = (m[3]||'').trim();
    if(UNIT_SET.has(maybeUnit)) return { amount: num, unit: maybeUnit, item: rest || raw, ...(note?{note}:{}), ...(optional?{optional}:{}) };
    return { amount: num, unit: null, item: ((maybeUnit+' '+rest).trim()||raw), ...(note?{note}:{}), ...(optional?{optional}:{}) };
  }
  m = s.match(/^([0-9]+(?:\.[0-9]+)?)x\s*(.*)$/i);
  if(m){
    const count = parseFloat(m[1]);
    const item = (m[2]||'').trim();
    return { amount: count, unit: null, item: item || raw, ...(note?{note}:{}), ...(optional?{optional}:{}) };
  }
  return { amount: null, unit: null, item: s || raw, ...(note?{note}:{}), ...(optional?{optional}:{}) };
}

function placeAfterIngredients(obj, parsed){
  const out = {};
  for(const k of Object.keys(obj)){
    out[k] = obj[k];
    if(k === 'ingredients'){
      out['ingredientsParsed'] = parsed;
    }
  }
  return out;
}

(function main(){
  const argv = process.argv.slice(2);
  let batch = 10;
  let doAll = false;
  for(const a of argv){
    if(a === '--all') doAll = true;
    const m = a.match(/^--batch=(\d+)$/);
    if(m) batch = parseInt(m[1],10);
  }

  const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json')).sort();
  const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH,'utf8')) : {};

  // Build candidate list: prefer manifest flag; fall back to absence of in-file ingredientsParsed
  const candidates = [];
  for(const fname of files){
    const slug = path.basename(fname, '.json');
    const mEntry = manifest[slug];
    if(mEntry && mEntry.stages && mEntry.stages.structureIngredients) continue;
    const fpath = path.join(RECIPES_DIR, fname);
    try{
      const data = JSON.parse(fs.readFileSync(fpath,'utf8'));
      if(data.ingredientsParsed) continue;
    }catch(e){ /* include file if parsing failed */ }
    candidates.push(fname);
  }

  const toProcess = doAll ? candidates : candidates.slice(0, batch);
  let processed = 0;
  for(const fname of toProcess){
    const slug = path.basename(fname, '.json');
    const fpath = path.join(RECIPES_DIR, fname);
    const data = JSON.parse(fs.readFileSync(fpath,'utf8'));
    if(data.ingredientsParsed){
      console.log(`${slug}: already has ingredientsParsed — skipping`);
      continue;
    }
    const parsed = (data.ingredients || []).map(i => {
      try{ return parseIngredient(i); }catch(e){ return { amount:null, unit:null, item:i, parseWarning:true }; }
    });
    const out = placeAfterIngredients(data, parsed);
    fs.writeFileSync(fpath, JSON.stringify(out, null, 2) + '\n');
    if(!manifest[slug]) manifest[slug] = { slug, source: 'pipeline/recipes/'+fname, seededAt: new Date().toISOString(), stages: {} };
    manifest[slug].stages = manifest[slug].stages || {};
    manifest[slug].stages.structureIngredients = true;
    processed++;
    console.log(`Processed: ${slug}`);
  }
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nDone — processed ${processed} recipes.`);
})();