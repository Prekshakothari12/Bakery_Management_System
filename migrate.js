#!/usr/bin/env node

/**
 * Migration script: Add necessary columns for authentication and orders
 */

const db = require('./db');

async function migrate() {
  try {
    console.log('🔧 Running database migrations...\n');

    // ─────────────────────────────────────────
    // 1. ADD Password COLUMN TO Customer
    // ─────────────────────────────────────────
    console.log('1️⃣  Adding Password column to Customer table...');
    try {
      await db.query(`
        ALTER TABLE Customer 
        ADD COLUMN Password VARCHAR(255) DEFAULT 'Customer123' AFTER Email
      `);
      console.log('   ✅ Password column added to Customer\n');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('   ℹ️  Password column already exists\n');
      } else {
        throw err;
      }
    }

    // ─────────────────────────────────────────
    // 2. ADD Email & Password COLUMNS TO Employee
    // ─────────────────────────────────────────
    console.log('2️⃣  Adding Email and Password columns to Employee table...');
    try {
      await db.query(`
        ALTER TABLE Employee 
        ADD COLUMN Email VARCHAR(100) DEFAULT NULL AFTER FullName
      `);
      console.log('   ✅ Email column added to Employee');
    } catch (err) {
      if (!err.message.includes('Duplicate column')) {
        throw err;
      }
      console.log('   ℹ️  Email column already exists');
    }

    try {
      await db.query(`
        ALTER TABLE Employee 
        ADD COLUMN Password VARCHAR(255) DEFAULT 'Employee123' AFTER Email
      `);
      console.log('   ✅ Password column added to Employee\n');
    } catch (err) {
      if (err.message.includes('Duplicate column')) {
        console.log('   ℹ️  Password column already exists\n');
      } else {
        throw err;
      }
    }

    // ─────────────────────────────────────────
    // 3. ADD OrderType COLUMN TO SaleOrder
    // ─────────────────────────────────────────
    console.log('3️⃣  Adding OrderType column to SaleOrder table...');
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

    console.log('✅ All migrations complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    console.error('\nFull error:', err);
    process.exit(1);
  }
}

migrate();
