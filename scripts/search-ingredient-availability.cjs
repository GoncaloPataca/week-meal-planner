#!/usr/bin/env node
/**
 * Searches ingredient availability across Portuguese supermarkets
 * for all recipes in pipeline/recipes/.
 *
 * Reliable APIs:
 *   - Auchan: demandware search (works, parseable)
 *   - Continente: SFCC search (works, parseable)
 *   - Pingo Doce / Lidl / Aldi: JS-rendered, not scrapeable
 *     → inferred from Auchan/Continente results + known heuristics
 */

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '../pipeline/recipes');
const DELAY_MS = 600;
const CACHE_FILE = path.join(__dirname, '../pipeline/ingredient-availability-cache.json');

// ─── Staples: available in ALL 5 stores, no need to search ───────────────────
const STAPLES = new Set([
  // proteins
  'egg', 'eggs', 'egg white', 'egg yolk', 'chicken', 'chicken thigh', 'chicken breast',
  'chicken mince', 'beef', 'beef mince', 'pork', 'pork mince', 'pork sausage', 'sausage',
  'bacon', 'bacon lardons', 'ham', 'salmon', 'salmon fillet', 'tuna', 'cod', 'prawn',
  'raw prawn', 'king prawns', 'raw peeled king prawn', 'mackerel', 'smoked mackerel',
  // dairy
  'butter', 'unsalted butter', 'salted butter', 'milk', 'whole milk', 'semi-skimmed milk',
  'skimmed milk', 'cream', 'single cream', 'double cream', 'yoghurt', 'natural yoghurt',
  'greek yoghurt', 'full-fat greek yoghurt', 'cream cheese', 'light cream cheese',
  'soft cheese', 'light soft cheese', 'cheddar cheese', 'extra mature cheddar',
  'mature cheddar cheese', 'mozzarella', 'grated mozzarella', 'parmesan', 'grated parmesan',
  'feta', 'reduced-fat feta', 'mascarpone', 'ricotta', 'brie', 'gruyère', 'manchego',
  'cottage cheese', 'light cottage cheese',
  // carbs
  'bread', 'pasta', 'rice', 'basmati rice', 'jasmine rice', 'long grain rice', 'sushi rice',
  'flour', 'plain flour', 'self raising flour', 'strong white bread flour', 'oats',
  'rolled oat', 'jumbo oat', 'sourdough', 'naan', 'pitta', 'wrap', 'tortilla',
  'flour tortilla', 'corn tortilla',
  // vegetables
  'onion', 'red onion', 'white onion', 'brown onion', 'spring onion', 'garlic',
  'garlic clove', 'carrot', 'potato', 'sweet potato', 'tomato', 'cherry tomatoes',
  'vine tomato', 'plum tomatoes', 'large tomato', 'cucumber', 'baby cucumber',
  'lettuce', 'iceberg lettuce', 'romaine lettuce', 'baby gem lettuce', 'sweet gem lettuce',
  'spinach', 'baby spinach', 'frozen spinach', 'frozen pea', 'pea', 'petit pois',
  'mushroom', 'chestnut mushroom', 'portobello mushroom', 'mixed mushroom',
  'porcini mushroom', 'pepper', 'red pepper', 'green bell pepper', 'red bell pepper',
  'yellow bell pepper', 'romano pepper', 'courgette', 'aubergine', 'broccoli',
  'tenderstem broccoli', 'cauliflower', 'leek', 'celery', 'stick celery', 'kale',
  'savoy cabbage', 'white cabbage', 'red cabbage', 'cabbage', 'sweetheart cabbage',
  'cavolo nero', 'hispi cabbage', 'asparagus', 'green bean', 'sugar snap pea',
  'mangetout', 'sweetcorn', 'frozen sweetcorn', 'cooked sweetcorn', 'corn', 'radish',
  'watercress', 'rocket', 'chard', 'fennel', 'bulb fennel', 'shallot', 'banana shallot',
  'avocado', 'butternut squash', 'baby corn', 'bean sprouts', 'beansprouts',
  'new potato', 'baby potato', 'maris piper potato',
  // fruit
  'lemon', 'lime', 'orange', 'apple', 'green apple', 'banana', 'ripe banana',
  'frozen banana', 'strawberry', 'frozen strawberry', 'blueberry', 'frozen blueberries',
  'raspberry', 'frozen raspberry', 'mango', 'frozen mango', 'pineapple', 'frozen pineapple',
  'kiwi', 'grape', 'blood orange', 'mixed berries', 'frozen mixed berries', 'fresh berries',
  'cherry', 'fig', 'rhubarb', 'dried currant', 'raisin', 'medjool date', 'pitted date',
  'pitted medjool dates',
  // pantry basics
  'salt', 'fine salt', 'sea salt', 'flaky sea salt', 'black pepper', 'olive oil',
  'extra virgin olive oil', 'vegetable oil', 'sunflower oil', 'coconut oil',
  'sugar', 'white sugar', 'brown sugar', 'caster sugar', 'soft light brown sugar',
  'icing sugar', 'honey', 'maple syrup', 'vinegar', 'white wine vinegar', 'red wine vinegar',
  'balsamic vinegar', 'apple cider vinegar',
  'tomato purée', 'tomato paste', 'passata', 'chopped tomatoes', 'canned tomatoes',
  'baked bean', 'butter beans', 'cannellini bean', 'kidney bean', 'black bean',
  'chickpeas', 'lentils', 'red lentil', 'puy lentil', 'brown lentil', 'bean',
  'drained cannellini beans', 'drained cooked black beans', 'drained cooked butter beans',
  'drained cooked cannellini beans', 'drained cooked chickpeas', 'drained cooked kidney beans',
  'drained cooked lentils', 'cooked lentil', 'cooked puy lentils',
  'chicken stock', 'vegetable stock', 'beef stock', 'chicken stock cube', 'vegetable stock cube',
  'stock', 'vegetable bouillon power',
  'coconut milk', 'light coconut milk',
  // herbs & spices
  'basil', 'fresh basil', 'dried basil', 'thyme', 'fresh thyme', 'dried thyme',
  'rosemary', 'fresh rosemary', 'oregano', 'dried oregano', 'fresh oregano',
  'parsley', 'fresh parsley', 'dried parsley', 'fresh flat leaf parsley',
  'coriander', 'fresh coriander', 'coriander seed', 'ground coriander',
  'cumin', 'cumin seed', 'cumin seeds', 'ground cumin',
  'paprika', 'smoked paprika', 'chilli', 'chilli flakes', 'chilli powder',
  'green chilli', 'red chilli', 'birds eye green chilli', 'chilli oil',
  'ginger', 'fresh ginger', 'ground ginger', 'ginger paste', 'cm ginger',
  'turmeric', 'ground turmeric', 'cinnamon', 'ground cinnamon', 'cinnamon stick',
  'nutmeg', 'ground nutmeg', 'bay leaf', 'dried bay leaf', 'clove',
  'cardamom pod', 'green cardamom pod', 'ground cardamom',
  'star anise', 'fennel seed', 'black peppercorn', 'chive', 'fresh chive',
  'dill', 'fresh dill', 'mint', 'fresh mint', 'sage', 'leaf sage', 'fresh sage',
  'fresh tarragon', 'nigella seed', 'mustard seeds', 'black mustard seed',
  'poppy seed', 'mixed spice', 'ground white pepper',
  'curry powder', 'garam masala', 'ras el hanout',
  // condiments (widely available)
  'soy sauce', 'light soy sauce', 'dark soy sauce', 'chinese dark soy sauce',
  'ketchup', 'tomato ketchup', 'mayonnaise', 'light mayonnaise', 'mustard',
  'dijon mustard', 'wholegrain mustard', 'english mustard', 'mustard powder',
  'worcestershire sauce', 'hot sauce', 'tabasco', 'sriracha', 'sweet chilli sauce',
  'oyster sauce', 'fish sauce', 'hoisin sauce', 'teriyaki sauce',
  'pesto', 'harissa paste', 'harissa powder',
  'tahini', 'hummus',
  // baking
  'baking powder', 'baking soda', 'bicarbonate of soda', 'dried instant yeast',
  'cocoa powder', 'dark chocolate', '70% dark chocolate', 'chocolate',
  'vanilla extract', 'vanilla essence',
  'almond', 'flaked almond', 'slivered almonds', 'toasted flaked almonds',
  'blanched hazelnuts', 'hazelnut', 'cashew nut', 'walnut', 'pecans',
  'peanut', 'salted peanuts', 'roasted peanuts',
  'sesame seeds', 'toasted sesame seed', 'toasted sesame seeds',
  'white sesame seed', 'black sesame seed', 'tabtbsp sesame seeds',
  'pine nuts', 'pistachio', 'mixed nuts', 'chopped nut',
  'pumpkin seed', 'sunflower seeds', 'mixed seeds',
  'breadcrumb', 'fresh breadcrumbs', 'panko breadcrumbs', 'golden breadcrumbs',
  // cheese (extras)
  'halloumi', 'paneer',
  // grains
  'couscous', 'giant couscous', 'bulgur wheat', 'pearl barley', 'quinoa',
  'spaghetti', 'fusilli', 'penne', 'rigatoni', 'orecchiette', 'macaroni',
  'orzo', 'conchiglie', 'conchiglioni', 'ditalini', 'campanelle', 'bucatini',
  'wholewheat pasta', 'durum wheat semolina pasta',
  // misc
  'water', 'boiling water', 'cold water', 'warm water', 'ice', 'ice cube',
  'white wine', 'red wine', 'lemon juice', 'lime juice', 'orange zest', 'lemon zest', 'lemon wedge', 'lime wedge',
  'olive', 'black olive', 'green olive', 'mixed olive', 'kalamata olives',
  'capers', 'cornichon', 'gherkin', 'pickle', 'sun-dried tomato',
  'tomato pasta sauce', 'salsa', 'piri piri seasoning',
  'chorizo', 'spicy chorizo', 'nduja',
  'butter brioche roll', 'brioche bun', 'bagel', 'english muffin', 'crumpet',
  'demi -baguette', 'flatbread', 'roti',
  'frozen hash brown', 'gnocchi', 'fresh lasagne sheet',
  'cornflour', 'pasta water', 'reserved butter bean liquid',
  'mixed herbs', 'dried mixed herbs', 'garlic powder', 'onion powder',
  'fajita seasoning', 'chargrilled chicken seasoning',
  'olive oil spray', 'vegetable oil spray',
  'instant coffee', 'freshly ground coffee', 'english breakfast teabag',
  'almond milk', 'unsweetened almond milk', 'oat milk', 'soya milk',
  'unsweetened soy milk', 'coconut yoghurt', 'vegan yoghurt',
  'vegan butter', 'vegan cheese', 'vegan cream cheese', 'vegan chocolate',
  'vegan mayonnaise',
  'protein powder', 'vanilla protein powder', 'chocolate protein powder',
  'plant-based protein powder', 'vegan vanilla protein powder',
  'granola', 'high-protein granola', 'crunchy nut cornflakes',
  'mixed cooked grains', 'cooked mixed grains', 'cooked quinoa',
  'microwavable brown rice', 'microwave rice', 'microwaveable basmati rice',
  'microwaveable quinoa pouch', 'cooked rice', 'cooked basmati rice',
  'cooked jasmine rice', 'cooked brown rice', 'cooked sushi rice',
  'cooked quinoa and rice', 'cooked chicken', 'cooked chicken breast',
  'cooked black beans', 'cooked butter beans', 'cooked kidney beans',
  'cooked lentils',
  // misc condiments
  'sour cream', 'crème fraîche', 'brown sauce', 'hp sauce',
  'mango chutney', 'lime pickle', 'chilli jam',
  'lemon curd', 'raspberry jam', 'strawberry jam', 'nutella',
  'biscoff spread', 'agave nectar',
  'crisps', 'prawn crackers',
  'rainbow slaw mix', 'stir-fry vegetable mix',
  'jarred grilled red peppers', 'jarred red pepper', 'roasted red pepper',
  'pickled red onion', 'pickled jalapeño', 'pickled guindilla chilli',
  'pickled jalapeño brine',
  'crispy fried onion', 'crispy shallot', 'fried shallot',
  // seeds
  'chia seed', 'hemp seeds', 'shelled hemp seeds', 'ground flaxseed',
  'whole flaxseed', 'milled flaxseed', 'oat bran',
  // misc packaged
  'apple & blueberry quaker oats sachet',
  'frozen dumplings', 'vegetable gyoza',
  'bread', 'slice bread', 'slice brown bread', 'slice seeded bread',
  'slice soft white bread', 'slice sourdough', 'slice crusty bread',
  'desiccated coconut', 'coconut flake', 'toasted coconut flake',
  'coconut milk', 'light coconut milk',
  // eggs (variants)
  'egg noodle', 'fresh berries', 'fresh fruit',
  'black treacle', 'pomegranate seeds',
  'za\'atar', 'sumac', 'lebanese 7-spice',
  // Korean/Asian basics widely found at Auchan
  'sesame oil', 'toasted sesame oil',
  'rice vinegar', 'rice wine vinegar',
  'mirin',
]);

// ─── Items known from previous research ────────────────────────────────────
const KNOWN = {
  'xo sauce': { continente: false, auchan: false, pingodoce: null, lidl: null, aldi: null },
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Searches Auchan for an ingredient.
 * Returns true (found), false (not found), or null (uncertain).
 */
async function searchAuchan(ingredient) {
  const url = `https://www.auchan.pt/on/demandware.store/Sites-AuchanPT-Site/pt_PT/Search-Show?q=${encodeURIComponent(ingredient)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    const text = await res.text();

    // Definitive not found
    if (/0 resultados/.test(text)) return false;
    if (/Não encontramos/.test(text)) return false;

    // Extract count
    const countMatch = text.match(/(\d+) resultado[s]? para/);
    const count = countMatch ? parseInt(countMatch[1]) : 0;
    if (count === 0) return false;

    // Extract product titles from result listings (### [Product Name])
    const titles = [];
    const titleRe = /###\s*\[([^\]]+)\]/g;
    let m;
    while ((m = titleRe.exec(text)) !== null) titles.push(m[1].toLowerCase());

    // Check if any title contains meaningful keywords from the ingredient
    const keywords = ingredient.toLowerCase()
      .replace(/[()]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['and', 'with', 'the', 'for', 'per', 'oil'].includes(w));

    if (keywords.length === 0) return count > 0 ? true : null;

    // For multi-word ingredients, require at least half the keywords to match
    const threshold = Math.max(1, Math.ceil(keywords.length * 0.5));
    const hasMatch = titles.some(title => {
      const matched = keywords.filter(kw => title.includes(kw)).length;
      return matched >= threshold;
    });

    return hasMatch ? true : false;
  } catch (e) {
    console.error(`  Auchan search error for "${ingredient}":`, e.message);
    return null;
  }
}

/**
 * Searches Continente for an ingredient.
 * Returns true, false, or null.
 */
async function searchContinente(ingredient) {
  const url = `https://www.continente.pt/pesquisa/?q=${encodeURIComponent(ingredient)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    });
    const text = await res.text();

    if (/Não encontramos resultados para/.test(text)) return false;
    if (/Encontramos 0 produto/.test(text)) return false;

    const countMatch = text.match(/Encontramos (\d+) produto[s]? para/);
    if (countMatch) {
      return parseInt(countMatch[1]) > 0 ? true : false;
    }

    // Check for product links as fallback
    if (text.includes('/produto/') && !text.includes('Não encontramos')) return true;

    return null;
  } catch (e) {
    console.error(`  Continente search error for "${ingredient}":`, e.message);
    return null;
  }
}

/**
 * Infer Pingo Doce availability from Auchan/Continente results.
 * PD has a similar mainstream range to Continente.
 */
function inferPingoDoce(auchan, continente) {
  if (auchan === true && continente !== false) return true;
  if (continente === true) return true;
  if (auchan === false && continente === false) return false;
  return null;
}

/**
 * Infer Lidl/Aldi availability (smaller, more limited range).
 * Only infer true if clearly mainstream.
 */
function inferDiscounter(auchan, continente) {
  if (auchan === true && continente === true) return true;
  if (auchan === false && continente === false) return false;
  return null;
}

async function main() {
  // Load cache
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log(`Loaded cache with ${Object.keys(cache).length} entries`);
  }

  // Merge known results into cache
  for (const [k, v] of Object.entries(KNOWN)) {
    cache[k] = v;
  }

  const files = fs.readdirSync(RECIPES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`Processing ${files.length} recipes...\n`);

  // First pass: collect all unique ingredients that need searching
  const ingredientsToSearch = new Set();
  for (const f of files) {
    const recipe = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, f), 'utf8'));
    const parsed = recipe.ingredientsParsed || [];
    for (const ing of parsed) {
      if (!ing.item) continue;
      const key = ing.item.toLowerCase().trim();
      if (STAPLES.has(key)) continue;
      if (cache[key] !== undefined) continue;
      ingredientsToSearch.add(key);
    }
  }

  console.log(`Found ${ingredientsToSearch.size} non-staple ingredients to search\n`);

  // Second pass: search each unique ingredient
  let searchCount = 0;
  for (const ingredient of ingredientsToSearch) {
    searchCount++;
    process.stdout.write(`[${searchCount}/${ingredientsToSearch.size}] Searching "${ingredient}"... `);

    await sleep(DELAY_MS);
    const auchan = await searchAuchan(ingredient);
    await sleep(DELAY_MS);
    const continente = await searchContinente(ingredient);

    const result = {
      continente,
      auchan,
      pingodoce: inferPingoDoce(auchan, continente),
      lidl: inferDiscounter(auchan, continente),
      aldi: inferDiscounter(auchan, continente),
    };

    cache[ingredient] = result;
    console.log(`auchan=${auchan} continente=${continente}`);

    // Save cache periodically
    if (searchCount % 10 === 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
      console.log(`  [cache saved]\n`);
    }
  }

  // Save final cache
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  console.log('\nAll searches complete. Writing availability to recipe files...\n');

  // Third pass: write ingredientAvailability to all recipe files
  const TODAY = new Date().toISOString().split('T')[0];
  let updated = 0;

  for (const f of files) {
    const filePath = path.join(RECIPES_DIR, f);
    const recipe = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const parsed = recipe.ingredientsParsed || [];

    if (parsed.length === 0) continue;

    const ingredients = {};
    for (const ing of parsed) {
      if (!ing.item) continue;
      const key = ing.item.toLowerCase().trim();

      if (STAPLES.has(key)) {
        ingredients[key] = {
          continente: true, auchan: true, pingodoce: true, lidl: true, aldi: true
        };
      } else if (cache[key]) {
        ingredients[key] = cache[key];
      } else {
        // Fallback: null for everything (shouldn't happen after search pass)
        ingredients[key] = {
          continente: null, auchan: null, pingodoce: null, lidl: null, aldi: null
        };
      }
    }

    recipe.ingredientAvailability = {
      searchedAt: TODAY,
      stores: ['continente', 'auchan', 'pingodoce', 'lidl', 'aldi'],
      ingredients,
    };

    fs.writeFileSync(filePath, JSON.stringify(recipe, null, 2));
    updated++;
    if (updated % 50 === 0) console.log(`  Written ${updated}/${files.length} files...`);
  }

  console.log(`\nDone. Updated ${updated} recipe files.`);
}

main().catch(console.error);
