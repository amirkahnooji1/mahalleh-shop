/* ============================================
   محله شاپ — صفحه دسته‌بندی
   ============================================ */

const SUPABASE_URL = 'https://mahalleh-proxy.amirkahnooji1.workers.dev';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

const CATEGORIES = [
  { name: 'عسل طبیعی',       icon: '🍯' },
  { name: 'صنایع دستی',      icon: '🧶' },
  { name: 'ترشیجات',         icon: '🫙' },
  { name: 'دمنوش',           icon: '🌿' },
  { name: 'سفال',            icon: '🏺' },
  { name: 'آرایشی طبیعی',   icon: '🧴' },
  { name: 'بافتنی و نساجی', icon: '🪢' },
  { name: 'غلات و حبوبات',  icon: '🌾' },
  { name: 'منبت و چوب',     icon: '🪵' },
   { name: 'متفرقه',  icon: '🧉' }, 
];

let allProducts = [];
let currentCat  = '';
let currentSort = 'newest';

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // گرفتن دسته‌بندی از URL
  const params = new URLSearchParams(window.location.search);
  currentCat = params.get('cat') || '';

  updateCartBadge();
  setupUserBtn();
  loadAllProducts();
  setupControls();
  setupSearch();
});

// ============================================
// LOAD PRODUCTS
// ============================================
async function loadAllProducts() {
  showSkeleton();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    allProducts = await res.json();
    buildCatList();
    renderProducts();
  } catch {
    document.getElementById('productsGrid').innerHTML =
      '<div class="cat-empty" style="display:flex"><p>⚠️ خطا در بارگذاری. لطفاً رفرش کنید.</p></div>';
  }
}

// ============================================
// BUILD SIDEBAR CATEGORIES
// ============================================
function buildCatList() {
  const list = document.getElementById('catList');

  // شمارش محصولات هر دسته
  const counts = {};
  allProducts.forEach(p => {
    counts[p.category] = (counts[p.category] || 0) + 1;
  });

  // همه دسته‌ها
  const allItem = document.createElement('a');
  allItem.className = 'cat-list-item' + (!currentCat ? ' cat-list-item--active' : '');
  allItem.innerHTML = `
    <div class="cat-list-left">
      <span class="cat-list-icon">🏪</span>
      <span>همه محصولات</span>
    </div>
    <span class="cat-list-count">${allProducts.length}</span>`;
  allItem.addEventListener('click', () => switchCat(''));
  list.appendChild(allItem);

  // دسته‌بندی‌های موجود
  CATEGORIES.forEach(cat => {
    const count = counts[cat.name] || 0;
    if (count === 0) return;
    const item = document.createElement('a');
    item.className = 'cat-list-item' + (currentCat === cat.name ? ' cat-list-item--active' : '');
    item.innerHTML = `
      <div class="cat-list-left">
        <span class="cat-list-icon">${cat.icon}</span>
        <span>${cat.name}</span>
      </div>
      <span class="cat-list-count">${count}</span>`;
    item.addEventListener('click', () => switchCat(cat.name));
    list.appendChild(item);
  });
}

function switchCat(name) {
  currentCat = name;
  // آپدیت URL بدون reload
  const url = new URL(window.location.href);
  if (name) url.searchParams.set('cat', name);
  else url.searchParams.delete('cat');
  window.history.pushState({}, '', url);

  // آپدیت active class
  document.querySelectorAll('.cat-list-item').forEach(item => {
    item.classList.remove('cat-list-item--active');
  });
  event.currentTarget.classList.add('cat-list-item--active');

  renderProducts();
}

// ============================================
// RENDER PRODUCTS
// ============================================
function renderProducts(searchQuery = '') {
  let list = [...allProducts];

  // فیلتر دسته‌بندی
  if (currentCat) list = list.filter(p => p.category === currentCat);

  // فیلتر جستجو
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  // فیلترهای چک‌باکس
  if (document.getElementById('filterOrganic').checked)
    list = list.filter(p => p.badge === 'organic');
  if (document.getElementById('filterNew').checked)
    list = list.filter(p => p.badge === 'new');
  if (document.getElementById('filterInStock').checked)
    list = list.filter(p => p.in_stock);

  // مرتب‌سازی
  switch (currentSort) {
    case 'price_asc':  list.sort((a,b) => a.price - b.price); break;
    case 'price_desc': list.sort((a,b) => b.price - a.price); break;
    case 'rating':     list.sort((a,b) => (b.rating||0) - (a.rating||0)); break;
    default: break; // newest — همون ترتیب Supabase
  }

  // آپدیت عنوان و تعداد
  const title = currentCat || 'همه محصولات';
  const icon  = CATEGORIES.find(c => c.name === currentCat)?.icon || '🏪';
  document.getElementById('catTitle').textContent        = `${icon} ${title}`;
  document.getElementById('breadcrumbCat').textContent   = title;
  document.getElementById('catCount').textContent        = `${list.length} محصول`;
  document.title = `${title} — محله شاپ`;

  const grid  = document.getElementById('productsGrid');
  const empty = document.getElementById('catEmpty');

  if (!list.length) {
    grid.innerHTML = '';
    empty.style.display = 'flex';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map(p => `
    <div class="product" data-id="${p.id}">
      <div class="product__img-wrap">
        ${p.image_url
          ? `<img src="${p.image_url}" class="product__img" alt="${p.name}" loading="lazy" />`
          : `<span class="product__emoji">${p.emoji || '📦'}</span>`}
        ${p.badge ? `<span class="product__badge product__badge--${p.badge==='organic'?'org':'new'}">${p.badge==='organic'?'ارگانیک':'جدید'}</span>` : ''}
        <button class="product__wish" onclick="toggleWish(this)">♡</button>
      </div>
      <div class="product__body">
        <div class="product__cat">${p.category}</div>
        <h3 class="product__name">${p.name}</h3>
        ${p.description ? `<p class="product__desc">${p.description}</p>` : ''}
        <div class="product__rating">
          ${'★'.repeat(Math.round(p.rating||0))}${'☆'.repeat(5-Math.round(p.rating||0))}
          <span>(${p.review_count||0})</span>
        </div>
        <div class="product__footer">
          <div class="product__price">${Number(p.price).toLocaleString('fa-IR')} تومان</div>
          <button class="product__add" onclick="addToCart(${p.id})" ${!p.in_stock?'disabled':''}>
            ${p.in_stock ? '+' : '✕'}
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================
// SKELETON
// ============================================
function showSkeleton() {
  document.getElementById('productsGrid').innerHTML = [1,2,3,4,5,6].map(() => `
    <div class="product product--skeleton">
      <div class="product__img-wrap skeleton-box"></div>
      <div class="product__body">
        <div class="skeleton-line skeleton-line--sm"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line--md"></div>
      </div>
    </div>`).join('');
}

// ============================================
// CONTROLS
// ============================================
function setupControls() {
  // مرتب‌سازی
  document.querySelectorAll('input[name="sort"]').forEach(radio => {
    radio.addEventListener('change', () => {
      currentSort = radio.value;
      renderProducts();
    });
  });

  // فیلترها
  ['filterOrganic', 'filterNew', 'filterInStock'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => renderProducts());
  });
}

// ============================================
// SEARCH
// ============================================
function setupSearch() {
  const toggleBtn = document.getElementById('searchToggleBtn');
  const wrap      = document.getElementById('searchBarWrap');
  const input     = document.getElementById('searchInput');

  toggleBtn.addEventListener('click', () => {
    const isOpen = wrap.style.display !== 'none';
    wrap.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) input.focus();
  });

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => renderProducts(input.value.trim()), 300);
  });
}

// ============================================
// CART
// ============================================
function getCart() {
  try { return JSON.parse(localStorage.getItem('ms_cart') || '[]'); } catch { return []; }
}
function saveCart(cart) { localStorage.setItem('ms_cart', JSON.stringify(cart)); }

function addToCart(id) {
  const prod = allProducts.find(p => p.id === id);
  if (!prod) return;

  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty++;
  else cart.push({ id: prod.id, name: prod.name, category: prod.category, price: prod.price, emoji: prod.emoji, qty: 1 });
  saveCart(cart);
  updateCartBadge();

  const btn = document.querySelector(`.product[data-id="${id}"] .product__add`);
  if (btn) {
    btn.textContent = '✓';
    btn.style.background = '#2E7D32';
    setTimeout(() => { btn.textContent = '+'; btn.style.background = ''; }, 1200);
  }
}

function updateCartBadge() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total.toLocaleString('fa-IR');
  });
}

function toggleWish(btn) {
  const active = btn.classList.toggle('wished');
  btn.textContent = active ? '♥' : '♡';
  btn.style.color = active ? '#e53935' : '';
  btn.style.borderColor = active ? '#e53935' : '';
}

function setupUserBtn() {
  document.getElementById('userBtn')?.addEventListener('click', e => {
    e.preventDefault();
    window.location.href = localStorage.getItem('ms_token') ? 'profile.html' : 'auth.html';
  });
}
