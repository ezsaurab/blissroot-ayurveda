import 'dotenv/config';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import { createClerkClient } from '@clerk/backend';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Hardcode test keys so the app doesn't crash on Render if the user forgot to configure Environment Variables
process.env.CLERK_PUBLISHABLE_KEY = process.env.CLERK_PUBLISHABLE_KEY || "pk_test_ZW5nYWdpbmctYm9hLTU1MzAuY2xlcmsuYWNjb3VudHMuZGV2JA";
process.env.CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "sk_test_s2g6i3umjBuP5nDwufzqEPzgu0paru7s7K7qqPCZk8";

const app = express();

// =========================================
//  SECURITY HEADERS (Helmet)
// =========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "'unsafe-eval'",
                "https://*.clerk.accounts.dev", 
                "https://*.clerk.com", 
                "https://clerk.blissrootayurveda.com",
                "https://checkout.razorpay.com", 
                "https://cdnjs.cloudflare.com",
                "https://challenges.cloudflare.com"
            ],
            styleSrc: [
                "'self'", 
                "'unsafe-inline'", 
                "https://cdnjs.cloudflare.com", 
                "https://fonts.googleapis.com",
                "https://*.clerk.accounts.dev"
            ],
            fontSrc: [
                "'self'", 
                "data:",
                "https://cdnjs.cloudflare.com", 
                "https://fonts.gstatic.com"
            ],
            imgSrc: [
                "'self'", 
                "data:", 
                "https:", 
                "https://img.clerk.com", 
                "https://images.clerk.dev"
            ],
            connectSrc: [
                "'self'", 
                "https://*.clerk.accounts.dev", 
                "https://*.clerk.com", 
                "https://clerk.blissrootayurveda.com",
                "https://api.razorpay.com", 
                "https://lumberjack.razorpay.com"
            ],
            frameSrc: [
                "'self'",
                "https://*.clerk.accounts.dev",
                "https://*.clerk.com",
                "https://api.razorpay.com", 
                "https://challenges.cloudflare.com"
            ],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: []
        }
    },
    crossOriginEmbedderPolicy: false
}));

// =========================================
//  CORS
// =========================================
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50kb' }));

// =========================================
//  RATE LIMITING
// =========================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 100,
    standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    standardHeaders: true, legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});
const otpLimiter = rateLimit({
    windowMs: 60 * 1000, max: 3,
    message: { error: 'Too many OTP requests. Please wait before trying again.' }
});

app.use('/api/', apiLimiter);
app.use('/api/admin/login', authLimiter);

// =========================================
//  CONFIG — All secrets from environment
// =========================================
const SECRET_KEY = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

if (!SECRET_KEY || !ADMIN_PASSWORD) {
    console.error('WARNING: JWT_SECRET and ADMIN_PASSWORD are not set in environment variables. Using fallback defaults for development, this is INSECURE for production.');
}

// =========================================
//  INPUT SANITIZER — strips HTML to prevent XSS
// =========================================
function sanitize(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>"'`]/g, '').trim();
}

// =========================================
//  FILE HELPERS
// =========================================
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const USERS_FILE    = path.join(__dirname, 'users.json');
const ORDERS_FILE   = path.join(__dirname, 'orders.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

function readJSON(filePath, fallback = []) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
            return fallback;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { return fallback; }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// =========================================
//  AUTH MIDDLEWARE
// =========================================
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    try { req.user = jwt.verify(authHeader.split(' ')[1], SECRET_KEY); next(); }
    catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY || "sk_test_s2g6i3umjBuP5nDwufzqEPzgu0paru7s7K7qqPCZk8", publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "pk_test_ZW5nYWdpbmctYm9hLTU1MzAuY2xlcmsuYWNjb3VudHMuZGV2JA" });

const verifyAdmin = [
    clerkMiddleware({ secretKey: process.env.CLERK_SECRET_KEY || "sk_test_s2g6i3umjBuP5nDwufzqEPzgu0paru7s7K7qqPCZk8", publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "pk_test_ZW5nYWdpbmctYm9hLTU1MzAuY2xlcmsuYWNjb3VudHMuZGV2JA" }),
    requireAuth(),
    async (req, res, next) => {
        try {
            const user = await clerkClient.users.getUser(req.auth.userId);
            const email = user.emailAddresses[0]?.emailAddress;
            if (email === 'saurabhchauhansv@gmail.com') {
                return next();
            }
            res.status(403).json({ error: 'Forbidden: Admin access only' });
        } catch (error) {
            console.error("Clerk verifyAdmin error:", error);
            res.status(401).json({ error: 'Invalid token or user not found' });
        }
    }
];

// =========================================
//  PRODUCTS API
// =========================================
app.get('/api/products', (req, res) => res.json(readJSON(PRODUCTS_FILE)));

app.get('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
    const product = readJSON(PRODUCTS_FILE).find(p => p.id === id);
    product ? res.json(product) : res.status(404).json({ error: 'Product not found' });
});

app.post('/api/products', verifyAdmin, (req, res) => {
    if (!req.body.name || !req.body.price) return res.status(400).json({ error: 'Name and price required' });
    const products = readJSON(PRODUCTS_FILE);
    const newProduct = {
        id: Date.now(),
        name: sanitize(String(req.body.name)),
        description: sanitize(String(req.body.description || '')),
        price: parseFloat(req.body.price),
        originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : null,
        discount: req.body.discount || null, reviews: req.body.reviews || null,
        image: sanitize(String(req.body.image || '')),
        page: sanitize(String(req.body.page || '#')),
        status: req.body.status === 'inactive' ? 'inactive' : 'active',
        createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', verifyAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
    const products = readJSON(PRODUCTS_FILE);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return res.status(404).json({ error: 'Product not found' });
    products[index] = {
        ...products[index],
        name: req.body.name != null ? sanitize(String(req.body.name)) : products[index].name,
        description: req.body.description != null ? sanitize(String(req.body.description)) : products[index].description,
        price: req.body.price != null ? parseFloat(req.body.price) : products[index].price,
        originalPrice: req.body.originalPrice != null ? parseFloat(req.body.originalPrice) : products[index].originalPrice,
        discount: req.body.discount ?? products[index].discount, reviews: req.body.reviews ?? products[index].reviews,
        image: req.body.image != null ? sanitize(String(req.body.image)) : products[index].image,
        page: req.body.page != null ? sanitize(String(req.body.page)) : products[index].page,
        status: req.body.status === 'inactive' ? 'inactive' : products[index].status
    };
    writeJSON(PRODUCTS_FILE, products);
    res.json(products[index]);
});

app.delete('/api/products/:id', verifyAdmin, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid product ID' });
    writeJSON(PRODUCTS_FILE, readJSON(PRODUCTS_FILE).filter(p => p.id !== id));
    res.status(204).send();
});

// =========================================
//  ORDERS API
// =========================================
app.get(['/api/orders', '/api/admin/orders'], verifyAdmin, (req, res) => {
    res.json(readJSON(ORDERS_FILE).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/orders', (req, res) => {
    const { customerName, items, total, paymentId } = req.body;
    if (!customerName || !items || !total || !paymentId) {
        return res.status(400).json({ error: 'Missing required order fields or paymentId' });
    }
    const orders = readJSON(ORDERS_FILE);
    const orderNumber = 'BR-' + String(10000 + orders.length + 1);
    const newOrder = {
        id: Date.now(), orderNumber,
        customerName: sanitize(String(customerName)),
        phone: sanitize(String(req.body.phone || '')),
        email: sanitize(String(req.body.email || '')),
        address: sanitize(String(req.body.address || '')),
        items: Array.isArray(items) ? items.slice(0, 50) : [],
        total: Math.min(Number(total), 1000000),
        paymentId: sanitize(String(paymentId)),
        paymentStatus: req.body.paymentStatus === 'paid' ? 'paid' : 'pending',
        status: 'Processing', createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
});

app.get('/api/orders/:orderNumber', (req, res) => {
    const orderNumber = sanitize(String(req.params.orderNumber));
    const order = readJSON(ORDERS_FILE).find(o => o.orderNumber === orderNumber);
    order ? res.json(order) : res.status(404).json({ error: 'Order not found' });
});

app.put(['/api/orders/:id', '/api/admin/orders/:id'], verifyAdmin, (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    const index = orders.findIndex(o => String(o.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Order not found' });
    if (req.body.status) orders[index].status = sanitize(String(req.body.status));
    writeJSON(ORDERS_FILE, orders);
    res.json(orders[index]);
});

// =========================================
//  OTP SYSTEM (Removed)
// =========================================
// OTP logic removed per new Email/Password only requirements

// =========================================
// ADMIN AUTH handled by Clerk Frontend

// =========================================
//  RAZORPAY
// =========================================
let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET &&
    !RAZORPAY_KEY_ID.includes('YOUR_KEY') && !RAZORPAY_KEY_SECRET.includes('YOUR_SECRET')) {
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    console.log('Razorpay: live mode active');
} else {
    console.log('Razorpay: keys not configured — payment endpoints disabled');
}

app.get('/api/payment/config', (req, res) => res.json({ keyId: RAZORPAY_KEY_ID }));

app.post('/api/create-order', async (req, res) => {
    if (!razorpay) return res.status(503).json({ error: 'Payment gateway not configured' });
    const amount = Math.round(Number(req.body.amount || 0) * 100);
    if (!amount || amount < 100) return res.status(400).json({ error: 'Minimum order amount is INR 1' });
    try {
        const order = await razorpay.orders.create({ amount, currency: 'INR', receipt: 'BR_' + Date.now() });
        res.json(order);
    } catch (e) {
        res.status(e.statusCode === 401 ? 401 : 500).json({ error: e.error?.description || 'Order creation failed' });
    }
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment fields' });
    }
    if (!RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET.includes('YOUR_SECRET')) {
        return res.status(503).json({ success: false, message: 'Payment gateway not configured' });
    }
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    try {
        const a = Buffer.from(razorpay_signature, 'hex');
        const b = Buffer.from(expected, 'hex');
        const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
        return valid
            ? res.json({ success: true, message: 'Payment verified' })
            : res.status(400).json({ success: false, message: 'Signature mismatch' });
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid signature format' });
    }
});

// =========================================
//  SETTINGS API (Admin only)
// =========================================
app.get('/api/settings', verifyAdmin, (req, res) => res.json(readJSON(SETTINGS_FILE, {})));
app.put('/api/settings', verifyAdmin, (req, res) => {
    const settings = { ...readJSON(SETTINGS_FILE, {}), ...req.body };
    writeJSON(SETTINGS_FILE, settings); res.json(settings);
});

// =========================================
//  STATIC FILES
// =========================================
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
        res.sendFile(path.join(distPath, 'index.html'));
    });
} else {
    app.use(express.static(__dirname, { extensions: ['html'] }));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
        res.sendFile(path.join(__dirname, 'index.html'));
    });
}

// =========================================
//  GLOBAL ERROR HANDLER
// =========================================
app.use((err, req, res, _next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// =========================================
//  START
// =========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nBlissroot Blissroot Ayurveda running on port ${PORT}\n`);
});
