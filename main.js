// main.js - Blissroot Ayurveda

// --- AUTHENTICATION MODAL & LOGIC ---

// Inject Auth Modal CSS
const authStyles = document.createElement('style');
authStyles.textContent = `
.auth-modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: none; justify-content: center; align-items: center; z-index: 9999;
}
.auth-modal-overlay.active { display: flex; }
.auth-modal {
  background: #fff; width: 100%; max-width: 400px; border-radius: 12px;
  overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  animation: authModalIn 0.3s ease;
}
@keyframes authModalIn {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.auth-header {
  display: flex; border-bottom: 1px solid #eee;
}
.auth-tab {
  flex: 1; text-align: center; padding: 15px; cursor: pointer;
  font-weight: 600; color: #777; transition: 0.3s;
}
.auth-tab.active {
  color: #1F3D2B; border-bottom: 3px solid #C9A84C;
}
.auth-body { padding: 30px; }
.auth-form { display: none; }
.auth-form.active { display: block; }
.auth-form h2 { margin-top: 0; color: #1F3D2B; margin-bottom: 20px; font-size: 1.5rem; text-align: center; }
.auth-input {
  width: 100%; padding: 12px 15px; margin-bottom: 15px;
  border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 1rem;
}
.auth-input:focus { outline: none; border-color: #C9A84C; box-shadow: 0 0 0 2px rgba(201,168,76,0.2); }
.auth-btn {
  width: 100%; padding: 14px; background: #1F3D2B; color: #fff; border: none;
  border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: 0.3s;
}
.auth-btn:hover { background: #2E5E3F; }
.auth-btn-outline {
  width: auto; padding: 12px 15px; background: #fff; color: #1F3D2B; border: 1px solid #1F3D2B;
  border-radius: 6px; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: 0.3s;
  white-space: nowrap;
}
.auth-btn-outline:hover { background: #f4f7f6; }
.auth-close {
  position: absolute; top: 15px; right: 15px; background: none; border: none;
  font-size: 1.5rem; cursor: pointer; color: #999;
}
.auth-close:hover { color: #333; }
.auth-error { color: #dc3545; font-size: 0.85rem; margin-bottom: 15px; text-align: center; display: none; }
.auth-success { color: #28a745; font-size: 0.85rem; margin-bottom: 15px; text-align: center; display: none; }

/* --- Nav Auth Button Styles --- */
.nav-auth-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 50px; cursor: pointer;
  font-size: 0.85rem; font-weight: 600; text-decoration: none;
  transition: all 0.3s ease; white-space: nowrap; border: none;
}
.nav-auth-btn.logged-out {
  background: #C9A84C; color: #fff;
}
.nav-auth-btn.logged-out:hover {
  background: #b8963e; transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(201,168,76,0.4);
}
.nav-auth-btn.logged-in {
  background: rgba(31,61,43,0.08); color: #1F3D2B;
  padding: 5px 14px 5px 5px;
}
.nav-auth-btn.logged-in:hover {
  background: rgba(31,61,43,0.15);
}
.nav-auth-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: #1F3D2B; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700; letter-spacing: 0.5px;
}
.nav-auth-name { max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
.nav-auth-logout {
  font-size: 0.7rem; color: #999; margin-left: 2px;
}
.nav-auth-icon {
  width: 18px; height: 18px; fill: currentColor;
}

/* --- Toast Notifications --- */
.toast-container {
  position: fixed; bottom: 20px; right: 20px; z-index: 99999;
  display: flex; flex-direction: column; gap: 10px;
}
.toast {
  padding: 14px 20px; border-radius: 10px; color: #fff;
  font-size: 0.9rem; font-weight: 500; min-width: 260px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.15);
  animation: toastIn 0.4s ease;
  display: flex; align-items: center; gap: 10px;
}
.toast.toast-out { animation: toastOut 0.3s ease forwards; }
.toast-success { background: #1F3D2B; }
.toast-error { background: #C0392B; }
.toast-info { background: #2980b9; }
@keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(40px); } }
`;
document.head.appendChild(authStyles);

// Inject Auth Modal HTML
const authModalHTML = `
<div class="auth-modal-overlay" id="authModal">
  <div style="position:relative; width: 100%; max-width: 400px;">
    <button class="auth-close" id="authClose">&times;</button>
    <div class="auth-modal">
      <div class="auth-header">
        <div class="auth-tab active" data-tab="login">Login</div>
        <div class="auth-tab" data-tab="signup">Sign Up</div>
      </div>
      <div class="auth-body">
        <!-- Login Form -->
        <form class="auth-form active" id="loginForm">
          <h2>Welcome Back</h2>
          <div class="auth-error" id="loginError"></div>
          <div class="auth-success" id="loginSuccess"></div>
          
          <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="tel" id="loginPhone" class="auth-input" style="margin-bottom:0;" placeholder="10-digit Phone Number" required>
            <button type="button" class="auth-btn-outline" onclick="sendOTP('loginPhone', 'loginError', 'loginSuccess')">Get OTP</button>
          </div>
          <input type="password" id="loginPassword" class="auth-input" placeholder="Password" required>
          <input type="text" id="loginOtp" class="auth-input" placeholder="6-digit OTP" required>
          
          <button type="submit" class="auth-btn">Login to Continue</button>
        </form>
        
        <!-- Signup Form -->
        <form class="auth-form" id="signupForm">
          <h2>Create Account</h2>
          <div class="auth-error" id="signupError"></div>
          <div class="auth-success" id="signupSuccess"></div>
          
          <input type="text" id="signupName" class="auth-input" placeholder="Full Name" required>
          <div style="display:flex; gap:10px; margin-bottom:15px;">
            <input type="tel" id="signupPhone" class="auth-input" style="margin-bottom:0;" placeholder="10-digit Phone Number" required>
            <button type="button" class="auth-btn-outline" onclick="sendOTP('signupPhone', 'signupError', 'signupSuccess')">Get OTP</button>
          </div>
          <input type="password" id="signupPassword" class="auth-input" placeholder="Password" required>
          <input type="text" id="signupOtp" class="auth-input" placeholder="6-digit OTP" required>
          
          <button type="submit" class="auth-btn">Sign Up to Continue</button>
        </form>
      </div>
    </div>
  </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', authModalHTML);

// Auth Modal Logic
const authModal = document.getElementById('authModal');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
let pendingCartItem = null; // Stores item to add after login

document.getElementById('authClose').addEventListener('click', () => {
    authModal.classList.remove('active');
});

authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        const targetForm = tab.getAttribute('data-tab') + 'Form';
        document.getElementById(targetForm).classList.add('active');
        
        // Hide messages when switching tabs
        document.getElementById('loginError').style.display = 'none';
        document.getElementById('loginSuccess').style.display = 'none';
        document.getElementById('signupError').style.display = 'none';
        document.getElementById('signupSuccess').style.display = 'none';
    });
});

window.sendOTP = async function(phoneFieldId, errorFieldId, successFieldId) {
    const phone = document.getElementById(phoneFieldId).value;
    const errorEl = document.getElementById(errorFieldId);
    const successEl = document.getElementById(successFieldId);
    
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    if (!phone) {
        errorEl.textContent = 'Please enter your phone number first';
        errorEl.style.display = 'block';
        return;
    }
    
    try {
        const res = await fetch('/api/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone })
        });
        const data = await res.json();
        
        if (res.ok) {
            successEl.textContent = 'OTP sent to ' + phone + '!';
            successEl.style.display = 'block';
            if (data.otp) {
                // Show OTP on screen for testing purposes
                alert('TEST MODE: Your OTP is ' + data.otp);
            }
        } else {
            throw new Error(data.error || 'Failed to send OTP');
        }
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
};

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    const successEl = document.getElementById('loginSuccess');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: document.getElementById('loginPhone').value,
                password: document.getElementById('loginPassword').value,
                otp: document.getElementById('loginOtp').value
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        authModal.classList.remove('active');
        if (typeof updateNavAuth === 'function') updateNavAuth();
        
        if (pendingCartItem) {
            proceedToCart(pendingCartItem);
            pendingCartItem = null;
        }
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('signupError');
    const successEl = document.getElementById('signupSuccess');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
    
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('signupName').value,
                phone: document.getElementById('signupPhone').value,
                password: document.getElementById('signupPassword').value,
                otp: document.getElementById('signupOtp').value
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Signup failed');
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        authModal.classList.remove('active');
        if (typeof updateNavAuth === 'function') updateNavAuth();
        
        if (pendingCartItem) {
            proceedToCart(pendingCartItem);
            pendingCartItem = null;
        }
    } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
    }
});

window.openAuthModal = () => {
    authModal.classList.add('active');
};

window.logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNavAuth();
    alert('Logged out successfully');
};

function updateNavAuth() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;
    
    let authBtn = document.getElementById('navAuthBtn');
    if (!authBtn) {
        authBtn = document.createElement('a');
        authBtn.id = 'navAuthBtn';
        authBtn.href = '#';
        
        const cartBtn = navActions.querySelector('a[href="cart.html"]');
        if (cartBtn) {
            navActions.insertBefore(authBtn, cartBtn);
        } else {
            navActions.prepend(authBtn);
        }
    }
    
    const token = localStorage.getItem('token');
    if (token) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const firstName = user.name ? user.name.split(' ')[0] : 'User';
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'U';
        authBtn.className = 'nav-auth-btn logged-in';
        authBtn.innerHTML = '<span class="nav-auth-avatar">' + initials + '</span><span class="nav-auth-name">' + firstName + '</span><span class="nav-auth-logout">✕</span>';
        authBtn.title = 'Click to logout';
        authBtn.onclick = (e) => {
            e.preventDefault();
            window.logout();
        };
    } else {
        authBtn.className = 'nav-auth-btn logged-out';
        authBtn.innerHTML = '<svg class="nav-auth-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg> Login';
        authBtn.title = 'Login or Sign Up';
        authBtn.onclick = (e) => {
            e.preventDefault();
            window.openAuthModal();
        };
    }
}

// Call once to initialize the button
document.addEventListener('DOMContentLoaded', updateNavAuth);
// Call immediately in case DOM is already loaded
if (document.readyState !== 'loading') updateNavAuth();


// --- CART MANAGEMENT ---
function getCart() {
  const cart = localStorage.getItem('blissroot_cart');
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  localStorage.setItem('blissroot_cart', JSON.stringify(cart));
}

function updateCartCount() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartCountEl = document.getElementById('cartCount');
  if (cartCountEl) {
    cartCountEl.textContent = totalQty;
  }
}

// Intercept Add to Cart to require Login
function addToCart(arg1, arg2, arg3) {
  let product;
  if (typeof arg1 === 'object') {
    product = arg1;
  } else {
    // Handles inline calls like: addToCart('chyawanprash', 'Blissroot Chyawanprash', 399)
    product = { id: arg1, name: arg2, price: arg3, image: '/images/logo.jpg' };
  }

  const token = localStorage.getItem('token');
  if (!token) {
      pendingCartItem = product;
      authModal.classList.add('active');
  } else {
      proceedToCart(product);
  }
}

// Actually add to cart
function proceedToCart(product) {
  const cart = getCart();
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  
  saveCart(cart);
  updateCartCount();
  showToast('✓ ' + product.name + ' added to cart!', 'success');
}

// Toast Notification System
let toastContainer = document.getElementById('toastContainer');
if (!toastContainer) {
  toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
window.showToast = showToast;

// Make addToCart globally available
window.addToCart = addToCart;

// --- PRODUCT LOADING & INIT ---
function initApp() {
  updateCartCount();

  const productsGrid = document.getElementById('productsGrid');
  
  // Scroll Animation using IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  if (productsGrid) {
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(products => {
        productsGrid.innerHTML = '';
        products.forEach(product => {
          const originalPrice = product.originalPrice || Math.round(product.price * 1.25);
          const discount = product.discount || '20%';
          const reviews = product.reviews || '500+';
          const page = product.page || '#';
          
          const productHTML = `
            <div class="product-card fade-in">
              <div class="product-badge"><span class="badge badge-lab">Lab Tested</span></div>
              <button class="product-wishlist">♡</button>
              <div class="product-img-wrap"><img src="${product.image}" alt="${product.name}"></div>
              <div class="product-info">
                <div class="product-category">Ayurvedic</div>
                <h3 class="product-name"><a href="${page}">${product.name}</a></h3>
                <div class="stars"><span class="star">⭐</span><span class="star">⭐</span><span class="star">⭐</span><span class="star">⭐</span><span class="star">⭐</span><span class="count">(${reviews})</span></div>
                <div class="product-price">
                  <span class="price-current">₹${product.price}</span>
                  <span class="price-original">₹${originalPrice}</span>
                  <span class="price-discount">${discount} OFF</span>
                </div>
                <button class="btn-add-cart" onclick="addToCart({id:${product.id},name:'${product.name.replace(/'/g, "\\'")}',price:${product.price},image:'${product.image}'})">🛒 Add to Cart</button>
              </div>
            </div>
          `;
          productsGrid.insertAdjacentHTML('beforeend', productHTML);
        });
        
        // Observe new elements for scroll animation
        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
      })
      .catch(error => {
        console.error('Error fetching products:', error);
        productsGrid.innerHTML = '<p class="error-msg" style="text-align:center; width:100%;">Failed to load products. Please try again later.</p>';
      });
  }

  // Fallback for pre-existing fade-in elements
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
