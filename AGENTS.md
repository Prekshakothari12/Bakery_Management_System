# AGENTS.md

Agent guidance for this repository (Sampada Bakery Management System).

## What this project is
- Node.js + Express backend with MySQL (`mysql2` promise pool).
- Single-page frontend served from `public/`.
- API is mounted under `/api/*` in `server.js`.

## Fast start
- Install deps: `npm install`
- Run app: `npm start`
- Dev mode: `npm run dev`
- Default URL: `http://localhost:3000`

## Required environment
Create `.env` in repo root (or rely on defaults in `db.js`):
- `PORT` (default `3000`)
- `DB_HOST` (default `localhost`)
- `DB_USER` (default `root`)
- `DB_PASSWORD` (default empty)
- `DB_NAME` (default `bakery_db`)
- `DB_PORT` (default `3306`)

## Architecture map
- Entry/server wiring: [server.js](server.js)
- DB pool: [db.js](db.js)
- API routes: [routes/](routes/)
  - Auth: [routes/auth.js](routes/auth.js)
  - Products: [routes/products.js](routes/products.js)
  - Orders: [routes/orders.js](routes/orders.js)
  - Customers: [routes/customers.js](routes/customers.js)
  - Ingredients: [routes/ingredients.js](routes/ingredients.js)
  - Employees: [routes/employees.js](routes/employees.js)
  - Dashboard stats: [routes/dashboard.js](routes/dashboard.js)
- Frontend SPA shell + sections: [public/index.html](public/index.html)
- Frontend logic and API calls: [public/app.js](public/app.js)
- Frontend styling: [public/style.css](public/style.css)

## Conventions agents should follow
- Keep backend route style consistent:
  - `express.Router()` per file.
  - async handlers with `try/catch`.
  - return JSON; on failures use `res.status(500).json({ error: err.message })`.
- Reuse shared DB instance from [db.js](db.js); do not create per-route pools.
- Preserve existing API base contract used by frontend:
  - Frontend uses `const API = 'http://localhost:3000/api'` in [public/app.js](public/app.js).
  - If adding endpoints, mount under `/api/...` and update frontend callers.
- Keep naming aligned with current schema conventions (e.g., `CustomerID`, `ProductID`, `OrderID`).

## Important pitfalls
- No automated tests are configured in `package.json`; validate by running app and manually exercising affected flows.
- Catch-all route in [server.js](server.js) serves `public/index.html`; keep it after API mounts.
- Current auth is demo-style in [routes/auth.js](routes/auth.js):
  - Admin credentials are hardcoded.
  - Customer/employee passwords are derived from phone values.
  - Do not silently harden or redesign auth unless explicitly requested.
- Order placement in [routes/orders.js](routes/orders.js) deducts ingredient stock via `ProductIngredient`; preserve this side effect when changing order logic.

## Change checklist for agents
- If editing API shape, also update dependent frontend calls in [public/app.js](public/app.js).
- Keep route responses stable (`message`, `error`, key casing) unless task requires a breaking change.
- Run `npm start` (or `npm run dev`) after changes and check for startup/runtime errors.
