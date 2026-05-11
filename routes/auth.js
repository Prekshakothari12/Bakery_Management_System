const express = require('express');
const router = express.Router();
const db = require('../db');
let bcrypt = null;
try {
  bcrypt = require('bcrypt');
} catch (err) {
  bcrypt = null;
}
const { normalizeCustomerName } = require('../utils/nameNormalizer');

// ═════════════════════════════════════════════════════════════
// SIMPLIFIED AUTHENTICATION SYSTEM
// Username + Password for all three roles: Customer, Admin, Employee
// ═════════════════════════════════════════════════════════════

// POST /api/auth/login
// Body: { role: 'customer'|'admin'|'employee', username, password }
// Supports all three roles with simple username/password
async function getTableColumns(tableName) {
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${tableName}\``);
  return new Set(rows.map(row => row.Field));
}

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]?\$/.test(value);
}

async function passwordMatches(inputPassword, storedPassword) {
  if (!storedPassword) return false;
  if (isBcryptHash(storedPassword)) {
    if (!bcrypt) return false;
    return bcrypt.compare(inputPassword, storedPassword);
  }
  return String(inputPassword) === String(storedPassword);
}

function buildCustomerDemoUser(username) {
  const normalized = String(username || '').trim().toLowerCase();
  if (normalized !== 'anita') return null;

  return {
    id: 1,
    name: 'Anita Sharma',
    email: 'anita@email.com'
  };
}

function buildEmployeeDemoUser(username) {
  const normalized = String(username || '').trim().toLowerCase();
  if (normalized !== 'ravi kumar') return null;

  return {
    id: 'EMP101',
    name: 'Ravi Kumar',
    email: 'ravi@bakery.com',
    empRole: 'Baker'
  };
}

router.post('/login', async (req, res) => {
  const { role, username, password } = req.body;

  try {
    // Validate inputs
    if (!role || !username || !password) {
      return res.status(400).json({ error: 'Role, username and password are required.' });
    }

    // ─────────────────────────────────────────────
    // ADMIN LOGIN (hardcoded for simplicity)
    // ─────────────────────────────────────────────
    if (role === 'admin') {
      if (username === 'admin' && password === 'Admin123') {
        return res.json({
          success: true,
          role: 'admin',
          user: {
            id: 'ADMIN001',
            name: 'Administrator',
            email: 'admin@bakery.local'
          }
        });
      }
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // ─────────────────────────────────────────────
    // CUSTOMER LOGIN
    // ─────────────────────────────────────────────
    if (role === 'customer') {
      const columns = await getTableColumns('Customer');

      if (!columns.has('Password')) {
        if (String(username).trim().toLowerCase() === 'anita' && (password === 'Anita123' || password === 'anita123')) {
          return res.json({
            success: true,
            role: 'customer',
            user: buildCustomerDemoUser(username)
          });
        }

        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const selectColumns = ['CustomerID'];
      if (columns.has('CustomerName')) selectColumns.push('CustomerName');
      if (columns.has('Username')) selectColumns.push('Username');
      if (columns.has('Email')) selectColumns.push('Email');
      if (columns.has('Password')) selectColumns.push('Password');

      const conditions = [];
      const params = [];
      if (columns.has('Username')) {
        conditions.push('Username = ?');
        params.push(username);
      }
      if (columns.has('CustomerName')) {
        conditions.push('CustomerName = ?');
        params.push(username);
      }
      if (columns.has('Email') && String(username).includes('@')) {
        conditions.push('Email = ?');
        params.push(username);
      }

      if (!conditions.length || !columns.has('Password')) {
        return res.status(500).json({ error: 'Customer authentication is not configured correctly.' });
      }

      const [rows] = await db.query(
        `SELECT ${selectColumns.join(', ')} FROM Customer WHERE (${conditions.join(' OR ')}) AND IsActive = TRUE LIMIT 1`,
        params
      );

      if (!rows.length) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const customer = rows[0];
      const matches = await passwordMatches(password, customer.Password);

      if (!matches) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      return res.json({
        success: true,
        role: 'customer',
        user: {
          id: customer.CustomerID,
          name: normalizeCustomerName(customer.CustomerName || customer.Username || username),
          email: customer.Email || null
        }
      });
    }

    // ─────────────────────────────────────────────
    // EMPLOYEE LOGIN
    // ─────────────────────────────────────────────
    if (role === 'employee') {
      const columns = await getTableColumns('Employee');

      if (!columns.has('Password')) {
        if (String(username).trim().toLowerCase() === 'ravi kumar' && password === 'Ravi@123') {
          return res.json({
            success: true,
            role: 'employee',
            user: buildEmployeeDemoUser(username)
          });
        }

        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const selectColumns = ['EmployeeID'];
      if (columns.has('FullName')) selectColumns.push('FullName');
      if (columns.has('Username')) selectColumns.push('Username');
      if (columns.has('Email')) selectColumns.push('Email');
      if (columns.has('Role')) selectColumns.push('Role');
      if (columns.has('Password')) selectColumns.push('Password');

      const normalizedUsername = String(username).trim();
      const conditions = [];
      const params = [];
      if (columns.has('EmployeeID')) {
        conditions.push('EmployeeID = ?');
        params.push(normalizedUsername.toUpperCase());
      }
      if (columns.has('Email') && normalizedUsername.includes('@')) {
        conditions.push('Email = ?');
        params.push(normalizedUsername);
      }
      if (columns.has('FullName')) {
        conditions.push('FullName = ?');
        params.push(normalizedUsername);
      }
      if (columns.has('Username')) {
        conditions.push('Username = ?');
        params.push(normalizedUsername);
      }

      if (!conditions.length || !columns.has('Password')) {
        return res.status(500).json({ error: 'Employee authentication is not configured correctly.' });
      }

      const [rows] = await db.query(
        `SELECT ${selectColumns.join(', ')} FROM Employee WHERE (${conditions.join(' OR ')}) AND IsActive = TRUE LIMIT 1`,
        params
      );

      if (!rows.length) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      const employee = rows[0];
      const matches = await passwordMatches(password, employee.Password);

      if (!matches) {
        return res.status(401).json({ error: 'Invalid username or password.' });
      }

      return res.json({
        success: true,
        role: 'employee',
        user: {
          id: employee.EmployeeID,
          name: employee.FullName || employee.Username || employee.EmployeeID,
          email: employee.Email || null,
          empRole: employee.Role || 'Employee'
        }
      });
    }

    return res.status(400).json({ error: 'Invalid role.' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

module.exports = router;
