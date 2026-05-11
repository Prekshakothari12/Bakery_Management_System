const express = require('express');
const router = express.Router();
const db = require('../db');
const { normalizeCustomerName } = require('../utils/nameNormalizer');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Customer ORDER BY CustomerName');
    res.json(rows.map(c => ({
      ...c,
      CustomerName: normalizeCustomerName(c.CustomerName)
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add a new customer (walk-in or registered)
// CustomerID is auto-generated if not provided
router.post('/', async (req, res) => {
  let { CustomerID, CustomerName, PhoneNumber, Address, Email } = req.body;
  if (!CustomerName) return res.status(400).json({ error: 'CustomerName is required.' });

  // Walk-in orders may not provide a phone number, but the table requires one.
  // Generate a unique placeholder that still satisfies the 10-digit constraint.
  if (!PhoneNumber) {
    PhoneNumber = `9${String(Date.now()).slice(-9)}`;
  }

  try {
    const insertSql = CustomerID
      ? 'INSERT INTO Customer (CustomerID, CustomerName, PhoneNumber, Address, Email) VALUES (?,?,?,?,?)'
      : 'INSERT INTO Customer (CustomerName, PhoneNumber, Address, Email) VALUES (?,?,?,?)';
    const insertParams = CustomerID
      ? [CustomerID, CustomerName, PhoneNumber || null, Address || null, Email || null]
      : [CustomerName, PhoneNumber || null, Address || null, Email || null];
    const [result] = await db.query(insertSql, insertParams);
    if (!CustomerID) {
      CustomerID = result.insertId;
    }
    res.json({
      message: 'Customer added',
      CustomerID,
      CustomerName: normalizeCustomerName(CustomerName)
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;