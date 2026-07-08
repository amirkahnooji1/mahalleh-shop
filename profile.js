/* ============================================
   محله شاپ — پروفایل کاربر
   ============================================ */

const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

let currentUser = null;
let addresses = [];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('ms_token');
  const userStr = localStorage.getItem('ms_user');

  if (!token || !userStr) {
    document.getElementById('notLogged').style.display = 'flex';
    return;
  }

  currentUser = JSON.parse(userStr);
  document.getElementById('profileWrap').style.display = 'block';
  initProfile();
  updateCartBadge();
});

function initProfile() {
  // نمایش اطلاعات کاربر
  const name = currentUser.name || currentUser.email?.split('@')[0] || 'کاربر';
  const initials = name.charAt(0) || 'م';

  document.getElementById('avatarCircle').textContent = initials;
  document.getElementById('profileName').textContent  = name;
  document.getElementById('profileEmail').textContent = currentUser.email || '';
  document.getElementById('secEmail').textContent     = currentUser.email || '';

  // پر کردن فرم ویرایش
  const nameParts = name.split(' ');
  document.getElementById('editFirstName').value = nameParts[0] || '';
  document.getElementById('editLastName').value  = nameParts.slice(1).join(' ') || '';
  document.getElementById('editEmail').value     = currentUser.email || '';
  document.getElementById('editPhone').value     = currentUser.phone || '';

  // بارگذاری سفارشات
  loadOrders();

  // بارگذاری آدرس‌ها
  loadAddresses();
}

// ============================================
// TABS
// ============================================
document.querySelectorAll('.profile-nav__item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.profile-nav__item').forEach(i => i.classList.remove('profile-nav__item--active'));
    document.querySelectorAll('.profile-tab').forEach(t => t.style.display = 'none');
    item.classList.add('profile-nav__item--active');
    document.getElementById(`tab-${item.dataset.tab}`).style.display = 'block';
  });
});

// ============================================
// ORDERS
// ============================================
async function loadOrders() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const orders = await res.json();

    if (!orders.length) {
      document.getElementById('ordersEmpty').style.display = 'flex';
      return;
    }

    const list = document.getElementById('ordersList');
    const statusMap = {
      'pending_verify': ['pending',   'در انتظار تأیید'],
      'verified':       ['verified',  'تأیید شده'],
      'shipped':        ['shipped',   'ارسال شده'],
      'cancelled':      ['cancelled', 'لغو شده'],
    };

    list.innerHTML = orders.map(o => {
      const items = safeJSON(o.items);
      const itemsText = Array.isArray(items)
        ? items.map(i => `${i.emoji||'📦'} ${i.name}`).join('، ')
        : '—';
      const [cls, label] = statusMap[o.status] || ['pending', o.status];

      return `
        <div class="order-item">
          <div class="order-item__id">${o.order_id || '#'+o.id}</div>
          <div class="order-item__products">${itemsText}</div>
          <div class="order-item__total">${Number(o.total||0).toLocaleString('fa-IR')} ت</div>
          <div class="order-item__date">${formatDate(o.created_at)}</div>
          <span class="order-status order-status--${cls}">${label}</span>
        </div>`;
    }).join('');

  } catch (err) {
    console.error(err);
  }
}

// ============================================
// EDIT PROFILE
// ============================================
document.getElementById('saveProfileBtn').addEventListener('click', async () => {
  const firstName = document.getElementById('editFirstName').value.trim();
  const lastName  = document.getElementById('editLastName').value.trim();
  const phone     = document.getElementById('editPhone').value.trim();
  const msg       = document.getElementById('editMsg');

  if (!firstName) return showMsg(msg, 'نام را وارد کنید', 'error');

  const btn = document.getElementById('saveProfileBtn');
  btn.disabled = true;
  btn.textContent = 'در حال ذخیره...';

  try {
    const fullName = `${firstName} ${lastName}`.trim();
    const token = localStorage.getItem('ms_token');

    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: { full_name: fullName, phone } })
    });

    if (res.ok) {
      // آپدیت localStorage
      currentUser.name = fullName;
      currentUser.phone = phone;
      localStorage.setItem('ms_user', JSON.stringify(currentUser));

      document.getElementById('profileName').textContent = fullName;
      document.getElementById('avatarCircle').textContent = fullName.charAt(0);
      showMsg(msg, '✅ اطلاعات با موفقیت ذخیره شد', 'success');
    } else {
      showMsg(msg, '❌ خطا در ذخیره‌سازی', 'error');
    }
  } catch {
    showMsg(msg, '❌ خطا در اتصال به سرور', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ذخیره تغییرات';
  }
});

// ============================================
// ADDRESSES
// ============================================
function loadAddresses() {
  const saved = localStorage.getItem(`ms_addresses_${currentUser.id}`);
  addresses = saved ? JSON.parse(saved) : [];
  renderAddresses();
}

function saveAddresses() {
  localStorage.setItem(`ms_addresses_${currentUser.id}`, JSON.stringify(addresses));
}

function renderAddresses() {
  const list = document.getElementById('addressesList');
  if (!addresses.length) {
    list.innerHTML = `
      <div class="addresses-empty">
        <div style="font-size:40px">📍</div>
        <p>هنوز آدرسی اضافه نکرده‌اید</p>
      </div>`;
    return;
  }

  list.innerHTML = addresses.map((a, i) => `
    <div class="address-card">
      <div class="address-card__text">
        <div class="address-card__name">${a.receiver} — ${a.phone}</div>
        ${a.province} — ${a.city}<br>
        ${a.address}<br>
        کد پستی: ${a.postal}
      </div>
      <button class="address-card__del" onclick="deleteAddress(${i})" aria-label="حذف آدرس">🗑</button>
    </div>`).join('');
}

document.getElementById('addAddressBtn').addEventListener('click', () => {
  document.getElementById('addressForm').style.display = 'flex';
  document.getElementById('addAddressBtn').style.display = 'none';
});

document.getElementById('cancelAddressBtn').addEventListener('click', () => {
  document.getElementById('addressForm').style.display = 'none';
  document.getElementById('addAddressBtn').style.display = '';
});

document.getElementById('saveAddressBtn').addEventListener('click', () => {
  const province = document.getElementById('aProvince').value;
  const city     = document.getElementById('aCity').value.trim();
  const address  = document.getElementById('aAddress').value.trim();
  const postal   = document.getElementById('aPostal').value.trim();
  const receiver = document.getElementById('aReceiver').value.trim();
  const phone    = document.getElementById('aPhone').value.trim();

  if (!province || !city || !address || !postal || !receiver || !phone) {
    alert('لطفاً همه فیلدها را پر کنید');
    return;
  }

  addresses.push({ province, city, address, postal, receiver, phone });
  saveAddresses();
  renderAddresses();

  // ریست فرم
  ['aProvince','aCity','aAddress','aPostal','aReceiver','aPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('addressForm').style.display = 'none';
  document.getElementById('addAddressBtn').style.display = '';
});

function deleteAddress(index) {
  if (!confirm('این آدرس حذف شود؟')) return;
  addresses.splice(index, 1);
  saveAddresses();
  renderAddresses();
}

// ============================================
// CHANGE PASSWORD
// ============================================
document.getElementById('changePassBtn').addEventListener('click', async () => {
  const newPass     = document.getElementById('newPass').value;
  const confirmPass = document.getElementById('confirmPass').value;
  const msg         = document.getElementById('secMsg');

  if (newPass.length < 8) return showMsg(msg, 'رمز عبور باید حداقل ۸ کاراکتر باشد', 'error');
  if (newPass !== confirmPass) return showMsg(msg, 'رمزهای عبور یکسان نیستند', 'error');

  const btn = document.getElementById('changePassBtn');
  btn.disabled = true;
  btn.textContent = 'در حال تغییر...';

  try {
    const token = localStorage.getItem('ms_token');
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPass })
    });

    if (res.ok) {
      showMsg(msg, '✅ رمز عبور با موفقیت تغییر کرد', 'success');
      document.getElementById('newPass').value = '';
      document.getElementById('confirmPass').value = '';
    } else {
      showMsg(msg, '❌ خطا در تغییر رمز عبور', 'error');
    }
  } catch {
    showMsg(msg, '❌ خطا در اتصال به سرور', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'تغییر رمز عبور';
  }
});

// ============================================
// LOGOUT
// ============================================
document.getElementById('logoutBtn').addEventListener('click', () => {
  if (!confirm('از حساب کاربری خارج شوید؟')) return;
  localStorage.removeItem('ms_token');
  localStorage.removeItem('ms_user');
  window.location.href = 'index.html';
});

// ============================================
// HELPERS
// ============================================
function safeJSON(str) {
  try { return typeof str === 'string' ? JSON.parse(str) : (str || {}); } catch { return {}; }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fa-IR');
}

function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `pform-msg ${type} show`;
  setTimeout(() => el.classList.remove('show'), 4000);
}

function updateCartBadge() {
  try {
    const cart = JSON.parse(localStorage.getItem('ms_cart') || '[]');
    const total = cart.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-badge').forEach(b => {
      b.textContent = total.toLocaleString('fa-IR');
    });
  } catch {}
}
