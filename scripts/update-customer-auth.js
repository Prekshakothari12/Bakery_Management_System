/**
 * Add Username and Password columns to Customer table
 * Update demo credentials
 */

const db = require('../db');

async function updateCustomerAuth() {
  try {
    console.log('Checking Customer table structure...');
    
    const [columns] = await db.query(`DESCRIBE Customer`);
    
    const hasUsername = columns.some(c => c.Field === 'Username');
    const hasPassword = columns.some(c => c.Field === 'Password');
    
    if (!hasUsername) {
      console.log('Adding Username column...');
      await db.query('ALTER TABLE Customer ADD COLUMN Username VARCHAR(50) UNIQUE');
      console.log('✓ Username column added');
    }
    
    if (!hasPassword) {
      console.log('Adding Password column...');
      await db.query('ALTER TABLE Customer ADD COLUMN Password VARCHAR(100)');
      console.log('✓ Password column added');
    }
    
    // Update demo customers with usernames and passwords
    console.log('\nUpdating demo customer credentials...');
    const demoCustomers = [
      { id: 1, username: 'anita', password: 'anita123' },
      { id: 2, username: 'rohan', password: 'rohan123' },
      { id: 3, username: 'priya', password: 'priya123' },
      { id: 4, username: 'amit', password: 'amit123' },
      { id: 5, username: 'neha', password: 'neha123' },
      { id: 6, username: 'sunita', password: 'sunita123' },
      { id: 7, username: 'vikram', password: 'vikram123' },
      { id: 8, username: 'meera', password: 'meera123' },
      { id: 9, username: 'deepak', password: 'deepak123' }
    ];
    
    for (const demo of demoCustomers) {
      await db.query(
        'UPDATE Customer SET Username = ?, Password = ? WHERE CustomerID = ?',
        [demo.username, demo.password, demo.id]
      );
      console.log(`✓ ${demo.username} / ${demo.password}`);
    }
    
    console.log('\n✅ Customer authentication updated!');
    console.log('\nDemo Credentials:');
    demoCustomers.forEach(d => {
      console.log(`  ${d.username} / ${d.password}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateCustomerAuth();
