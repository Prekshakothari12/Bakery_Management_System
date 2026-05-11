/**
 * Check customer data in database
 */

const db = require('../db');

async function checkCustomers() {
  try {
    console.log('Fetching all customers...\n');
    
    const [customers] = await db.query('SELECT CustomerID, CustomerName, PhoneNumber, Email FROM Customer');
    
    if (!customers.length) {
      console.log('❌ NO CUSTOMERS FOUND IN DATABASE');
      process.exit(0);
    }
    
    console.log(`Found ${customers.length} customer(s):\n`);
    customers.forEach(c => {
      console.log(`ID: ${c.CustomerID}`);
      console.log(`Name: ${c.CustomerName}`);
      console.log(`Phone: ${c.PhoneNumber} (use as password)`);
      console.log(`Email: ${c.Email}`);
      console.log('---');
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkCustomers();
