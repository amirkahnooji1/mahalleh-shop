/* ============================================
   محله شاپ — سبد خرید + پرداخت کارت به کارت
   ============================================ */

const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

// ---- اطلاعات کارت فروشنده ----
const SHOP_CARD = {
  number: '6219-8619-0779-7293', // شماره کارت خودت رو اینجا بذار
  owner:  'امیرحسین کهنوجی',
  bank:   'بانک سامان'
};

const COUPONS = {
  'MAHALLEH10': { percent: 10 },
  'NOROOZ20':   { percent: 20 },
  'ORGANIC15':  { percent: 15 },
};

let cart = [];
let currentStep = 1;
let discount = 0;
let appliedCoupon = null;

// ============================================
// CART STORAGE
// ============================================
function getCart() {
  try { return JSON.parse(localStorage.getItem('ms_cart') || '[]'); } catch { return []; }
}
function saveCart(c) {
  localStorage.setItem('ms_cart', JSON.stringify(c));
}
function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = total.toLocaleString('fa-IR');
  });
}

// ============================================
// RENDER CART
// ============================================
function renderCart() {
  cart = getCart();
  const list     = document.getElementById('cartList');
  const empty    = document.getElementById('cartEmpty');
  const couponBox = document.getElementById('couponBox');
  const nextBtn  = document.getElementById('nextStepBtn');

  if (!cart.length) {
    list.innerHTML = '';
    empty.style.display = 'flex';
    couponBox.style.display = 'none';
    document.getElementById('clearCartBtn').style.display = 'none';
    nextBtn.disabled = true;
  } else {
    empty.style.display = 'none';
    couponBox.style.display = 'block';
    document.getElementById('clearCartBtn').style.display = '';
    nextBtn.disabled = false;

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
        <button class="cart-item__remove" onclick="removeItem(${item.id})">✕</button>
      </div>
    `).join('');
  }

  renderSummary();
  updateCartBadge();
}

function renderSummary() {
  const rows = document.getElementById('summaryRows');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(total * discount / 100);
  const finalTotal  = total - discountAmt;
  const shipping    = finalTotal > 0 && finalTotal < 500000 ? 30000 : 0;

  rows.innerHTML = cart.map(i => `
    <div class="summary__row-item">
      <span>${i.name} × ${i.qty}</span>
      <span>${(i.price * i.qty).toLocaleString('fa-IR')} ت</span>
    </div>
  `).join('');

  const discRow = document.getElementById('discountRow');
  if (discountAmt > 0) {
    discRow.style.display = 'flex';
    document.getElementById('summaryDiscount').textContent = `− ${discountAmt.toLocaleString('fa-IR')} ت`;
  } else {
    discRow.style.display = 'none';
  }

  document.getElementById('summaryShipping').textContent =
    shipping === 0 ? 'رایگان' : `${shipping.toLocaleString('fa-IR')} تومان`;

  document.getElementById('summaryTotal').textContent =
    `${(finalTotal + shipping).toLocaleString('fa-IR')} تومان`;
}

function getFinalTotal() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = Math.round(total * discount / 100);
  const finalTotal  = total - discountAmt;
  const shipping    = finalTotal > 0 && finalTotal < 500000 ? 30000 : 0;
  return finalTotal + shipping;
}

// ============================================
// CART ACTIONS
// ============================================
function changeQty(id, delta) {
  const c = getCart();
  const item = c.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(c);
  renderCart();
}

function removeItem(id) {
  const c = getCart().filter(i => i.id !== id);
  saveCart(c);
  renderCart();
}

document.getElementById('clearCartBtn').addEventListener('click', () => {
  if (confirm('سبد خرید پاک شود؟')) {
    saveCart([]);
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
    msg.textContent = `✅ ${discount}٪ تخفیف اعمال شد`;
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
  [1, 2, 3, 4].forEach(i => {
    const el = document.getElementById(`cartStep${i}`);
    if (el) el.style.display = i === n ? 'block' : 'none';
    const stepEl = document.getElementById(`step${i}`);
    if (stepEl) {
      stepEl.classList.remove('step--active', 'step--done');
      if (i === n) stepEl.classList.add('step--active');
      if (i < n)  stepEl.classList.add('step--done');
    }
  });

  document.getElementById('prevStepBtn').style.display      = n > 1 && n < 4 ? '' : 'none';
  document.getElementById('continueShopping').style.display = n === 1 ? '' : 'none';
  document.getElementById('cartNav').style.display          = n === 4 ? 'none' : 'flex';

  const nextBtn = document.getElementById('nextStepBtn');
  if (n === 3) nextBtn.textContent = '💳 تأیید و مشاهده اطلاعات پرداخت';
  else nextBtn.textContent = 'مرحله بعد ←';

  if (n === 3) renderPaymentStep();
  currentStep = n;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.getElementById('nextStepBtn').addEventListener('click', () => {
  if (currentStep === 1 && !cart.length) return;
  if (currentStep === 1) goToStep(2);
  else if (currentStep === 2) {
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
  const fields = ['sfName','sfFamily','sfPhone','sfProvince','sfCity','sfAddress','sfPostal'];
  let valid = true;
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.classList.add('error');
      setTimeout(() => el.classList.remove('error'), 2500);
      valid = false;
    }
  });
  if (!valid) alert('لطفاً تمام فیلدهای ستاره‌دار را پر کنید');
  return valid;
}

// ============================================
// STEP 3 — PAYMENT (کارت به کارت)
// ============================================
function renderPaymentStep() {
  const finalTotal = getFinalTotal();
  const orderId = 'MS-' + Date.now().toString().slice(-6);
  localStorage.setItem('ms_pending_order_id', orderId);

  document.getElementById('orderSummaryDetail').innerHTML = `
    <div class="card2card">
      <div class="card2card__header">
        <span class="card2card__icon">💳</span>
        <div>
          <div class="card2card__title">پرداخت کارت به کارت</div>
          <div class="card2card__sub">لطفاً مبلغ را به کارت زیر واریز کنید</div>
        </div>
      </div>

      <div class="card2card__amount">
        <span>مبلغ قابل پرداخت</span>
        <strong>${finalTotal.toLocaleString('fa-IR')} تومان</strong>
      </div>

      <div class="card2card__info">
        <div class="card2card__row">
          <span>شماره کارت</span>
          <div class="card2card__num">
            <strong id="cardNumDisplay">${SHOP_CARD.number}</strong>
            <button class="copy-btn" onclick="copyCard()">کپی</button>
          </div>
        </div>
        <div class="card2card__row">
          <span>به نام</span>
          <strong>${SHOP_CARD.owner}</strong>
        </div>
        <div class="card2card__row">
          <span>بانک</span>
          <strong>${SHOP_CARD.bank}</strong>
        </div>
        <div class="card2card__row">
          <span>شناسه سفارش</span>
          <strong>${orderId}</strong>
        </div>
      </div>

      <div class="card2card__notice">
        ⚠️ لطفاً شناسه سفارش <strong>${orderId}</strong> را در توضیحات انتقال وارد کنید
      </div>

      <div class="card2card__receipt">
        <label>شماره پیگیری یا کد رهگیری *</label>
        <input type="text" id="receiptCode" placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰" />
        <label style="margin-top:10px">توضیحات (اختیاری)</label>
        <input type="text" id="receiptNote" placeholder="مثال: واریز از بانک ملی" />
      </div>

      <button class="btn btn--primary" style="width:100%;margin-top:4px" onclick="submitOrder()">
        ✅ ثبت نهایی سفارش
      </button>
    </div>
  `;
}

function copyCard() {
  const num = SHOP_CARD.number.replace(/-/g, '');
  navigator.clipboard.writeText(num).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'کپی شد ✓';
    btn.style.background = '#2E7D32';
    setTimeout(() => { btn.textContent = 'کپی'; btn.style.background = ''; }, 2000);
  });
}

// ============================================
// SUBMIT ORDER
// ============================================
async function submitOrder() {
  const receiptEl = document.getElementById('receiptCode');
  if (!receiptEl?.value.trim()) {
    alert('لطفاً کد پیگیری پرداخت را وارد کنید');
    receiptEl?.focus();
    return;
  }

  const finalTotal = getFinalTotal();
  const orderId = localStorage.getItem('ms_pending_order_id');

  const order = {
    order_id:       orderId,
    items:          JSON.stringify(cart),
    shipping:       JSON.stringify({
      name:     `${document.getElementById('sfName').value} ${document.getElementById('sfFamily').value}`,
      phone:    document.getElementById('sfPhone').value,
      province: document.getElementById('sfProvince').value,
      city:     document.getElementById('sfCity').value,
      address:  document.getElementById('sfAddress').value,
      postal:   document.getElementById('sfPostal').value,
      note:     document.getElementById('sfNote').value,
    }),
    total:          finalTotal,
    coupon:         appliedCoupon,
    payment_method: 'card2card',
    receipt_code:   receiptEl.value.trim(),
    receipt_note:   document.getElementById('receiptNote')?.value || '',
    status:         'pending_verify',
  };

  const btn = document.querySelector('.card2card button.btn--primary');
  if (btn) { btn.disabled = true; btn.textContent = 'در حال ثبت...'; }

  try {
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
    saveCart([]);
    localStorage.removeItem('ms_pending_order_id');

    // رفتن به صفحه موفقیت
    showSuccessStep(orderId, finalTotal);

  } catch {
    alert('❌ خطا در ثبت سفارش. لطفاً دوباره تلاش کنید.');
    if (btn) { btn.disabled = false; btn.textContent = '✅ ثبت نهایی سفارش'; }
  }
}

// ============================================
// STEP 4 — SUCCESS
// ============================================
function showSuccessStep(orderId, total) {
  // مخفی کردن همه step ها
  [1,2,3].forEach(i => {
    const el = document.getElementById(`cartStep${i}`);
    if (el) el.style.display = 'none';
  });
  document.getElementById('cartNav').style.display = 'none';

  // نمایش پیام موفقیت
  const wrap = document.querySelector('.cart-items-wrap');
  const success = document.createElement('div');
  success.className = 'order-success';
  success.innerHTML = `
    <div class="order-success__icon">🎉</div>
    <h2>سفارش شما ثبت شد!</h2>
    <p>سفارش <strong>${orderId}</strong> با موفقیت ثبت شد.</p>
    <p>مبلغ <strong>${total.toLocaleString('fa-IR')} تومان</strong> پس از تأیید واریز، پردازش می‌شود.</p>
    <p class="order-success__note">📞 در صورت نیاز با ما تماس بگیرید: <strong>021-12345678</strong></p>
    <a href="index.html" class="btn btn--primary">بازگشت به فروشگاه</a>
  `;
  wrap.appendChild(success);

  // آپدیت badge سبد
  updateCartBadge();
}

// ============================================
// INIT
// ============================================
renderCart();
goToStep(1);
