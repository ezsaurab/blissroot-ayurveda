// main.js - Blissroot Ayurveda

// --- AUTHENTICATION MODAL & LOGIC ---

// Inject Auth Modal CSS
const authStyles = document.createElement('style');
authStyles.textContent = `

/* --- Auth Modal Redesign --- */
.auth-modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: none; justify-content: center; align-items: center;
  z-index: 9999; backdrop-filter: blur(5px);
}
.auth-modal-overlay.active { display: flex; }
.auth-modal {
  background: #111; width: 100%; max-width: 400px;
  border-radius: 20px; padding: 30px; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5); position: relative;
  animation: authModalIn 0.3s ease;
}
@keyframes authModalIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.auth-close {
  position: absolute; top: 15px; left: 15px;
  background: none; border: none; font-size: 24px;
  color: #fff; cursor: pointer; padding: 5px; line-height: 1;
}
.auth-title { text-align: center; font-size: 1.2rem; margin-top: -5px; margin-bottom: 30px; font-weight: 500; }
.auth-form-title { font-size: 1.6rem; font-weight: 600; margin-bottom: 5px; }
.auth-form-subtitle { color: #999; font-size: 0.9rem; margin-bottom: 25px; line-height: 1.4; }
.auth-input-group { margin-bottom: 15px; position: relative; text-align: left; }
.auth-input-group label { display: block; font-size: 0.85rem; color: #bbb; margin-bottom: 5px; text-align: left; }
.auth-input {
  width: 100%; background: #1c1c1c; border: 1px solid #333; color: #fff;
  padding: 14px 15px; border-radius: 12px; font-size: 1rem; outline: none; transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 0;
}
.auth-input:focus { border-color: #c8a97e; }
.auth-eye { position: absolute; right: 15px; bottom: 15px; color: #999; cursor: pointer; font-size: 1rem; }
.auth-options { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; font-size: 0.85rem; }
.auth-options label { display: flex; align-items: center; color: #ddd; cursor: pointer; }
.auth-options input { margin-right: 8px; accent-color: #c8a97e; }
.auth-forgot { color: #c8a97e; text-decoration: none; }
.auth-btn {
  width: 100%; background: #1F3D2B; color: #fff; border: none; padding: 15px;
  border-radius: 25px; font-size: 1.05rem; font-weight: 600; cursor: pointer; margin-bottom: 25px; transition: background 0.2s;
}
.auth-btn:hover { background: #2c553d; }
.auth-or { text-align: center; position: relative; margin-bottom: 25px; color: #fff; font-size: 0.9rem; }
.auth-or::before, .auth-or::after { content: ""; position: absolute; top: 50%; width: 40%; height: 1px; background: #333; }
.auth-or::before { left: 0; }
.auth-or::after { right: 0; }
.social-btn {
  width: 100%; background: #1c1c1c; color: #ddd; border: 1px solid #333; padding: 12px;
  border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 12px; font-size: 0.95rem; cursor: pointer; transition: background 0.2s;
}
.social-btn:hover { background: #2a2a2a; }
.auth-switch { text-align: center; font-size: 0.9rem; color: #999; margin-top: 20px; }
.auth-switch span { color: #c8a97e; cursor: pointer; font-weight: 600; }
.auth-form-container { display: none; text-align: left; }
.auth-form-container.active { display: block; }
.auth-error { color: #ff6b6b; font-size: 0.9rem; margin-bottom: 10px; display: none; text-align: center; }
/* --- End Auth Modal Redesign --- */

`;
document.head.appendChild(authStyles);

// Inject Auth Modal HTML
const authModalHTML = `

<div class="auth-modal-overlay" id="authModal">
  <div class="auth-modal">
    <button class="auth-close" id="authClose">&times;</button>
    <div class="auth-title">Blissroot Ayurveda</div>
    
    <!-- Login Form -->
    <div class="auth-form-container active" id="loginFormContainer">
      <div class="auth-form-title">Login Now To Your Account.</div>
      <div class="auth-form-subtitle">Access your account to manage settings, explore features</div>
      
      <div class="auth-error" id="loginError"></div>
      
      <form id="loginForm">
        <div class="auth-input-group">
          <label>Email</label>
          <input type="email" id="loginEmail" class="auth-input" placeholder="jamesschleifer@gmail.com" required>
        </div>
        <div class="auth-input-group">
          <label>Password</label>
          <input type="password" id="loginPassword" class="auth-input" placeholder="•••••••••" required>
          <span class="auth-eye" onclick="togglePassword('loginPassword', this)">👁️</span>
        </div>
        
        <div class="auth-options">
          <label><input type="checkbox"> Remember me</label>
          <a href="#" class="auth-forgot">Forgot password?</a>
        </div>
        
        <button type="submit" class="auth-btn">Login</button>
      </form>
      
      <div class="auth-or">OR</div>
      
      <button class="social-btn" type="button" onclick="alert('Google login coming soon!')">
        <i class="fab fa-google"></i> Sign in with Google
      </button>
      <button class="social-btn" type="button" onclick="alert('Apple login coming soon!')">
        <i class="fab fa-apple"></i> Continue with Apple
      </button>
      
      <div class="auth-switch">
        Don't have an account? <span onclick="switchAuthTab('signup')">Sign Up</span>
      </div>
    </div>
    
    <!-- Signup Form -->
    <div class="auth-form-container" id="signupFormContainer">
      <div class="auth-form-title">Sign Up To Your Account.</div>
      <div class="auth-form-subtitle">Create an account to join the Blissroot family</div>
      
      <div class="auth-error" id="signupError"></div>
      
      <form id="signupForm">
        <div class="auth-input-group">
          <label>Email</label>
          <input type="email" id="signupEmail" class="auth-input" placeholder="jamesschleifer@gmail.com" required>
        </div>
        <div class="auth-input-group">
          <label>Password</label>
          <input type="password" id="signupPassword" class="auth-input" placeholder="•••••••••" required minlength="6">
          <span class="auth-eye" onclick="togglePassword('signupPassword', this)">👁️</span>
        </div>
        <div class="auth-input-group">
          <label>Confirm Password</label>
          <input type="password" id="signupConfirmPassword" class="auth-input" placeholder="•••••••••" required minlength="6">
          <span class="auth-eye" onclick="togglePassword('signupConfirmPassword', this)">👁️</span>
        </div>
        
        <button type="submit" class="auth-btn">Sign UP</button>
      </form>
      
      <div class="auth-or">OR</div>
      
      <button class="social-btn" type="button" onclick="alert('Google login coming soon!')">
        <i class="fab fa-google"></i> Sign in with Google
      </button>
      <button class="social-btn" type="button" onclick="alert('Apple login coming soon!')">
        <i class="fab fa-apple"></i> Continue with Apple
      </button>
      
      <div class="auth-switch">
        Already have an account? <span onclick="switchAuthTab('login')">Login</span>
      </div>
    </div>
  </div>
</div>

`;
document.body.insertAdjacentHTML('beforeend', authModalHTML);


// Auth Modal Logic
const authModal = document.getElementById('authModal');
const authClose = document.getElementById('authClose');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');

authClose.addEventListener('click', () => {
    authModal.classList.remove('active');
});

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.classList.remove('active');
    }
});

window.switchAuthTab = function(tab) {
    document.getElementById('loginFormContainer').classList.remove('active');
    document.getElementById('signupFormContainer').classList.remove('active');
    document.getElementById(tab + 'FormContainer').classList.add('active');
    loginError.style.display = 'none';
    signupError.style.display = 'none';
};

window.togglePassword = function(id, el) {
    const input = document.getElementById(id);
    if (input.type === 'password') {
        input.type = 'text';
        el.style.color = '#c8a97e';
    } else {
        input.type = 'password';
        el.style.color = '#999';
    }
};

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
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
        } else {
            window.location.reload();
        }
    } catch (err) {
        loginError.textContent = err.message;
        loginError.style.display = 'block';
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    signupError.style.display = 'none';
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;
    
    if (password !== confirmPassword) {
        signupError.textContent = "Passwords do not match";
        signupError.style.display = 'block';
        return;
    }
    
    try {
        const res = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
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
        } else {
            window.location.reload();
        }
    } catch (err) {
        signupError.textContent = err.message;
        signupError.style.display = 'block';
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
        const firstName = user.email ? user.email.split('@')[0] : (user.name ? user.name.split(' ')[0] : 'User');
        const initials = firstName.slice(0,2).toUpperCase();
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
