/* ============================================
   محله شاپ — جاوااسکریپت احراز هویت
   ============================================ */

const SUPABASE_URL = 'https://pgytilmdbcksoquruyrc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBneXRpbG1kYmNrc29xdXJ1eXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1OTE0NzIsImV4cCI6MjA5ODE2NzQ3Mn0.W7_SLzAhegSxxU6G1kVfbC6a9IaZ_aRWaW6eK83aYPM';

// ============================================
// TABS
// ============================================
document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
document.getElementById('tabRegister').addEventListener('click', () => switchTab('register'));

function switchTab(tab) {
  document.getElementById('formLogin').style.display    = tab === 'login'    ? 'flex' : 'none';
  document.getElementById('formRegister').style.display = tab === 'register' ? 'flex' : 'none';
  document.getElementById('formForgot').style.display   = 'none';
  document.getElementById('tabLogin').classList.toggle('auth-tab--active',    tab === 'login');
  document.getElementById('tabRegister').classList.toggle('auth-tab--active', tab === 'register');
  document.querySelectorAll('.auth-tabs').forEach(t => t.style.display = '');
}

// ============================================
// FORGOT PASSWORD
// ============================================
document.getElementById('forgotLink').addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('formLogin').style.display  = 'none';
  document.getElementById('formForgot').style.display = 'flex';
  document.querySelector('.auth-tabs').style.display  = 'none';
});

document.getElementById('backToLogin').addEventListener('click', () => switchTab('login'));

document.getElementById('forgotBtn').addEventListener('click', async () => {
  const email = document.getElementById('forgotEmail').value.trim();
  const msg   = document.getElementById('forgotMsg');

  if (!email) return showMsg(msg, 'ایمیل را وارد کنید', 'error');

  const btn = document.getElementById('forgotBtn');
  btn.disabled = true;
  btn.textContent = 'در حال ارسال...';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    if (res.ok) {
      showMsg(msg, '✅ لینک بازیابی به ایمیل شما ارسال شد', 'success');
    } else {
      showMsg(msg, '❌ خطا در ارسال. ایمیل را بررسی کنید', 'error');
    }
  } catch {
    showMsg(msg, '❌ خطا در اتصال به سرور', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ارسال لینک بازیابی';
  }
});

// ============================================
// LOGIN
// ============================================
document.getElementById('loginBtn').addEventListener('click', loginUser);
document.getElementById('loginPass').addEventListener('keydown', e => {
  if (e.key === 'Enter') loginUser();
});

async function loginUser() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const msg   = document.getElementById('loginMsg');

  if (!email || !pass) return showMsg(msg, 'لطفاً ایمیل و رمز عبور را وارد کنید', 'error');

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'در حال ورود...';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();

    if (res.ok && data.access_token) {
      // ذخیره توکن
      localStorage.setItem('ms_token', data.access_token);
      localStorage.setItem('ms_user', JSON.stringify({
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.full_name || email.split('@')[0]
      }));
      showMsg(msg, '✅ خوش آمدید! در حال انتقال...', 'success');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } else {
      const errMap = {
        'Invalid login credentials': 'ایمیل یا رمز عبور اشتباه است',
        'Email not confirmed': 'لطفاً ابتدا ایمیل خود را تأیید کنید',
      };
      showMsg(msg, errMap[data.error_description] || 'خطا در ورود. مجدداً تلاش کنید', 'error');
    }
  } catch {
    showMsg(msg, '❌ خطا در اتصال به سرور', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ورود به حساب';
  }
}

// ============================================
// REGISTER
// ============================================
document.getElementById('registerBtn').addEventListener('click', registerUser);

async function registerUser() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const terms = document.getElementById('regTerms').checked;
  const msg   = document.getElementById('registerMsg');

  if (!name)         return showMsg(msg, 'نام خود را وارد کنید', 'error');
  if (!email)        return showMsg(msg, 'ایمیل را وارد کنید', 'error');
  if (pass.length < 8) return showMsg(msg, 'رمز عبور باید حداقل ۸ کاراکتر باشد', 'error');
  if (!terms)        return showMsg(msg, 'لطفاً شرایط استفاده را بپذیرید', 'error');

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.textContent = 'در حال ثبت‌نام...';

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password: pass,
        data: { full_name: name }
      })
    });

    const data = await res.json();

    if (res.ok && data.id) {
      document.querySelector('.auth-tabs').style.display = 'none';
      document.getElementById('formRegister').style.display = 'none';
      document.getElementById('authSuccess').style.display = 'flex';
    } else {
      const errMap = {
        'User already registered': 'این ایمیل قبلاً ثبت شده است',
        'Password should be at least 6 characters': 'رمز عبور خیلی کوتاه است',
      };
      showMsg(msg, errMap[data.msg] || 'خطا در ثبت‌نام. مجدداً تلاش کنید', 'error');
    }
  } catch {
    showMsg(msg, '❌ خطا در اتصال به سرور', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'ساخت حساب کاربری';
  }
}

// ============================================
// GOOGLE LOGIN
// ============================================
document.getElementById('googleBtn').addEventListener('click', () => {
  window.location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}/index.html`;
});

// ============================================
// PASSWORD STRENGTH
// ============================================
document.getElementById('regPass').addEventListener('input', e => {
  const val = e.target.value;
  const container = document.getElementById('passStrength');

  if (!val) { container.innerHTML = ''; return; }

  let strength = 0;
  if (val.length >= 8) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;

  const levels = ['weak', 'weak', 'medium', 'strong', 'strong'];
  const level  = levels[strength] || 'weak';

  container.innerHTML = [1,2,3,4].map(i =>
    `<div class="pass-strength-bar ${i <= strength ? level : ''}"></div>`
  ).join('');
});

// ============================================
// TOGGLE PASSWORD VISIBILITY
// ============================================
function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.style.opacity = input.type === 'text' ? '1' : '0.5';
}

// ============================================
// HELPER
// ============================================
function showMsg(el, text, type) {
  el.textContent = text;
  el.className = `auth-msg ${type} show`;
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ============================================
// CHECK IF ALREADY LOGGED IN
// ============================================
if (localStorage.getItem('ms_token')) {
  window.location.href = 'index.html';
}
