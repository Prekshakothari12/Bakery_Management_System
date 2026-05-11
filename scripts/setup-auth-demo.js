#!/usr/bin/env node

/**
 * Setup Authentication Demo Data
 * 
 * This script:
 * 1. Adds Password column to Customer table if missing
 * 2. Adds Password column to Employee table if missing
 * 3. Creates demo customer and employee records with hashed passwords
 * 
 * Demo Credentials:
 * Customer:
 *   Email: customer@example.com
 *   Password: Customer123
 * 
 * Employee:
 *   Email: employee@example.com
 *   Employee ID: EMP101
 *   Password: Employee123
 */

const db = require('../db');
const bcrypt = require('bcrypt');

const DEMO_CUSTOMER = {
  CustomerID: 'CUST001',
  CustomerName: 'John Doe',
  Email: 'customer@example.com',
  PhoneNumber: '9876543210',
  Password: 'Customer123',
  IsActive: true
};

const DEMO_EMPLOYEE = {
  EmployeeID: 'EMP101',
  FullName: 'Jane Smith',
  Email: 'employee@example.com',
  PhoneNumber: '9876543211',
  Password: 'Employee123',
  Role: 'Baker',
  Salary: 30000,
  JoiningDate: '2023-01-15',
  IsActive: true
};

async function setupAuth() {
  try {
    console.log('🔐 Starting Authentication Setup...\n');

    // ═══════════════════════════════════════════════
    // 1. Add Password column to Customer table
    // ═══════════════════════════════════════════════
    console.log('1️⃣  Checking Customer table...');
    try {
      await db.query('ALTER TABLE Customer ADD COLUMN Password VARCHAR(255) DEFAULT NULL');
      console.log('   ✅ Added Password column to Customer table');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   ℹ️  Password column already exists in Customer table');
      } else {
        throw err;
      }
    }

    // ═══════════════════════════════════════════════
    // 2. Add Password column to Employee table
    // ═══════════════════════════════════════════════
    console.log('\n2️⃣  Checking Employee table...');
    try {
      await db.query('ALTER TABLE Employee ADD COLUMN Password VARCHAR(255) DEFAULT NULL');
      console.log('   ✅ Added Password column to Employee table');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('   ℹ️  Password column already exists in Employee table');
      } else {
        throw err;
      }
    }

    // ═══════════════════════════════════════════════
    // 3. Create Demo Customer
    // ═══════════════════════════════════════════════
    console.log('\n3️⃣  Setting up Demo Customer...');
    try {
      const hashedPassword = await bcrypt.hash(DEMO_CUSTOMER.Password, 10);
      
      // Check if customer exists
      const [existing] = await db.query(
        'SELECT CustomerID FROM Customer WHERE Email = ?',
        [DEMO_CUSTOMER.Email]
      );

      if (existing.length) {
        // Update existing customer
        await db.query(
          'UPDATE Customer SET Password = ?, CustomerName = ?, PhoneNumber = ?, IsActive = ? WHERE Email = ?',
          [hashedPassword, DEMO_CUSTOMER.CustomerName, DEMO_CUSTOMER.PhoneNumber, DEMO_CUSTOMER.IsActive, DEMO_CUSTOMER.Email]
        );
        console.log('   ✅ Updated demo customer with hashed password');
      } else {
        // Create new customer
        await db.query(
          'INSERT INTO Customer (CustomerID, CustomerName, Email, PhoneNumber, Password, IsActive) VALUES (?, ?, ?, ?, ?, ?)',
          [DEMO_CUSTOMER.CustomerID, DEMO_CUSTOMER.CustomerName, DEMO_CUSTOMER.Email, DEMO_CUSTOMER.PhoneNumber, hashedPassword, DEMO_CUSTOMER.IsActive]
        );
        console.log('   ✅ Created demo customer');
      }
      console.log(`   📧 Email: ${DEMO_CUSTOMER.Email}`);
      console.log(`   🔑 Password: ${DEMO_CUSTOMER.Password}`);
    } catch (err) {
      console.error('   ❌ Error creating demo customer:', err.message);
    }

    // ═══════════════════════════════════════════════
    // 4. Create Demo Employee
    // ═══════════════════════════════════════════════
    console.log('\n4️⃣  Setting up Demo Employee...');
    try {
      const hashedPassword = await bcrypt.hash(DEMO_EMPLOYEE.Password, 10);
      
      // Check if employee exists
      const [existing] = await db.query(
        'SELECT EmployeeID FROM Employee WHERE Email = ?',
        [DEMO_EMPLOYEE.Email]
      );

      if (existing.length) {
        // Update existing employee
        await db.query(
          'UPDATE Employee SET Password = ?, FullName = ?, PhoneNumber = ?, Role = ?, Salary = ?, IsActive = ? WHERE Email = ?',
          [hashedPassword, DEMO_EMPLOYEE.FullName, DEMO_EMPLOYEE.PhoneNumber, DEMO_EMPLOYEE.Role, DEMO_EMPLOYEE.Salary, DEMO_EMPLOYEE.IsActive, DEMO_EMPLOYEE.Email]
        );
        console.log('   ✅ Updated demo employee with hashed password');
      } else {
        // Create new employee
        await db.query(
          'INSERT INTO Employee (EmployeeID, FullName, Email, PhoneNumber, Password, Role, Salary, JoiningDate, IsActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [DEMO_EMPLOYEE.EmployeeID, DEMO_EMPLOYEE.FullName, DEMO_EMPLOYEE.Email, DEMO_EMPLOYEE.PhoneNumber, hashedPassword, DEMO_EMPLOYEE.Role, DEMO_EMPLOYEE.Salary, DEMO_EMPLOYEE.JoiningDate, DEMO_EMPLOYEE.IsActive]
        );
        console.log('   ✅ Created demo employee');
      }
      console.log(`   📧 Email: ${DEMO_EMPLOYEE.Email}`);
      console.log(`   🆔 Employee ID: ${DEMO_EMPLOYEE.EmployeeID}`);
      console.log(`   🔑 Password: ${DEMO_EMPLOYEE.Password}`);
    } catch (err) {
      console.error('   ❌ Error creating demo employee:', err.message);
    }

    // ═══════════════════════════════════════════════
    // 5. Verify Setup
    // ═══════════════════════════════════════════════
    console.log('\n5️⃣  Verifying setup...');
    const [customers] = await db.query('SELECT COUNT(*) AS count FROM Customer WHERE Password IS NOT NULL');
    const [employees] = await db.query('SELECT COUNT(*) AS count FROM Employee WHERE Password IS NOT NULL');
    
    console.log(`   ✅ Customers with passwords: ${customers[0].count}`);
    console.log(`   ✅ Employees with passwords: ${employees[0].count}`);

    console.log('\n✨ Authentication setup complete!\n');
    console.log('🚀 Demo Login Credentials:');
    console.log('   Customer: customer@example.com / Customer123');
    console.log('   Employee: employee@example.com (EMP101) / Employee123\n');

    process.exit(0);

  } catch (err) {
    console.error('❌ Setup failed:', err);
    process.exit(1);
  }
}

setupAuth();
