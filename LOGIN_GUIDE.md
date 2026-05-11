# 🍰 BakeFlow - Quick Start Guide

## How to Start the Application

### Method 1: Simple (Recommended)
1. Double-click `START.bat` in the project folder
   - This automatically kills old processes and starts the server
2. Wait for message: "Sampada Bakery server running at http://localhost:3000"
3. Open browser: http://localhost:3000

### Method 2: Manual
```powershell
taskkill /F /IM node.exe
Start-Sleep -Seconds 2
node server.js
```

---

## How to Login

### Admin Account
**Step 1:** Click the **Admin** button (◆ symbol)

**Step 2:** Fill in the form:
- ID: `admin`
- Password: `admin123`

**Step 3:** Either:
- Click the **Sign In** button, OR
- Press **Enter** key

✅ You should see the Dashboard

---

### Customer Account  
**Step 1:** Click the **Customer** button (☺ symbol)

**Step 2:** Fill in the form:
- ID: `anita` (or: rohan, priya, amit, neha, sunita, vikram, meera, deepak)
- Password: `anita` (same as ID - phone number is the password)

**Step 3:** Press **Enter** or click **Sign In**

---

### Employee Account
**Step 1:** Click the **Employee** button (☉ symbol)

**Step 2:** Fill in the form:
- ID: Employee phone number (e.g., `9012133344` for Riya Sharma)
- Password: Same phone number

**Step 3:** Press **Enter** or click **Sign In**

---

## Troubleshooting

### "Address already in use :::3000"
**Solution:** Double-click `START.bat` - it will kill any old processes

### "Cannot connect to server"
**Solution:** Make sure the terminal shows:
```
Sampada Bakery server running at http://localhost:3000
MySQL connected
```

### "Invalid admin credentials"
**Solution:** Make sure you:
1. Clicked the **Admin** button first (must be highlighted)
2. Entered exactly: ID=`admin`, Password=`admin123`
3. MySQL is connected

### Database not found
**Solution:** Run the database setup:
```powershell
node setup-db.js
```

---

## Key Features

✅ **Admin Dashboard** - View orders, revenue, inventory
✅ **In-Store Order** - Place orders for customers  
✅ **Products** - Manage inventory (17 products)
✅ **Ingredients** - Track stock levels
✅ **Customers** - Manage customer data
✅ **Employees** - Manage staff
✅ **Automatic Stock Deduction** - Triggers handle it!

---

## Database

- Database: `bakery_db`
- 14 Tables with triggers
- All stock management is automatic via SQL triggers
- No manual stock code needed!

---

## API Endpoints

All available at: `http://localhost:3000/api/`

- `POST /auth/login` - Login
- `GET /products` - List products
- `GET /orders` - List orders
- `POST /orders` - Create order
- `GET /ingredients` - List ingredients
- And more...

---

## Files

- `START.bat` - Quick start (recommended)
- `server.js` - Main server
- `db.js` - Database connection
- `routes/` - API endpoints
- `public/` - Frontend files
- `bakery_db_setup.sql` - Database schema

---

✨ **The system is ready! Just run START.bat and login.** ✨
