const db = require('../db');

async function seedFullData() {
  try {
    console.log('Seeding comprehensive bakery data...\n');
    
    // Clear existing data
    await db.query('DELETE FROM ProductIngredient');
    await db.query('DELETE FROM Product');
    await db.query('DELETE FROM Ingredient');
    await db.query('DELETE FROM Supplier');

    // ============ CREATE SUPPLIERS ============
    console.log('Creating suppliers...');
    const suppliers = [
      { name: 'Premium Flour Mills', address: 'Mumbai' },
      { name: 'Golden Sugar Co', address: 'Delhi' },
      { name: 'Dairy Fresh', address: 'Pune' },
      { name: 'Spice Master', address: 'Bangalore' },
      { name: 'Organic Farms', address: 'Goa' },
      { name: 'Eastern Suppliers', address: 'Kolkata' },
    ];

    const supplierIds = {};
    for (const supplier of suppliers) {
      const [result] = await db.query(
        'INSERT INTO Supplier (SupplierName, Address) VALUES (?, ?)',
        [supplier.name, supplier.address]
      );
      supplierIds[supplier.name] = result.insertId;
      console.log(`  ✓ ${supplier.name}`);
    }

    // ============ CREATE INGREDIENTS ============
    console.log('\nCreating ingredients...');
    const ingredients = [
      { name: 'Flour', unit: 'g', qty: 500, supplier: 'Premium Flour Mills' },
      { name: 'Sugar', unit: 'g', qty: 400, supplier: 'Golden Sugar Co' },
      { name: 'Butter', unit: 'g', qty: 300, supplier: 'Dairy Fresh' },
      { name: 'Eggs', unit: 'pcs', qty: 60, supplier: 'Dairy Fresh' },
      { name: 'Milk', unit: 'ml', qty: 350, supplier: 'Dairy Fresh' },
      { name: 'Cocoa Powder', unit: 'g', qty: 150, supplier: 'Spice Master' },
      { name: 'Chocolate Chips', unit: 'g', qty: 200, supplier: 'Spice Master' },
      { name: 'Vanilla Extract', unit: 'ml', qty: 100, supplier: 'Spice Master' },
      { name: 'Yeast', unit: 'g', qty: 30, supplier: 'Premium Flour Mills' },
      { name: 'Baking Powder', unit: 'g', qty: 0, supplier: 'Premium Flour Mills' },
      { name: 'Salt', unit: 'g', qty: 50, supplier: 'Spice Master' },
      { name: 'Cinnamon', unit: 'g', qty: 40, supplier: 'Spice Master' },
      { name: 'Almonds', unit: 'g', qty: 0, supplier: 'Organic Farms' },
      { name: 'Walnuts', unit: 'g', qty: 80, supplier: 'Organic Farms' },
      { name: 'Oil', unit: 'ml', qty: 250, supplier: 'Golden Sugar Co' },
      { name: 'Honey', unit: 'ml', qty: 200, supplier: 'Organic Farms' },
      { name: 'Coffee Powder', unit: 'g', qty: 0, supplier: 'Spice Master' },
      { name: 'Cream', unit: 'ml', qty: 100, supplier: 'Dairy Fresh' },
      { name: 'Cheese', unit: 'g', qty: 120, supplier: 'Dairy Fresh' },
      { name: 'Jam', unit: 'ml', qty: 150, supplier: 'Eastern Suppliers' },
      { name: 'Custard Powder', unit: 'g', qty: 60, supplier: 'Spice Master' },
      { name: 'Black Pepper', unit: 'g', qty: 25, supplier: 'Spice Master' },
      { name: 'Cardamom', unit: 'g', qty: 30, supplier: 'Spice Master' },
      { name: 'Maida', unit: 'g', qty: 400, supplier: 'Premium Flour Mills' },
      { name: 'Condensed Milk', unit: 'ml', qty: 200, supplier: 'Dairy Fresh' },
    ];

    const ingredientIds = {};
    for (const ing of ingredients) {
      const supplierId = supplierIds[ing.supplier];
      const [result] = await db.query(
        'INSERT INTO Ingredient (Name, Unit, QuantityInStock, MinimumStockLevel, UnitPrice, SupplierID) VALUES (?, ?, ?, ?, ?, ?)',
        [ing.name, ing.unit, ing.qty, 50, 1.0, supplierId]
      );
      ingredientIds[ing.name] = result.insertId;
      console.log(`  ✓ ${ing.name}: ${ing.qty}${ing.unit} ${ing.qty === 0 ? '(OUT OF STOCK)' : ''}`);
    }

    // ============ CREATE PRODUCTS ============
    console.log('\nCreating products...');
    const products = [
      { name: 'Butter Bun', category: 'Bread', price: 45, weight: '100g', shelf: 2, qty: 25 },
      { name: 'White Bread', category: 'Bread', price: 120, weight: '500g', shelf: 3, qty: 15 },
      { name: 'Brown Bread', category: 'Bread', price: 140, weight: '500g', shelf: 3, qty: 0 }, // OUT
      { name: 'Multigrain Bread', category: 'Bread', price: 150, weight: '500g', shelf: 3, qty: 8 },
      { name: 'Garlic Bread', category: 'Bread', price: 200, weight: '300g', shelf: 2, qty: 12 },
      { name: 'Chocolate Cake', category: 'Cake', price: 350, weight: '1kg', shelf: 5, qty: 20 },
      { name: 'Vanilla Cake', category: 'Cake', price: 320, weight: '1kg', shelf: 5, qty: 18 },
      { name: 'Cheese Cake', category: 'Cake', price: 400, weight: '1kg', shelf: 5, qty: 0 }, // OUT
      { name: 'Black Forest Cake', category: 'Cake', price: 450, weight: '1kg', shelf: 4, qty: 10 },
      { name: 'Carrot Cake', category: 'Cake', price: 380, weight: '1kg', shelf: 5, qty: 6 },
      { name: 'Chocolate Chip Cookie', category: 'Cookie', price: 80, weight: '200g', shelf: 7, qty: 35 },
      { name: 'Oatmeal Cookie', category: 'Cookie', price: 75, weight: '200g', shelf: 7, qty: 28 },
      { name: 'Almond Cookie', category: 'Cookie', price: 100, weight: '200g', shelf: 7, qty: 0 }, // OUT
      { name: 'Butter Cookie', category: 'Cookie', price: 90, weight: '200g', shelf: 7, qty: 40 },
      { name: 'Vanilla Muffin', category: 'Muffin', price: 120, weight: '100g', shelf: 3, qty: 22 },
      { name: 'Chocolate Muffin', category: 'Muffin', price: 130, weight: '100g', shelf: 3, qty: 18 },
      { name: 'Blueberry Muffin', category: 'Muffin', price: 140, weight: '100g', shelf: 3, qty: 14 },
      { name: 'Croissant', category: 'Pastry', price: 180, weight: '80g', shelf: 2, qty: 16 },
      { name: 'Almond Croissant', category: 'Pastry', price: 220, weight: '100g', shelf: 2, qty: 0 }, // OUT (needs almonds)
      { name: 'Danish Pastry', category: 'Pastry', price: 150, weight: '80g', shelf: 2, qty: 20 },
      { name: 'Donut', category: 'Pastry', price: 60, weight: '50g', shelf: 1, qty: 32 },
      { name: 'Brownie', category: 'Dessert', price: 100, weight: '80g', shelf: 5, qty: 24 },
      { name: 'Cheesecake Slice', category: 'Dessert', price: 150, weight: '100g', shelf: 5, qty: 12 },
      { name: 'Tiramisu', category: 'Dessert', price: 180, weight: '100g', shelf: 4, qty: 10 },
      { name: 'Fruit Tart', category: 'Dessert', price: 200, weight: '120g', shelf: 3, qty: 8 },
      { name: 'Cupcake', category: 'Muffin', price: 100, weight: '60g', shelf: 2, qty: 36 },
      { name: 'Focaccia', category: 'Bread', price: 160, weight: '250g', shelf: 2, qty: 11 },
      { name: 'Sourdough', category: 'Bread', price: 200, weight: '400g', shelf: 4, qty: 7 },
      { name: 'Rye Bread', category: 'Bread', price: 180, weight: '500g', shelf: 4, qty: 9 },
    ];

    const productIds = {};
    for (const prod of products) {
      const productionCost = prod.price * 0.35; // 35% of selling price
      const [result] = await db.query(
        'INSERT INTO Product (ProductName, Category, SellingPrice, UnitWeight, ShelfLifeDays, QuantityInStock, ProductionCost, IsActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [prod.name, prod.category, prod.price, prod.weight, prod.shelf, prod.qty, productionCost, 1]
      );
      productIds[prod.name] = result.insertId;
      const status = prod.qty === 0 ? ' (OUT OF STOCK)' : '';
      console.log(`  ✓ ${prod.name}: ${prod.qty} units${status}`);
    }

    // ============ CREATE RECIPES ============
    console.log('\nLinking recipes...');
    const recipes = {
      'Butter Bun': [
        { ing: 'Flour', qty: 250 },
        { ing: 'Butter', qty: 50 },
        { ing: 'Sugar', qty: 40 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Yeast', qty: 5 },
        { ing: 'Salt', qty: 2 },
      ],
      'White Bread': [
        { ing: 'Flour', qty: 500 },
        { ing: 'Yeast', qty: 10 },
        { ing: 'Salt', qty: 5 },
        { ing: 'Oil', qty: 30 },
      ],
      'Brown Bread': [
        { ing: 'Flour', qty: 500 },
        { ing: 'Maida', qty: 300 },
        { ing: 'Yeast', qty: 10 },
        { ing: 'Salt', qty: 5 },
      ],
      'Multigrain Bread': [
        { ing: 'Flour', qty: 400 },
        { ing: 'Maida', qty: 200 },
        { ing: 'Yeast', qty: 8 },
        { ing: 'Salt', qty: 4 },
      ],
      'Garlic Bread': [
        { ing: 'Flour', qty: 300 },
        { ing: 'Butter', qty: 100 },
        { ing: 'Yeast', qty: 6 },
        { ing: 'Salt', qty: 3 },
      ],
      'Chocolate Cake': [
        { ing: 'Maida', qty: 300 },
        { ing: 'Sugar', qty: 250 },
        { ing: 'Butter', qty: 200 },
        { ing: 'Eggs', qty: 5 },
        { ing: 'Cocoa Powder', qty: 100 },
        { ing: 'Milk', qty: 200 },
      ],
      'Vanilla Cake': [
        { ing: 'Maida', qty: 300 },
        { ing: 'Sugar', qty: 250 },
        { ing: 'Butter', qty: 200 },
        { ing: 'Eggs', qty: 5 },
        { ing: 'Vanilla Extract', qty: 10 },
        { ing: 'Milk', qty: 200 },
      ],
      'Cheese Cake': [
        { ing: 'Maida', qty: 200 },
        { ing: 'Sugar', qty: 300 },
        { ing: 'Cream', qty: 400 },
        { ing: 'Cheese', qty: 200 },
        { ing: 'Eggs', qty: 4 },
      ],
      'Black Forest Cake': [
        { ing: 'Maida', qty: 300 },
        { ing: 'Sugar', qty: 250 },
        { ing: 'Butter', qty: 200 },
        { ing: 'Eggs', qty: 5 },
        { ing: 'Cocoa Powder', qty: 120 },
        { ing: 'Chocolate Chips', qty: 150 },
      ],
      'Carrot Cake': [
        { ing: 'Maida', qty: 300 },
        { ing: 'Sugar', qty: 250 },
        { ing: 'Oil', qty: 180 },
        { ing: 'Eggs', qty: 5 },
        { ing: 'Cinnamon', qty: 8 },
      ],
      'Chocolate Chip Cookie': [
        { ing: 'Maida', qty: 200 },
        { ing: 'Butter', qty: 150 },
        { ing: 'Sugar', qty: 150 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Chocolate Chips', qty: 100 },
        { ing: 'Vanilla Extract', qty: 5 },
      ],
      'Oatmeal Cookie': [
        { ing: 'Maida', qty: 180 },
        { ing: 'Butter', qty: 140 },
        { ing: 'Sugar', qty: 140 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Salt', qty: 2 },
      ],
      'Almond Cookie': [
        { ing: 'Maida', qty: 200 },
        { ing: 'Butter', qty: 150 },
        { ing: 'Sugar', qty: 150 },
        { ing: 'Almonds', qty: 100 }, // OUT OF STOCK INGREDIENT
        { ing: 'Eggs', qty: 2 },
      ],
      'Butter Cookie': [
        { ing: 'Maida', qty: 200 },
        { ing: 'Butter', qty: 180 },
        { ing: 'Sugar', qty: 150 },
        { ing: 'Eggs', qty: 2 },
      ],
      'Vanilla Muffin': [
        { ing: 'Maida', qty: 150 },
        { ing: 'Sugar', qty: 120 },
        { ing: 'Butter', qty: 80 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Milk', qty: 100 },
        { ing: 'Vanilla Extract', qty: 5 },
      ],
      'Chocolate Muffin': [
        { ing: 'Maida', qty: 150 },
        { ing: 'Sugar', qty: 130 },
        { ing: 'Butter', qty: 80 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Cocoa Powder', qty: 30 },
        { ing: 'Milk', qty: 100 },
      ],
      'Blueberry Muffin': [
        { ing: 'Maida', qty: 150 },
        { ing: 'Sugar', qty: 120 },
        { ing: 'Butter', qty: 80 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Milk', qty: 100 },
      ],
      'Croissant': [
        { ing: 'Maida', qty: 250 },
        { ing: 'Butter', qty: 200 },
        { ing: 'Sugar', qty: 50 },
        { ing: 'Salt', qty: 2 },
      ],
      'Almond Croissant': [
        { ing: 'Maida', qty: 250 },
        { ing: 'Butter', qty: 200 },
        { ing: 'Almonds', qty: 80 }, // OUT OF STOCK INGREDIENT
        { ing: 'Sugar', qty: 60 },
      ],
      'Danish Pastry': [
        { ing: 'Maida', qty: 200 },
        { ing: 'Butter', qty: 150 },
        { ing: 'Sugar', qty: 80 },
        { ing: 'Jam', qty: 50 },
      ],
      'Donut': [
        { ing: 'Maida', qty: 100 },
        { ing: 'Sugar', qty: 100 },
        { ing: 'Eggs', qty: 1 },
        { ing: 'Oil', qty: 80 },
      ],
      'Brownie': [
        { ing: 'Maida', qty: 150 },
        { ing: 'Sugar', qty: 200 },
        { ing: 'Butter', qty: 150 },
        { ing: 'Cocoa Powder', qty: 80 },
        { ing: 'Eggs', qty: 3 },
      ],
      'Cheesecake Slice': [
        { ing: 'Maida', qty: 100 },
        { ing: 'Cheese', qty: 150 },
        { ing: 'Sugar', qty: 120 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Cream', qty: 150 },
      ],
      'Tiramisu': [
        { ing: 'Maida', qty: 100 },
        { ing: 'Custard Powder', qty: 30 },
        { ing: 'Cream', qty: 150 },
        { ing: 'Coffee Powder', qty: 10 }, // OUT OF STOCK INGREDIENT
        { ing: 'Sugar', qty: 80 },
      ],
      'Fruit Tart': [
        { ing: 'Maida', qty: 150 },
        { ing: 'Butter', qty: 100 },
        { ing: 'Sugar', qty: 100 },
        { ing: 'Cream', qty: 100 },
      ],
      'Cupcake': [
        { ing: 'Maida', qty: 100 },
        { ing: 'Sugar', qty: 100 },
        { ing: 'Butter', qty: 80 },
        { ing: 'Eggs', qty: 2 },
        { ing: 'Vanilla Extract', qty: 3 },
      ],
      'Focaccia': [
        { ing: 'Flour', qty: 300 },
        { ing: 'Oil', qty: 50 },
        { ing: 'Salt', qty: 5 },
        { ing: 'Yeast', qty: 5 },
      ],
      'Sourdough': [
        { ing: 'Flour', qty: 400 },
        { ing: 'Yeast', qty: 8 },
        { ing: 'Salt', qty: 4 },
      ],
      'Rye Bread': [
        { ing: 'Flour', qty: 400 },
        { ing: 'Maida', qty: 100 },
        { ing: 'Yeast', qty: 8 },
        { ing: 'Salt', qty: 4 },
      ],
    };

    let recipeCount = 0;
    for (const [prodName, items] of Object.entries(recipes)) {
      const productId = productIds[prodName];
      if (!productId) continue;

      for (const item of items) {
        const ingredientId = ingredientIds[item.ing];
        if (!ingredientId) {
          console.log(`  ⚠ Ingredient "${item.ing}" not found for ${prodName}`);
          continue;
        }
        await db.query(
          'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
          [productId, ingredientId, item.qty]
        );
        recipeCount++;
      }
    }
    console.log(`  ✓ Linked ${recipeCount} recipe items`);

    console.log('\n✅ Sample data seeded successfully!');
    console.log('\nSummary:');
    console.log(`  - ${Object.keys(supplierIds).length} suppliers`);
    console.log(`  - ${Object.keys(ingredientIds).length} ingredients (3 out of stock)`);
    console.log(`  - ${Object.keys(productIds).length} products (4 out of stock)`);
    console.log(`  - ${recipeCount} recipe relationships`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seedFullData();
