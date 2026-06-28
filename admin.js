/* ============================================
   محله شاپ — جاوااسکریپت پنل مدیریت
   ============================================ */

const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

// رمز عبور پنل مدیریت — بعداً می‌تونی تغییر بدی
const ADMIN_PASSWORD = 'mahalleh1403';

let products = [];
let deleteTargetId = null;

// ============================================
// LOGIN
// ============================================
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('adminPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') login();
});

function login() {
  const pass = document.getElementById('adminPass').value;
  const err  = document.getElementById('loginError');
  if (pass === ADMIN_PASSWORD) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'flex';
    loadProducts();
  } else {
    err.classList.add('show');
    setTimeout(() => err.classList.remove('show'), 2500);
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('adminPass').value = '';
});

// ============================================
// NAVIGATION
// ============================================
document.querySelectorAll('.nav-item[data-page]').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('nav-item--active'));
    item.classList.add('nav-item--active');
    showPage(item.dataset.page);
  });
});

document.getElementById('goAddBtn').addEventListener('click', () => showPage('add'));
document.getElementById('backBtn').addEventListener('click', () => showPage('products'));
document.getElementById('cancelBtn').addEventListener('click', () => showPage('products'));

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`page-${name}`).style.display = 'flex';
  if (name === 'add') {
    clearForm();
    document.getElementById('formTitle').textContent = 'افزودن محصول جدید';
  }
}

// ============================================
// FETCH PRODUCTS
// ============================================
async function loadProducts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    products = await res.json();
    renderTable(products);
    updateStats(products);
  } catch {
    document.getElementById('productsTableBody').innerHTML =
      '<tr><td colspan="6" class="loading-row">خطا در بارگذاری</td></tr>';
  }
}

// ============================================
// RENDER TABLE
// ============================================
function renderTable(list) {
  const tbody = document.getElementById('productsTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">محصولی یافت نشد</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div class="product-cell">
          <span class="product-emoji">${p.emoji || '📦'}</span>
          <span class="product-name">${p.name}</span>
        </div>
      </td>
      <td>${p.category}</td>
      <td>${Number(p.price).toLocaleString('fa-IR')} ت</td>
      <td>
        ${p.badge === 'organic' ? '<span class="badge badge--org">ارگانیک</span>'
        : p.badge === 'new'     ? '<span class="badge badge--new">جدید</span>'
        :                         '<span class="badge badge--none">—</span>'}
      </td>
      <td>
        <span class="stock-dot stock-dot--${p.in_stock ? 'in' : 'out'}">
          ${p.in_stock ? 'موجود' : 'ناموجود'}
        </span>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editProduct(${p.id})">ویرایش</button>
          <button class="btn-del"  onclick="confirmDelete(${p.id})">حذف</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================
// STATS
// ============================================
function updateStats(list) {
  document.getElementById('statTotal').textContent   = list.length;
  document.getElementById('statInStock').textContent = list.filter(p => p.in_stock).length;
  document.getElementById('statOrganic').textContent = list.filter(p => p.badge === 'organic').length;
  document.getElementById('statNew').textContent     = list.filter(p => p.badge === 'new').length;
}

// ============================================
// SEARCH
// ============================================
document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );
  renderTable(filtered);
});

// ============================================
// ADD PRODUCT
// ============================================
document.getElementById('saveBtn').addEventListener('click', saveProduct);

async function saveProduct() {
  const id    = document.getElementById('editId').value;
  const name  = document.getElementById('fname').value.trim();
  const cat   = document.getElementById('fcategory').value;
  const price = document.getElementById('fprice').value;

  if (!name || !cat || !price) {
    showToast('لطفاً فیلدهای ضروری را پر کنید', 'error');
    return;
  }

  const data = {
    name,
    category: cat,
    price: parseInt(price),
    description: document.getElementById('fdesc').value.trim(),
    badge:  document.getElementById('fbadge').value || null,
    emoji:  document.getElementById('femoji').value || '📦',
    rating: parseFloat(document.getElementById('frating').value) || 4.5,
    review_count: 0,
    in_stock: document.getElementById('fstock').checked,
  };

  const btn = document.getElementById('saveBtn');
  btn.textContent = 'در حال ذخیره...';
  btn.disabled = true;

  try {
    if (id) {
      // ویرایش
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      showToast('✅ محصول با موفقیت ویرایش شد', 'success');
    } else {
      // افزودن
      await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data)
      });
      showToast('✅ محصول جدید اضافه شد', 'success');
    }

    await loadProducts();
    setTimeout(() => showPage('products'), 1200);

  } catch {
    showToast('❌ خطا در ذخیره‌سازی', 'error');
  } finally {
    btn.textContent = 'ذخیره محصول';
    btn.disabled = false;
  }
}

// ============================================
// EDIT PRODUCT
// ============================================
function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  document.getElementById('editId').value       = p.id;
  document.getElementById('fname').value        = p.name;
  document.getElementById('fcategory').value    = p.category;
  document.getElementById('fprice').value       = p.price;
  document.getElementById('fdesc').value        = p.description || '';
  document.getElementById('fbadge').value       = p.badge || '';
  document.getElementById('femoji').value       = p.emoji || '';
  document.getElementById('frating').value      = p.rating || '';
  document.getElementById('fstock').checked     = p.in_stock;

  document.getElementById('formTitle').textContent = 'ویرایش محصول';
  showPage('add');
}

// ============================================
// DELETE PRODUCT
// ============================================
function confirmDelete(id) {
  deleteTargetId = id;
  document.getElementById('deleteModal').style.display = 'flex';
}

document.getElementById('cancelDelete').addEventListener('click', () => {
  document.getElementById('deleteModal').style.display = 'none';
  deleteTargetId = null;
});

document.getElementById('confirmDelete').addEventListener('click', async () => {
  if (!deleteTargetId) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${deleteTargetId}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'
      }
    });
    document.getElementById('deleteModal').style.display = 'none';
    showToast('✅ محصول حذف شد', 'success');
    await loadProducts();
  } catch {
    showToast('❌ خطا در حذف', 'error');
  }
  deleteTargetId = null;
});

// ============================================
// HELPERS
// ============================================
function clearForm() {
  ['editId','fname','fprice','fdesc','femoji','frating'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fcategory').value = '';
  document.getElementById('fbadge').value = '';
  document.getElementById('fstock').checked = true;
}

function pickEmoji(e) {
  document.getElementById('femoji').value = e;
}

function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// RLS POLICY برای INSERT/UPDATE/DELETE
// باید در Supabase اضافه بشه:
// برای ادمین از service_role key استفاده می‌کنیم
// ============================================
