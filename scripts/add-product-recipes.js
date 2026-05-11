const db = require('../db');

async function addRecipes() {
  console.log('START: Adding recipes...');
  try {
    console.log('Adding recipes for products...');

    // Recipes mapping: ProductName -> array of {id (IngredientID), qty}
    const recipes = {
      'Bread': [
        { id: 1, qty: 500 },     // Flour
        { id: 20, qty: 10 },     // Salt
        { id: 19, qty: 5 },      // Yeast
        { id: 17, qty: 300 }     // Milk
      ],
      'Brown Bread': [
        { id: 1, qty: 600 },     // Flour
        { id: 20, qty: 12 },     // Salt
        { id: 19, qty: 6 },      // Yeast
        { id: 17, qty: 350 }     // Milk
      ],
      'Bun Maska': [
        { id: 1, qty: 250 },     // Flour
        { id: 20, qty: 5 },      // Salt
        { id: 19, qty: 3 },      // Yeast
        { id: 4, qty: 50 },      // Butter
        { id: 17, qty: 150 }     // Milk
      ],
      'Garlic Bread': [
        { id: 1, qty: 500 },     // Flour
        { id: 20, qty: 10 },     // Salt
        { id: 19, qty: 5 },      // Yeast
        { id: 4, qty: 100 },     // Butter
        { id: 17, qty: 300 }     // Milk
      ],
      'Plain Tea Bun': [
        { id: 1, qty: 200 },     // Flour
        { id: 2, qty: 80 },      // Sugar
        { id: 20, qty: 4 },      // Salt
        { id: 19, qty: 3 },      // Yeast
        { id: 4, qty: 40 },      // Butter
        { id: 17, qty: 120 }     // Milk
      ],
      'Black Forest Cake': [
        { id: 1, qty: 300 },     // Flour
        { id: 2, qty: 250 },     // Sugar
        { id: 4, qty: 200 },     // Butter
        { id: 18, qty: 4 },      // Eggs
        { id: 5, qty: 50 },      // Cocoa Powder
        { id: 25, qty: 250 }     // Fresh Cream
      ],
      'Butter Cake': [
        { id: 1, qty: 350 },     // Flour
        { id: 2, qty: 300 },     // Sugar
        { id: 4, qty: 250 },     // Butter
        { id: 18, qty: 5 },      // Eggs
        { id: 23, qty: 10 }      // Vanilla Essence
      ],
      'Chocolate Cake': [
        { id: 1, qty: 300 },     // Flour
        { id: 2, qty: 250 },     // Sugar
        { id: 4, qty: 200 },     // Butter
        { id: 18, qty: 4 },      // Eggs
        { id: 5, qty: 60 },      // Cocoa Powder
        { id: 23, qty: 8 }       // Vanilla Essence
      ],
      'Tea Cake': [
        { id: 1, qty: 280 },     // Flour
        { id: 2, qty: 220 },     // Sugar
        { id: 4, qty: 180 },     // Butter
        { id: 18, qty: 3 },      // Eggs
        { id: 23, qty: 7 }       // Vanilla Essence
      ],
      'Brownie': [
        { id: 1, qty: 200 },     // Flour
        { id: 2, qty: 300 },     // Sugar
        { id: 4, qty: 180 },     // Butter
        { id: 18, qty: 3 },      // Eggs
        { id: 5, qty: 100 },     // Cocoa Powder
        { id: 24, qty: 150 }     // Chocolate Chips
      ],
      'Cupcake': [
        { id: 1, qty: 150 },     // Flour
        { id: 2, qty: 120 },     // Sugar
        { id: 4, qty: 100 },     // Butter
        { id: 18, qty: 2 },      // Eggs
        { id: 17, qty: 50 },     // Milk
        { id: 23, qty: 3 }       // Vanilla Essence
      ],
      'Croissant': [
        { id: 1, qty: 400 },     // Flour
        { id: 4, qty: 200 },     // Butter
        { id: 20, qty: 8 },      // Salt
        { id: 19, qty: 4 },      // Yeast
        { id: 17, qty: 180 }     // Milk
      ],
      'Donut': [
        { id: 1, qty: 250 },     // Flour
        { id: 2, qty: 150 },     // Sugar
        { id: 18, qty: 2 },      // Eggs
        { id: 21, qty: 80 },     // Oil
        { id: 22, qty: 10 },     // Baking Powder
        { id: 17, qty: 100 }     // Milk
      ],
      'Puff': [
        { id: 1, qty: 300 },     // Flour
        { id: 4, qty: 250 },     // Butter
        { id: 20, qty: 6 },      // Salt
        { id: 17, qty: 150 }     // Milk
      ],
      'Fruit Tart': [
        { id: 1, qty: 250 },     // Flour
        { id: 4, qty: 150 },     // Butter
        { id: 2, qty: 100 },     // Sugar
        { id: 18, qty: 2 },      // Eggs
        { id: 22, qty: 8 },      // Baking Powder
        { id: 26, qty: 100 }     // Dry Fruits
      ],
      'Vanilla Muffin': [
        { id: 1, qty: 200 },     // Flour
        { id: 2, qty: 150 },     // Sugar
        { id: 4, qty: 120 },     // Butter
        { id: 18, qty: 3 },      // Eggs
        { id: 17, qty: 80 },     // Milk
        { id: 23, qty: 5 },      // Vanilla Essence
        { id: 22, qty: 6 }       // Baking Powder
      ],
      'Almond Cookie': [
        { id: 1, qty: 180 },     // Flour
        { id: 4, qty: 130 },     // Butter
        { id: 2, qty: 120 },     // Sugar
        { id: 3, qty: 100 },     // Almonds
        { id: 18, qty: 2 },      // Eggs
        { id: 23, qty: 3 }       // Vanilla Essence
      ],
      'Choco Cookie': [
        { id: 1, qty: 200 },     // Flour
        { id: 4, qty: 140 },     // Butter
        { id: 2, qty: 130 },     // Sugar
        { id: 18, qty: 2 },      // Eggs
        { id: 5, qty: 40 },      // Cocoa Powder
        { id: 24, qty: 100 }     // Chocolate Chips
      ]
    };

    // Get all products
    const [products] = await db.query('SELECT ProductID, ProductName FROM Product WHERE IsActive = TRUE');
    
    let addedCount = 0;

    for (const product of products) {
      const recipeName = product.ProductName;
      
      // Check if product already has recipes
      const [existing] = await db.query(
        'SELECT COUNT(*) as count FROM ProductIngredient WHERE ProductID = ?',
        [product.ProductID]
      );

      if (existing[0].count > 0) {
        console.log(`♻️  ${recipeName} already has recipes, replacing...`);
        // Delete existing recipes first
        await db.query('DELETE FROM ProductIngredient WHERE ProductID = ?', [product.ProductID]);
      }

      const recipeItems = recipes[recipeName];
      
      if (!recipeItems) {
        console.log(`⏭️  No recipe found for "${recipeName}", skipping...`);
        continue;
      }

      // Add recipe items
      for (const item of recipeItems) {
        await db.query(
          'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
          [product.ProductID, item.id, item.qty]
        );
      }

      console.log(`✅ Added ${recipeItems.length} ingredients to "${recipeName}"`);
      addedCount++;
    }

    console.log(`\n✅ Recipes added successfully! (${addedCount} products updated)`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addRecipes();
