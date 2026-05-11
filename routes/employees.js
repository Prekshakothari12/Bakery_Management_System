const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT EmployeeID, FullName, Role, Salary, JoiningDate, PhoneNumber,
             CASE WHEN Salary >= 30000 THEN 'Senior' WHEN Salary >= 25000 THEN 'Mid' ELSE 'Junior' END AS Band,
             TIMESTAMPDIFF(YEAR, JoiningDate, CURDATE()) AS YearsOfService
      FROM Employee ORDER BY Role, FullName
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
