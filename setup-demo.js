#!/usr/bin/env node

/**
 * Setup script: Create demo users (customer, employee) and orders with proper status/type
 * Run this after updating the schema
 */

const db = require('./db');

async function setup() {
  try {
    console.log('🔧 Setting up demo data...\n');

    // ─────────────────────────────────────────
    // 1. ADD DEMO CUSTOMER
    // ─────────────────────────────────────────
    console.log('1️⃣  Creating demo customer...');
    await db.query(`
      INSERT IGNORE INTO Customer 
      (CustomerID, CustomerName, Email, PhoneNumber, Password, Address, IsActive)
      VALUES 
      ('CUST001', 'customer', 'customer@bakery.local', '9876543210', 'Customer123', 'Demo Address', TRUE)
    `);
    console.log('   ✅ Demo customer ready (username: customer, password: Customer123)\n');

    // ─────────────────────────────────────────
    // 2. ADD DEMO EMPLOYEE
    // ─────────────────────────────────────────
    console.log('2️⃣  Creating demo employee...');
    await db.query(`
      INSERT IGNORE INTO Employee 
      (EmployeeID, FullName, Email, PhoneNumber, Password, Role, Salary, JoiningDate, IsActive)
      VALUES 
      ('EMP001', 'employee', 'employee@bakery.local', '9876543211', 'Employee123', 'Baker', 25000, CURDATE(), TRUE)
    `);
    console.log('   ✅ Demo employee ready (username: employee, password: Employee123)\n');

    // ─────────────────────────────────────────
    // 3. CHECK/CREATE OrderType COLUMN
    // ─────────────────────────────────────────
    console.log('3️⃣  Ensuring OrderType column exists...');
    try {
      await db.query(`
        ALTER TABLE SaleOrder 
        ADD COLUMN OrderType VARCHAR(20) DEFAULT 'Online' AFTER Status
      `);
      console.log('   ✅ OrderType column added to SaleOrder\n');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('   ℹ️  OrderType column already exists\n');
      } else {
        throw err;
      }
    }

    // ─────────────────────────────────────────
    // 4. CREATE DEMO ORDERS (if none exist)
    // ─────────────────────────────────────────
    console.log('4️⃣  Creating demo orders...');
    const [orders] = await db.query('SELECT COUNT(*) as cnt FROM SaleOrder');
    
    if (orders[0].cnt === 0) {
      // Get first customer and product for demo order
      const [customers] = await db.query('SELECT CustomerID FROM Customer LIMIT 1');
      const [products] = await db.query('SELECT ProductID, SellingPrice FROM Product LIMIT 1');
      
      if (customers.length && products.length) {
        const custId = customers[0].CustomerID;
        const prodId = products[0].ProductID;
        const price = products[0].SellingPrice || 100;

        // Create demo orders
        const [order1] = await db.query(
          `INSERT INTO SaleOrder (OrderDate, Status, OrderType, CustomerID, TotalAmount) 
           VALUES (CURDATE(), 'Pending', 'Online', ?, ?)`,
          [custId, price]
        );

        await db.query(
          `INSERT INTO SaleOrder_Contains (OrderID, ProductID, Quantity, UnitPrice, LineTotal) 
           VALUES (?, ?, 1, ?, ?)`,
          [order1.insertId, prodId, price, price]
        );

        const [order2] = await db.query(
          `INSERT INTO SaleOrder (OrderDate, Status, OrderType, CustomerID, TotalAmount) 
           VALUES (CURDATE(), 'Confirmed', 'Offline', ?, ?)`,
          [custId, price * 2]
        );

        await db.query(
          `INSERT INTO SaleOrder_Contains (OrderID, ProductID, Quantity, UnitPrice, LineTotal) 
           VALUES (?, ?, 2, ?, ?)`,
          [order2.insertId, prodId, price, price * 2]
        );

        const [order3] = await db.query(
          `INSERT INTO SaleOrder (OrderDate, Status, OrderType, CustomerID, TotalAmount) 
           VALUES (CURDATE(), 'Completed', 'Offline', ?, ?)`,
          [custId, price * 3]
        );

        await db.query(
          `INSERT INTO SaleOrder_Contains (OrderID, ProductID, Quantity, UnitPrice, LineTotal) 
           VALUES (?, ?, 3, ?, ?)`,
          [order3.insertId, prodId, price, price * 3]
        );

        console.log('   ✅ Demo orders created:\n');
        console.log(`      • Order ${order1.insertId}: Pending, Online`);
        console.log(`      • Order ${order2.insertId}: Confirmed, Offline`);
        console.log(`      • Order ${order3.insertId}: Completed, Offline\n`);
      } else {
        console.log('   ⚠️  No products found. Skipping demo orders.\n');
      }
    } else {
      console.log('   ℹ️  Orders already exist in database\n');
    }

    console.log('✅ Setup complete! Ready to test.\n');
    console.log('Demo credentials:');
    console.log('  👤 Customer: customer / Customer123');
    console.log('  🔐 Admin:    admin / Admin123');
    console.log('  👨‍💼 Employee:  employee / Employee123\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Setup error:', err.message);
    process.exit(1);
  }
}

setup();
