/* ============================================
   محله شاپ — پنل مدیریت (با آپلود عکس)
   ============================================ */

const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';
const ADMIN_PASSWORD = 'Amir@4461';
const STORAGE_URL = `${SUPABASE_URL}/storage/v1/object/public/products/`;

let products = [];
let orders   = [];
let deleteTargetId = null;
let currentOrderFilter = 'all';
let uploadedImageUrl = null;

// ============================================
// LOGIN
// ============================================
document.getElementById('loginBtn').addEventListener('click', login);
document.getElementById('adminPass').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });

function login() {
  if (document.getElementById('adminPass').value === ADMIN_PASSWORD) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display  = 'flex';
    loadOrders();
    loadProducts();
  } else {
    const err = document.getElementById('loginError');
    err.classList.add('show');
    setTimeout(() => err.classList.remove('show'), 2500);
  }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display  = 'none';
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

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
  document.getElementById(`page-${name}`).style.display = 'flex';
  if (name === 'add') {
    clearForm();
    document.getElementById('formTitle').textContent = 'افزودن محصول جدید';
  }
}

document.getElementById('goAddBtn')?.addEventListener('click',  () => showPage('add'));
document.getElementById('backBtn')?.addEventListener('click',   () => showPage('products'));
document.getElementById('cancelBtn')?.addEventListener('click', () => showPage('products'));
document.getElementById('backToOrders')?.addEventListener('click', () => showPage('orders'));

// ============================================
// IMAGE UPLOAD
// ============================================
function setupImageUpload() {
  const dropzone  = document.getElementById('imageDropzone');
  const fileInput = document.getElementById('imageInput');
  const preview   = document.getElementById('imagePreview');
  const removeBtn = document.getElementById('removeImage');

  if (!dropzone) return;

  // کلیک روی dropzone
  dropzone.addEventListener('click', () => fileInput.click());

  // drag & drop
  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleImageFile(fileInput.files[0]);
  });

  removeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadedImageUrl = null;
    preview.style.display = 'none';
    dropzone.querySelector('.dropzone-placeholder').style.display = 'flex';
    fileInput.value = '';
  });
}

async function handleImageFile(file) {
  // بررسی نوع فایل
  if (!file.type.startsWith('image/')) {
    showToast('❌ فقط فایل تصویری قابل قبول است', 'error');
    return;
  }
  // بررسی حجم (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showToast('❌ حجم عکس نباید بیشتر از ۲ مگابایت باشد', 'error');
    return;
  }

  const preview     = document.getElementById('imagePreview');
  const previewImg  = document.getElementById('previewImg');
  const uploadStatus = document.getElementById('uploadStatus');

  // نمایش preview موقت
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    preview.style.display = 'block';
    document.querySelector('.dropzone-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);

  // آپلود به Supabase Storage
  uploadStatus.textContent = '⏳ در حال آپلود...';
  uploadStatus.style.color = '#E65100';

  const fileName = `${Date.now()}-${file.name.replace(/\s/g, '-')}`;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/products/${fileName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': file.type,
          'x-upsert': 'true'
        },
        body: file
      }
    );

    if (!res.ok) throw new Error('خطا در آپلود');

    uploadedImageUrl = `${STORAGE_URL}${fileName}`;
    uploadStatus.textContent = '✅ آپلود شد';
    uploadStatus.style.color = '#2E7D32';

  } catch (err) {
    uploadStatus.textContent = '❌ خطا در آپلود';
    uploadStatus.style.color = '#C62828';
    console.error(err);
  }
}

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    orders = await res.json();
    renderOrders(orders);
    updateStats();
  } catch {
    document.getElementById('ordersTableBody').innerHTML =
      '<tr><td colspan="8" class="loading-row">خطا در بارگذاری سفارشات</td></tr>';
  }
}

function renderOrders(list) {
  const filtered = currentOrderFilter === 'all'
    ? list : list.filter(o => o.status === currentOrderFilter);

  const tbody = document.getElementById('ordersTableBody');
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-row">سفارشی یافت نشد</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(o => {
    const shipping = safeJSON(o.shipping);
    const items    = safeJSON(o.items);
    const itemsText = Array.isArray(items)
      ? items.map(i => `${i.emoji||'📦'} ${i.name} ×${i.qty}`).join('، ')
      : '—';

    return `<tr>
      <td><strong>${o.order_id || '#'+o.id}</strong></td>
      <td>
        <div>${shipping.name||'—'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${shipping.phone||''}</div>
      </td>
      <td style="max-width:180px;font-size:12px">${itemsText}</td>
      <td><strong>${Number(o.total||0).toLocaleString('fa-IR')} ت</strong></td>
      <td style="font-size:12px">${o.receipt_code||'—'}</td>
      <td>${statusBadge(o.status)}</td>
      <td style="font-size:11px;color:var(--text-muted)">${formatDate(o.created_at)}</td>
      <td><button class="btn-edit" onclick="viewOrder(${o.id})">جزئیات</button></td>
    </tr>`;
  }).join('');
}

function statusBadge(status) {
  const map = {
    'pending_verify': ['pending',  'در انتظار تأیید'],
    'verified':       ['verified', 'تأیید شده'],
    'shipped':        ['shipped',  'ارسال شده'],
    'cancelled':      ['cancelled','لغو شده'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return `<span class="status-badge status-badge--${cls}">${label}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fa-IR');
}

function safeJSON(str) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str || {}); } catch { return {}; }
}

document.querySelectorAll('.filter-row .filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-row .filter-tab').forEach(t => t.classList.remove('filter-tab--active'));
    tab.classList.add('filter-tab--active');
    currentOrderFilter = tab.dataset.status;
    renderOrders(orders);
  });
});

function viewOrder(id) {
  const o = orders.find(x => x.id === id);
  if (!o) return;
  const shipping = safeJSON(o.shipping);
  const items    = safeJSON(o.items);

  document.getElementById('orderDetailTitle').textContent = `سفارش ${o.order_id||'#'+o.id}`;
  document.getElementById('orderDetailContent').innerHTML = `
    <div class="order-detail-grid">
      <div class="detail-card">
        <div class="detail-card__title">📦 اطلاعات سفارش</div>
        <div class="detail-card__row"><span>شناسه</span><span>${o.order_id||'#'+o.id}</span></div>
        <div class="detail-card__row"><span>مبلغ کل</span><span>${Number(o.total).toLocaleString('fa-IR')} تومان</span></div>
        <div class="detail-card__row"><span>کد پیگیری</span><span>${o.receipt_code||'—'}</span></div>
        <div class="detail-card__row"><span>توضیحات پرداخت</span><span>${o.receipt_note||'—'}</span></div>
        <div class="detail-card__row"><span>کد تخفیف</span><span>${o.coupon||'—'}</span></div>
        <div class="detail-card__row"><span>تاریخ ثبت</span><span>${formatDate(o.created_at)}</span></div>
        <div class="detail-card__row"><span>وضعیت</span><span>${statusBadge(o.status)}</span></div>
      </div>
      <div class="detail-card">
        <div class="detail-card__title">🚚 اطلاعات ارسال</div>
        <div class="detail-card__row"><span>نام</span><span>${shipping.name||'—'}</span></div>
        <div class="detail-card__row"><span>موبایل</span><span>${shipping.phone||'—'}</span></div>
        <div class="detail-card__row"><span>استان</span><span>${shipping.province||'—'}</span></div>
        <div class="detail-card__row"><span>شهر</span><span>${shipping.city||'—'}</span></div>
        <div class="detail-card__row"><span>کد پستی</span><span>${shipping.postal||'—'}</span></div>
        <div class="detail-card__row"><span>آدرس</span><span>${shipping.address||'—'}</span></div>
        <div class="detail-card__row"><span>یادداشت</span><span>${shipping.note||'—'}</span></div>
      </div>
    </div>
    <div class="detail-card" style="margin-bottom:16px">
      <div class="detail-card__title">🛒 محصولات سفارش</div>
      <table class="order-items-table">
        <thead><tr><th>محصول</th><th>قیمت واحد</th><th>تعداد</th><th>جمع</th></tr></thead>
        <tbody>
          ${Array.isArray(items) ? items.map(i => `
            <tr>
              <td>${i.emoji||'📦'} ${i.name}</td>
              <td>${Number(i.price).toLocaleString('fa-IR')} ت</td>
              <td>${i.qty}</td>
              <td>${(i.price*i.qty).toLocaleString('fa-IR')} ت</td>
            </tr>`).join('') : '<tr><td colspan="4">اطلاعات موجود نیست</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="detail-card">
      <div class="detail-card__title">⚙️ تغییر وضعیت</div>
      <div class="status-actions" style="margin-top:8px">
        <button class="status-btn status-btn--verify"  onclick="updateOrderStatus(${o.id},'verified')">✅ تأیید پرداخت</button>
        <button class="status-btn status-btn--ship"    onclick="updateOrderStatus(${o.id},'shipped')">🚚 ارسال شد</button>
        <button class="status-btn status-btn--cancel"  onclick="updateOrderStatus(${o.id},'cancelled')">❌ لغو سفارش</button>
      </div>
    </div>`;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('nav-item--active'));
  showPage('order-detail');
}

async function updateOrderStatus(id, status) {
  const labels = { verified:'تأیید شد', shipped:'ارسال شد', cancelled:'لغو شد' };
  if (!confirm(`وضعیت به "${labels[status]}" تغییر کند؟`)) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status })
    });
    showToast(`✅ وضعیت به «${labels[status]}» تغییر کرد`, 'success');
    await loadOrders();
    showPage('orders');
    document.querySelector('[data-page="orders"]')?.classList.add('nav-item--active');
  } catch { showToast('❌ خطا در بروزرسانی', 'error'); }
}

// ============================================
// STATS
// ============================================
function updateStats() {
  document.getElementById('statOrders').textContent   = orders.length;
  document.getElementById('statPending').textContent  = orders.filter(o => o.status === 'pending_verify').length;
  document.getElementById('statDone').textContent     = orders.filter(o => o.status === 'verified' || o.status === 'shipped').length;
  document.getElementById('statProducts').textContent = products.length;
  const pending = orders.filter(o => o.status === 'pending_verify').length;
  const badge = document.getElementById('pendingBadge');
  badge.textContent = pending;
  badge.style.display = pending > 0 ? 'inline-flex' : 'none';
}

// ============================================
// PRODUCTS
// ============================================
async function loadProducts() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    products = await res.json();
    renderProductTable(products);
    updateStats();
  } catch {
    document.getElementById('productsTableBody').innerHTML =
      '<tr><td colspan="6" class="loading-row">خطا در بارگذاری</td></tr>';
  }
}

function renderProductTable(list) {
  const tbody = document.getElementById('productsTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-row">محصولی یافت نشد</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td>
        <div class="product-cell">
          ${p.image_url
            ? `<img src="${p.image_url}" class="product-thumb" alt="${p.name}" />`
            : `<span class="product-emoji">${p.emoji||'📦'}</span>`}
          <span class="product-name">${p.name}</span>
        </div>
      </td>
      <td>${p.category}</td>
      <td>${Number(p.price).toLocaleString('fa-IR')} ت</td>
      <td>${p.badge==='organic'?'<span class="badge badge--org">ارگانیک</span>':p.badge==='new'?'<span class="badge badge--new">جدید</span>':'<span class="badge badge--none">—</span>'}</td>
      <td><span class="stock-dot stock-dot--${p.in_stock?'in':'out'}">${p.in_stock?'موجود':'ناموجود'}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-edit" onclick="editProduct(${p.id})">ویرایش</button>
          <button class="btn-del"  onclick="confirmDelete(${p.id})">حذف</button>
        </div>
      </td>
    </tr>`).join('');
}

document.getElementById('searchInput')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderProductTable(products.filter(p =>
    p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  ));
});

// ============================================
// SAVE PRODUCT
// ============================================
document.getElementById('saveBtn').addEventListener('click', saveProduct);

async function saveProduct() {
  const id    = document.getElementById('editId').value;
  const name  = document.getElementById('fname').value.trim();
  const cat   = document.getElementById('fcategory').value;
  const price = document.getElementById('fprice').value;
  if (!name || !cat || !price) return showToast('فیلدهای ضروری را پر کنید', 'error');

  const data = {
    name, category: cat, price: parseInt(price),
    description: document.getElementById('fdesc').value.trim(),
    badge:    document.getElementById('fbadge').value || null,
    emoji:    document.getElementById('femoji').value || '📦',
    rating:   parseFloat(document.getElementById('frating').value) || 4.5,
    in_stock: document.getElementById('fstock').checked,
    image_url: uploadedImageUrl || document.getElementById('currentImageUrl').value || null,
  };

  const btn = document.getElementById('saveBtn');
  btn.textContent = 'در حال ذخیره...';
  btn.disabled = true;

  try {
    if (id) {
      await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(data)
      });
      showToast('✅ محصول ویرایش شد', 'success');
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(data)
      });
      showToast('✅ محصول اضافه شد', 'success');
    }
    await loadProducts();
    setTimeout(() => showPage('products'), 1000);
  } catch { showToast('❌ خطا در ذخیره‌سازی', 'error'); }
  finally { btn.textContent = 'ذخیره محصول'; btn.disabled = false; }
}

function editProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  document.getElementById('editId').value         = p.id;
  document.getElementById('fname').value          = p.name;
  document.getElementById('fcategory').value      = p.category;
  document.getElementById('fprice').value         = p.price;
  document.getElementById('fdesc').value          = p.description || '';
  document.getElementById('fbadge').value         = p.badge || '';
  document.getElementById('femoji').value         = p.emoji || '';
  document.getElementById('frating').value        = p.rating || '';
  document.getElementById('fstock').checked       = p.in_stock;
  document.getElementById('currentImageUrl').value = p.image_url || '';
  uploadedImageUrl = null;

  // نمایش عکس فعلی
  const preview    = document.getElementById('imagePreview');
  const previewImg = document.getElementById('previewImg');
  const placeholder = document.querySelector('.dropzone-placeholder');
  if (p.image_url) {
    previewImg.src = p.image_url;
    preview.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    document.getElementById('uploadStatus').textContent = '✅ عکس موجود';
    document.getElementById('uploadStatus').style.color = '#2E7D32';
  } else {
    preview.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    document.getElementById('uploadStatus').textContent = '';
  }

  document.getElementById('formTitle').textContent = 'ویرایش محصول';
  showPage('add');
}

// ============================================
// DELETE
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
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Prefer': 'return=minimal' }
    });
    document.getElementById('deleteModal').style.display = 'none';
    showToast('✅ محصول حذف شد', 'success');
    await loadProducts();
  } catch { showToast('❌ خطا در حذف', 'error'); }
  deleteTargetId = null;
});

// ============================================
// HELPERS
// ============================================
function clearForm() {
  ['editId','fname','fprice','fdesc','femoji','frating','currentImageUrl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['fcategory','fbadge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const stock = document.getElementById('fstock');
  if (stock) stock.checked = true;
  uploadedImageUrl = null;
  const preview = document.getElementById('imagePreview');
  if (preview) preview.style.display = 'none';
  const placeholder = document.querySelector('.dropzone-placeholder');
  if (placeholder) placeholder.style.display = 'flex';
  const status = document.getElementById('uploadStatus');
  if (status) { status.textContent = ''; }
}

function pickEmoji(e) { document.getElementById('femoji').value = e; }

function showToast(msg, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast toast--${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', setupImageUpload);
