const db = require('../db');

async function checkIngredients() {
  try {
    const [ingredients] = await db.query('SELECT IngredientID, Name FROM Ingredient LIMIT 20');
    console.log('Available Ingredients:');
    ingredients.forEach(ing => {
      console.log(`  ${ing.IngredientID}: ${ing.Name}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
}

checkIngredients();
