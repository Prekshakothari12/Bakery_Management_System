const express = require('express');
const router  = require('express').Router();
const db      = require('../db');

// GET /api/ingredients — all ingredients with supplier info + stock status
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        i.*,
        s.SupplierName,
        s.PhoneNumber AS SupplierPhone,
        CASE
          WHEN i.QuantityInStock = 0                          THEN 'Out of Stock'
          WHEN i.QuantityInStock < i.MinimumStockLevel        THEN 'Low Stock'
          ELSE 'Adequate'
        END AS StockStatus
      FROM Ingredient i
      LEFT JOIN Supplier s ON i.SupplierID = s.SupplierID
      ORDER BY i.Name
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ingredients/low-stock — ingredients below minimum level
router.get('/low-stock', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        i.*,
        s.SupplierName,
        s.PhoneNumber AS SupplierPhone,
        ROUND(i.MinimumStockLevel - i.QuantityInStock, 3) AS Shortfall
      FROM Ingredient i
      LEFT JOIN Supplier s ON i.SupplierID = s.SupplierID
      WHERE i.QuantityInStock < i.MinimumStockLevel
      ORDER BY i.QuantityInStock ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ingredients/:id — single ingredient
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT i.*, s.SupplierName FROM Ingredient i
       LEFT JOIN Supplier s ON i.SupplierID = s.SupplierID
       WHERE i.IngredientID = ?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ingredient not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ingredients — add new ingredient
// ID is AUTO_INCREMENT — no ING prefix generation needed
router.post('/', async (req, res) => {
  const { Name, QuantityInStock, MinimumStockLevel, UnitPrice, Unit, SupplierID } = req.body;

  if (!Name)      return res.status(400).json({ error: 'Name is required.' });
  if (!UnitPrice || parseFloat(UnitPrice) <= 0) {
    return res.status(400).json({ error: 'UnitPrice must be a positive number.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO Ingredient (Name, QuantityInStock, MinimumStockLevel, UnitPrice, Unit, SupplierID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Name,
        parseFloat(QuantityInStock)    || 0,
        parseFloat(MinimumStockLevel)  || 0,
        parseFloat(UnitPrice),
        Unit       || 'kg',
        SupplierID || null
      ]
    );
    res.json({ message: 'Ingredient added.', IngredientID: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/ingredients/:id — update ingredient details
router.put('/:id', async (req, res) => {
  const { Name, MinimumStockLevel, UnitPrice, Unit, SupplierID } = req.body;

  if (UnitPrice && parseFloat(UnitPrice) <= 0) {
    return res.status(400).json({ error: 'UnitPrice must be a positive number.' });
  }

  try {
    await db.query(
      `UPDATE Ingredient
       SET Name = ?, MinimumStockLevel = ?, UnitPrice = ?, Unit = ?, SupplierID = ?
       WHERE IngredientID = ?`,
      [Name, parseFloat(MinimumStockLevel) || 0, parseFloat(UnitPrice), Unit || 'kg', SupplierID || null, req.params.id]
    );
    res.json({ message: 'Ingredient updated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/ingredients/:id/restock — add to stock (positive qty only)
// Trigger trg_Ingredient_AfterUpdate logs the change + fires low-stock alert
router.put('/:id/restock', async (req, res) => {
  const qty = parseFloat(req.body.quantity);

  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive number.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT Name, QuantityInStock FROM Ingredient WHERE IngredientID = ?', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ingredient not found.' });

    await db.query(
      'UPDATE Ingredient SET QuantityInStock = QuantityInStock + ? WHERE IngredientID = ?',
      [qty, req.params.id]
      // ↑ trg_Ingredient_AfterUpdate fires → logs to StockAuditLog
      //   trg_Ingredient_BeforeUpdate fires → blocks if result would be negative (won't happen here)
    );

    res.json({
      message     : `Restocked ${rows[0].Name} by ${qty} units.`,
      previousStock: parseFloat(rows[0].QuantityInStock),
      added       : qty,
      newStock    : parseFloat(rows[0].QuantityInStock) + qty
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/ingredients/:id — soft approach: only delete if no dependencies
router.delete('/:id', async (req, res) => {
  try {
    // Check if any product recipe uses this ingredient
    const [used] = await db.query(
      'SELECT COUNT(*) AS cnt FROM ProductIngredient WHERE IngredientID = ?', [req.params.id]
    );
    if (used[0].cnt > 0) {
      return res.status(400).json({
        error: 'Cannot delete ingredient — it is used in product recipes. Remove it from recipes first.'
      });
    }

    await db.query('DELETE FROM Ingredient WHERE IngredientID = ?', [req.params.id]);
    res.json({ message: 'Ingredient deleted.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;