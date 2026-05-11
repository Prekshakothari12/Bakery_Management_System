/**
 * Check if Unit column exists in Ingredient table, and add if needed
 * Then populate with proper units based on ingredient type
 */

const db = require('../db');

const LIQUID_KEYWORDS = ['milk', 'water', 'oil', 'cream', 'honey', 'juice', 'extract', 'essence', 'vanilla', 'lemon', 'coconut'];
const COUNT_KEYWORDS = ['egg'];

async function fixIngredientUnits() {
  try {
    console.log('Checking Ingredient table structure...');
    
    // Check if Unit column exists
    const [columns] = await db.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Ingredient' AND COLUMN_NAME='Unit'");
    
    if (!columns.length) {
      console.log('Unit column not found. Adding it...');
      await db.query('ALTER TABLE Ingredient ADD COLUMN Unit VARCHAR(10) DEFAULT "g"');
      console.log('✓ Unit column added with default value "g"');
    } else {
      console.log('✓ Unit column already exists');
    }
    
    // Now update units based on ingredient name
    console.log('\nFetching all ingredients...');
    const [ingredients] = await db.query('SELECT IngredientID, Name FROM Ingredient');
    
    let updated = 0;
    for (const ing of ingredients) {
      const nameLower = ing.Name.toLowerCase();
      let unit = 'g'; // default to grams
      
      if (LIQUID_KEYWORDS.some(kw => nameLower.includes(kw))) {
        unit = 'ml';
      } else if (COUNT_KEYWORDS.some(kw => nameLower.includes(kw))) {
        unit = 'pcs';
      }
      
      await db.query('UPDATE Ingredient SET Unit = ? WHERE IngredientID = ?', [unit, ing.IngredientID]);
      console.log(`  ✓ ${ing.Name} -> ${unit}`);
      updated++;
    }
    
    console.log(`\n✅ Updated ${updated} ingredients successfully!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixIngredientUnits();
