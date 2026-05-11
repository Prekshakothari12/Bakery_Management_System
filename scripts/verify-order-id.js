/**
 * Verify OrderID column current state
 */

const db = require('../db');

async function checkOrderIDColumn() {
  try {
    console.log('Checking SaleOrder table structure...\n');
    
    const [columns] = await db.query(`DESCRIBE SaleOrder`);
    
    columns.forEach(col => {
      if (col.Field === 'OrderID') {
        console.log(`OrderID Column Details:`);
        console.log(`  Type: ${col.Type}`);
        console.log(`  Null: ${col.Null}`);
        console.log(`  Key: ${col.Key}`);
        console.log(`  Default: ${col.Default}`);
        console.log(`  Extra: ${col.Extra}`);
      }
    });
    
    // Try to insert a test order
    console.log('\nTesting order insertion...');
    const testOrderID = 'ORD999TEST';
    
    try {
      await db.query(
        'INSERT INTO SaleOrder (OrderID, OrderDate, Status, CustomerID) VALUES (?, CURDATE(), ?, ?)',
        [testOrderID, 'Test', 1]
      );
      console.log(`✅ Successfully inserted test order: ${testOrderID}`);
      
      // Clean up
      await db.query('DELETE FROM SaleOrder WHERE OrderID = ?', [testOrderID]);
      console.log('✓ Cleaned up test order');
    } catch (insertErr) {
      console.log(`❌ Insert failed: ${insertErr.message}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkOrderIDColumn();
