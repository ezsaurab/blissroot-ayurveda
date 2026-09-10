// main.js - Blissroot Ayurveda
import { Clerk } from '@clerk/clerk-js';

// --- CLERK AUTHENTICATION CONFIGURATION ---
const CLERK_PUBLISHABLE_KEY = "pk_test_ZXRoaWNhbC1iYXNzLTYxNTQuY2xlcmsuYWNjb3VudHMuZGV2JA"; 

window.Clerk = new Clerk(CLERK_PUBLISHABLE_KEY);

(async () => {
    try {
        await window.Clerk.load();
        updateNavAuth();
        window.Clerk.addListener(() => {
            updateNavAuth();
        });
    } catch(e) {
        console.warn("Notice: Clerk initialization status:", e);
    }
})();

function updateNavAuth() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;
    
    let authContainer = document.getElementById('navAuthContainer');
    if (!authContainer) {
        authContainer = document.createElement('div');
        authContainer.id = 'navAuthContainer';
        authContainer.className = 'nav-auth-container';
        const cartBtn = navActions.querySelector('a[href="cart.html"]');
        if (cartBtn) {
            navActions.insertBefore(authContainer, cartBtn);
        } else {
            navActions.prepend(authContainer);
        }
    }
    
    // Signed-in State
    if (window.Clerk && window.Clerk.user) {
        authContainer.innerHTML = '';
        
        // Admin link if current user is the owner
        const email = window.Clerk.user.primaryEmailAddress?.emailAddress;
        if (email === 'saurabhchauhansv@gmail.com') {
            const adminBtn = document.createElement('a');
            adminBtn.href = 'admin.html';
            adminBtn.className = 'nav-admin-badge';
            adminBtn.innerHTML = '⚙️ Admin';
            authContainer.appendChild(adminBtn);
        }
        
        // Mount Clerk User Profile Button
        const userBtnDiv = document.createElement('div');
        userBtnDiv.id = 'clerkUserButtonMount';
        userBtnDiv.style.display = 'inline-flex';
        userBtnDiv.style.alignItems = 'center';
        authContainer.appendChild(userBtnDiv);
        
        try {
            window.Clerk.mountUserButton(userBtnDiv, {
                afterSignOutUrl: '/'
            });
        } catch (err) {
            console.error("Error mounting UserButton:", err);
        }
    } else {
        // Signed-out State: Render or wire up the Login / Sign Up button
        let loginBtn = document.getElementById('navAuthBtn');
        if (!loginBtn) {
            authContainer.innerHTML = `
                <a href="login.html" class="nav-auth-btn" id="navAuthBtn">
                    <span class="auth-icon">👤</span>
                    <span class="auth-text">Login / Sign Up</span>
                </a>
            `;
            loginBtn = document.getElementById('navAuthBtn');
        }
        
        if (loginBtn) {
            loginBtn.onclick = (e) => {
                e.preventDefault();
                if (window.Clerk && window.Clerk.loaded) {
                    try {
                        window.Clerk.openSignIn({
                            fallbackRedirectUrl: window.location.href,
                            signUpUrl: '/signup.html'
                        });
                        return;
                    } catch (err) {
                        console.warn("Clerk modal open failed, falling back to login page:", err);
                    }
                }
                // Direct fallback to dedicated login page
                window.location.href = 'login.html';
            };
        }
    }
}

// Global helper to open Clerk auth directly from anywhere
window.openClerkAuth = function(mode = 'signIn') {
    if (window.Clerk && window.Clerk.loaded) {
        if (mode === 'signUp') {
            window.Clerk.openSignUp({ fallbackRedirectUrl: window.location.href });
        } else {
            window.Clerk.openSignIn({ fallbackRedirectUrl: window.location.href });
        }
    } else {
        window.location.href = mode === 'signUp' ? 'signup.html' : 'login.html';
    }
};

// --- CART MANAGEMENT (100% UNBLOCKED & FULLY FUNCTIONAL) ---
function getCart() {
    try {
        const cart = localStorage.getItem('blissroot_cart');
        return cart ? JSON.parse(cart) : [];
    } catch(e) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('blissroot_cart', JSON.stringify(cart));
    updateCartCount();
}

function updateCartCount() {
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + (Number(item.qty) || Number(item.quantity) || 1), 0);
    const cartCountEls = document.querySelectorAll('#cartCount, .cart-count');
    cartCountEls.forEach(el => {
        el.textContent = totalQty;
    });
}

// Immediate, smooth Add to Cart - never blocked by login
function addToCart(arg1, arg2, arg3) {
    let product = {};
    if (typeof arg1 === 'object' && arg1 !== null) {
        product = {
            id: arg1.id || Date.now(),
            name: arg1.name || 'Ayurvedic Product',
            price: Number(arg1.price) || 0,
            image: arg1.image || '/images/logo.jpg',
            qty: Number(arg1.qty) || 1
        };
    } else {
        product = {
            id: arg1 || Date.now(),
            name: arg2 || 'Ayurvedic Product',
            price: Number(arg3) || 0,
            image: '/images/logo.jpg',
            qty: 1
        };
    }

    // Check if there is an on-page quantity input field (for product detail pages)
    const pageQtyInput = document.querySelector('.qty-input');
    if (pageQtyInput && Number(pageQtyInput.value) > 0) {
        product.qty = Number(pageQtyInput.value);
    }

    const cart = getCart();
    const existingIndex = cart.findIndex(item => String(item.id) === String(product.id) || item.name === product.name);
    
    if (existingIndex > -1) {
        cart[existingIndex].qty = (Number(cart[existingIndex].qty) || 1) + product.qty;
    } else {
        cart.push(product);
    }

    saveCart(cart);
    showToast(`✓ ${product.name} added to cart!`, 'success');
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
    if (!toastContainer) {
        toastContainer = document.getElementById('toastContainer') || document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
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
window.addToCart = addToCart;
window.getCart = getCart;
window.saveCart = saveCart;
window.updateCartCount = updateCartCount;

// --- PRODUCT LOADING & INIT ---
function initApp() {
    updateCartCount();
    updateNavAuth();

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
                            <button class="product-wishlist" aria-label="Add to wishlist">♡</button>
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
                
                document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
            })
            .catch(error => {
                console.error('Error fetching products:', error);
                productsGrid.innerHTML = '<p class="error-msg" style="text-align:center; width:100%;">Failed to load products. Please try again later.</p>';
            });
    }

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
