/**
 * Get employee names and IDs for login hints
 */

const db = require('../db');

async function getEmployeeHints() {
  try {
    const [employees] = await db.query('SELECT EmployeeID, FullName, Password FROM Employee ORDER BY EmployeeID');
    
    console.log('Employee Credentials:');
    employees.forEach(emp => {
      console.log(`${emp.FullName} (${emp.EmployeeID}): ${emp.Password}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

getEmployeeHints();
