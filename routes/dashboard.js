const express = require('express');
const router = express.Router();
const db = require('../db');
const { normalizeCustomerName } = require('../utils/nameNormalizer');

router.get('/stats', async (req, res) => {
  try {
    const [[{ totalProducts }]]  = await db.query('SELECT COUNT(*) AS totalProducts FROM Product WHERE IsActive=TRUE');
    const [[{ totalOrders }]]    = await db.query('SELECT COUNT(*) AS totalOrders FROM SaleOrder');
    const [[{ totalCustomers }]] = await db.query('SELECT COUNT(*) AS totalCustomers FROM Customer');
    const [[{ lowStock }]]       = await db.query('SELECT COUNT(*) AS lowStock FROM Ingredient WHERE QuantityInStock < MinimumStockLevel');
    const [[{ pendingOrders }]]  = await db.query("SELECT COUNT(*) AS pendingOrders FROM SaleOrder WHERE Status='Pending'");
    const [[{ totalRevenue }]]   = await db.query(`
      SELECT COALESCE(SUM(sc.Quantity * p.SellingPrice), 0) AS totalRevenue
      FROM SaleOrder_Contains sc
      JOIN Product p ON sc.ProductID = p.ProductID
    `);

    const [recentOrders] = await db.query(`
      SELECT so.OrderID, so.OrderDate, so.Status,
             c.CustomerName, p.ProductName, sc.Quantity,
             (sc.Quantity * p.SellingPrice) AS LineTotal
      FROM SaleOrder so
      JOIN Customer c            ON so.CustomerID = c.CustomerID
      JOIN SaleOrder_Contains sc ON so.OrderID    = sc.OrderID
      JOIN Product p             ON sc.ProductID  = p.ProductID
      ORDER BY so.OrderDate DESC LIMIT 5
    `);

    const [topProducts] = await db.query(`
      SELECT p.ProductName, p.Category,
             SUM(sc.Quantity)                  AS TotalSold,
             SUM(sc.Quantity * p.SellingPrice) AS Revenue
      FROM SaleOrder_Contains sc
      JOIN Product p ON sc.ProductID = p.ProductID
      GROUP BY p.ProductID
      ORDER BY TotalSold DESC LIMIT 5
    `);

    res.json({
      totalProducts, totalOrders, totalCustomers,
      lowStock, pendingOrders, totalRevenue,
      recentOrders: recentOrders.map(o => ({
        ...o,
        CustomerName: normalizeCustomerName(o.CustomerName)
      })),
      topProducts
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;