/* ============================================
   محله شاپ — جاوااسکریپت اصلی
   ============================================ */

// ---- SUPABASE CONFIG ----
const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

// ---- FETCH PRODUCTS FROM SUPABASE ----
async function loadProducts() {
  const grid = document.getElementById('productGrid');

  // نمایش اسکلتون لودینگ
  grid.innerHTML = `
    ${[1,2,3,4,5,6].map(() => `
      <div class="product product--skeleton">
        <div class="product__img-wrap skeleton-box"></div>
        <div class="product__body">
          <div class="skeleton-line skeleton-line--sm"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-line--md"></div>
          <div class="skeleton-line skeleton-line--sm"></div>
        </div>
      </div>
    `).join('')}
  `;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        }
      }
    );

    if (!res.ok) throw new Error('خطا در دریافت محصولات');

    const products = await res.json();
    renderProducts(products);

  } catch (err) {
    grid.innerHTML = `
      <div class="products__error">
        <p>⚠️ خطا در بارگذاری محصولات. لطفاً صفحه را رفرش کنید.</p>
      </div>
    `;
    console.error(err);
  }
}

// ---- RENDER PRODUCTS ----
function renderProducts(products) {
  const grid = document.getElementById('productGrid');

  if (!products.length) {
    grid.innerHTML = '<p class="products__empty">محصولی یافت نشد.</p>';
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product" data-id="${p.id}" data-category="${p.category}">
      <div class="product__img-wrap">
        <span class="product__emoji">${p.emoji || '📦'}</span>
        ${p.badge ? `<span class="product__badge product__badge--${p.badge === 'organic' ? 'org' : 'new'}">${p.badge === 'organic' ? 'ارگانیک' : 'جدید'}</span>` : ''}
        <button class="product__wish" aria-label="افزودن به علاقه‌مندی‌ها">♡</button>
      </div>
      <div class="product__body">
        <div class="product__cat">${p.category}</div>
        <h3 class="product__name">${p.name}</h3>
        <div class="product__rating">
          ${'★'.repeat(Math.round(p.rating || 0))}${'☆'.repeat(5 - Math.round(p.rating || 0))}
          <span>(${p.review_count || 0})</span>
        </div>
        <div class="product__footer">
          <div class="product__price">${Number(p.price).toLocaleString('fa-IR')} تومان</div>
          <button class="product__add" aria-label="افزودن به سبد خرید" ${!p.in_stock ? 'disabled' : ''}>
            ${p.in_stock ? '+' : '✕'}
          </button>
        </div>
      </div>
    </div>
  `).join('');

  // اتصال مجدد رویدادها بعد از رندر
  bindProductEvents();
}

// ---- FILTER TABS ----
let currentFilter = 'all';

function setupFilterTabs() {
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('filter-tab--active'));
      tab.classList.add('filter-tab--active');

      const filter = tab.dataset.filter;
      currentFilter = filter;
      filterProducts(filter);
    });
  });
}

function filterProducts(filter) {
  const cards = document.querySelectorAll('.product[data-id]');
  cards.forEach(card => {
    if (filter === 'all') {
      card.style.display = '';
    } else if (filter === 'organic') {
      card.style.display = card.querySelector('.product__badge--org') ? '' : 'none';
    } else if (filter === 'new') {
      card.style.display = card.querySelector('.product__badge--new') ? '' : 'none';
    } else {
      card.style.display = card.dataset.category === filter ? '' : 'none';
    }
  });
}

// ---- ADD TO CART ----
let cartCount = 0;
const cartBadge = document.querySelector('.cart-badge');

function bindProductEvents() {
  document.querySelectorAll('.product__add').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      cartCount++;
      cartBadge.textContent = cartCount.toLocaleString('fa-IR');
      btn.textContent = '✓';
      btn.style.background = '#2E7D32';
      setTimeout(() => {
        btn.textContent = '+';
        btn.style.background = '';
      }, 1200);
    });
  });

  document.querySelectorAll('.product__wish').forEach(btn => {
    btn.addEventListener('click', () => {
      const active = btn.classList.toggle('wished');
      btn.textContent = active ? '♥' : '♡';
      btn.style.color = active ? '#e53935' : '';
      btn.style.borderColor = active ? '#e53935' : '';
    });
  });
}

// ---- MOBILE MENU ----
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');

hamburger.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});

document.querySelectorAll('.mobile-nav__link').forEach(link => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
  });
});

// ---- STICKY HEADER SHADOW ----
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  header.style.boxShadow = window.scrollY > 10
    ? '0 2px 16px rgba(61,43,26,0.14)'
    : '0 1px 4px rgba(61,43,26,0.08)';
});

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupFilterTabs();
});
