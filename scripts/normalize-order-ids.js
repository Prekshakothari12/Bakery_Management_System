const db = require('../db');

async function normalizeOrderIds() {
  try {
    console.log('Checking for orders with numeric-only IDs...');
    
    // Fetch all orders
    const [orders] = await db.query('SELECT OrderID FROM SaleOrder ORDER BY OrderID');
    
    if (!orders.length) {
      console.log('✅ No orders in database');
      process.exit(0);
    }

    const numericOrders = orders.filter(o => !String(o.OrderID).startsWith('ORD'));
    
    if (!numericOrders.length) {
      console.log('✅ All order IDs already have proper ORD prefix!');
      process.exit(0);
    }

    console.log(`\n⚠️  Found ${numericOrders.length} orders with numeric-only IDs. Converting...\n`);

    // Get the max number from existing ORD orders
    const [maxResult] = await db.query(`
      SELECT MAX(CAST(SUBSTRING(OrderID, 4) AS UNSIGNED)) as maxNum 
      FROM SaleOrder WHERE OrderID LIKE 'ORD%'
    `);
    
    let nextNum = (maxResult[0]?.maxNum || 0) + 1;

    // Disable foreign key checks
    await db.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const order of numericOrders) {
      const oldId = String(order.OrderID).trim();
      const newId = 'ORD' + String(nextNum).padStart(3, '0');

      console.log(`Converting: ${oldId} → ${newId}`);

      // Update SaleOrder
      await db.query(
        'UPDATE SaleOrder SET OrderID = ? WHERE OrderID = ?',
        [newId, oldId]
      );

      // Update SaleOrder_Contains
      await db.query(
        'UPDATE SaleOrder_Contains SET OrderID = ? WHERE OrderID = ?',
        [newId, oldId]
      );
      
      nextNum++;
    }

    // Re-enable foreign key checks
    await db.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log(`\n✅ Successfully normalized ${numericOrders.length} order IDs!`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

normalizeOrderIds();
