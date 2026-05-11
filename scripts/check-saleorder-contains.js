/**
 * Check SaleOrder_Contains table schema
 */

const db = require('../db');

async function checkTablesSchema() {
  try {
    console.log('Checking SaleOrder_Contains table structure...\n');
    
    const [columns] = await db.query(`DESCRIBE SaleOrder_Contains`);
    
    columns.forEach(col => {
      console.log(`${col.Field}: ${col.Type} | Null: ${col.Null} | Key: ${col.Key}`);
    });
    
    // Check if OrderID is INT in this table too
    const orderIdCol = columns.find(c => c.Field === 'OrderID');
    if (orderIdCol && orderIdCol.Type.includes('int')) {
      console.log('\n⚠️  OrderID in SaleOrder_Contains is still INT. Converting to VARCHAR...');
      
      try {
        await db.query('SET FOREIGN_KEY_CHECKS=0');
        await db.query('ALTER TABLE SaleOrder_Contains MODIFY COLUMN OrderID VARCHAR(20)');
        await db.query('SET FOREIGN_KEY_CHECKS=1');
        console.log('✅ Successfully converted OrderID to VARCHAR(20)');
      } catch (err) {
        await db.query('SET FOREIGN_KEY_CHECKS=1');
        throw err;
      }
    } else {
      console.log('\n✓ OrderID in SaleOrder_Contains is already VARCHAR');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkTablesSchema();
