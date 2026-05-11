/**
 * Properly check and fix OrderID column - be more aggressive
 */

const db = require('../db');

async function fixOrderIDColumn() {
  try {
    console.log('Fetching SaleOrder table schema...');
    
    const [columns] = await db.query(`DESCRIBE SaleOrder`);
    
    console.log('\nCurrent SaleOrder structure:');
    columns.forEach(col => {
      if (col.Field === 'OrderID') {
        console.log(`>>> OrderID: Type=${col.Type}, Null=${col.Null}, Key=${col.Key}, Default=${col.Default}, Extra=${col.Extra}`);
      } else {
        console.log(`    ${col.Field}: ${col.Type}`);
      }
    });
    
    const orderIdCol = columns.find(c => c.Field === 'OrderID');
    
    if (!orderIdCol.Type.includes('varchar') && !orderIdCol.Type.includes('char') && !orderIdCol.Type.includes('text')) {
      console.log('\n⚠️  OrderID is numeric type. Must convert to VARCHAR...');
      console.log('Attempting conversion...');
      
      try {
        // Disable foreign key checks temporarily
        console.log('Disabling foreign key checks...');
        await db.query('SET FOREIGN_KEY_CHECKS=0');
        
        // Now modify the column without worrying about FKs
        console.log('Modifying OrderID column...');
        await db.query('ALTER TABLE SaleOrder DROP PRIMARY KEY, CHANGE COLUMN OrderID OrderID VARCHAR(20) NOT NULL');
        await db.query('ALTER TABLE SaleOrder ADD PRIMARY KEY (OrderID)');
        console.log('✓ Changed OrderID to VARCHAR(20)');
        
        // Re-enable foreign key checks
        console.log('Re-enabling foreign key checks...');
        await db.query('SET FOREIGN_KEY_CHECKS=1');
        
        console.log('✅ Successfully converted OrderID to VARCHAR(20)');
      } catch (alterErr) {
        await db.query('SET FOREIGN_KEY_CHECKS=1');
        console.log('Error during conversion:', alterErr.message);
        throw alterErr;
      }
    } else {
      console.log('\n✓ OrderID is already text-based type');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

fixOrderIDColumn();
