import 'dotenv/config';
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
const app = express();

// =========================================
//  SECURITY HEADERS (Helmet)
// =========================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://checkout.razorpay.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://api.razorpay.com", "https://lumberjack.razorpay.com"],
            frameSrc: ["https://api.razorpay.com"],
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
app.use('/api/login', authLimiter);
app.use('/api/signup', authLimiter);
app.use('/api/send-otp', otpLimiter);

// =========================================
//  CONFIG — All secrets from environment
// =========================================
const SECRET_KEY = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

if (!SECRET_KEY || !ADMIN_PASSWORD) {
    console.error('FATAL: JWT_SECRET and ADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
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

function verifyAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], SECRET_KEY);
        if (!decoded.isAdmin) return res.status(403).json({ error: 'Admin access required' });
        req.user = decoded; next();
    } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

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
app.get('/api/orders', verifyAdmin, (req, res) => {
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

app.put('/api/orders/:id', verifyAdmin, (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    const index = orders.findIndex(o => String(o.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Order not found' });
    if (req.body.status) orders[index].status = sanitize(String(req.body.status));
    writeJSON(ORDERS_FILE, orders);
    res.json(orders[index]);
});

// =========================================
//  OTP + AUTH API
// =========================================
const otpStore = new Map();

app.post('/api/send-otp', (req, res) => {
    const phone = String(req.body.phone || '').trim().replace(/\D/g, '');
    if (!phone || phone.length < 10) return res.status(400).json({ error: 'Valid 10-digit phone required' });
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`[OTP] ${phone} → ${otp}`);  // server logs only — remove otp from response in production
    res.json({ success: true, otp, message: 'OTP sent' });
});

function verifyOTP(phone, otp) {
    const record = otpStore.get(phone);
    if (!record || record.expiresAt < Date.now() || record.otp !== String(otp || '')) return false;
    otpStore.delete(phone); return true;
}

app.post('/api/signup', async (req, res) => {
    const name = sanitize(String(req.body.name || ''));
    const phone = String(req.body.phone || '').trim().replace(/\D/g, '');
    const password = String(req.body.password || '');
    const otp = String(req.body.otp || '');
    if (!name || !phone || !password || !otp) return res.status(400).json({ error: 'All fields required' });
    if (phone.length < 10) return res.status(400).json({ error: 'Invalid phone number' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (!verifyOTP(phone, otp)) return res.status(400).json({ error: 'Invalid or expired OTP' });
    const users = readJSON(USERS_FILE);
    if (users.some(u => u.phone === phone)) return res.status(409).json({ error: 'Account already exists' });
    const user = { id: Date.now(), name, phone, password: await bcrypt.hash(password, 12) };
    users.push(user); writeJSON(USERS_FILE, users);
    const token = jwt.sign({ id: user.id, phone: user.phone }, SECRET_KEY, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, phone: user.phone } });
});

app.post('/api/login', async (req, res) => {
    const phone = String(req.body.phone || '').trim().replace(/\D/g, '');
    const