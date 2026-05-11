const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT SupplierID, SupplierName, PhoneNumber, Address, PaymentTerms, IsActive FROM Supplier ORDER BY SupplierName'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { SupplierName, PhoneNumber, Address, PaymentTerms } = req.body;

  if (!SupplierName) {
    return res.status(400).json({ error: 'SupplierName is required.' });
  }

  if (!PhoneNumber || !/^[0-9]{10}$/.test(String(PhoneNumber))) {
    return res.status(400).json({ error: 'PhoneNumber must be a 10-digit number.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO Supplier (SupplierName, PhoneNumber, Address, PaymentTerms, IsActive) VALUES (?, ?, ?, ?, TRUE)',
      [SupplierName, PhoneNumber, Address || null, PaymentTerms || null]
    );
    res.json({ message: 'Supplier added.', SupplierID: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;