/**
 * Add Password column to Employee table and set employee credentials
 */

const db = require('../db');

async function updateEmployeeAuth() {
  try {
    console.log('Checking Employee table structure...');
    
    const [columns] = await db.query(`DESCRIBE Employee`);
    
    const hasPassword = columns.some(c => c.Field === 'Password');
    
    if (!hasPassword) {
      console.log('Adding Password column...');
      await db.query('ALTER TABLE Employee ADD COLUMN Password VARCHAR(100)');
      console.log('✓ Password column added');
    }
    
    // Get all employees
    console.log('\nUpdating employee credentials...');
    const [employees] = await db.query('SELECT EmployeeID, FullName FROM Employee');
    
    const demoPasswords = {
      'EMP001': 'emp001pass',
      'EMP002': 'emp002pass',
      'EMP003': 'emp003pass'
    };
    
    for (const emp of employees) {
      const empId = String(emp.EmployeeID);
      const password = demoPasswords[empId] || empId.toLowerCase() + 'pass';
      await db.query(
        'UPDATE Employee SET Password = ? WHERE EmployeeID = ?',
        [password, emp.EmployeeID]
      );
      console.log(`✓ ${empId}: ${password}`);
    }
    
    console.log('\n✅ Employee authentication updated!');
    console.log('\nEmployee Credentials:');
    for (const emp of employees) {
      const empId = String(emp.EmployeeID);
      const password = demoPasswords[empId] || empId.toLowerCase() + 'pass';
      console.log(`  ${empId} / ${password}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

updateEmployeeAuth();
