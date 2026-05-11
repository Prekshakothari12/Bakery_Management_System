/**
 * Helper script to update ingredient units based on ingredient type
 * Liquids (milk, oil, water, etc) -> ml
 * Solids (flour, sugar, butter, etc) -> g
 * Count items (eggs) -> pcs
 * 
 * Run: node scripts/update-ingredient-units.js
 */

const db = require('../db');

const LIQUID_KEYWORDS = ['milk', 'water', 'oil', 'cream', 'honey', 'juice', 'extract', 'essence', 'vanilla', 'lemon', 'coconut milk'];
const SOLID_KEYWORDS = ['flour', 'sugar', 'butter', 'salt', 'powder', 'cocoa', 'baking', 'yeast', 'soda', 'spice', 'cinnamon', 'cardamom', 'almond', 'walnut', 'chocolate', 'fruit', 'jam'];
const COUNT_KEYWORDS = ['egg', 'eggs'];

async function updateIngredientUnits() {
  try {
    console.log('Fetching all ingredients...');
    const [ingredients] = await db.query('SELECT IngredientID, Name FROM Ingredient');
    
    let updated = 0;
    
    for (const ing of ingredients) {
      const nameLower = ing.Name.toLowerCase();
      let unit = 'g'; // default to grams for solids
      
      // Check if liquid
      if (LIQUID_KEYWORDS.some(kw => nameLower.includes(kw))) {
        unit = 'ml';
      }
      // Check if count item
      else if (COUNT_KEYWORDS.some(kw => nameLower.includes(kw))) {
        unit = 'pcs';
      }
      // Check if solid
      else if (!SOLID_KEYWORDS.some(kw => nameLower.includes(kw))) {
        // If not explicitly a solid, check for other liquid indicators
        if (nameLower.includes('syrup') || nameLower.includes('sauce')) unit = 'ml';
      }
      
      await db.query('UPDATE Ingredient SET Unit = ? WHERE IngredientID = ?', [unit, ing.IngredientID]);
      console.log(`✓ ${ing.Name} -> ${unit}`);
      updated++;
    }
    
    console.log(`\n✅ Updated ${updated} ingredients successfully!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating ingredients:', err.message);
    process.exit(1);
  }
}

updateIngredientUnits();