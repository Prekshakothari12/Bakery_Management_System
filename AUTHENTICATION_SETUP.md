# INSTALLATION & SETUP GUIDE

## Step 1: Install Dependencies

```bash
cd c:\Users\preks\OneDrive\Desktop\Trigger_dbms
npm install bcrypt
```

## Step 2: Setup Authentication Demo Data

Run this command to create demo customer and employee records:

```bash
node scripts/setup-auth-demo.js
```

This will:
- Add Password columns to Customer and Employee tables (if missing)
- Create demo customer: customer@example.com / Customer123
- Create demo employee: employee@example.com (EMP101) / Employee123

## Step 3: Start the Server

```bash
npm start
```

Server will run at: http://localhost:3000

## Demo Credentials

### Customer Login:
- **Email:** customer@example.com
- **Password:** Customer123

### Employee Login:
- **Email:** employee@example.com
- **Employee ID:** EMP101
- **Password:** Employee123

### Admin Login (Legacy):
- **Admin ID:** admin
- **Password:** admin123

## Complete Flow:

1. Start MySQL server
2. Run: `npm install bcrypt`
3. Run: `node scripts/setup-auth-demo.js`
4. Run: `npm start`
5. Open: http://localhost:3000
6. Try Customer/Employee login
7. Test dashboards
8. Test logout functionality
