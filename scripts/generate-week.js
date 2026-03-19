#!/usr/bin/env node

/**
 * Generate a week of random breakfasts and update meals.json
 * Usage: node scripts/generate-week.js [start-date] [--seed=123]
 * Example: node scripts/generate-week.js 2026-03-23 --seed=42
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Breakfast recipes data (copied from breakfastService.ts)
const breakfastRecipes = [
  { id: 1, name: "Panquecas de Banana e Aveia sem Glúten", ingredients: [{ amount: "2 unidades", name: "Banana madura" }, { amount: "1 xícara (80g)", name: "Aveia em flocos (certificada sem glúten)" }, { amount: "2 unidades", name: "Ovos" }, { amount: "1 colher de chá", name: "Canela em pó" }, { amount: "1 colher de chá", name: "Fermento em pó" }, { amount: "1 colher de sopa", name: "Óleo de coco" }, { amount: "1 pitada", name: "Sal" }], steps: ["Esmague as bananas num recipiente com um garfo.", "Adicione os ovos e bata bem.", "Junte a aveia, a canela, o fermento e o sal. Misture até obter uma massa homogénea.", "Aqueça uma frigideira antiaderente em lume médio com um pouco de óleo de coco.", "Despeje pequenas porções de massa (cerca de 1/4 xícara) na frigideira.", "Cozinhe por 2-3 minutos de cada lado até dourar.", "Sirva quente com frutos vermelhos ou manteiga de amêndoa."], tags: ["sem glúten", "sem lactose", "sem açúcar", "rápido", "pequeno-almoço"], calories: 375, prepTime: "5 min", cookTime: "10 min", servings: 2, url: "https://pequeno-almoco.chefantonioduarte.com/#panquecas-de-banana-e-aveia-sem-gluten", image: "/images/recipes/panquecas-banana-aveia.jpg" },
  { id: 2, name: "Overnight Oats de Frutos Vermelhos", ingredients: [{ amount: "1/2 xícara (40g)", name: "Aveia em flocos (certificada sem glúten)" }, { amount: "3/4 xícara (180ml)", name: "Leite de amêndoa sem açúcar" }, { amount: "1 colher de sopa", name: "Sementes de chia" }, { amount: "5 unidades", name: "Morangos frescos" }, { amount: "2 colheres de sopa", name: "Mirtilos" }, { amount: "1/2 colher de chá", name: "Canela em pó" }, { amount: "1/2 colher de chá", name: "Essência de baunilha" }], steps: ["Num frasco de vidro ou recipiente com tampa, coloque a aveia e as sementes de chia.", "Adicione o leite de amêndoa, a canela e a essência de baunilha.", "Mexa bem com uma colher para combinar todos os ingredientes.", "Corte os morangos em fatias finas e coloque metade dentro da mistura.", "Tampe o frasco e leve ao frigorífico por no mínimo 6 horas (idealmente durante a noite).", "Pela manhã, mexa a mistura. Se estiver muito espessa, adicione um pouco mais de leite.", "Decore com os morangos e mirtilos restantes por cima.", "Consuma frio, diretamente do frasco."], tags: ["sem glúten", "sem lactose", "sem açúcar", "sem forno", "pequeno-almoço"], calories: 220, prepTime: "5 min", cookTime: "0 min (repouso de 6-8h)", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#overnight-oats-de-frutos-vermelhos", image: "/images/recipes/overnight-oats.jpg" },
  { id: 4, name: "Smoothie Bowl Verde Energizante", ingredients: [{ amount: "2 xícaras (60g)", name: "Espinafres frescos" }, { amount: "1 unidade", name: "Banana congelada" }, { amount: "1/4 unidade", name: "Abacate maduro" }, { amount: "1/2 xícara (120ml)", name: "Leite de coco sem açúcar" }, { amount: "1 colher de sopa", name: "Sementes de cânhamo" }, { amount: "1 colher de sopa", name: "Sementes de abóbora" }, { amount: "1 colher de sopa", name: "Coco ralado sem açúcar" }, { amount: "1/2 unidade", name: "Kiwi fatiado" }], steps: ["Coloque os espinafres, a banana congelada, o abacate e o leite de coco no liquidificador.", "Bata em velocidade alta por 30-40 segundos até ficar completamente liso e cremoso.", "A consistência deve ser espessa, como um gelado macio.", "Despeje numa tigela.", "Decore com sementes de cânhamo, sementes de abóbora, coco ralado e fatias de kiwi.", "Consuma imediatamente."], tags: ["sem glúten", "sem lactose", "sem açúcar", "vegano", "pequeno-almoço", "rápido"], calories: 395, prepTime: "5 min", cookTime: "0 min", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#smoothie-bowl-verde-energizante", image: "/images/recipes/smoothie-bowl-verde.jpg" },
  { id: 6, name: "Panquecas de Batata-Doce e Canela", ingredients: [{ amount: "1 xícara (200g)", name: "Batata-doce cozida e amassada" }, { amount: "2 unidades", name: "Ovos" }, { amount: "1/2 xícara (40g)", name: "Farinha de aveia (certificada sem glúten)" }, { amount: "1 colher de chá", name: "Canela em pó" }, { amount: "1 colher de chá", name: "Fermento em pó" }, { amount: "3 colheres de sopa", name: "Leite de coco sem açúcar" }, { amount: "1 colher de chá", name: "Óleo de coco (para a frigideira)" }, { amount: "1 pitada", name: "Noz-moscada" }], steps: ["Num recipiente grande, misture a batata-doce amassada com os ovos.", "Adicione a farinha de aveia, a canela, a noz-moscada e o fermento. Misture bem.", "Acrescente o leite de coco aos poucos até obter uma consistência cremosa mas não líquida.", "Aqueça uma frigideira antiaderente em lume médio com óleo de coco.", "Despeje porções de massa (cerca de 1/4 xícara) e espalhe suavemente.", "Cozinhe por 3-4 minutos até aparecerem bolhas na superfície.", "Vire e cozinhe mais 2-3 minutos até dourar.", "Sirva quente."], tags: ["sem glúten", "sem lactose", "sem açúcar", "pequeno-almoço"], calories: 265, prepTime: "10 min", cookTime: "12 min", servings: 2, url: "https://pequeno-almoco.chefantonioduarte.com/#panquecas-de-batata-doce-e-canela", image: "/images/recipes/panquecas-batata-doce.jpg" },
  { id: 7, name: "Pudim de Chia com Manga Fresca", ingredients: [{ amount: "3 colheres de sopa (30g)", name: "Sementes de chia" }, { amount: "3/4 xícara (180ml)", name: "Leite de coco sem açúcar" }, { amount: "1/2 unidade", name: "Manga madura" }, { amount: "1/2 colher de chá", name: "Essência de baunilha" }, { amount: "1 colher de sopa", name: "Coco ralado sem açúcar" }, { amount: "3 folhas", name: "Hortelã fresca (decoração)" }], steps: ["Num frasco de vidro, misture as sementes de chia com o leite de coco e a essência de baunilha.", "Mexa vigorosamente por 30 segundos para evitar grumos.", "Tampe e leve ao frigorífico por no mínimo 4 horas (idealmente durante a noite).", "Após o tempo de repouso, mexa novamente — o pudim deve ter consistência firme e cremosa.", "Descasque a manga e corte em cubos pequenos.", "Distribua metade da manga no fundo de uma taça ou copo.", "Coloque o pudim de chia por cima e decore com os cubos restantes de manga, coco ralado e folhas de hortelã.", "Consuma frio."], tags: ["sem glúten", "sem lactose", "sem açúcar", "sem forno", "pequeno-almoço"], calories: 245, prepTime: "5 min", cookTime: "0 min (repouso de 4-6h)", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#pudim-de-chia-com-manga-fresca", image: "/images/recipes/pudim-chia-manga.jpg" },
  { id: 11, name: "Smoothie Cremoso de Abacate e Cacau", ingredients: [{ amount: "1/2 unidade", name: "Abacate maduro" }, { amount: "1 unidade", name: "Banana congelada" }, { amount: "2 colheres de sopa", name: "Cacau em pó puro (sem açúcar)" }, { amount: "1 xícara (240ml)", name: "Leite de amêndoa sem açúcar" }, { amount: "1 colher de sopa", name: "Sementes de chia" }, { amount: "3-4 cubos", name: "Gelo" }], steps: ["Coloque o abacate, a banana congelada, o cacau em pó e o leite de amêndoa no liquidificador.", "Adicione as sementes de chia e o gelo.", "Bata em velocidade alta por 40-50 segundos até ficar completamente cremoso.", "A consistência deve ser espessa como um batido.", "Sirva num copo alto.", "Consuma imediatamente para máximo frescor."], tags: ["sem glúten", "sem lactose", "sem açúcar", "vegano", "pequeno-almoço", "rápido"], calories: 345, prepTime: "5 min", cookTime: "0 min", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#smoothie-cremoso-de-abacate-e-cacau", image: "/images/recipes/smoothie-abacate-cacau.jpg" },
  { id: 12, name: "Tapioca Recheada com Ovo e Espinafres", ingredients: [{ amount: "3 colheres de sopa (45g)", name: "Goma de tapioca hidratada" }, { amount: "2 unidades", name: "Ovos" }, { amount: "1 xícara (30g)", name: "Espinafres frescos" }, { amount: "1 colher de chá", name: "Azeite extra-virgem" }, { amount: "1 dente", name: "Alho picado" }, { amount: "a gosto", name: "Sal e pimenta" }, { amount: "1/2 colher de chá", name: "Orégãos secos" }], steps: ["Aqueça uma frigideira antiaderente em lume médio.", "Espalhe a goma de tapioca uniformemente na frigideira formando um círculo fino.", "Deixe cozinhar 2-3 minutos até solidificar. Reserve.", "Na mesma frigideira, aqueça o azeite e refogue o alho por 30 segundos.", "Adicione os espinafres e salteie por 1-2 minutos até murchar.", "Bata os ovos com sal, pimenta e orégãos. Despeje na frigideira.", "Mexa suavemente por 2 minutos até os ovos ficarem cremosos.", "Coloque o recheio de ovo e espinafres sobre a tapioca.", "Dobre ao meio e sirva de imediato."], tags: ["sem glúten", "sem lactose", "sem açúcar", "rápido", "pequeno-almoço"], calories: 260, prepTime: "5 min", cookTime: "8 min", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#tapioca-recheada-com-ovo-e-espinafres", image: "/images/recipes/tapioca-ovo-espinafres.jpg" },
  { id: 15, name: "Papas de Aveia com Maçã Caramelizada e Nozes", ingredients: [{ amount: "1/2 xícara (40g)", name: "Aveia em flocos (certificada sem glúten)" }, { amount: "1 xícara (240ml)", name: "Leite de amêndoa sem açúcar" }, { amount: "1 unidade", name: "Maçã verde" }, { amount: "2 colheres de sopa", name: "Nozes partidas" }, { amount: "1 colher de chá", name: "Canela em pó" }, { amount: "1 colher de chá", name: "Óleo de coco" }, { amount: "1 pitada", name: "Sal" }], steps: ["Numa panela pequena, combine a aveia, o leite de amêndoa, meia colher de chá de canela e o sal.", "Cozinhe em lume médio-baixo, mexendo ocasionalmente, por 5-7 minutos até engrossar.", "Enquanto isso, corte a maçã em cubos pequenos.", "Numa frigideira pequena, derreta o óleo de coco e adicione os cubos de maçã.", "Polvilhe com a restante canela e cozinhe por 3-4 minutos até a maçã amolecer.", "Sirva as papas numa tigela, cubra com a maçã caramelizada e as nozes partidas.", "Consuma quente."], tags: ["sem glúten", "sem lactose", "sem açúcar", "pequeno-almoço"], calories: 310, prepTime: "5 min", cookTime: "10 min", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#papas-de-aveia-com-maca-caramelizada-e-nozes", image: "/images/recipes/papas-aveia-maca.jpg" },
  { id: 16, name: "Açaí Bowl Energizante com Granola", ingredients: [{ amount: "1 pacote (100g)", name: "Polpa de açaí congelada (sem açúcar)" }, { amount: "1 unidade", name: "Banana congelada" }, { amount: "1/4 xícara (60ml)", name: "Leite de coco sem açúcar" }, { amount: "1/2 unidade", name: "Banana fresca fatiada" }, { amount: "3 colheres de sopa", name: "Granola caseira sem glúten" }, { amount: "1 colher de sopa", name: "Coco em lascas sem açúcar" }, { amount: "1 colher de chá", name: "Sementes de chia" }], steps: ["Retire a polpa de açaí do congelador e parta-a em pedaços menores.", "Coloque a polpa de açaí, a banana congelada e o leite de coco no liquidificador.", "Bata em velocidade alta por 30-40 segundos. A consistência deve ser muito espessa, como um gelado macio.", "Se necessário, use a espátula para empurrar os ingredientes. Adicione leite aos poucos se estiver muito espesso.", "Transfira para uma tigela funda.", "Decore em fileiras: fatias de banana, granola, lascas de coco e sementes de chia.", "Consuma imediatamente — o açaí derrete rápido."], tags: ["sem glúten", "sem lactose", "sem açúcar", "vegano", "pequeno-almoço"], calories: 320, prepTime: "5 min", cookTime: "0 min", servings: 1, url: "https://pequeno-almoco.chefantonioduarte.com/#acai-bowl-energizante-com-granola", image: "/images/recipes/acai-bowl.jpg" },
  { id: 20, name: "Ovos Assados em Abacate", ingredients: [{ amount: "1 unidade grande", name: "Abacate maduro" }, { amount: "2 unidades pequenos", name: "Ovos" }, { amount: "4 unidades", name: "Tomates cereja" }, { amount: "1 colher de sopa", name: "Cebolinho picado" }, { amount: "1 colher de chá", name: "Azeite extra-virgem" }, { amount: "a gosto", name: "Sal e pimenta preta" }, { amount: "1 pitada", name: "Pimenta em flocos (opcional)" }], steps: ["Pré-aqueça o forno a 200°C.", "Corte o abacate ao meio e retire o caroço.", "Com uma colher, alargue ligeiramente o buraco do caroço para criar mais espaço.", "Coloque as metades de abacate numa forma de forno, apoiadas sobre papel de alumínio amassado para ficarem estáveis.", "Parta um ovo em cada metade de abacate.", "Tempere com sal e pimenta.", "Corte os tomates cereja ao meio e disponha à volta dos abacates.", "Leve ao forno por 12-15 minutos até a clara estar firme mas a gema ainda cremosa.", "Retire do forno e polvilhe com cebolinho picado e pimenta em flocos.", "Sirva imediatamente."], tags: ["sem glúten", "sem lactose", "sem açúcar", "pequeno-almoço", "rápido"], calories: 250, prepTime: "5 min", cookTime: "15 min", servings: 2, url: "https://pequeno-almoco.chefantonioduarte.com/#ovos-assados-em-abacate", image: "/images/recipes/ovos-abacate.jpg" }
];

// Seeded random number generator for deterministic randomness
class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

function parseDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function getNextMonday(fromDate) {
  const date = new Date(fromDate);
  const daysUntilMonday = (8 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  return date;
}

function generateMealEntry(breakfast) {
  return {
    id: `breakfast-${breakfast.id}`,
    label: "Morning",
    time: "08:00",
    title: breakfast.name,
    servings: breakfast.servings,
    prep: breakfast.prepTime,
    cook: breakfast.cookTime,
    tags: breakfast.tags,
    ingredients: breakfast.ingredients,
    steps: breakfast.steps,
    notes: `Pequeno-almoço do Chef António Duarte • ${breakfast.calories} calorias por porção`,
    url: breakfast.url,
    image: breakfast.image
  };
}

function generateWeek(startDate, seed = null) {
  const random = seed !== null ? new SeededRandom(seed) : null;
  const shuffled = random 
    ? random.shuffle(breakfastRecipes)
    : [...breakfastRecipes].sort(() => Math.random() - 0.5);
  
  const selectedBreakfasts = shuffled.slice(0, 7);
  const meals = {};
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateISO = formatDate(date);
    
    meals[dateISO] = [generateMealEntry(selectedBreakfasts[i])];
  }
  
  return meals;
}

function updateMealsJson(newMeals, options = {}) {
  const mealsPath = path.join(__dirname, '..', 'src', 'data', 'meals.json');
  
  let existingMeals = {};
  if (fs.existsSync(mealsPath)) {
    const content = fs.readFileSync(mealsPath, 'utf8');
    existingMeals = JSON.parse(content);
  }
  
  // Merge or replace existing meals
  if (options.replace) {
    // Replace only the dates in the new week
    Object.keys(newMeals).forEach(date => {
      existingMeals[date] = newMeals[date];
    });
  } else {
    // Default: keep existing entries, only add new ones
    Object.keys(newMeals).forEach(date => {
      if (!existingMeals[date]) {
        existingMeals[date] = newMeals[date];
      }
    });
  }
  
  // Sort by date
  const sortedMeals = Object.keys(existingMeals)
    .sort()
    .reduce((acc, key) => {
      acc[key] = existingMeals[key];
      return acc;
    }, {});
  
  fs.writeFileSync(mealsPath, JSON.stringify(sortedMeals, null, 2) + '\n', 'utf8');
  
  return sortedMeals;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    startDate: null,
    seed: null,
    replace: false,
    dryRun: false,
    help: false
  };
  
  args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--replace' || arg === '-r') {
      options.replace = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg.startsWith('--seed=')) {
      options.seed = parseInt(arg.split('=')[1]);
    } else if (!arg.startsWith('-')) {
      options.startDate = arg;
    }
  });
  
  return options;
}

function printHelp() {
  console.log(`
Generate Week - Meal Planner Script

Usage: node scripts/generate-week.js [start-date] [options]

Arguments:
  start-date        Starting date for the week (ISO format: YYYY-MM-DD)
                    If omitted, uses next Monday from today

Options:
  --seed=NUMBER     Use a seed for deterministic random selection (default: random)
  --replace, -r     Replace existing meals for these dates (default: keep existing)
  --dry-run, -d     Show what would be generated without writing to file
  --help, -h        Show this help message

Examples:
  node scripts/generate-week.js
  node scripts/generate-week.js 2026-03-23
  node scripts/generate-week.js 2026-03-23 --seed=42
  node scripts/generate-week.js --replace --seed=123
  node scripts/generate-week.js --dry-run
`);
}

// Main execution
function main() {
  const options = parseArgs();
  
  if (options.help) {
    printHelp();
    return;
  }
  
  try {
    // Determine start date
    let startDate;
    if (options.startDate) {
      startDate = parseDate(options.startDate);
    } else {
      startDate = getNextMonday(new Date());
    }
    
    console.log(`🍳 Generating breakfasts for week starting ${formatDate(startDate)}`);
    
    if (options.seed !== null) {
      console.log(`🎲 Using seed: ${options.seed} (deterministic)`);
    } else {
      console.log(`🎲 Using random selection`);
    }
    
    // Generate meals
    const newMeals = generateWeek(startDate, options.seed);
    
    // Display generated meals
    console.log('\n📅 Generated meals:\n');
    Object.entries(newMeals).forEach(([date, meals]) => {
      const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`  ${dayName}, ${date}: ${meals[0].title}`);
    });
    
    if (options.dryRun) {
      console.log('\n✨ Dry run - no files were modified');
      console.log('\nJSON output:');
      console.log(JSON.stringify(newMeals, null, 2));
    } else {
      // Update meals.json
      const updatedMeals = updateMealsJson(newMeals, options);
      console.log(`\n✅ Updated meals.json with ${Object.keys(newMeals).length} days`);
      
      if (options.replace) {
        console.log('   Existing meals for these dates were replaced');
      } else {
        console.log('   Existing meals were preserved');
      }
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
