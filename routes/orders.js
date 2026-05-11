const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { normalizeCustomerName } = require('../utils/nameNormalizer');

async function hasOrderTypeColumn(conn = db) {
  const [rows] = await conn.query(
    "SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SaleOrder' AND COLUMN_NAME = 'OrderType'"
  );
  return Number(rows[0] && rows[0].cnt) > 0;
}

// Ensure OrderType column exists so we can persist order origin (Online/Offline).
// If missing, add it with default 'Online'. This prevents inferring OrderType from Status
// which caused Delivered orders to be shown as Offline even when they were originally Online.
(async function ensureOrderType() {
  try {
    const exists = await hasOrderTypeColumn();
    if (!exists) {
      await db.query("ALTER TABLE SaleOrder ADD COLUMN OrderType VARCHAR(20) DEFAULT 'Online' AFTER Status");
      console.log('Added OrderType column to SaleOrder');
    }
  } catch (err) {
    // If another process already added it or permission denied, ignore and continue.
    if (!String(err.message || '').toLowerCase().includes('duplicate') && !String(err.message || '').toLowerCase().includes('already')) {
      console.error('Could not ensure OrderType column:', err.message);
    }
  }
})();

// ─────────────────────────────────────────────────────────────
//  NOTE ON STOCK MANAGEMENT (TRIGGER-BASED)
//
//  Stock deduction is handled by database triggers:
//
//  For SaleOrder (product sales):
//    trg_SaleOrderContains_BeforeInsert
//      → Validates product stock availability
//      → Auto-fills UnitPrice from Product.SellingPrice if not provided
//    trg_SaleOrderContains_AfterInsert
//      → Deducts product stock automatically
//      → Updates SaleOrder.TotalAmount
//    trg_SaleOrderContains_AfterDelete
//      → Restores product stock if order line deleted
//
//  For ProductionBatch (product manufacturing):
//    trg_ProductionBatch_AfterInsert
//      → Deducts all ingredients per recipe
//      → Updates Product.QuantityInStock
//      → Logs to StockAuditLog
//      → Creates LowStockAlert if below minimum
//
//  SO: Backend just inserts, triggers handle the rest.
// ─────────────────────────────────────────────────────────────

// GET /api/orders — fetch all orders with detail (for admin/employees)
router.get('/', async (req, res) => {
  try {
    const orderTypeExists = await hasOrderTypeColumn();
    const [rows] = await db.query(`
      SELECT
        so.OrderID,
        so.OrderDate,
        so.Status           AS OrderStatus,
        ${orderTypeExists ? 'so.OrderType' : "CASE WHEN (SELECT NewStatus FROM SaleOrderAuditLog WHERE OrderID = so.OrderID ORDER BY ChangedAt ASC LIMIT 1) = 'Delivered' THEN 'Offline' ELSE 'Online' END AS OrderType"},
        c.CustomerID,
        c.CustomerName,
        p.ProductID,
        p.ProductName,
        sc.Quantity,
        sc.UnitPrice,
        sc.LineTotal
      FROM SaleOrder          so
      LEFT JOIN Customer      c  ON so.CustomerID = c.CustomerID
      LEFT JOIN SaleOrder_Contains sc ON so.OrderID    = sc.OrderID
      LEFT JOIN Product       p  ON sc.ProductID  = p.ProductID
      ORDER BY so.OrderID DESC, p.ProductName
    `);
    res.json(rows.map(o => ({
      ...o,
      CustomerName: normalizeCustomerName(o.CustomerName)
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/customer/:customerId — fetch customer's orders with details
router.get('/customer/:customerId', async (req, res) => {
  try {
    const orderTypeExists = await hasOrderTypeColumn();
    const [rows] = await db.query(`
      SELECT
        so.OrderID,
        so.OrderDate,
        so.Status,
        ${orderTypeExists ? 'so.OrderType' : "CASE WHEN (SELECT NewStatus FROM SaleOrderAuditLog WHERE OrderID = so.OrderID ORDER BY ChangedAt ASC LIMIT 1) = 'Delivered' THEN 'Offline' ELSE 'Online' END AS OrderType"},
        c.CustomerID,
        c.CustomerName,
        p.ProductID,
        p.ProductName,
        sc.Quantity,
        sc.UnitPrice,
        sc.LineTotal
      FROM SaleOrder so
      LEFT JOIN Customer c ON so.CustomerID = c.CustomerID
      LEFT JOIN SaleOrder_Contains sc ON so.OrderID = sc.OrderID
      LEFT JOIN Product p ON sc.ProductID = p.ProductID
      WHERE so.CustomerID = ?
      ORDER BY so.OrderID DESC, p.ProductName
    `, [req.params.customerId]);

    res.json(rows.map(o => ({
      ...o,
      CustomerName: normalizeCustomerName(o.CustomerName)
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/orders/:id — single order with all lines
router.get('/:id', async (req, res) => {
  try {
    const orderTypeExists = await hasOrderTypeColumn();
    const [rows] = await db.query(`
      SELECT
        so.OrderID,
        so.OrderDate,
        so.Status,
        ${orderTypeExists ? 'so.OrderType' : "CASE WHEN (SELECT NewStatus FROM SaleOrderAuditLog WHERE OrderID = so.OrderID ORDER BY ChangedAt ASC LIMIT 1) = 'Delivered' THEN 'Offline' ELSE 'Online' END AS OrderType"},
        so.TotalAmount,
        c.CustomerID,
        c.CustomerName,
        c.PhoneNumber,
        p.ProductID,
        p.ProductName,
        sc.Quantity,
        sc.UnitPrice,
        sc.LineTotal
      FROM SaleOrder          so
      LEFT JOIN Customer      c  ON so.CustomerID = c.CustomerID
      LEFT JOIN SaleOrder_Contains sc ON so.OrderID = sc.OrderID
      LEFT JOIN Product       p  ON sc.ProductID  = p.ProductID
      WHERE so.OrderID = ?
      ORDER BY p.ProductName
    `, [req.params.id]);
    
    if (!rows.length) return res.status(404).json({ error: 'Order not found.' });
    res.json(rows.map(o => ({
      ...o,
      CustomerName: normalizeCustomerName(o.CustomerName)
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/orders — place a new sale order (creates SaleOrder + SaleOrder_Contains line)
// Body: { CustomerID, ProductID, Quantity, UnitPrice? }
// Triggers handle: stock validation, deduction, TotalAmount update
router.post('/', async (req, res) => {
  const { CustomerID, ProductID, Quantity } = req.body;
  const requestedType = req.body.OrderType || req.body.orderType;
  const validOrderTypes = ['Online', 'Offline'];
  const orderType = validOrderTypes.includes(requestedType) ? requestedType : 'Online';
  const orderTypeExists = await hasOrderTypeColumn();
  
  if (!CustomerID) return res.status(400).json({ error: 'CustomerID is required.' });
  if (!ProductID)  return res.status(400).json({ error: 'ProductID is required.' });
  
  const qty = parseInt(Quantity);
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Quantity must be a positive integer.' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Verify customer exists
    const [custRows] = await conn.query('SELECT CustomerID FROM Customer WHERE CustomerID = ?', [CustomerID]);
    if (!custRows.length) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Create SaleOrder (status = Pending for online, Delivered for offline)
    const initialStatus = orderType === 'Offline' ? 'Delivered' : 'Pending';
    const orderInsertSql = orderTypeExists
      ? 'INSERT INTO SaleOrder (OrderDate, Status, OrderType, CustomerID) VALUES (CURDATE(), ?, ?, ?)'
      : 'INSERT INTO SaleOrder (OrderDate, Status, CustomerID) VALUES (CURDATE(), ?, ?)';
    const orderInsertParams = orderTypeExists
      ? [initialStatus, orderType, CustomerID]
      : [initialStatus, CustomerID];
    const [orderResult] = await conn.query(orderInsertSql, orderInsertParams);
    const OrderID = orderResult.insertId;

    // Add product line (trigger will check stock, deduct it, and auto-fill UnitPrice)
    await conn.query(
      'INSERT INTO SaleOrder_Contains (OrderID, ProductID, Quantity) VALUES (?, ?, ?)',
      [OrderID, ProductID, qty]
    );
    // ↑ Triggers fire:
    //   trg_SaleOrderContains_BeforeInsert:  validates stock, auto-fills UnitPrice
    //   trg_SaleOrderContains_AfterInsert:   deducts stock, updates SaleOrder.TotalAmount

    await conn.commit();
    res.json({
      message : `Order placed successfully.`,
      OrderID : OrderID,
      Quantity: qty,
      Status  : initialStatus,
      OrderType: orderTypeExists ? orderType : (initialStatus === 'Delivered' ? 'Offline' : 'Online')
    });

  } catch (err) {
    if (conn) await conn.rollback();
    // Trigger errors (insufficient stock) surface here
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/orders/:id — update order status (Pending → Processing → Baking → Ready → Shipped → Delivered)
router.put('/:id', async (req, res) => {
  const { Status } = req.body;
  const validStatuses = ['Pending', 'Processing', 'Baking', 'Ready', 'Shipped', 'Delivered', 'Cancelled'];
  
  if (!Status || !validStatuses.includes(Status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    await db.query(
      'UPDATE SaleOrder SET Status = ? WHERE OrderID = ?',
      [Status, req.params.id]
    );
    // ↑ Trigger trg_SaleOrder_AfterUpdate logs status change to SaleOrderAuditLog
    
    res.json({ message: `Order updated to ${Status}.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/orders/:id/status — update only the Status field
// Body: { status: 'Pending'|'Processing'|'Shipped'|'Delivered'|'Cancelled' }
router.put('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  
  console.log(`PUT /api/orders/${req.params.id}/status - status: ${status}`);
  
  if (!status || !validStatuses.includes(status)) {
    console.log(`Invalid status: ${status}`);
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const [result] = await db.query(
      'UPDATE SaleOrder SET Status = ? WHERE OrderID = ?',
      [status, req.params.id]
    );
    
    console.log(`Update result: affectedRows=${result.affectedRows}`);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    
    res.json({ message: `Order status updated to ${status}.`, status });
  } catch (err) { 
    console.error(`Error updating order status: ${err.message}`);
    res.status(500).json({ error: err.message }); 
  }
});

// PUT /api/orders/:id/type — update only the OrderType field
// Body: { type: 'Online'|'Offline' }
router.put('/:id/type', async (req, res) => {
  const { type } = req.body;
  const validTypes = ['Online', 'Offline'];
  
  if (!type || !validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  }

  const orderTypeExists = await hasOrderTypeColumn();
  if (!orderTypeExists) {
    return res.status(400).json({ error: 'OrderType is not available in the current database schema.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE SaleOrder SET OrderType = ? WHERE OrderID = ?',
      [type, req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    
    res.json({ message: `Order type updated to ${type}.`, type });
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

// DELETE /api/orders/:id — cancel entire order (restores all product stock via trigger)
router.delete('/:id', async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Check order exists and status
    const [orderRows] = await conn.query('SELECT Status FROM SaleOrder WHERE OrderID = ?', [req.params.id]);
    if (!orderRows.length) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    
    if (orderRows[0].Status === 'Delivered' || orderRows[0].Status === 'Cancelled') {
      return res.status(400).json({ error: `Cannot delete a ${orderRows[0].Status} order.` });
    }

    // Delete all order lines (trigger restores stock for each line)
    await conn.query('DELETE FROM SaleOrder_Contains WHERE OrderID = ?', [req.params.id]);
    // ↑ Trigger trg_SaleOrderContains_AfterDelete fires for each line:
    //   → restores product stock
    //   → updates SaleOrder.TotalAmount

    // Mark order as cancelled
    await conn.query('UPDATE SaleOrder SET Status = ? WHERE OrderID = ?', ['Cancelled', req.params.id]);
    // ↑ Trigger trg_SaleOrder_AfterUpdate logs status change

    await conn.commit();
    res.json({ message: `Order cancelled and stock restored.` });

  } catch (err) {
    if (conn) await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

// DELETE /api/orders/:id/lines/:productId — remove one product line from order
router.delete('/:id/lines/:productId', async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM SaleOrder_Contains WHERE OrderID = ? AND ProductID = ?',
      [req.params.id, req.params.productId]
    );
    // ↑ Trigger trg_SaleOrderContains_AfterDelete fires:
    //   → restores product stock
    //   → updates SaleOrder.TotalAmount

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Order line not found.' });
    }
    res.json({ message: 'Product removed from order and stock restored.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;