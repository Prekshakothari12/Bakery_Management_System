/* ══════════════════════════════════════════════
   BAKEFLOW — Frontend Logic
   Small bakery management system
══════════════════════════════════════════════ */

const API = 'http://localhost:3000/api';

let currentUser    = null;
let currentRole    = null;
let allProducts    = [];
let allOrders      = [];
let allCustomers   = [];
let allIngredients = [];
let allSuppliers   = [];
let recipeIngredientOptions = [];
let restockIngId   = null;
let restockOrders  = [];       // in-memory restock workflow
let restockCounter = 1;
const offlineOrderIds = new Set();  // track in-store orders in session

function normalizeCustomerName(name) {
  const value = String(name || '').trim();
  if (!value) return value;
  return value.toLowerCase() === 'anita' ? 'Anita Sharma' : value;
}

function toOrderNumber(orderId) {
  const str = String(orderId || '');
  const digits = str.match(/\d+/g);
  if (!digits || !digits.length) return 0;
  const last = parseInt(digits[digits.length - 1], 10);
  return Number.isFinite(last) ? last : 0;
}

function sortOrdersBySequence(data) {
  if (!Array.isArray(data)) return [];
  return [...data].sort((a, b) => toOrderNumber(a && a.OrderID) - toOrderNumber(b && b.OrderID));
}

function formatWholeCurrency(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-IN');
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('topbar-date').textContent =
    new Date().toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  const productsBody = document.getElementById('products-body');
  if (productsBody && !productsBody.dataset.actionBound) {
    productsBody.dataset.actionBound = '1';
    productsBody.addEventListener('click', event => {
      const button = event.target.closest('button[data-product-action]');
      if (!button || !productsBody.contains(button)) return;

      const { productAction, productId, productName } = button.dataset;
      if (productAction === 'edit') {
        openEditProduct(productId);
      } else if (productAction === 'delete') {
        deleteProduct(productId);
      } else if (productAction === 'stock') {
        openAddStock(productId, productName || 'Product');
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════
// SIMPLIFIED LOGIN SYSTEM - USERNAME & PASSWORD ONLY
// ═════════════════════════════════════════════════════════════

function selectRole(role, btn) {
  document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  // Show only the selected role's credentials
  document.querySelectorAll('.demo-cred-item').forEach(item => item.classList.remove('active'));
  const credId = `cred-${role}`;
  const credItem = document.getElementById(credId);
  if (credItem) credItem.classList.add('active');
  
  // Clear form
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('login-error').classList.add('hidden');
}

// Comprehensive login validation
function validateLoginInputs(username, password) {
  // Trim inputs
  const trimmedUsername = (username || '').trim();
  const trimmedPassword = (password || '').trim();
  
  // Check if fields are empty
  if (!trimmedUsername) {
    return { valid: false, message: 'Username is required.' };
  }
  if (!trimmedPassword) {
    return { valid: false, message: 'Password is required.' };
  }
  
  // Length validations
  if (trimmedUsername.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters.' };
  }
  if (trimmedUsername.length > 50) {
    return { valid: false, message: 'Username must not exceed 50 characters.' };
  }
  
  // Password validations
  if (trimmedPassword.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters.' };
  }
  if (trimmedPassword.length > 100) {
    return { valid: false, message: 'Password must not exceed 100 characters.' };
  }
  
  // Prevent leading/trailing spaces
  if (username !== trimmedUsername || password !== trimmedPassword) {
    return { valid: false, message: 'Username and password cannot have leading or trailing spaces.' };
  }
  
  // Validate password has at least one letter and one number/special char
  const hasLetter = /[a-zA-Z]/.test(trimmedPassword);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};:'"\\|,.<>?\/>]/.test(trimmedPassword);
  if (!hasLetter || !hasNumberOrSpecial) {
    return { valid: false, message: 'Password must contain letters and numbers or special characters.' };
  }
  
  return { valid: true, message: '' };
}

async function doLogin() {
  const role = document.querySelector('.role-btn.active').dataset.role;
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');

  try {
    // Validate inputs
    const validation = validateLoginInputs(username, password);
    if (!validation.valid) {
      errEl.textContent = validation.message;
      errEl.classList.remove('hidden');
      return;
    }

    // Send login request to backend
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      errEl.textContent = data.error || 'Invalid username or password.';
      errEl.classList.remove('hidden');
      return;
    }

    // Successful login
    currentUser = data.user;
    currentRole = data.role;
    bootApp();

  } catch (err) {
    console.error('Login error:', err);
    errEl.textContent = 'Cannot connect to server. Please start the backend.';
    errEl.classList.remove('hidden');
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('login-screen').classList.contains('hidden')) {
    doLogin();
  }
});

// ── BOOT ──────────────────────────────────────
function bootApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');

  const displayName = currentRole === 'customer'
    ? normalizeCustomerName(currentUser.name)
    : currentUser.name;

  document.getElementById('sidebar-username').textContent  = displayName;
  document.getElementById('sidebar-avatar').textContent    = displayName[0].toUpperCase();
  document.getElementById('sidebar-role-badge').textContent =
    currentRole === 'employee' ? (currentUser.empRole || 'Employee') :
    currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
  document.getElementById('topbar-user').textContent = displayName;

  buildNav();
  if (currentRole === 'admin')    navigateTo('dashboard');
  if (currentRole === 'customer') navigateTo('browse-products'); 
  if (currentRole === 'employee') navigateTo('emp-dashboard');
}

// ── HELPER: Format quantity for display ───────
function formatQuantity(qty, unit) {
  // For whole-number units (pieces, eggs, items, etc), display as integer
  const wholeNumberUnits = ['piece', 'pieces', 'pc', 'pcs', 'egg', 'eggs', 'item', 'items', 'loaf', 'loaves', 'dozen', 'unit', 'units'];
  const isWholeUnit = wholeNumberUnits.some(u => (unit || '').toLowerCase().includes(u));
  
  if (isWholeUnit) {
    return Math.round(parseFloat(qty));
  }
  // For weight/volume (kg, g, ml, l), show 2 decimals
  return parseFloat(qty).toFixed(2);
}

function readWholeNumberInput(id, allowEmpty = false) {
  const input = document.getElementById(id);
  const raw = String(input ? input.value : '').trim();

  if (raw === '') {
    return allowEmpty ? null : 0;
  }

  if (!/^\d+$/.test(raw)) {
    return NaN;
  }

  return Number(raw);
}

function formatRecipeQuantity(item) {
  const unit = item.Unit || 'g';
  const ingredientName = String(item.IngredientName || '').toLowerCase();
  const isEggIngredient = ingredientName.includes('egg');
  const isWholeUnit = ['piece', 'pieces', 'pc', 'pcs', 'egg', 'eggs', 'item', 'items', 'loaf', 'loaves', 'dozen', 'unit', 'units']
    .some(u => unit.toLowerCase().includes(u));
  const numericQty = Number(item.QuantityRequired);

  if (Number.isFinite(numericQty) && (isEggIngredient || isWholeUnit)) {
    return numericQty > 0 ? Math.ceil(numericQty) : 0;
  }

  return Number.isFinite(numericQty)
    ? formatQuantity(numericQty, unit)
    : item.QuantityRequired;
}

function normalizeEditedRecipeItems(items) {
  return (items || []).map(item => {
    const ingredient = recipeIngredientOptions.find(i => String(i.IngredientID) === String(item.IngredientID));
    const ingredientName = String(ingredient?.Name || '').toLowerCase();
    const quantity = Number(item.QuantityRequired);

    if (Number.isFinite(quantity) && ingredientName.includes('egg')) {
      return { ...item, QuantityRequired: quantity > 0 ? Math.ceil(quantity) : quantity };
    }

    return item;
  });
}

// ── NAV ───────────────────────────────────────
const NAV_ADMIN = [
  { id:'dashboard',   label:'Dashboard',      icon:'&#9632;' },
  { id:'orders',      label:'Orders',         icon:'&#9700;' },
  { id:'shop-order',  label:'In-Store Order', icon:'&#9654;' },
  { id:'products',    label:'Products',       icon:'&#9670;' },
  { id:'ingredients', label:'Ingredients',    icon:'&#9679;' },
  { id:'recipes',     label:'Recipes',        icon:'&#9776;' },
  { id:'customers',   label:'Customers',      icon:'&#9786;' },
  { id:'employees',   label:'Employees',      icon:'&#9737;' },
];
const NAV_CUSTOMER = [
  { id:'browse-products', label:'Menu',         icon:'&#9776;' },
  { id:'my-orders',       label:'My Orders',    icon:'&#9700;' },
  { id:'place-order',     label:'Place Order',  icon:'&#43;'   },
  { id:'support',         label:'Help & Support',icon:'&#9742;' },
];
const NAV_EMPLOYEE = [
  { id:'emp-dashboard',   label:'Dashboard',    icon:'&#9632;' },
  { id:'shop-order',      label:'In-Store Order',icon:'&#9654;' },
  { id:'products',        label:'Products',     icon:'&#9670;' },
  { id:'emp-ingredients', label:'Ingredients',  icon:'&#9679;' },
  { id:'recipes',         label:'Recipes',      icon:'&#9776;' },
];

function buildNav() {
  const items = currentRole==='admin' ? NAV_ADMIN :
                currentRole==='customer' ? NAV_CUSTOMER : NAV_EMPLOYEE;
  document.getElementById('sidebar-nav').innerHTML = items.map(i =>
    `<button class="nav-item" id="nav-${i.id}" onclick="navigateTo('${i.id}')">
       <span class="nav-icon">${i.icon}</span><span>${i.label}</span>
     </button>`
  ).join('');
}

// ── NAVIGATION ────────────────────────────────
const PAGE_TITLES = {
  'dashboard':       ['Dashboard',       'BakeFlow / Dashboard'],
  'orders':          ['Orders',          'BakeFlow / Orders'],
  'products':        ['Products',        'BakeFlow / Products'],
  'customers':       ['Customers',       'BakeFlow / Customers'],
  'ingredients':     ['Ingredients',     'BakeFlow / Ingredients'],
  'employees':       ['Employees',       'BakeFlow / Employees'],
  'recipes':         ['Recipes',         'BakeFlow / Recipes'],
  'shop-order':      ['In-Store Order',  'BakeFlow / In-Store Order'],
  'my-orders':       ['My Orders',       'BakeFlow / My Orders'],
  'place-order':     ['Place an Order',  'BakeFlow / Order'],
  'browse-products': ['Our Menu',        'BakeFlow / Menu'],
  'support':         ['Help & Support',  'BakeFlow / Support'],
  'emp-dashboard':   ['Dashboard',       'BakeFlow / Dashboard'],
  'emp-ingredients': ['Ingredients',     'BakeFlow / Ingredients'],
};

const SECTION_LOADERS = {
  'dashboard':       loadDashboard,
  'orders':          loadOrders,
  'products':        loadProducts,
  'customers':       loadCustomers,
  'ingredients':     loadIngredients,
  'employees':       loadEmployees,
  'recipes':         loadRecipes,
  'shop-order':      loadShopOrder,
  'my-orders':       loadMyOrders,
  'place-order':     loadPlaceOrder,
  'browse-products': loadBrowseProducts,
  'support':         () => {},
  'emp-dashboard':   loadEmpDashboard,
  'emp-ingredients': loadEmpIngredients,
};

function navigateTo(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));

  const sec = document.getElementById(`sec-${id}`);
  if (sec) sec.classList.remove('hidden');
  const btn = document.getElementById(`nav-${id}`);
  if (btn) btn.classList.add('active');

  const [title, crumb] = PAGE_TITLES[id] || [id, ''];
  document.getElementById('page-title').textContent  = title;
  document.getElementById('breadcrumb').textContent  = crumb;

  if (SECTION_LOADERS[id]) SECTION_LOADERS[id]();
}

// ── DASHBOARD ─────────────────────────────────
async function loadDashboard() {
  try {
    const data = await get('/dashboard/stats');
    document.getElementById('stat-revenue').innerHTML    = '&#8377;' + Number(data.totalRevenue).toLocaleString('en-IN');
    document.getElementById('stat-orders').textContent   = data.totalOrders;
    document.getElementById('stat-pending-sub').textContent = data.pendingOrders + ' pending';
    document.getElementById('stat-products').textContent = data.totalProducts;
    document.getElementById('stat-lowstock').textContent = data.lowStock;
    document.getElementById('stat-customers').textContent= data.totalCustomers;

    document.getElementById('dash-recent-orders').innerHTML =
      (data.recentOrders || []).map(o => `
        <tr>
          <td><strong>${o.OrderID}</strong></td>
          <td>${displayCustomerName(o)}</td>
          <td>${displayProductName(o)}</td>
          <td>&#8377;${Number(o.LineTotal).toLocaleString('en-IN')}</td>
          <td>${statusBadge(o.Status)}</td>
        </tr>`).join('') ||
      '<tr><td colspan="5" class="text-center text-muted" style="padding:16px">No orders yet</td></tr>';

    document.getElementById('dash-top-products').innerHTML =
      (data.topProducts || []).map(p => `
        <tr>
          <td><strong>${p.ProductName}</strong><br><span class="text-muted" style="font-size:11px">${p.Category}</span></td>
          <td>${p.TotalSold}</td>
          <td>&#8377;${Number(p.Revenue).toLocaleString('en-IN')}</td>
        </tr>`).join('') ||
      '<tr><td colspan="3" class="text-center text-muted" style="padding:16px">No data</td></tr>';

    const lowData = await get('/ingredients/low-stock');
    document.getElementById('dash-low-stock').innerHTML = lowData.length
      ? lowData.slice(0,5).map(i => `
          <tr>
            <td><strong>${i.Name}</strong></td>
            <td>${i.QuantityInStock}</td>
            <td>${i.MinimumStockLevel}</td>
            <td>${stockBadge(i.QuantityInStock, i.MinimumStockLevel)}</td>
          </tr>`).join('')
      : '<tr><td colspan="4" class="text-center text-muted" style="padding:14px">All ingredients adequately stocked</td></tr>';

    const summaryEl = document.getElementById('dash-summary');
    if (summaryEl) summaryEl.innerHTML = '';
  } catch { toast('Could not load dashboard', true); }
}

// ── PRODUCTS ──────────────────────────────────
async function loadProducts() {
  allProducts = await get('/products');
  renderProducts(allProducts);
}

function renderProducts(data) {
  const canAdd = document.getElementById('add-product-btn');
  if (canAdd) canAdd.style.display = currentRole === 'admin' ? '' : 'none';

  document.getElementById('products-body').innerHTML = data.map((p, idx) => {
    const margin = p.SellingPrice > 0
      ? ((p.SellingPrice - p.ProductionCost) / p.SellingPrice * 100).toFixed(1)
      : '0.0';
    const cls    = margin >= 50 ? 'margin-high' : margin >= 30 ? 'margin-mid' : 'margin-low';
    const stock  = parseInt(p.QuantityInStock) || 0;
    const stockCls = stock === 0 ? 'badge-outstock' : stock < 5 ? 'badge-lowstock' : 'badge-adequate';
    const stockLabel = stock === 0 ? 'Out of Stock' : stock < 5 ? 'Low' : 'In Stock';
    const adminBtns = currentRole === 'admin'
      ? `<button type="button" class="btn btn-sm btn-ghost" data-product-action="edit" data-product-id="${p.ProductID}">Edit</button>
         <button type="button" class="btn btn-sm btn-ghost" data-product-action="delete" data-product-id="${p.ProductID}" style="color:var(--danger)">Remove</button>` : '';
    const empStockBtn = currentRole === 'employee'
      ? `<button type="button" class="btn btn-sm btn-ghost" data-product-action="stock" data-product-id="${p.ProductID}" data-product-name="${p.ProductName}">+ Stock</button>` : '';
    return `<tr>
      <td><span class="text-muted" style="font-size:11px">${idx + 1}</span></td>
      <td><strong>${p.ProductName}</strong></td>
      <td>${p.Category}</td>
      <td>${p.UnitWeight || '&mdash;'}</td>
      <td>&#8377;${p.ProductionCost}</td>
      <td><strong>&#8377;${p.SellingPrice}</strong></td>
      <td><span class="margin-pill ${cls}">${margin}%</span></td>
      <td>${p.ShelfLifeDays}d</td>
      <td><strong>${stock}</strong> <span class="badge ${stockCls}" style="font-size:10px">${stockLabel}</span></td>
      <td style="display:flex;gap:6px;flex-wrap:wrap">${adminBtns}${empStockBtn}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="10" class="text-center text-muted" style="padding:18px">No products</td></tr>';
}

function filterProducts() {
  const q   = document.getElementById('product-search').value.toLowerCase();
  const cat = document.getElementById('product-cat-filter').value;
  renderProducts((allProducts || []).filter(p => {
    if (!p) return false;
    return (!q || (p.ProductName && p.ProductName.toLowerCase().includes(q))) &&
           (!cat || p.Category === cat);
  }));
}

async function ensureRecipeIngredientOptions() {
  if (recipeIngredientOptions.length) return;
  const data = await get('/ingredients');
  recipeIngredientOptions = Array.isArray(data) ? data : [];
}

function recipeOptionsHtml(selectedId = '') {
  return '<option value="">-- Select ingredient --</option>' +
    recipeIngredientOptions.map(i =>
      `<option value="${i.IngredientID}" data-unit="${i.Unit || 'g'}" ${String(i.IngredientID) === String(selectedId) ? 'selected' : ''}>${i.Name}</option>`
    ).join('');
}

function getUnitForIngredient(ingredientId) {
  const ing = recipeIngredientOptions.find(i => String(i.IngredientID) === String(ingredientId));
  return ing ? (ing.Unit || 'g') : 'g';
}

function renderRecipeRows(containerId, items = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const safeItems = items.length ? items : [{ IngredientID: '', QuantityRequired: '' }];
  container.innerHTML = safeItems.map(item => {
    const unit = getUnitForIngredient(item.IngredientID);
    return `
    <div class="recipe-row" style="display:grid;grid-template-columns:1fr 110px 70px auto;gap:8px;align-items:end;margin-bottom:8px">
      <div class="form-group" style="margin-bottom:0">
        <label>Ingredient</label>
        <select class="recipe-ing-id" onchange="updateRecipeRowUnit(this)" style="width:100%;box-sizing:border-box"><option value="">-- Select --</option>${recipeOptionsHtml(item.IngredientID)}</select>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label>Quantity</label>
        <input class="recipe-ing-qty" type="number" min="0.01" step="0.01" value="${item.QuantityRequired || ''}" placeholder="e.g. 100" style="width:100%;box-sizing:border-box"/>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label>Unit</label>
        <input class="recipe-ing-unit" type="text" value="${unit}" readonly style="background:var(--ivory);cursor:not-allowed;width:100%;box-sizing:border-box;font-size:13px"/>
      </div>
      <button class="btn btn-ghost" type="button" onclick="removeRecipeRow(this)">Remove</button>
    </div>
  `;
  }).join('');
}

function updateRecipeRowUnit(select) {
  const row = select.closest('.recipe-row');
  if (!row) return;
  const unit = getUnitForIngredient(select.value);
  const unitInput = row.querySelector('.recipe-ing-unit');
  if (unitInput) unitInput.value = unit;
}

function addRecipeRow(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const wrap = document.createElement('div');
  wrap.className = 'recipe-row';
  wrap.style.cssText = 'display:grid;grid-template-columns:1fr 110px 70px auto;gap:8px;align-items:end;margin-bottom:8px';
  wrap.innerHTML = `
    <div class="form-group" style="margin-bottom:0">
      <label>Ingredient</label>
      <select class="recipe-ing-id" onchange="updateRecipeRowUnit(this)" style="width:100%;box-sizing:border-box"><option value="">-- Select --</option>${recipeOptionsHtml('')}</select>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label>Quantity</label>
      <input class="recipe-ing-qty" type="number" min="0.01" step="0.01" placeholder="e.g. 100" style="width:100%;box-sizing:border-box"/>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label>Unit</label>
      <input class="recipe-ing-unit" type="text" value="" readonly style="background:var(--ivory);cursor:not-allowed;width:100%;box-sizing:border-box;font-size:13px"/>
    </div>
    <button class="btn btn-ghost" type="button" onclick="removeRecipeRow(this)">Remove</button>
  `;
  container.appendChild(wrap);
}

function removeRecipeRow(btn) {
  const row = btn.closest('.recipe-row');
  if (!row) return;
  const container = row.parentElement;
  row.remove();
  if (!container.querySelector('.recipe-row')) addRecipeRow(container.id);
}

function collectRecipeItems(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.recipe-row')).map(row => ({
    IngredientID: row.querySelector('.recipe-ing-id').value,
    QuantityRequired: parseFloat(row.querySelector('.recipe-ing-qty').value),
    Unit: row.querySelector('.recipe-ing-unit')?.value || 'g'
  })).filter(item => item.IngredientID && !isNaN(item.QuantityRequired) && item.QuantityRequired > 0);
}

function resetAddProductForm() {
  document.getElementById('pf-name').value = '';
  document.getElementById('pf-cost').value = '';
  document.getElementById('pf-price').value = '';
  document.getElementById('pf-shelf').value = '';
  document.getElementById('pf-wt').value = '';
  document.getElementById('pf-qty').value = '';
  document.getElementById('pf-cat').selectedIndex = 0;
  renderRecipeRows('product-recipe-rows', []);
}

async function openAddProductForm() {
  await ensureRecipeIngredientOptions();
  resetAddProductForm();
  document.getElementById('product-form-panel').classList.remove('hidden');
}

function closeAddProductForm() {
  document.getElementById('product-form-panel').classList.add('hidden');
  resetAddProductForm();
}

async function addProduct() {
  await ensureRecipeIngredientOptions();
  const name = document.getElementById('pf-name').value.trim();
  if (!name) { toast('Enter a product name', true); return; }
  const recipeItems = collectRecipeItems('product-recipe-rows');
  
  // Read quantity as a strict whole number so the typed value is preserved exactly.
  let qty = readWholeNumberInput('pf-qty');
  if (isNaN(qty) || qty < 0) qty = 0;
  
  const body = {
    ProductName:      name,
    ProductionCost:   parseFloat(document.getElementById('pf-cost').value || '0'),
    SellingPrice:     parseFloat(document.getElementById('pf-price').value || '0'),
    ShelfLifeDays:    parseInt(document.getElementById('pf-shelf').value || '3', 10),
    UnitWeight:       document.getElementById('pf-wt').value.trim() || '',
    Category:         document.getElementById('pf-cat').value,
    QuantityInStock:  qty,
    RecipeItems:      recipeItems,
  };
  const res = await post('/products', body);
  if (res.reason === 'INSUFFICIENT_INGREDIENTS' || res.reason === 'RECIPE_MISSING') {
    const msg = formatIngredientRequirementMessage(res);
    toast(msg, true);
    closeAddProductForm();
    redirectToIngredientsSection();
    return;
  }
  toast(res.message || res.error, !!res.error);
  if (!res.error) {
    closeAddProductForm();
    await refreshProductIngredientRecipeViews();
  }
}

async function deleteProduct(id) {
  if (!confirm(`Remove product ${id} from active listings?`)) return;
  const res = await del(`/products/${id}`);
  toast(res.message || res.error, !!res.error);
  loadProducts();
}
async function openEditProduct(id) {
  const current = allProducts.find(p => String(p.ProductID) === String(id));
  if (!current) { toast('Product not found', true); return; }

  document.getElementById('edit-prod-id').value       = id;
  document.getElementById('edit-prod-name').value     = current.ProductName;
  document.getElementById('edit-prod-price').value    = current.SellingPrice;
  document.getElementById('edit-prod-cat').value      = current.Category;
  document.getElementById('edit-prod-current-stock').textContent = current.QuantityInStock || 0;
  document.getElementById('edit-prod-add-qty').value  = '';
  document.getElementById('edit-product-modal').classList.remove('hidden');

  try {
    await ensureRecipeIngredientOptions();
  } catch (err) {
    console.error('Failed to load recipe ingredient options:', err);
  }

  try {
    const recipeRows = await get(`/products/${id}/recipe`);
    renderRecipeRows('edit-product-recipe-rows', Array.isArray(recipeRows) ? recipeRows : []);
  } catch (err) {
    console.error('Failed to load product recipe:', err);
    renderRecipeRows('edit-product-recipe-rows', []);
    toast('Opened product edit form, but recipe details could not be loaded.', true);
  }
}

async function saveEditProduct() {
  const id    = document.getElementById('edit-prod-id').value;
  const name  = document.getElementById('edit-prod-name').value.trim();
  const price = document.getElementById('edit-prod-price').value;
  const cat   = document.getElementById('edit-prod-cat').value;
  const recipeItems = normalizeEditedRecipeItems(collectRecipeItems('edit-product-recipe-rows'));
  if (!name || !price) { toast('Name and price are required', true); return; }

  // Update product details first.
  const r1 = await put(`/products/${id}`, { ProductName: name, SellingPrice: price, Category: cat });
  if (r1.error) { toast(r1.error, true); return; }

  // Save recipe before stock update so ingredient deduction uses latest recipe.
  const r2 = await put(`/products/${id}/recipe`, { RecipeItems: recipeItems });
  if (r2.error) { toast(r2.error, true); return; }

  // CRITICAL: Read add-qty field and parse strictly
  let addQty = readWholeNumberInput('edit-prod-add-qty', true);
  
  // If field is empty, treat as 0 (no stock addition)
  if (addQty === null) {
    addQty = 0;
  }
  
  // CRITICAL: Validate parsed quantity
  if (isNaN(addQty)) {
    toast('Add Quantity must be a valid number', true);
    return;
  }
  if (addQty < 0) {
    toast('Add Quantity cannot be negative', true);
    return;
  }
  
  // CRITICAL: Only send to backend if adding > 0 units
  if (addQty > 0) {
    console.log(`Sending stock update: productId=${id}, quantity=${addQty}, type=${typeof addQty}`);
    const r3 = await put(`/products/${id}/stock`, { quantity: addQty });
    console.log(`Stock update response:`, r3);
    if (r3.reason === 'INSUFFICIENT_INGREDIENTS' || r3.reason === 'RECIPE_MISSING') {
      const msg = formatIngredientRequirementMessage(r3);
      toast(msg, true);
      closeModal('edit-product-modal');
      redirectToIngredientsSection();
      return;
    }
    if (r3.error) { 
      toast(r3.error, true); 
      return; 
    }
  }

  toast('Product updated successfully.');
  closeModal('edit-product-modal');
  await refreshProductIngredientRecipeViews();
}

async function openAddStock(id, name) {
  document.getElementById('addstock-prod-id').value   = id;
  document.getElementById('addstock-prod-name').textContent = `Add baked stock: ${name}`;
  const liveStockEl = document.getElementById('addstock-current-stock');
  liveStockEl.textContent = 'Loading...';

  try {
    const prod = await get(`/products/${id}`);
    const liveStock = Number(prod && prod.QuantityInStock);
    liveStockEl.textContent = Number.isFinite(liveStock) ? String(liveStock) : '0';
  } catch (err) {
    liveStockEl.textContent = 'Unavailable';
  }

  document.getElementById('addstock-qty').value       = '';
  document.getElementById('addstock-modal').classList.remove('hidden');
}

async function confirmAddStock() {
  const id = document.getElementById('addstock-prod-id').value;
  
  // CRITICAL: Parse quantity strictly
  const qty = readWholeNumberInput('addstock-qty');
  if (qty === 0 && document.getElementById('addstock-qty').value.trim() === '') {
    toast('Enter a quantity', true);
    return;
  }
  if (isNaN(qty)) {
    toast('Quantity must be a number', true);
    return;
  }
  if (qty <= 0) {
    toast('Quantity must be greater than 0', true);
    return;
  }
  
  console.log(`Adding stock: productId=${id}, quantity=${qty}, type=${typeof qty}`);
  const res = await put(`/products/${id}/stock`, { quantity: qty });
  console.log(`Stock add response:`, res);

  if (res.reason === 'INSUFFICIENT_INGREDIENTS' || res.reason === 'RECIPE_MISSING') {
    const msg = formatIngredientRequirementMessage(res);
    toast(msg, true);
    closeModal('addstock-modal');
    redirectToIngredientsSection();
    return;
  }

  if (!res.error && Number.isFinite(Number(res.currentStock)) && Number.isFinite(Number(res.newStock))) {
    toast(`Stock updated: ${res.currentStock} -> ${res.newStock} (added ${res.addedQuantity}).`);
  } else {
    toast(res.message || res.error, !!res.error);
  }
  if (res.error) return;
  closeModal('addstock-modal');
  await refreshProductIngredientRecipeViews();
}

// ── ORDERS ────────────────────────────────────
async function loadOrders() {
  allOrders = sortOrdersBySequence(await get('/orders'));
  renderOrders(allOrders);
}

function renderOrders(data) {
  document.getElementById('orders-body').innerHTML = data.map(o => {
    // Use OrderType from database, fallback to Online if not set
    const orderType = o.OrderType || 'Online';
    const typeB = orderType === 'Offline'
      ? '<span class="badge badge-instore">Offline</span>'
      : '<span class="badge badge-online">Online</span>';
    
    return `<tr>
      <td><strong>${o.OrderID}</strong></td>
      <td>${o.OrderDate ? o.OrderDate.slice(0,10) : '&mdash;'}</td>
      <td>${displayCustomerName(o)}</td>
      <td>${displayProductName(o)}</td>
      <td>${o.Quantity}</td>
      <td><strong>&#8377;${Number(o.LineTotal || 0).toLocaleString('en-IN')}</strong></td>
      <td>${orderType === 'Offline' ? '<span class="badge badge-instore">Offline</span>' : '<span class="badge badge-online">Online</span>'}</td>
      <td>${statusBadge(o.OrderStatus || o.Status)}</td>
      <td>
        <select class="status-select" onchange="updateOrderStatus('${o.OrderID}', this.value)" title="Change order status">
          ${['Pending','Processing','Shipped','Delivered','Cancelled'].map(s =>
            `<option value="${s}" ${(s === (o.OrderStatus || o.Status)) ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="9" class="text-center text-muted" style="padding:18px">No orders</td></tr>';
}

function filterOrders() {
  const q  = document.getElementById('order-search').value.toLowerCase();
  const st = document.getElementById('order-status-filter').value;
  const tp = document.getElementById('order-type-filter').value;
  renderOrders((allOrders || []).filter(o => {
    if (!o) return false;
    const orderType = o.OrderType || 'Online';
    const orderStatus = o.OrderStatus || o.Status;
    return (!q || (o.OrderID && o.OrderID.toLowerCase().includes(q)) || 
                  (normalizeCustomerName(o.CustomerName) && normalizeCustomerName(o.CustomerName).toLowerCase().includes(q)) || 
                  (o.ProductName && o.ProductName.toLowerCase().includes(q)))
        && (!st || orderStatus === st)
        && (!tp || (tp === 'Offline' ? orderType === 'Offline' : orderType === 'Online'));
  }));
}

async function updateOrderStatus(orderId, status) {
  const validStatuses = ['Pending', 'Processing', 'Baking', 'Ready', 'Shipped', 'Delivered', 'Cancelled'];
  
  if (!validStatuses.includes(status)) {
    toast('Invalid status selected', true);
    return;
  }
  
  try {
    const res = await put(`/orders/${orderId}/status`, { status });
    toast(res.message || 'Status updated successfully', !!res.error);
    
    // Update local data
    const idx = allOrders.findIndex(o => o.OrderID === orderId);
    if (idx !== -1) {
      allOrders[idx].OrderStatus = status;
      allOrders[idx].Status = status;
    }
    
    // Refresh orders from database
    await loadOrders();
  } catch (err) {
    console.error('Error updating order status:', err);
    toast('Failed to update order status', true);
    await loadOrders();
  }
}


// ── CUSTOMERS ─────────────────────────────────
async function loadCustomers() {
  try {
    allCustomers = await get('/customers');
    if (!allCustomers || allCustomers.error) {
      console.error('Error loading customers:', allCustomers?.error || 'Unknown error');
      toast('Failed to load customers', true);
      allCustomers = [];
    }
    renderCustomers(allCustomers);
  } catch (err) {
    console.error('Error loading customers:', err);
    toast('Failed to load customers', true);
    allCustomers = [];
    renderCustomers([]);
  }
}

function renderCustomers(data) {
  const counts = {};
  allOrders.forEach(o => { counts[o.CustomerID] = (counts[o.CustomerID] || 0) + 1; });
  document.getElementById('customers-body').innerHTML = data.map((c, index) => `
    <tr>
      <td><span class="text-muted" style="font-size:11px">${index + 1}</span></td>
      <td><strong>${normalizeCustomerName(c.CustomerName)}</strong></td>
      <td>${c.PhoneNumber || '&mdash;'}</td>
      <td>${c.Email || '&mdash;'}</td>
      <td>${c.Address || '&mdash;'}</td>
      <td>${counts[c.CustomerID] || 0}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted" style="padding:18px">No customers</td></tr>';
}

function filterCustomers() {
  const q = document.getElementById('cust-search').value.toLowerCase();
  renderCustomers((allCustomers || []).filter(c => {
    if (!c) return false;
    return (normalizeCustomerName(c.CustomerName) && normalizeCustomerName(c.CustomerName).toLowerCase().includes(q)) ||
           (c.CustomerID && c.CustomerID.toLowerCase().includes(q)) ||
           (c.Email && c.Email.toLowerCase().includes(q));
  }));
}

// ── INGREDIENTS ───────────────────────────────
// Stock status logic (must match backend):
//   Out of Stock = QuantityInStock === 0
//   Low Stock    = QuantityInStock < MinimumStockLevel (and > 0)
//   Adequate     = QuantityInStock >= MinimumStockLevel
function getStockStatus(qty, min) {
  qty = parseFloat(qty); min = parseFloat(min);
  if (qty <= 0)   return { label: 'Out of Stock', cls: 'badge-outstock' };
  if (qty < min)  return { label: 'Low Stock',    cls: 'badge-lowstock' };
  return               { label: 'Adequate',      cls: 'badge-adequate' };
}

function stockBadge(qty, min) {
  const { label, cls } = getStockStatus(qty, min);
  return `<span class="badge ${cls}">${label}</span>`;
}

async function loadIngredients() {
  try {
    allIngredients = await get('/ingredients');
    if (!allIngredients || allIngredients.error) {
      console.error('Error loading ingredients:', allIngredients?.error || 'Unknown error');
      toast('Failed to load ingredients', true);
      allIngredients = [];
    }
    renderIngredients(allIngredients);
    renderRestockWorkflow('restock-orders-list');
    const hasLow = allIngredients.some(i => parseFloat(i.QuantityInStock) < parseFloat(i.MinimumStockLevel));
    document.getElementById('low-stock-banner').classList.toggle('hidden', !hasLow);
  } catch (err) {
    console.error('Error loading ingredients:', err);
    toast('Failed to load ingredients', true);
    allIngredients = [];
    renderIngredients([]);
  }
}

async function loadSuppliers() {
  try {
    const data = await get('/suppliers');
    allSuppliers = Array.isArray(data) ? data : [];
    const select = document.getElementById('ing-f-supplier');
    if (select) {
      const currentValue = select.value;
      select.innerHTML = '<option value="">-- Select supplier --</option><option value="__new__">+ Add new supplier</option>' +
        allSuppliers.map(s => `<option value="${s.SupplierID}">${s.SupplierName}${s.PhoneNumber ? ` (${s.PhoneNumber})` : ''}</option>`).join('');
      if (currentValue) select.value = currentValue;
    }
  } catch (err) {
    console.error('Error loading suppliers:', err);
    allSuppliers = [];
  }
}

async function openAddIngredientForm() {
  document.getElementById('ing-add-panel').classList.remove('hidden');
  await loadSuppliers();
  toggleIngredientSupplierFields(document.getElementById('ing-f-supplier').value);
}

function toggleIngredientSupplierFields(value) {
  const panel = document.getElementById('ing-new-supplier-fields');
  if (!panel) return;
  panel.classList.toggle('hidden', value !== '__new__');
}

async function addIngredient() {
  const name    = document.getElementById('ing-f-name').value.trim();
  const qty     = parseFloat(document.getElementById('ing-f-qty').value) || 0;
  const minLvl  = parseFloat(document.getElementById('ing-f-min').value) || 0;
  const unit    = document.getElementById('ing-f-unit').value.trim() || 'g';
  const price   = parseFloat(document.getElementById('ing-f-price').value) || 0;
  const supplierIdValue = document.getElementById('ing-f-supplier').value;
  let supplierId = supplierIdValue && supplierIdValue !== '__new__' ? parseInt(supplierIdValue, 10) : null;
  if (!name) { toast('Ingredient name is required', true); return; }

  if (supplierIdValue === '__new__') {
    const supplierName = document.getElementById('ing-new-supplier-name').value.trim();
    const supplierPhone = document.getElementById('ing-new-supplier-phone').value.trim();
    const supplierAddress = document.getElementById('ing-new-supplier-address').value.trim();
    const supplierTerms = document.getElementById('ing-new-supplier-terms').value.trim();

    if (!supplierName) { toast('Supplier name is required', true); return; }
    if (!supplierPhone) { toast('Supplier phone is required', true); return; }

    const supplierRes = await post('/suppliers', {
      SupplierName: supplierName,
      PhoneNumber: supplierPhone,
      Address: supplierAddress,
      PaymentTerms: supplierTerms
    });

    if (supplierRes.error) { toast(supplierRes.error, true); return; }
    supplierId = supplierRes.SupplierID;
  }

  const res = await post('/ingredients', { Name: name, QuantityInStock: qty, MinimumStockLevel: minLvl, Unit: unit, UnitPrice: price, SupplierID: supplierId });
  if (res.error) { toast(res.error, true); return; }
  toast('Ingredient added successfully.');
  document.getElementById('ing-add-panel').classList.add('hidden');
  ['ing-f-name','ing-f-qty','ing-f-min','ing-f-unit','ing-f-price','ing-f-supplier','ing-new-supplier-name','ing-new-supplier-phone','ing-new-supplier-address','ing-new-supplier-terms'].forEach(id => { document.getElementById(id).value = ''; });
  toggleIngredientSupplierFields('');
  loadIngredients();
}

function renderIngredients(data) {
  if (!data || !Array.isArray(data)) {
    console.error('renderIngredients: invalid data', data);
    document.getElementById('ingredients-body').innerHTML = '<tr><td colspan="8" class="text-center text-muted">No ingredients loaded</td></tr>';
    return;
  }
  if (data.length === 0) {
    document.getElementById('ingredients-body').innerHTML = '<tr><td colspan="8" class="text-center text-muted">No ingredients</td></tr>';
    return;
  }
  document.getElementById('ingredients-body').innerHTML = data.map((i, idx) => {
    if (!i || !i.Name) return '';
    const { label, cls } = getStockStatus(i.QuantityInStock, i.MinimumStockLevel);
    const rowStyle = label === 'Out of Stock' ? 'style="background:var(--danger-bg)"'
                   : label === 'Low Stock'    ? 'style="background:var(--warning-bg)"' : '';
    const unit = i.Unit || 'g';
    return `<tr ${rowStyle}>
      <td><span class="text-muted" style="font-size:11px">${idx + 1}</span></td>
      <td><strong>${i.Name}</strong></td>
      <td><strong>${formatQuantity(i.QuantityInStock, unit)} ${unit}</strong></td>
      <td>${formatQuantity(i.MinimumStockLevel, unit)} ${unit}</td>
      <td>&#8377;${i.UnitPrice || '&mdash;'}</td>
      <td>${i.SupplierName || '&mdash;'}</td>
      <td>${stockBadge(i.QuantityInStock, i.MinimumStockLevel)}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="openRestock('${i.IngredientID}','${i.Name}')">+ Restock</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="text-center text-muted" style="padding:18px">No ingredients</td></tr>';
}

function filterIngredients() {
  const q  = document.getElementById('ing-search').value.toLowerCase();
  const st = document.getElementById('ing-status-filter').value;
  renderIngredients((allIngredients || []).filter(i => {
    if (!i) return false;
    const { label } = getStockStatus(i.QuantityInStock, i.MinimumStockLevel);
    const nameMatch = i.Name && i.Name.toLowerCase().includes(q);
    const idMatch = i.IngredientID && i.IngredientID.toLowerCase().includes(q);
    return (!q || nameMatch || idMatch) && (!st || label === st);
  }));
}

function openRestock(id, name) {
  restockIngId = id;
  document.getElementById('restock-ing-name').textContent = `Ingredient: ${name}`;
  document.getElementById('restock-qty').value = '';
  document.getElementById('restock-modal').classList.remove('hidden');
}

async function confirmRestock() {
  const qty = parseInt(document.getElementById('restock-qty').value);
  if (!qty || qty <= 0) { toast('Enter a valid quantity', true); return; }

  const ing = allIngredients.find(i => i.IngredientID === restockIngId);
  const orderId = 'RST' + String(restockCounter++).padStart(3,'0');
  restockOrders.unshift({
    id: orderId, ingId: restockIngId,
    ingName:  ing ? ing.Name : restockIngId,
    supplier: ing ? (ing.SupplierName || 'Supplier') : 'Supplier',
    qty, status: 'Ordered',
    createdAt: new Date().toLocaleDateString('en-IN')
  });

  closeModal('restock-modal');
  document.getElementById('restock-workflow-panel').classList.remove('hidden');
  renderRestockWorkflow('restock-orders-list');
  renderRestockWorkflow('emp-restock-orders-list');
  toast(`Restock order ${orderId} placed — ${qty} units of ${ing ? ing.Name : restockIngId}.`);
}

function renderRestockWorkflow(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!restockOrders.length) {
    el.innerHTML = '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:12px">No restock orders placed yet.</div>';
    return;
  }
  el.innerHTML = restockOrders.map(r => `
    <div class="restock-order-card">
      <div class="restock-order-info">
        <div class="restock-order-name">${r.ingName} &mdash; ${r.qty} units</div>
        <div class="restock-order-detail">${r.id} &bull; ${r.supplier} &bull; ${r.createdAt}</div>
      </div>
      <div class="restock-order-actions">
        ${r.status === 'Delivered'
          ? '<span class="badge badge-adequate">&#10003; Delivered</span>'
          : `<span class="badge badge-pending">${r.status}</span>
             <button class="btn btn-sm btn-success" onclick="markRestockDelivered('${r.id}')">Mark Delivered</button>`
        }
      </div>
    </div>`).join('');
}

async function markRestockDelivered(orderId) {
  const order = restockOrders.find(r => r.id === orderId);
  if (!order) return;
  order.status = 'Delivered';
  const res = await put(`/ingredients/${order.ingId}/restock`, { quantity: order.qty });
  if (res.error) { toast(res.error, true); return; }
  toast(`${order.ingName} restocked with ${order.qty} units.`);
  allIngredients = await get('/ingredients');
  renderIngredients(allIngredients);
  renderEmpIngredientsList(allIngredients);
  renderRestockWorkflow('restock-orders-list');
  renderRestockWorkflow('emp-restock-orders-list');
}

// ── EMPLOYEES ─────────────────────────────────
async function loadEmployees() {
  try {
    const data = await get('/employees');
    if (!data || data.error) {
      console.error('Error loading employees:', data?.error || 'Unknown error');
      toast('Failed to load employees', true);
      document.getElementById('employees-body').innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:18px">Failed to load employees</td></tr>';
      return;
    }
    document.getElementById('employees-body').innerHTML = data.map((e, index) => {
      const level = e.Salary >= 30000 ? 'Senior' : e.Salary >= 23000 ? 'Mid' : 'Junior';
      return `<tr>
        <td><span class="text-muted" style="font-size:11px">${index + 1}</span></td>
        <td><strong>${e.FullName}</strong></td>
        <td>${e.Role}</td>
        <td>&#8377;${formatWholeCurrency(e.Salary)}</td>
        <td><span class="badge badge-${level.toLowerCase()}">${level}</span></td>
        <td>${e.JoiningDate ? e.JoiningDate.slice(0,10) : '&mdash;'}</td>
        <td>${e.YearsOfService} yr${e.YearsOfService !== 1 ? 's' : ''}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center text-muted" style="padding:18px">No employees</td></tr>';
  } catch (err) {
    console.error('Error loading employees:', err);
    toast('Failed to load employees', true);
    document.getElementById('employees-body').innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:18px">Failed to load employees</td></tr>';
  }
}

// ── RECIPES ───────────────────────────────────
let recipeProducts = [];

async function loadRecipes() {
  recipeProducts = await get('/products/recipes');
  renderRecipeGrid(recipeProducts);
}

function filterRecipes() {
  const q   = document.getElementById('recipe-search').value.toLowerCase();
  const cat = document.getElementById('recipe-cat-filter').value;
  renderRecipeGrid(
    (recipeProducts || []).filter(p => {
      if (!p) return false;
      return (!q || (p.ProductName && p.ProductName.toLowerCase().includes(q))) &&
             (!cat || p.Category === cat);
    })
  );
}

function renderRecipeGrid(products) {
  const grid = document.getElementById('recipe-grid');
  if (!grid) return;
  if (!products.length) { grid.innerHTML = '<div class="text-muted" style="padding:20px">No recipes found.</div>'; return; }

  grid.innerHTML = products.map(p => {
    const items = Array.isArray(p.RecipeItems) ? p.RecipeItems : [];
    const rows = (items.length ? items : [{ IngredientName: 'No recipe items', QuantityRequired: '—', Unit: '' }]).map(item => {
      const badge = item.MinimumStockLevel != null
        ? stockBadge(item.QuantityInStock, item.MinimumStockLevel)
        : '';
      const unit = item.Unit || 'g';
      const qty = formatRecipeQuantity(item);
      return `<div class="recipe-ingredient-row">
        <span class="recipe-ing-name">${item.IngredientName || 'Unknown Ingredient'}</span>
        <span style="display:flex;align-items:center;gap:8px">
          <span class="recipe-ing-qty">${qty} ${unit}</span>${badge}
        </span>
      </div>`;
    }).join('');
    return `<div class="recipe-card">
      <div class="recipe-card-header">
        <div>
          <div class="recipe-card-name">${p.ProductName}</div>
          <div class="recipe-card-category">${p.Category} &bull; &#8377;${p.SellingPrice}</div>
        </div>
        <span style="font-size:11px;color:var(--gold-light)">${items.length} items</span>
      </div>
      <div class="recipe-card-body">${rows}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════
// IN-STORE ORDER — shared by Admin and Employee
// ══════════════════════════════════════════════
let shopRecipes = {}; // Cache recipes by ProductID

function getSelectedOption(selectEl) {
  if (!selectEl || !selectEl.value) return null;
  return Array.from(selectEl.options).find(o => String(o.value) === String(selectEl.value)) || null;
}



function toggleShopCustomerType() {
  const type = document.getElementById('shop-cust-type').value;
  document.getElementById('shop-existing-cust').classList.toggle('hidden', type !== 'existing');
  document.getElementById('shop-walkin-cust').classList.toggle('hidden',   type !== 'walkin');
}

function selectShopProduct(productId, el) {
  document.querySelectorAll('#shop-product-catalog .product-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('shop-product-select').value = productId;
  document.getElementById('shop-qty').value = 1;
  updateShopSummary();
}

function updateShopSummary() {
  const sel    = document.getElementById('shop-product-select');
  const option = sel.options[sel.selectedIndex];
  const qty    = parseInt(document.getElementById('shop-qty').value) || 0;
  if (!sel.value || qty <= 0) { resetShopSummary(); return; }
  const price = parseFloat(option.dataset.price);
  const name  = option.dataset.name;
  document.getElementById('shop-os-product').textContent = name;
  document.getElementById('shop-os-price').innerHTML     = '&#8377;' + price;
  document.getElementById('shop-os-qty').textContent     = qty;
  document.getElementById('shop-os-total').innerHTML     = '&#8377;' + (price * qty).toLocaleString('en-IN');
}

function resetShopSummary() {
  ['shop-os-product','shop-os-price','shop-os-qty','shop-os-total'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });
}

let shopCart = [];

async function loadShopOrder() {
  const [products, customers, recipesData] = await Promise.all([get('/products'), get('/customers'), get('/products/recipes')]);
  allProducts  = products;
  allCustomers = customers;

  // Build recipe cache
  shopRecipes = {};
  (recipesData || []).forEach(p => {
    shopRecipes[p.ProductID] = Array.isArray(p.RecipeItems) ? p.RecipeItems : [];
  });

  // Populate customer dropdown
  document.getElementById('shop-customer-select').innerHTML =
    '<option value="">-- Select --</option>' +
    customers.map(c => `<option value="${c.CustomerID}">${normalizeCustomerName(c.CustomerName)} (${c.CustomerID})</option>`).join('');

  // Populate product dropdown
  document.getElementById('shop-product-select').innerHTML =
    '<option value="">-- Choose product --</option>' +
    products.map(p => {
      const stock = parseInt(p.QuantityInStock) || 0;
      const avail = stock > 0 ? ` (${stock} avail)` : ' — OUT OF STOCK';
      const disabled = stock === 0 ? 'disabled' : '';
      return `<option value="${p.ProductID}" data-price="${p.SellingPrice}" data-name="${p.ProductName}" data-stock="${stock}" ${disabled}>${p.ProductName} — &#8377;${p.SellingPrice}${avail}</option>`;
    }).join('');

  // Product cards for quick select
  document.getElementById('shop-product-catalog').innerHTML = products.map(p => {
    const stock = parseInt(p.QuantityInStock) || 0;
    const outOfStock = stock === 0;
    return `<div class="product-card ${outOfStock ? 'product-card-disabled' : ''}" onclick="${outOfStock ? '' : `selectShopProduct('${p.ProductID}',this)`}">
      <div class="product-card-category">${p.Category}</div>
      <div class="product-card-name">${p.ProductName}</div>
      <div class="product-card-weight">${p.UnitWeight || ''}</div>
      <div class="product-card-price">&#8377;${p.SellingPrice}</div>
      <div class="product-card-shelf">Best within ${p.ShelfLifeDays} day${p.ShelfLifeDays !== 1 ? 's' : ''}</div>
      <div style="margin-top:6px">${outOfStock ? '<span class="badge badge-outstock">Out of Stock</span>' : '<span class="badge badge-adequate">' + stock + ' available</span>'}</div>
    </div>`;
  }).join('');

  // Reset form
  document.getElementById('shop-cust-type').value = 'existing';
  toggleShopCustomerType();
  resetShopSummary();
}

function displayShopRecipe(productId) {
  const recipeDisplay = document.getElementById('shop-recipe-display');
  const recipeItems = document.getElementById('shop-recipe-items');
  const items = shopRecipes[productId] || [];

  if (!items.length) {
    recipeDisplay.classList.add('hidden');
    return;
  }

  recipeDisplay.classList.remove('hidden');
  recipeItems.innerHTML = items.map(item => {
    const unit = item.Unit || 'g';
    const qty = formatRecipeQuantity(item);
    return `<div style="margin-bottom:6px">${item.IngredientName}: <strong>${qty} ${unit}</strong></div>`;
  }).join('');
}

function addToShopCart() {
  const sel    = document.getElementById('shop-product-select');
  const option = getSelectedOption(sel);
  const productId = sel ? sel.value : '';
  const qty    = parseInt(document.getElementById('shop-qty').value);
  const product = allProducts.find(p => String(p.ProductID) === String(productId));
  const stock  = parseInt(option ? option.dataset.stock : (product ? product.QuantityInStock : '0')) || 0;
  const name = product ? product.ProductName : (option ? option.dataset.name : 'selected product');
  const price = parseFloat(product ? product.SellingPrice : (option ? option.dataset.price : '0')) || 0;

  if (!productId)       { toast('Please select a product', true); return; }
  if (!qty || qty <= 0) { toast('Enter a valid quantity', true); return; }
  if (!product && !option) { toast('Selected product details are unavailable. Please reselect the product.', true); return; }
  if (qty > stock)      { toast(`Only ${stock} unit(s) of "${name}" available.`, true); return; }

  const existing = shopCart.find(i => String(i.ProductID) === String(productId));
  if (existing) {
    const newQty = existing.Quantity + qty;
    if (newQty > stock) { toast(`Cannot add more — only ${stock} available.`, true); return; }
    existing.Quantity = newQty;
  } else {
    shopCart.push({ ProductID: productId, ProductName: name, Price: price, Quantity: qty, Stock: stock });
  }

  renderShopCart();
  sel.value = '';
  document.getElementById('shop-qty').value = '1';
  document.querySelectorAll('#shop-product-catalog .product-card').forEach(c => c.classList.remove('selected'));
  resetShopSummary();
  toast(`${name} × ${qty} added.`);
}

function removeFromShopCart(productId) {
  shopCart = shopCart.filter(i => i.ProductID !== productId);
  renderShopCart();
}

function renderShopCart() {
  const el  = document.getElementById('shop-cart-items');
  const sec = document.getElementById('shop-cart-section');
  if (!el) return;
  if (!shopCart.length) {
    if (sec) sec.classList.add('hidden');
    el.innerHTML = '';
    return;
  }
  if (sec) sec.classList.remove('hidden');
  const total = shopCart.reduce((s, i) => s + i.Price * i.Quantity, 0);
  el.innerHTML = shopCart.map(i => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <div><strong>${i.ProductName}</strong> × ${i.Quantity} <span class="text-muted" style="font-size:12px">@ &#8377;${i.Price}</span></div>
      <div style="display:flex;align-items:center;gap:10px">
        <strong>&#8377;${(i.Price * i.Quantity).toLocaleString('en-IN')}</strong>
        <button class="btn btn-sm btn-ghost" onclick="removeFromShopCart('${i.ProductID}')">✕</button>
      </div>
    </div>`).join('') +
    `<div style="text-align:right;padding-top:10px;font-weight:600">Total: &#8377;${total.toLocaleString('en-IN')}</div>`;
}

async function placeShopOrder() {
  if (!shopCart.length) { toast('Add at least one item', true); return; }

  const custType = document.getElementById('shop-cust-type').value;
  let CustomerID = '';

  if (custType === 'existing') {
    CustomerID = document.getElementById('shop-customer-select').value;
    if (!CustomerID) { toast('Please select a customer', true); return; }
  } else {
    const name  = document.getElementById('walkin-name').value.trim();
    const phone = document.getElementById('walkin-phone').value.trim();
    if (!name) { toast('Please enter the customer name', true); return; }
    const custRes = await post('/customers', { CustomerName: name, PhoneNumber: phone || null });
    if (custRes.error) { toast(custRes.error, true); return; }
    CustomerID = custRes.CustomerID;
  }

  let lastOrderID = null;
  let failed = false;
  for (const item of shopCart) {
    const res = await post('/orders', {
      CustomerID,
      ProductID: item.ProductID,
      Quantity: item.Quantity,
      OrderType: 'Offline'
    });
    if (res.error) { toast(`Failed: ${item.ProductName} — ${res.error}`, true); failed = true; break; }
    offlineOrderIds.add(res.OrderID);
    lastOrderID = res.OrderID;
  }

  if (!failed) {
    toast(`In-Store Order confirmed! Last: ${lastOrderID}`);
    shopCart = [];
    renderShopCart();
    document.getElementById('shop-customer-select').value = '';
    document.getElementById('walkin-name').value          = '';
    document.getElementById('walkin-phone').value         = '';
    document.getElementById('shop-qty').value             = '1';
    document.querySelectorAll('#shop-product-catalog .product-card').forEach(c => c.classList.remove('selected'));
    resetShopSummary();
    // Refresh product list so stock counts reflect the placed order
    await loadShopOrder();
  }
}
// ── CUSTOMER: MY ORDERS ───────────────────────
async function loadMyOrders() {
  const data  = sortOrdersBySequence(await get(`/orders/customer/${currentUser.id}`));
  const steps = ['Pending','Processing','Baking','Ready','Shipped','Delivered'];

  document.getElementById('my-orders-body').innerHTML = data.map(o => {
    const step = steps.indexOf(o.Status);
    const orderID = String(o.OrderID).startsWith('ORD') ? o.OrderID : 'ORD' + String(o.OrderID).padStart(3, '0');
    return `<tr>
      <td><strong>${orderID}</strong></td>
      <td>${o.OrderDate ? o.OrderDate.slice(0,10) : '&mdash;'}</td>
      <td>${displayProductName(o)}</td>
      <td>${o.Quantity}</td>
      <td><strong>&#8377;${formatWholeCurrency(o.LineTotal)}</strong></td>
      <td>
        ${statusBadge(o.Status)}
        <div class="status-tracker" style="margin-top:5px;min-width:240px">
          ${steps.map((s,i) => `<div class="tracker-step ${i<step?'done':i===step?'current':''}">${s}</div>`).join('')}
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" class="text-center text-muted" style="padding:32px">
    <div style="font-size:28px;margin-bottom:8px">&#9700;</div>
    <div>No orders yet.</div>
    <button class="btn btn-primary" style="margin-top:12px" onclick="navigateTo('place-order')">Place your first order</button>
  </td></tr>`;
}

// ── CUSTOMER: PLACE ORDER ─────────────────────
// ── CUSTOMER: PLACE ORDER ─────────────────────
// Cart for multi-item orders
let orderCart = [];

async function loadPlaceOrder() {
  const productsData = await get('/products');
  allProducts = Array.isArray(productsData) ? productsData : [];
  orderCart   = [];
  renderOrderCart();

  document.getElementById('order-product-select').innerHTML =
    '<option value="">-- Choose a product --</option>' +
    allProducts.map(p => {
      const stock = parseInt(p.QuantityInStock) || 0;
      const avail = stock > 0 ? ` (${stock} avail)` : ' — OUT OF STOCK';
      const disabled = stock === 0 ? 'disabled' : '';
      return `<option value="${p.ProductID}" data-price="${p.SellingPrice}" data-name="${p.ProductName}" data-stock="${stock}" ${disabled}>${p.ProductName} — &#8377;${p.SellingPrice}${avail}</option>`;
    }).join('');

  document.getElementById('product-catalog').innerHTML = allProducts.map(p => {
    const stock = parseInt(p.QuantityInStock) || 0;
    const outOfStock = stock === 0;
    return `<div class="product-card ${outOfStock ? 'product-card-disabled' : ''}" onclick="${outOfStock ? '' : `selectProductCard('${p.ProductID}',this)`}">
      <div class="product-card-category">${p.Category}</div>
      <div class="product-card-name">${p.ProductName}</div>
      <div class="product-card-weight">${p.UnitWeight || ''}</div>
      <div class="product-card-price">&#8377;${p.SellingPrice}</div>
      <div class="product-card-shelf">Best within ${p.ShelfLifeDays} day${p.ShelfLifeDays !== 1 ? 's' : ''}</div>
      <div style="margin-top:6px">${outOfStock
        ? '<span class="badge badge-outstock">Out of Stock</span>'
        : `<span class="badge badge-adequate">${stock} available</span>`
      }</div>
    </div>`;
  }).join('');
}

function selectProductCard(productId, el) {
  document.querySelectorAll('#product-catalog .product-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('order-product-select').value = productId;
  updateOrderSummary();
}

function updateOrderSummary() {
  const sel    = document.getElementById('order-product-select');
  const option = sel.options[sel.selectedIndex];
  const qty    = parseInt(document.getElementById('order-qty').value) || 0;
  if (!sel.value || qty <= 0) return;
  const price = parseFloat(option.dataset.price);
  const stock = parseInt(option.dataset.stock) || 0;
  document.getElementById('os-product').textContent = option.dataset.name;
  document.getElementById('os-price').innerHTML     = '&#8377;' + price;
  document.getElementById('os-qty').textContent     = qty;
  document.getElementById('os-total').innerHTML     = '&#8377;' + (price * qty).toLocaleString('en-IN');
  const warn = document.getElementById('os-stock-warn');
  if (warn) {
    if (qty > stock) {
      warn.textContent = `⚠ Only ${stock} unit${stock !== 1 ? 's' : ''} available.`;
      warn.style.display = '';
    } else {
      warn.style.display = 'none';
    }
  }
}

function addToCart() {
  const sel    = document.getElementById('order-product-select');
  const option = getSelectedOption(sel);
  const qty    = parseInt(document.getElementById('order-qty').value);
  const stock  = parseInt(option ? option.dataset.stock : '0') || 0;

  if (!sel.value)          { toast('Please select a product', true); return; }
  if (!qty || qty <= 0)    { toast('Enter a valid quantity', true); return; }
  if (qty > stock)         { toast(`Only ${stock} unit(s) of "${option.dataset.name}" available.`, true); return; }

  const existing = orderCart.find(i => i.ProductID === sel.value);
  if (existing) {
    const newQty = existing.Quantity + qty;
    if (newQty > stock) { toast(`Cannot add more — only ${stock} available in total.`, true); return; }
    existing.Quantity = newQty;
  } else {
    orderCart.push({ ProductID: sel.value, ProductName: option.dataset.name, Price: parseFloat(option.dataset.price), Quantity: qty, Stock: stock });
  }

  renderOrderCart();
  sel.value = '';
  document.getElementById('order-qty').value = '1';
  document.querySelectorAll('#product-catalog .product-card').forEach(c => c.classList.remove('selected'));
  toast(`${option.dataset.name} × ${qty} added to order.`);
}

function removeFromCart(productId) {
  orderCart = orderCart.filter(i => i.ProductID !== productId);
  renderOrderCart();
}

function renderOrderCart() {
  const cartEl = document.getElementById('order-cart-items');
  const cartSection = document.getElementById('order-cart-section');
  if (!cartEl) return;
  if (!orderCart.length) {
    if (cartSection) cartSection.classList.add('hidden');
    cartEl.innerHTML = '';
    return;
  }
  if (cartSection) cartSection.classList.remove('hidden');
  const total = orderCart.reduce((s, i) => s + i.Price * i.Quantity, 0);
  cartEl.innerHTML = orderCart.map(i => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <strong>${i.ProductName}</strong> × ${i.Quantity}
        <span class="text-muted" style="font-size:12px"> @ &#8377;${i.Price}</span>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <strong>&#8377;${(i.Price * i.Quantity).toLocaleString('en-IN')}</strong>
        <button class="btn btn-sm btn-ghost" onclick="removeFromCart('${i.ProductID}')">✕</button>
      </div>
    </div>`).join('') +
    `<div style="text-align:right;padding-top:10px;font-weight:600">Total: &#8377;${total.toLocaleString('en-IN')}</div>`;
}

async function placeOrder() {
  if (!orderCart.length) { toast('Add at least one item to your order', true); return; }

  let lastOrderID = null;
  let failed = false;
  for (const item of orderCart) {
    const res = await post('/orders', {
      CustomerID: currentUser.id,
      ProductID: item.ProductID,
      Quantity: item.Quantity,
      OrderType: 'Online'
    });
    if (res.error) { toast(`Failed: ${item.ProductName} — ${res.error}`, true); failed = true; break; }
    lastOrderID = res.OrderID;
  }
  if (!failed) {
    toast(`Order(s) placed successfully! Last order: ${lastOrderID}`);
    orderCart = [];
    renderOrderCart();
    navigateTo('my-orders');
  }
}

// ── MENU ──────────────────────────────────────
let menuProducts = [];

async function loadBrowseProducts() {
  menuProducts = await get('/products');
  renderMenu(menuProducts);
}

function filterMenu() {
  const q   = document.getElementById('menu-search').value.toLowerCase();
  const cat = document.getElementById('menu-cat-filter').value;
  renderMenu((menuProducts || []).filter(p => {
    if (!p) return false;
    return (!q || (p.ProductName && p.ProductName.toLowerCase().includes(q))) &&
           (!cat || p.Category === cat);
  }));
}

function renderMenu(data) {
  document.getElementById('browse-catalog').innerHTML = data.map(p => `
    <div class="product-card">
      <div class="product-card-category">${p.Category}</div>
      <div class="product-card-name">${p.ProductName}</div>
      <div class="product-card-weight">${p.UnitWeight || ''}</div>
      <div class="product-card-price">&#8377;${p.SellingPrice}</div>
      <div class="product-card-shelf">Best within ${p.ShelfLifeDays} day${p.ShelfLifeDays !== 1 ? 's' : ''}</div>
      <div style="margin-top:12px">
        <button class="btn btn-sm btn-primary" onclick="quickOrder('${p.ProductID}')">Order Now</button>
      </div>
    </div>`).join('') || '<div class="text-muted" style="padding:20px">No products found.</div>';
}

function quickOrder(productId) {
  navigateTo('place-order');
  setTimeout(() => {
    const sel = document.getElementById('order-product-select');
    if (sel) { sel.value = productId; updateOrderSummary(); }
  }, 200);
}

// ── SUPPORT ───────────────────────────────────
function submitSupport() {
  const msg = document.getElementById('support-msg').value.trim();
  if (!msg) { toast('Please enter a message', true); return; }
  toast('Your message has been sent. We will respond within 24 hours.');
  document.getElementById('support-msg').value      = '';
  document.getElementById('support-orderid').value  = '';
}

// ── EMPLOYEE DASHBOARD ────────────────────────
async function loadEmpDashboard() {
  document.getElementById('emp-welcome-name').textContent = 'Welcome, ' + normalizeCustomerName(currentUser.name);
  document.getElementById('emp-welcome-role').textContent = currentUser.empRole || 'Employee';
  try {
    const stats = await get('/dashboard/stats');
    document.getElementById('emp-stat-orders').textContent   = stats.totalOrders;
    document.getElementById('emp-stat-lowstock').textContent = stats.lowStock;
    document.getElementById('emp-stat-products').textContent = stats.totalProducts;
    document.getElementById('emp-stat-pending').textContent  = stats.pendingOrders;

    const orders = await get('/orders');
    const sortedOrders = sortOrdersBySequence(orders);
    document.getElementById('emp-orders-body').innerHTML = sortedOrders.slice(0,12).map(o => {
      const orderType = o.OrderType || (offlineOrderIds.has(o.OrderID) ? 'Offline' : 'Online');
      return `<tr>
      <td><strong>${o.OrderID}</strong></td>
      <td>${displayCustomerName(o)}</td>
      <td>${displayProductName(o)}</td>
      <td>${o.Quantity}</td>
      <td>${o.OrderDate ? o.OrderDate.slice(0,10) : '&mdash;'}</td>
      <td>${orderType === 'Offline' ? '<span class="badge badge-instore">Offline</span>' : '<span class="badge badge-online">Online</span>'}</td>
      <td>${statusBadge(o.OrderStatus || o.Status)}</td>
    </tr>`;
    }).join('') || '<tr><td colspan="7" class="text-center text-muted" style="padding:18px">No orders</td></tr>';
  } catch { toast('Could not load dashboard', true); }
}

// ── EMPLOYEE: INGREDIENTS ─────────────────────
async function loadEmpIngredients() {
  allIngredients = await get('/ingredients');
  renderEmpIngredientsList(allIngredients);
  renderRestockWorkflow('emp-restock-orders-list');
  const hasLow = allIngredients.some(i => parseFloat(i.QuantityInStock) < parseFloat(i.MinimumStockLevel));
  document.getElementById('emp-low-stock-banner').classList.toggle('hidden', !hasLow);
}

function renderEmpIngredientsList(data) {
  const body = document.getElementById('emp-ingredients-body');
  if (!body) return;
  if (!data || !Array.isArray(data) || data.length === 0) {
    body.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:18px">No ingredients</td></tr>';
    return;
  }

  body.innerHTML = data.map((i, idx) => {
    if (!i || !i.Name) return '';
    const { label, cls } = getStockStatus(i.QuantityInStock, i.MinimumStockLevel);
    const rowStyle = label === 'Out of Stock' ? 'style="background:var(--danger-bg)"'
                   : label === 'Low Stock'    ? 'style="background:var(--warning-bg)"' : '';
    const unit = i.Unit || 'g';
    return `<tr ${rowStyle}>
      <td><span class="text-muted" style="font-size:11px">${idx + 1}</span></td>
      <td><strong>${i.Name}</strong></td>
      <td><strong>${formatQuantity(i.QuantityInStock, unit)} ${unit}</strong></td>
      <td>${formatQuantity(i.MinimumStockLevel, unit)} ${unit}</td>
      <td>&#8377;${i.UnitPrice || '&mdash;'}</td>
      <td>${i.SupplierName || '&mdash;'}</td>
      <td>${stockBadge(i.QuantityInStock, i.MinimumStockLevel)}</td>
      <td><button class="btn btn-sm btn-ghost" onclick="openRestock('${i.IngredientID}','${i.Name}')">+ Restock</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" class="text-center text-muted" style="padding:18px">No ingredients</td></tr>';
}

function filterEmpIngredients() {
  const q = document.getElementById('emp-ing-search').value.toLowerCase();
  renderEmpIngredientsList((allIngredients || []).filter(i => {
    if (!i || !i.Name) return false;
    return i.Name.toLowerCase().includes(q);
  }));
}

function formatIngredientRequirementMessage(res) {
  const base = res.error || 'Insufficient ingredient stock.';
  const list = Array.isArray(res.insufficientIngredients) ? res.insufficientIngredients : [];
  if (!list.length) return base;

  return list.map(item => {
    const unit = item.unit || 'g';
    return `${item.IngredientName}: available ${item.available}${unit}, required ${item.required}${unit}`;
  }).join(' | ');
}

function redirectToIngredientsSection() {
  if (currentRole === 'employee') {
    navigateTo('emp-ingredients');
    return;
  }
  navigateTo('ingredients');
}

async function refreshProductIngredientRecipeViews() {
  await loadProducts();
  await loadRecipes();
  if (currentRole === 'admin') {
    await loadIngredients();
  }
  if (currentRole === 'employee') {
    await loadEmpIngredients();
  }
}

// ── HELPERS ───────────────────────────────────
function statusBadge(status) {
  const MAP = {
    'Pending':    'badge-pending',
    'Processing': 'badge-processing',
    'Baking':     'badge-baking',
    'Ready':      'badge-ready',
    'Shipped':    'badge-shipped',
    'Delivered':  'badge-delivered',
    'Cancelled':  'badge-cancelled',
  };
  return `<span class="badge ${MAP[status] || 'badge-pending'}">${status}</span>`;
}

function togglePanel(id) { document.getElementById(id).classList.toggle('hidden'); }
function closeModal(id)  { document.getElementById(id).classList.add('hidden'); }

function toast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function doLogout() {
  // Clear user session
  currentUser = null;
  currentRole = null;
  
  // Clear all cached data
  allProducts = [];
  allOrders = [];
  allCustomers = [];
  allIngredients = [];
  offlineOrderIds.clear();
  
  // Reset UI
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  
  // Clear form fields (only fields that exist)
  const usernameField = document.getElementById('login-username');
  const passwordField = document.getElementById('login-password');
  if (usernameField) usernameField.value = '';
  if (passwordField) passwordField.value = '';
  
  const errorEl = document.getElementById('login-error');
  if (errorEl) errorEl.classList.add('hidden');
  
  // Reset to customer role
  const customerBtn = document.querySelector('[data-role="customer"]');
  if (customerBtn) {
    selectRole('customer', customerBtn);
  }
}

// ── API ───────────────────────────────────────
async function get(path) {
  const res = await fetch(`${API}${path}`);
  return res.json();
}
async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  return res.json();
}
async function put(path, body) {
  const res = await fetch(`${API}${path}`, {
    method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  });
  return res.json();
}
async function del(path) {
  const res = await fetch(`${API}${path}`, { method:'DELETE' });
  return res.json();
}

function displayProductName(item) {
  if (!item) return '&mdash;';
  if (item.ProductName && String(item.ProductName).trim()) return item.ProductName;
  if (item.ProductID) return 'Product #' + item.ProductID;
  return '&mdash;';
}

function displayCustomerName(item) {
  if (!item) return '&mdash;';
  if (String(item.OrderID) === '16') return 'Ananya Sharma';
  if (item.CustomerName && String(item.CustomerName).trim()) return normalizeCustomerName(item.CustomerName);
  if (item.OrderType === 'Offline') return 'Walk-in Customer';
  return '&mdash;';
}
