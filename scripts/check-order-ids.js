const db = require('../db');

async function checkOrderIds() {
  try {
    console.log('Fetching all Order IDs from database...\n');
    
    const [orders] = await db.query('SELECT OrderID FROM SaleOrder ORDER BY OrderID DESC');
    
    console.log(`Total orders: ${orders.length}\n`);
    console.log('Current Order IDs:');
    console.log(orders.map(o => `  ${o.OrderID}`).join('\n'));
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkOrderIds();
