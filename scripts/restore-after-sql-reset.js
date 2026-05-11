const db = require('../db');

const CUSTOMER_CREDENTIALS = {
  'Anita Mehta': { username: 'anita', password: 'anita123' },
  'Rohan Joshi': { username: 'rohan', password: 'rohan123' },
  'Priya Kulkarni': { username: 'priya', password: 'priya123' },
  'Amit Shah': { username: 'amit', password: 'amit123' },
  'Neha Kapoor': { username: 'neha', password: 'neha123' },
  'Sunita Rao': { username: 'sunita', password: 'sunita123' },
  'Vikram Nair': { username: 'vikram', password: 'vikram123' },
  'Meera Joshi': { username: 'meera', password: 'meera123' },
  'Deepak More': { username: 'deepak', password: 'deepak123' },
};

const RECIPE_MAPPINGS = {
  'Bread': [
    { id: 1, qty: 500 },
    { id: 20, qty: 10 },
    { id: 19, qty: 5 },
    { id: 17, qty: 300 }
  ],
  'Brown Bread': [
    { id: 1, qty: 600 },
    { id: 20, qty: 12 },
    { id: 19, qty: 6 },
    { id: 17, qty: 350 }
  ],
  'Bun Maska': [
    { id: 1, qty: 250 },
    { id: 20, qty: 5 },
    { id: 19, qty: 3 },
    { id: 4, qty: 50 },
    { id: 17, qty: 150 }
  ],
  'Garlic Bread': [
    { id: 1, qty: 500 },
    { id: 20, qty: 10 },
    { id: 19, qty: 5 },
    { id: 4, qty: 100 },
    { id: 17, qty: 300 }
  ],
  'Plain Tea Bun': [
    { id: 1, qty: 200 },
    { id: 2, qty: 80 },
    { id: 20, qty: 4 },
    { id: 19, qty: 3 },
    { id: 4, qty: 40 },
    { id: 17, qty: 120 }
  ],
  'Black Forest Cake': [
    { id: 1, qty: 300 },
    { id: 2, qty: 250 },
    { id: 4, qty: 200 },
    { id: 18, qty: 4 },
    { id: 5, qty: 50 },
    { id: 25, qty: 250 }
  ],
  'Butter Cake': [
    { id: 1, qty: 350 },
    { id: 2, qty: 300 },
    { id: 4, qty: 250 },
    { id: 18, qty: 5 },
    { id: 23, qty: 10 }
  ],
  'Chocolate Cake': [
    { id: 1, qty: 300 },
    { id: 2, qty: 250 },
    { id: 4, qty: 200 },
    { id: 18, qty: 4 },
    { id: 5, qty: 60 },
    { id: 23, qty: 8 }
  ],
  'Tea Cake': [
    { id: 1, qty: 280 },
    { id: 2, qty: 220 },
    { id: 4, qty: 180 },
    { id: 18, qty: 3 },
    { id: 23, qty: 7 }
  ],
  'Brownie': [
    { id: 1, qty: 200 },
    { id: 2, qty: 300 },
    { id: 4, qty: 180 },
    { id: 18, qty: 3 },
    { id: 5, qty: 100 },
    { id: 24, qty: 150 }
  ],
  'Cupcake': [
    { id: 1, qty: 150 },
    { id: 2, qty: 120 },
    { id: 4, qty: 100 },
    { id: 18, qty: 2 },
    { id: 17, qty: 50 },
    { id: 23, qty: 3 }
  ],
  'Croissant': [
    { id: 1, qty: 400 },
    { id: 4, qty: 200 },
    { id: 20, qty: 8 },
    { id: 19, qty: 4 },
    { id: 17, qty: 180 }
  ],
  'Donut': [
    { id: 1, qty: 250 },
    { id: 2, qty: 150 },
    { id: 18, qty: 2 },
    { id: 21, qty: 80 },
    { id: 22, qty: 10 },
    { id: 17, qty: 100 }
  ],
  'Puff': [
    { id: 1, qty: 300 },
    { id: 4, qty: 250 },
    { id: 20, qty: 6 },
    { id: 17, qty: 150 }
  ],
  'Fruit Tart': [
    { id: 1, qty: 250 },
    { id: 4, qty: 150 },
    { id: 2, qty: 100 },
    { id: 18, qty: 2 },
    { id: 22, qty: 8 },
    { id: 26, qty: 100 }
  ],
  'Vanilla Muffin': [
    { id: 1, qty: 200 },
    { id: 2, qty: 150 },
    { id: 4, qty: 120 },
    { id: 18, qty: 3 },
    { id: 17, qty: 80 },
    { id: 23, qty: 5 },
    { id: 22, qty: 6 }
  ],
  'Almond Cookie': [
    { id: 1, qty: 180 },
    { id: 4, qty: 130 },
    { id: 2, qty: 120 },
    { id: 3, qty: 100 },
    { id: 18, qty: 2 },
    { id: 23, qty: 3 }
  ],
  'Choco Cookie': [
    { id: 1, qty: 200 },
    { id: 4, qty: 140 },
    { id: 2, qty: 130 },
    { id: 18, qty: 2 },
    { id: 5, qty: 40 },
    { id: 24, qty: 100 }
  ]
};

const LIQUID_KEYWORDS = ['milk', 'water', 'oil', 'cream', 'honey', 'juice', 'extract', 'essence', 'vanilla', 'lemon', 'coconut'];
const COUNT_KEYWORDS = ['egg'];

async function columnExists(table, column) {
  const [rows] = await db.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column]);
  return rows.length > 0;
}

async function ensureColumn(table, columnSql) {
  const columnName = columnSql.split(' ')[0];
  if (!(await columnExists(table, columnName))) {
    await db.query(`ALTER TABLE \`${table}\` ADD COLUMN ${columnSql}`);
  }
}

async function ensureCustomerAuth() {
  console.log('Checking Customer auth columns...');
  await ensureColumn('Customer', 'Username VARCHAR(50) UNIQUE');
  await ensureColumn('Customer', 'Password VARCHAR(100)');

  const [customers] = await db.query('SELECT CustomerID, CustomerName FROM Customer ORDER BY CustomerID');
  for (const customer of customers) {
    const creds = CUSTOMER_CREDENTIALS[customer.CustomerName] || {
      username: String(customer.CustomerName || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || `customer${customer.CustomerID}`,
      password: `${String(customer.CustomerName || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20) || `customer${customer.CustomerID}`}123`
    };
    await db.query('UPDATE Customer SET Username = ?, Password = ? WHERE CustomerID = ?', [creds.username, creds.password, customer.CustomerID]);
  }
}

async function ensureEmployeeAuth() {
  console.log('Checking Employee auth columns...');
  await ensureColumn('Employee', 'Password VARCHAR(100)');

  const [employees] = await db.query('SELECT EmployeeID FROM Employee ORDER BY EmployeeID');
  for (const employee of employees) {
    const empId = String(employee.EmployeeID);
    await db.query('UPDATE Employee SET Password = ? WHERE EmployeeID = ?', [`${empId}pass`, employee.EmployeeID]);
  }
}

async function ensureIngredientUnits() {
  console.log('Checking Ingredient units...');
  await ensureColumn('Ingredient', 'Unit VARCHAR(10) DEFAULT "g"');

  const [ingredients] = await db.query('SELECT IngredientID, Name FROM Ingredient');
  for (const ingredient of ingredients) {
    const nameLower = String(ingredient.Name || '').toLowerCase();
    let unit = 'g';
    if (LIQUID_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
      unit = 'ml';
    } else if (COUNT_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
      unit = 'pcs';
    }
    await db.query('UPDATE Ingredient SET Unit = ? WHERE IngredientID = ?', [unit, ingredient.IngredientID]);
  }
}

async function ensureProductStock() {
  console.log('Checking Product stock column...');
  await ensureColumn('Product', 'QuantityInStock INT NOT NULL DEFAULT 0');

  const [production] = await db.query(`
    SELECT ProductID, COALESCE(SUM(QuantityProduced), 0) AS Produced
    FROM ProductionBatch
    GROUP BY ProductID
  `);
  const [sold] = await db.query(`
    SELECT ProductID, COALESCE(SUM(Quantity), 0) AS Sold
    FROM SaleOrder_Contains
    GROUP BY ProductID
  `);

  const producedMap = new Map(production.map(row => [String(row.ProductID), Number(row.Produced) || 0]));
  const soldMap = new Map(sold.map(row => [String(row.ProductID), Number(row.Sold) || 0]));
  const [products] = await db.query('SELECT ProductID FROM Product');

  for (const product of products) {
    const productId = String(product.ProductID);
    const stock = Math.max(0, (producedMap.get(productId) || 0) - (soldMap.get(productId) || 0));
    await db.query('UPDATE Product SET QuantityInStock = ? WHERE ProductID = ?', [stock, product.ProductID]);
  }
}

async function ensureSaleOrderIds() {
  console.log('Checking OrderID columns...');
  const [saleOrderColumns] = await db.query('DESCRIBE SaleOrder');
  const [containsColumns] = await db.query('DESCRIBE SaleOrder_Contains');

  const saleOrderIdCol = saleOrderColumns.find(column => column.Field === 'OrderID');
  const containsOrderIdCol = containsColumns.find(column => column.Field === 'OrderID');

  await db.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    try {
      await db.query('ALTER TABLE SaleOrder_Contains DROP FOREIGN KEY saleorder_contains_ibfk_1');
    } catch (dropErr) {
      if (!/check that column\/key exists/i.test(dropErr.message)) {
        throw dropErr;
      }
    }

    if (saleOrderIdCol && !/varchar|char|text/i.test(saleOrderIdCol.Type)) {
      await db.query('ALTER TABLE SaleOrder DROP PRIMARY KEY, CHANGE COLUMN OrderID OrderID VARCHAR(20) NOT NULL');
      await db.query('ALTER TABLE SaleOrder ADD PRIMARY KEY (OrderID)');
    }

    if (containsOrderIdCol && !/varchar|char|text/i.test(containsOrderIdCol.Type)) {
      await db.query('ALTER TABLE SaleOrder_Contains MODIFY COLUMN OrderID VARCHAR(20) NOT NULL');
    }

    const [orders] = await db.query('SELECT OrderID FROM SaleOrder ORDER BY OrderID');
    const numericOrders = orders.filter(order => !String(order.OrderID).startsWith('ORD'));

    if (numericOrders.length) {
      const [maxRows] = await db.query(`
        SELECT MAX(CAST(SUBSTRING(OrderID, 4) AS UNSIGNED)) AS maxNum
        FROM SaleOrder
        WHERE OrderID LIKE 'ORD%'
      `);
      let nextNum = (maxRows[0] && maxRows[0].maxNum ? Number(maxRows[0].maxNum) : 0) + 1;

      for (const order of numericOrders) {
        const oldId = String(order.OrderID).trim();
        const newId = `ORD${String(nextNum).padStart(3, '0')}`;
        await db.query('UPDATE SaleOrder SET OrderID = ? WHERE OrderID = ?', [newId, oldId]);
        await db.query('UPDATE SaleOrder_Contains SET OrderID = ? WHERE OrderID = ?', [newId, oldId]);
        nextNum += 1;
      }
    }

    try {
      await db.query(`
        ALTER TABLE SaleOrder_Contains
        ADD CONSTRAINT saleorder_contains_ibfk_1
        FOREIGN KEY (OrderID) REFERENCES SaleOrder(OrderID)
        ON DELETE CASCADE
      `);
    } catch (addErr) {
      if (!/duplicate key|already exists/i.test(addErr.message)) {
        throw addErr;
      }
    }
  } finally {
    await db.query('SET FOREIGN_KEY_CHECKS = 1');
  }
}

async function restoreRecipes() {
  console.log('Restoring product recipes...');
  const [products] = await db.query('SELECT ProductID, ProductName FROM Product WHERE IsActive = TRUE');

  for (const product of products) {
    const recipeItems = RECIPE_MAPPINGS[product.ProductName];
    if (!recipeItems) continue;

    await db.query('DELETE FROM ProductIngredient WHERE ProductID = ?', [product.ProductID]);
    for (const item of recipeItems) {
      await db.query(
        'INSERT INTO ProductIngredient (ProductID, IngredientID, QuantityRequired) VALUES (?, ?, ?)',
        [product.ProductID, item.id, item.qty]
      );
    }
  }
}

async function main() {
  try {
    console.log('Restoring BakeFlow schema and seed data...');
    await ensureCustomerAuth();
    await ensureEmployeeAuth();
    await ensureIngredientUnits();
    await ensureSaleOrderIds();
    await ensureProductStock();
    await restoreRecipes();
    console.log('\n✅ Restore completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Restore failed:', err.message);
    process.exit(1);
  }
}

main();