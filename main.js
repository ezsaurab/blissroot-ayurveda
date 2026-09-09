// main.js - Blissroot Ayurveda

// --- AUTHENTICATION MODAL & LOGIC ---

// --- CLERK AUTHENTICATION ---
const CLERK_PUBLISHABLE_KEY = "pk_test_Y2xlcmsuYmxpc3Nyb290LmF5dXJ2ZWRhLmNvbSQ"; // placeholder
const clerkScript = document.createElement('script');
clerkScript.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
clerkScript.async = true;
clerkScript.src = "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js";
clerkScript.crossOrigin = "anonymous";
document.head.appendChild(clerkScript);

let clerkLoaded = false;
clerkScript.onload = async () => {
    try {
        await window.Clerk.load();
        clerkLoaded = true;
        updateNavAuth();
    } catch (err) {
        console.error("Error loading Clerk: ", err);
    }
};

function updateNavAuth() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions || !window.Clerk) return;
    
    const oldBtn = document.getElementById('navAuthBtn');
    if (oldBtn) oldBtn.remove();
    
    let authContainer = document.getElementById('navAuthContainer');
    if (!authContainer) {
        authContainer = document.createElement('div');
        authContainer.id = 'navAuthContainer';
        authContainer.style.marginRight = '10px';
        const cartBtn = navActions.querySelector('a[href="cart.html"]');
        if (cartBtn) {
            navActions.insertBefore(authContainer, cartBtn);
        } else {
            navActions.prepend(authContainer);
        }
    }
    
    authContainer.innerHTML = '';
    
    if (window.Clerk.user) {
        window.Clerk.mountUserButton(authContainer);
        
        if (typeof pendingCartItem !== 'undefined' && pendingCartItem) {
            proceedToCart(pendingCartItem);
            pendingCartItem = null;
        }
    } else {
        const loginBtn = document.createElement('button');
        loginBtn.className = 'nav-btn';
        loginBtn.style = 'background: #1F3D2B; color: #fff; border: none; padding: 8px 16px; border-radius: 50px; cursor: pointer; font-weight: 600; font-size: 0.9rem;';
        loginBtn.textContent = 'Login / Sign Up';
        loginBtn.onclick = () => window.Clerk.openSignIn();
        authContainer.appendChild(loginBtn);
    }
}

window.addEventListener('load', () => {
    if (window.Clerk && window.Clerk.isReady) {
        window.Clerk.addListener(({ user }) => {
            updateNavAuth();
        });
    }
});

let pendingCartItem = null;

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

  
    if (!window.Clerk || !window.Clerk.isReady) {
        if(window.showToast) window.showToast('Authentication is still loading. Please wait...', 'info');
        return;
    }
    if (!window.Clerk.user) {
        pendingCartItem = product;
        window.Clerk.openSignIn();
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
