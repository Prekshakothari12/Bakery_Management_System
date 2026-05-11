const express = require('express');
const router = express.Router();
const db = require('../db');

function normalizeRecipeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => ({
      IngredientID: item && item.IngredientID,
      QuantityRequired: parseFloat(item && item.QuantityRequired)
    }))
    .filter(item => item.IngredientID && !isNaN(item.QuantityRequired) && item.QuantityRequired > 0);
}

async function checkAndConsumeIngredients(conn, productId, unitsToProduce) {
  if (unitsToProduce <= 0) return { ok: true, consumed: [] };

  const [recipeRows] = await conn.query(
    `SELECT pi.IngredientID,
            pi.QuantityRequired,
            i.Name AS IngredientName,
            i.Unit,
            i.QuantityInStock
     FROM ProductIngredient pi
     JOIN Ingredient i ON i.IngredientID = pi.IngredientID
     WHERE pi.ProductID = ?
     ORDER BY i.Name
     FOR UPDATE`,
    [productId]
  );

  if (!recipeRows.length) {
    return {
      ok: false,
      reason: 'RECIPE_MISSING',
      message: 'Recipe is not configured for this product. Please add recipe ingredients before restocking/producing.'
    };
  }

  const insufficient = [];
  const requiredByIngredient = [];

  for (const row of recipeRows) {
    // CRITICAL: Extract ingredient required PER UNIT
    const perUnit = parseFloat(row.QuantityRequired);
    if (isNaN(perUnit) || perUnit <= 0) {
      // Skip ingredients with invalid quantities
      continue;
    }
    
    // CRITICAL: Calculate TOTAL required = PER UNIT × QUANTITY ADDED
    // Formula: required = perUnit × unitsToProduce
    const required = perUnit * unitsToProduce;
    
    // CRITICAL: Get current available quantity
    const available = parseFloat(row.QuantityInStock);
    if (isNaN(available)) {
      // Treat missing stock as 0
      row.QuantityInStock = 0;
    }
    const available_final = isNaN(available) ? 0 : available;
    
    const unit = row.Unit || 'g';

    requiredByIngredient.push({
      IngredientID: row.IngredientID,
      IngredientName: row.IngredientName,
      unit,
      perUnit,              // What's needed per 1 product
      unitsToProduce,       // How many products being added
      required,             // Total needed = perUnit × unitsToProduce
      available: available_final
    });

    // CRITICAL: Check if sufficient stock exists
    if (available_final < required) {
      insufficient.push({
        IngredientID: row.IngredientID,
        IngredientName: row.IngredientName,
        unit,
        available: available_final,
        required,
        shortBy: required - available_final
      });
    }
  }

  if (insufficient.length) {
    return {
      ok: false,
      reason: 'INSUFFICIENT_INGREDIENTS',
      insufficient,
      message: insufficient
        .map(item => `${item.IngredientName}: available ${item.available}${item.unit}, required ${item.required}${item.unit}`)
        .join('; ')
    };
  }

  // CRITICAL: Deduct ingredients for all recipe items
  for (const item of requiredByIngredient) {
    // Deduct: TOTAL REQUIRED = perUnit × unitsToProduce
    await conn.query(
      'UPDATE Ingredient SET QuantityInStock = QuantityInStock - ? WHERE IngredientID = ?',
      [item.required, item.IngredientID]
    );
  }

  return { ok: true, consumed: requiredByIngredient };
}

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM Product WHERE IsActive = TRUE ORDER BY Category, ProductName'
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update product stock quantity
router.put('/:id/stock', async (req, res) => {
  // CRITICAL: Parse quantity strictly
  let qty = req.body.quantity;
  
  // Convert to number, then validate
  qty = Number(qty);
  console.log(`Backend received stock update: productId=${req.params.id}, quantity=${qty}, type=${typeof qty}`);
  
  if (isNaN(qty)) {
    return res.status(400).json({ error: 'Quantity must be a number.' });
  }
  
  // Must be integer and non-negative
  if (!Number.isInteger(qty) || qty < 0) {
    return res.status(400).json({ error: 'Quantity must be a non-negative integer.' });
  }
  
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // CRITICAL: Fetch current stock with lock
    const [prodRows] = await conn.query(
      'SELECT ProductID, ProductName, QuantityInStock FROM Product WHERE ProductID = ? AND IsActive = TRUE FOR UPDATE',
      [req.params.id]
    );
    if (!prodRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Product not found.' });
    }

    // CRITICAL: Get current stock and ensure it's a number
    let currentStock = prodRows[0].QuantityInStock;
    if (currentStock === null || currentStock === undefined) {
      currentStock = 0;
    }
    currentStock = Number(currentStock);
    if (isNaN(currentStock)) {
      currentStock = 0;
    }

    // CRITICAL: If adding quantity > 0, check and consume ingredients
    if (qty > 0) {
      const result = await checkAndConsumeIngredients(conn, req.params.id, qty);
      if (!result.ok) {
        await conn.rollback();
        if (result.reason === 'RECIPE_MISSING') {
          return res.status(400).json({ error: result.message, reason: result.reason, redirectTo: 'ingredients' });
        }
        return res.status(400).json({
          error: `Insufficient ingredient stock. ${result.message}`,
          reason: result.reason,
          insufficientIngredients: result.insufficient,
          redirectTo: 'ingredients'
        });
      }
    }

    // CRITICAL: Calculate new stock = CURRENT + ADDED (simple addition)
    // Formula: newStock = currentStock + qty
    const newStock = currentStock + qty;

    // CRITICAL: Update product stock in database
    await conn.query(
      'UPDATE Product SET QuantityInStock = ? WHERE ProductID = ?',
      [newStock, req.params.id]
    );

    await conn.commit();
    res.json({ 
      message: `Product stock updated from ${currentStock} to ${newStock}.`,
      currentStock,
      addedQuantity: qty,
      newStock
    });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/recipes', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.ProductID, p.ProductName, p.Category, p.SellingPrice,
             pi.IngredientID, pi.QuantityRequired,
             i.Name AS IngredientName, i.Unit, i.QuantityInStock, i.MinimumStockLevel
      FROM Product p
      LEFT JOIN ProductIngredient pi ON p.ProductID = pi.ProductID
      LEFT JOIN Ingredient i ON pi.IngredientID = i.IngredientID
      WHERE p.IsActive = TRUE
      ORDER BY p.Category, p.ProductName, i.Name
    `);

    const grouped = [];
    const byId = new Map();
    for (const row of rows) {
      if (!byId.has(row.ProductID)) {
        const prod = {
          ProductID: row.ProductID,
          ProductName: row.ProductName,
          Category: row.Category,
          SellingPrice: row.SellingPrice,
          RecipeItems: []
        };
        byId.set(row.ProductID, prod);
        grouped.push(prod);
      }
      if (row.IngredientID) {
        byId.get(row.ProductID).RecipeItems.push({
          IngredientID: row.IngredientID,
          IngredientName: row.IngredientName,
          Unit: row.Unit || 'g',
          QuantityRequired: row.QuantityRequired,
          QuantityInStock: row.QuantityInStock,
          MinimumStockLevel: row.MinimumStockLevel
        });
      }
    }

    res.json(grouped);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/recipe', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT pi.IngredientID, i.Name AS IngredientName, pi.QuantityRequired, i.Unit
      FROM ProductIngredient pi
      LEFT JOIN Ingredient i ON pi.IngredientID = i.IngredientID
      WHERE pi.ProductID = ?
      ORDER BY i.Name
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/recipe', async (req, res) => {
  const recipeItems = normalizeRecipeItems(req.body.RecipeItems);
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    await conn.query('DELETE FROM ProductIngredient WHERE ProductID = ?', [req.params.id]);
    for (const item of recipeItems) {
      await conn.query(
        'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
        [req.params.id, item.IngredientID, item.QuantityRequired]
      );
    }

    await conn.commit();
    res.json({ message: 'Recipe updated.' });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM Product WHERE ProductID = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  const { ProductName, ProductionCost, SellingPrice, ShelfLifeDays, UnitWeight, Category } = req.body;
  const recipeItems = normalizeRecipeItems(req.body.RecipeItems);
  const initialStock = parseInt(req.body.QuantityInStock) || 0;
  if (!ProductName) return res.status(400).json({ error: 'ProductName is required.' });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      'INSERT INTO Product (ProductName, ProductionCost, SellingPrice, ShelfLifeDays, UnitWeight, Category, IsActive, QuantityInStock) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?)',
      [ProductName, ProductionCost || 0, SellingPrice || 0,
       ShelfLifeDays || 3, UnitWeight || '', Category || 'Other', initialStock]
    );

    const ProductID = result.insertId;
    for (const item of recipeItems) {
      await conn.query(
        'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
        [ProductID, item.IngredientID, item.QuantityRequired]
      );
    }

    if (initialStock > 0) {
      const consumeResult = await checkAndConsumeIngredients(conn, ProductID, initialStock);
      if (!consumeResult.ok) {
        await conn.rollback();
        if (consumeResult.reason === 'RECIPE_MISSING') {
          return res.status(400).json({ error: consumeResult.message, reason: consumeResult.reason, redirectTo: 'ingredients' });
        }
        return res.status(400).json({
          error: `Insufficient ingredient stock. ${consumeResult.message}`,
          reason: consumeResult.reason,
          insufficientIngredients: consumeResult.insufficient,
          redirectTo: 'ingredients'
        });
      }
    }

    await conn.commit();
    res.json({ message: 'Product added.', ProductID });
  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.put('/:id', async (req, res) => {
  const { SellingPrice, ProductName, Category } = req.body;
  try {
    await db.query(
      'UPDATE Product SET SellingPrice = ?, ProductName = ?, Category = ? WHERE ProductID = ?',
      [SellingPrice, ProductName, Category, req.params.id]
    );
    res.json({ message: 'Product updated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('UPDATE Product SET IsActive = FALSE WHERE ProductID = ?', [req.params.id]);
    res.json({ message: 'Product deactivated.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;