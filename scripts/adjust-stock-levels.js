const db = require('../db');

async function adjustStockLevels() {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    console.log('Adjusting product stock levels...');

    // Update product stock levels (IN STOCK, OUT OF STOCK, LOW STOCK mix)
    const productUpdates = [
      // IN STOCK products
      { name: 'Butter Bun', qty: 25 },
      { name: 'Chocolate Cookie', qty: 40 },
      { name: 'Chocolate Cake', qty: 12 },
      { name: 'Vanilla Muffin', qty: 18 },
      // OUT OF STOCK
      { name: 'Croissant', qty: 0 },
      // Add any other existing products with stock
    ];

    for (const update of productUpdates) {
      const [result] = await conn.query(
        'UPDATE Product SET QuantityInStock = ? WHERE ProductName = ? AND IsActive = TRUE',
        [update.qty, update.name]
      );
      if (result.affectedRows > 0) {
        console.log(`  ✓ ${update.name}: ${update.qty} units`);
      }
    }

    console.log('\nAdjusting ingredient stock levels...');

    // Update ingredient stock levels (MIX of adequate, low, and out of stock)
    const ingredientUpdates = [
      // ADEQUATE STOCK
      { name: 'Flour', qty: 400 },
      { name: 'Sugar', qty: 250 },
      { name: 'Butter', qty: 150 },
      { name: 'Eggs', qty: 40 },
      { name: 'Milk', qty: 180 },
      // LOW STOCK (below minimum)
      { name: 'Chocolate Chips', qty: 20 },
      { name: 'Cocoa Powder', qty: 10 },
      { name: 'Vanilla Essence', qty: 8 },
      { name: 'Yeast', qty: 3 },
      // OUT OF STOCK
      { name: 'Salt', qty: 0 },
      { name: 'Baking Powder', qty: 0 },
      // Add any other existing ingredients
    ];

    for (const update of ingredientUpdates) {
      const [result] = await conn.query(
        'UPDATE Ingredient SET QuantityInStock = ? WHERE Name = ?',
        [update.qty, update.name]
      );
      if (result.affectedRows > 0) {
        const status = update.qty === 0 ? '(OUT OF STOCK)' : 
                      update.qty < 20 ? '(LOW STOCK)' : '(ADEQUATE)';
        console.log(`  ✓ ${update.name}: ${update.qty} ${status}`);
      }
    }

    await conn.commit();
    console.log('\n✓ Stock levels adjusted successfully!');
    console.log('\nSummary:');
    console.log('  IN STOCK: Butter Bun, Chocolate Cookie, Chocolate Cake, Vanilla Muffin');
    console.log('  OUT OF STOCK: Croissant');
    console.log('  LOW STOCK INGREDIENTS: Chocolate Chips, Cocoa Powder, Vanilla Essence, Yeast');
    console.log('  OUT OF STOCK INGREDIENTS: Salt, Baking Powder');
    
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Error adjusting stock:', err.message);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

adjustStockLevels();
