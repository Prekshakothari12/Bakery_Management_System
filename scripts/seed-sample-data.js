const db = require('../db');

async function seedSampleData() {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    console.log('Seeding suppliers...');

    // Clear existing data to start fresh
    await conn.query('DELETE FROM ProductIngredient');
    await conn.query('DELETE FROM Product');
    await conn.query('DELETE FROM Ingredient');
    await conn.query('DELETE FROM Supplier');

    // Create suppliers
    const suppliers = [
      { name: 'Premium Flour Mills', phone: '9876543210' },
      { name: 'Golden Sugar Co', phone: '9876543211' },
      { name: 'Dairy Fresh', phone: '9876543212' },
      { name: 'Spice Master', phone: '9876543213' },
    ];

    const supplierMap = {};
    for (const sup of suppliers) {
      const [result] = await conn.query(
        'INSERT INTO Supplier (SupplierName, PhoneNumber) VALUES (?, ?)',
        [sup.name, sup.phone]
      );
      supplierMap[sup.name] = result.insertId;
      console.log(`  ✓ ${sup.name}`);
    }

    console.log('\nSeeding sample ingredients...');

    // Insert ingredients with supplier mapping
    const ingredients = [
      { Name: 'Flour', QuantityInStock: 500, MinimumStockLevel: 100, Unit: 'g', UnitPrice: 50, Supplier: 'Premium Flour Mills' },
      { Name: 'Sugar', QuantityInStock: 300, MinimumStockLevel: 50, Unit: 'g', UnitPrice: 60, Supplier: 'Golden Sugar Co' },
      { Name: 'Butter', QuantityInStock: 200, MinimumStockLevel: 50, Unit: 'g', UnitPrice: 200, Supplier: 'Dairy Fresh' },
      { Name: 'Eggs', QuantityInStock: 50, MinimumStockLevel: 10, Unit: 'pcs', UnitPrice: 5, Supplier: 'Dairy Fresh' },
      { Name: 'Chocolate Chips', QuantityInStock: 150, MinimumStockLevel: 30, Unit: 'g', UnitPrice: 150, Supplier: 'Spice Master' },
      { Name: 'Cocoa Powder', QuantityInStock: 100, MinimumStockLevel: 20, Unit: 'g', UnitPrice: 120, Supplier: 'Spice Master' },
      { Name: 'Vanilla Essence', QuantityInStock: 50, MinimumStockLevel: 10, Unit: 'ml', UnitPrice: 300, Supplier: 'Spice Master' },
      { Name: 'Milk', QuantityInStock: 200, MinimumStockLevel: 50, Unit: 'ml', UnitPrice: 40, Supplier: 'Dairy Fresh' },
      { Name: 'Yeast', QuantityInStock: 25, MinimumStockLevel: 5, Unit: 'g', UnitPrice: 100, Supplier: 'Premium Flour Mills' },
      { Name: 'Salt', QuantityInStock: 50, MinimumStockLevel: 10, Unit: 'g', UnitPrice: 20, Supplier: 'Spice Master' },
      // Out of stock example
      { Name: 'Almonds', QuantityInStock: 0, MinimumStockLevel: 50, Unit: 'g', UnitPrice: 500, Supplier: 'Spice Master' },
      // Low stock example
      { Name: 'Baking Powder', QuantityInStock: 15, MinimumStockLevel: 30, Unit: 'g', UnitPrice: 80, Supplier: 'Premium Flour Mills' },
    ];

    const ingMap = {};
    for (const ing of ingredients) {
      const supplierId = supplierMap[ing.Supplier] || null;
      const [result] = await conn.query(
        'INSERT INTO Ingredient (Name, QuantityInStock, MinimumStockLevel, Unit, UnitPrice, SupplierID) VALUES (?, ?, ?, ?, ?, ?)',
        [ing.Name, ing.QuantityInStock, ing.MinimumStockLevel, ing.Unit, ing.UnitPrice, supplierId]
      );
      ingMap[ing.Name] = result.insertId;
      console.log(`  ✓ ${ing.Name}: ${ing.QuantityInStock}${ing.Unit} (${ing.Supplier})`);
    }

    console.log('\nSeeding sample products with recipes...');

    // Products with recipes - IN STOCK
    const products = [
      {
        name: 'Butter Bun',
        cost: 15,
        price: 40,
        shelf: 3,
        weight: '100g',
        category: 'Bread',
        stock: 20,
        recipe: [
          { ing: 'Flour', qty: 100 },
          { ing: 'Butter', qty: 30 },
          { ing: 'Sugar', qty: 20 },
          { ing: 'Eggs', qty: 2 },
          { ing: 'Yeast', qty: 2 },
          { ing: 'Salt', qty: 2 },
        ]
      },
      {
        name: 'Chocolate Cookie',
        cost: 20,
        price: 50,
        shelf: 5,
        weight: '80g',
        category: 'Cookie',
        stock: 30,
        recipe: [
          { ing: 'Flour', qty: 80 },
          { ing: 'Butter', qty: 40 },
          { ing: 'Sugar', qty: 50 },
          { ing: 'Eggs', qty: 1 },
          { ing: 'Chocolate Chips', qty: 60 },
          { ing: 'Vanilla Essence', qty: 5 },
        ]
      },
      {
        name: 'Chocolate Cake',
        cost: 50,
        price: 180,
        shelf: 4,
        weight: '200g',
        category: 'Cake',
        stock: 10,
        recipe: [
          { ing: 'Flour', qty: 150 },
          { ing: 'Sugar', qty: 100 },
          { ing: 'Eggs', qty: 4 },
          { ing: 'Cocoa Powder', qty: 40 },
          { ing: 'Butter', qty: 60 },
          { ing: 'Milk', qty: 100 },
          { ing: 'Vanilla Essence', qty: 10 },
        ]
      },
      {
        name: 'Vanilla Muffin',
        cost: 25,
        price: 60,
        shelf: 3,
        weight: '120g',
        category: 'Muffin',
        stock: 15,
        recipe: [
          { ing: 'Flour', qty: 120 },
          { ing: 'Sugar', qty: 60 },
          { ing: 'Eggs', qty: 2 },
          { ing: 'Butter', qty: 50 },
          { ing: 'Milk', qty: 80 },
          { ing: 'Vanilla Essence', qty: 8 },
          { ing: 'Baking Powder', qty: 5 },
        ]
      },
      {
        name: 'Croissant',
        cost: 30,
        price: 80,
        shelf: 2,
        weight: '90g',
        category: 'Pastry',
        stock: 8,
        recipe: [
          { ing: 'Flour', qty: 100 },
          { ing: 'Butter', qty: 80 },
          { ing: 'Salt', qty: 2 },
          { ing: 'Sugar', qty: 20 },
        ]
      },
      {
        name: 'White Bread',
        cost: 20,
        price: 60,
        shelf: 3,
        weight: '250g',
        category: 'Bread',
        stock: 12,
        recipe: [
          { ing: 'Flour', qty: 200 },
          { ing: 'Yeast', qty: 5 },
          { ing: 'Salt', qty: 3 },
          { ing: 'Sugar', qty: 10 },
        ]
      },
      {
        name: 'Brownies',
        cost: 35,
        price: 100,
        shelf: 5,
        weight: '100g',
        category: 'Cookie',
        stock: 18,
        recipe: [
          { ing: 'Flour', qty: 80 },
          { ing: 'Sugar', qty: 100 },
          { ing: 'Butter', qty: 70 },
          { ing: 'Eggs', qty: 2 },
          { ing: 'Cocoa Powder', qty: 60 },
          { ing: 'Chocolate Chips', qty: 50 },
        ]
      },
      {
        name: 'Donut',
        cost: 15,
        price: 45,
        shelf: 2,
        weight: '80g',
        category: 'Pastry',
        stock: 25,
        recipe: [
          { ing: 'Flour', qty: 70 },
          { ing: 'Sugar', qty: 80 },
          { ing: 'Eggs', qty: 1 },
          { ing: 'Milk', qty: 50 },
          { ing: 'Baking Powder', qty: 3 },
        ]
      },
      {
        name: 'Vanilla Cake',
        cost: 45,
        price: 160,
        shelf: 4,
        weight: '200g',
        category: 'Cake',
        stock: 7,
        recipe: [
          { ing: 'Flour', qty: 150 },
          { ing: 'Sugar', qty: 100 },
          { ing: 'Eggs', qty: 4 },
          { ing: 'Butter', qty: 60 },
          { ing: 'Milk', qty: 100 },
          { ing: 'Vanilla Essence', qty: 12 },
          { ing: 'Baking Powder', qty: 5 },
        ]
      },
    ];

    for (const prod of products) {
      const [result] = await conn.query(
        'INSERT INTO Product (ProductName, ProductionCost, SellingPrice, ShelfLifeDays, UnitWeight, Category, IsActive, QuantityInStock) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)',
        [prod.name, prod.cost, prod.price, prod.shelf, prod.weight, prod.category, prod.stock]
      );
      const productId = result.insertId;

      // Add recipe items
      for (const recItem of prod.recipe) {
        const ingId = ingMap[recItem.ing];
        if (ingId) {
          await conn.query(
            'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
            [productId, ingId, recItem.qty]
          );
        }
      }
      console.log(`  ✓ ${prod.name}: ${prod.stock} in stock`);
    }

    // OUT OF STOCK product example
    console.log('\nSeeding out-of-stock product...');
    const [result] = await conn.query(
      'INSERT INTO Product (ProductName, ProductionCost, SellingPrice, ShelfLifeDays, UnitWeight, Category, IsActive, QuantityInStock) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)',
      ['Almond Tart', 60, 200, 4, '150g', 'Pastry', 0]
    );
    const outOfStockId = result.insertId;
    
    // Add recipe for out of stock product
    const almondRecipe = [
      { ing: 'Flour', qty: 100 },
      { ing: 'Butter', qty: 70 },
      { ing: 'Sugar', qty: 80 },
      { ing: 'Almonds', qty: 60 },
      { ing: 'Eggs', qty: 2 },
    ];
    
    for (const recItem of almondRecipe) {
      const ingId = ingMap[recItem.ing];
      if (ingId) {
        await conn.query(
          'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
          [outOfStockId, ingId, recItem.qty]
        );
      }
    }
    console.log(`  ✓ Almond Tart: 0 in stock (OUT OF STOCK - Almonds needed)`);

    await conn.commit();
    console.log('\n✓ Sample data seeded successfully!');
    console.log('\nSummary:');
    console.log('  - 12 ingredients (2 with low/out stock)');
    console.log('  - 11 products (10 in stock, 1 out of stock)');
    console.log('  - All products linked with recipes');
    
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error seeding data:', err.message);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

seedSampleData();
