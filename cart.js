/* ============================================
   محله شاپ — جاوااسکریپت سبد خرید
   ============================================ */

const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

// کدهای تخفیف
const COUPONS = {
  'MAHALLEH10': { percent: 10, label: '۱۰٪ تخفیف' },
  'NOROOZ20':   { percent: 20, label: '۲۰٪ تخفیف' },
  'ORGANIC15':  { percent: 15, label: '۱۵٪ تخفیف' },
};

let cart = [];
let currentStep = 1;
let discount = 0;
let appliedCoupon = null;

// ============================================
// CART STORAGE
// ============================================
function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem('ms_cart') || '[]');
  } catch {
    cart = [];
  }
}

function saveCart() {
  localStorage.setItem('ms_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total.toLocaleString('fa-IR');
  });
}

// ============================================
// RENDER
// ============================================
function renderCart() {
  const list  = document.getElementById('cartList');
  const empty = document.getElementById('cartEmpty');
  const couponBox = document.getElementById('couponBox');

  if (!cart.length) {
    list.innerHTML  = '';
    empty.style.display = 'flex';
    couponBox.style.display = 'none';
    document.getElementById('clearCartBtn').style.display = 'none';
    document.getElementById('nextStepBtn').disabled = true;
  } else {
    empty.style.display = 'none';
    couponBox.style.display = 'block';
    document.getElementById('clearCartBtn').style.display = '';
    document.getElementById('nextStepBtn').disabled = false;

    list.innerHTML = cart.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item__emoji">${item.emoji || '📦'}</div>
        <div class="cart-item__info">
          <div class="cart-item__cat">${item.category}</div>
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">${(item.price * item.qty).toLocaleString('fa-IR')} تومان</div>
        </div>
        <div class="cart-item__qty">
          <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
          <span class="qty-num">${item.qty.toLocaleString('fa-IR')}</span>
          <button class="qty-btn" onclick="changeQty(${item.id}, +1)">+</button>
        </div>
        <button class="cart-item__remove" onclick="removeItem(${item.id})" aria-label="حذف">✕</button>
      </div>
    `).join('');
  }

  renderSummary();
}

function renderSummary() {
  const rows  = document.getElementById('summaryRows');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(total * discount / 100);
  const finalTotal  = total - discountAmt;

  rows.innerHTML = cart.map(i => `
    <div class="summary__row-item">
      <span>${i.name} × ${i.qty}</span>
      <span>${(i.price * i.qty).toLocaleString('fa-IR')} ت</span>
    </div>
  `).join('');

  const discRow = document.getElementById('discountRow');
  if (discountAmt > 0) {
    discRow.style.display = 'flex';
    document.getElementById('summaryDiscount').textContent =
      `− ${discountAmt.toLocaleString('fa-IR')} ت`;
  } else {
    discRow.style.display = 'none';
  }

  document.getElementById('summaryTotal').textContent =
    `${finalTotal.toLocaleString('fa-IR')} تومان`;

  document.getElementById('summaryShipping').textContent =
    finalTotal >= 500000 ? 'رایگان' : '۳۰,۰۰۰ تومان';
}

// ============================================
// CART ACTIONS
// ============================================
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCart();
}

document.getElementById('clearCartBtn').addEventListener('click', () => {
  if (confirm('سبد خرید پاک شود؟')) {
    cart = [];
    saveCart();
    renderCart();
  }
});

// ============================================
// COUPON
// ============================================
document.getElementById('couponBtn').addEventListener('click', () => {
  const code = document.getElementById('couponInput').value.trim().toUpperCase();
  const msg  = document.getElementById('couponMsg');

  if (!code) return;

  if (COUPONS[code]) {
    discount = COUPONS[code].percent;
    appliedCoupon = code;
    msg.textContent = `✅ کد تخفیف اعمال شد: ${COUPONS[code].label}`;
    msg.className = 'coupon-msg show success';
    renderSummary();
  } else {
    msg.textContent = '❌ کد تخفیف معتبر نیست';
    msg.className = 'coupon-msg show error';
  }
  setTimeout(() => msg.classList.remove('show'), 3000);
});

// ============================================
// STEPS
// ============================================
function goToStep(n) {
  [1, 2, 3].forEach(i => {
    document.getElementById(`cartStep${i}`).style.display = i === n ? 'block' : 'none';
    const stepEl = document.getElementById(`step${i}`);
    stepEl.classList.remove('step--active', 'step--done');
    if (i === n) stepEl.classList.add('step--active');
    if (i < n)  stepEl.classList.add('step--done');
  });

  document.getElementById('prevStepBtn').style.display  = n > 1 ? '' : 'none';
  document.getElementById('continueShopping').style.display = n === 1 ? '' : 'none';

  const nextBtn = document.getElementById('nextStepBtn');
  if (n === 3) {
    nextBtn.textContent = '💳 پرداخت نهایی';
  } else {
    nextBtn.textContent = 'مرحله بعد ←';
  }

  if (n === 3) renderOrderConfirm();
  currentStep = n;
}

document.getElementById('nextStepBtn').addEventListener('click', () => {
  if (currentStep === 1) {
    if (!cart.length) return;
    goToStep(2);
  } else if (currentStep === 2) {
    if (!validateShipping()) return;
    goToStep(3);
  } else if (currentStep === 3) {
    submitOrder();
  }
});

document.getElementById('prevStepBtn').addEventListener('click', () => {
  goToStep(currentStep - 1);
});

// ============================================
// SHIPPING VALIDATION
// ============================================
function validateShipping() {
  const fields = [
    { id: 'sfName',     label: 'نام' },
    { id: 'sfFamily',   label: 'نام خانوادگی' },
    { id: 'sfPhone',    label: 'شماره موبایل' },
    { id: 'sfProvince', label: 'استان' },
    { id: 'sfCity',     label: 'شهر' },
    { id: 'sfAddress',  label: 'آدرس' },
    { id: 'sfPostal',   label: 'کد پستی' },
  ];

  let valid = true;
  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (!el.value.trim()) {
      el.classList.add('error');
      valid = false;
      setTimeout(() => el.classList.remove('error'), 2000);
    }
  });

  if (!valid) alert('لطفاً تمام فیلدهای ضروری را پر کنید');
  return valid;
}

// ============================================
// ORDER CONFIRM BOX
// ============================================
function renderOrderConfirm() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(total * discount / 100);
  const finalTotal  = total - discountAmt;
  const shipping = finalTotal >= 500000 ? 'رایگان' : '۳۰,۰۰۰ تومان';

  document.getElementById('orderSummaryDetail').innerHTML = `
    <strong>تأیید سفارش</strong><br><br>
    نام: ${document.getElementById('sfName').value} ${document.getElementById('sfFamily').value}<br>
    موبایل: ${document.getElementById('sfPhone').value}<br>
    استان: ${document.getElementById('sfProvince').value} — ${document.getElementById('sfCity').value}<br>
    آدرس: ${document.getElementById('sfAddress').value}<br>
    کد پستی: ${document.getElementById('sfPostal').value}<br><br>
    <strong>مبلغ قابل پرداخت: ${finalTotal.toLocaleString('fa-IR')} تومان</strong><br>
    هزینه ارسال: ${shipping}
  `;
}

// ============================================
// SUBMIT ORDER
// ============================================
async function submitOrder() {
  const btn = document.getElementById('nextStepBtn');
  btn.disabled = true;
  btn.textContent = 'در حال پردازش...';

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(total * discount / 100);
  const finalTotal  = total - discountAmt;
  const payMethod = document.querySelector('input[name="payMethod"]:checked').value;

  const order = {
    items: cart,
    shipping: {
      name:    `${document.getElementById('sfName').value} ${document.getElementById('sfFamily').value}`,
      phone:   document.getElementById('sfPhone').value,
      province: document.getElementById('sfProvince').value,
      city:    document.getElementById('sfCity').value,
      address: document.getElementById('sfAddress').value,
      postal:  document.getElementById('sfPostal').value,
      note:    document.getElementById('sfNote').value,
    },
    total: finalTotal,
    coupon: appliedCoupon,
    payment_method: payMethod,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  try {
    // ذخیره سفارش در Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(order)
    });

    // پاک کردن سبد
    cart = [];
    saveCart();

    if (payMethod === 'zarinpal') {
      // اینجا در آینده به زرین‌پال ریدایرکت می‌شه
      alert('✅ سفارش ثبت شد!\n\nدر مرحله بعدی درگاه زرین‌پال اضافه می‌شود.');
    } else {
      alert('✅ سفارش شما با پرداخت در محل ثبت شد!\nبه زودی با شما تماس می‌گیریم.');
    }

    window.location.href = 'index.html';

  } catch {
    alert('❌ خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.');
    btn.disabled = false;
    btn.textContent = '💳 پرداخت نهایی';
  }
}

// ============================================
// PAYMENT METHOD TOGGLE
// ============================================
document.querySelectorAll('.pay-method').forEach(label => {
  label.addEventListener('click', () => {
    document.querySelectorAll('.pay-method').forEach(l => l.classList.remove('pay-method--active'));
    label.classList.add('pay-method--active');
  });
});

// ============================================
// INIT
// ============================================
loadCart();
renderCart();
goToStep(1);
