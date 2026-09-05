import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
app.use(cors());
app.use(express.json());

// ===== CONFIG =====
const SECRET_KEY = process.env.JWT_SECRET || 'blissroot_ayurveda_secret_key';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'blissroot2026';
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET_HERE';

// ===== FILE HELPERS =====
const PRODUCTS_FILE = path.join(__dirname, 'products.json');
const USERS_FILE = path.join(__dirname, 'users.json');
const ORDERS_FILE = path.join(__dirname, 'orders.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

function readJSON(filePath, fallback = []) {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
            return fallback;
        }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return fallback;
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ===== AUTH MIDDLEWARE =====
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function verifyAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        if (!decoded.isAdmin) return res.status(403).json({ error: 'Admin access required' });
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// =========================================
// PRODUCTS API
// =========================================
app.get('/api/products', (req, res) => {
    res.json(readJSON(PRODUCTS_FILE));
});

app.get('/api/products/:id', (req, res) => {
    const products = readJSON(PRODUCTS_FILE);
    const product = products.find(p => p.id === parseInt(req.params.id, 10));
    if (product) res.json(product);
    else res.status(404).json({ error: 'Product not found' });
});

app.post('/api/products', verifyAdmin, (req, res) => {
    const products = readJSON(PRODUCTS_FILE);
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        description: req.body.description || '',
        price: parseFloat(req.body.price),
        originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : null,
        discount: req.body.discount || null,
        reviews: req.body.reviews || null,
        image: req.body.image || '',
        page: req.body.page || '#',
        status: req.body.status || 'active',
        createdAt: new Date().toISOString()
    };
    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', verifyAdmin, (req, res) => {
    const products = readJSON(PRODUCTS_FILE);
    const index = products.findIndex(p => p.id === parseInt(req.params.id, 10));
    if (index === -1) return res.status(404).json({ error: 'Product not found' });

    products[index] = {
        ...products[index],
        name: req.body.name ?? products[index].name,
        description: req.body.description ?? products[index].description,
        price: req.body.price != null ? parseFloat(req.body.price) : products[index].price,
        originalPrice: req.body.originalPrice != null ? parseFloat(req.body.originalPrice) : products[index].originalPrice,
        discount: req.body.discount ?? products[index].discount,
        reviews: req.body.reviews ?? products[index].reviews,
        image: req.body.image ?? products[index].image,
        page: req.body.page ?? products[index].page,
        status: req.body.status ?? products[index].status
    };
    writeJSON(PRODUCTS_FILE, products);
    res.json(products[index]);
});

app.delete('/api/products/:id', verifyAdmin, (req, res) => {
    let products = readJSON(PRODUCTS_FILE);
    products = products.filter(p => p.id !== parseInt(req.params.id, 10));
    writeJSON(PRODUCTS_FILE, products);
    res.status(204).send();
});

// =========================================
// ORDERS API
// =========================================
app.get('/api/orders', verifyAdmin, (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    res.json(orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/orders', (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    const orderNumber = 'BR-' + String(10000 + orders.length + 1);
    const newOrder = {
        id: Date.now(),
        orderNumber,
        customerName: req.body.customerName || 'Guest',
        phone: req.body.phone || '',
        email: req.body.email || '',
        address: req.body.address || '',
        items: req.body.items || [],
        total: Number(req.body.total) || 0,
        paymentId: req.body.paymentId || null,
        paymentStatus: req.body.paymentStatus || 'pending',
        status: req.body.status || 'pending',
        createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
});

app.get('/api/orders/:orderNumber', (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    const order = orders.find(o => o.orderNumber === req.params.orderNumber);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
});

app.put('/api/orders/:id', verifyAdmin, (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    const index = orders.findIndex(o => String(o.id) === String(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Order not found' });
    orders[index] = { ...orders[index], ...req.body, id: orders[index].id };
    writeJSON(ORDERS_FILE, orders);
    res.json(orders[index]);
});

// =========================================
// CUSTOMER AUTH API
// =========================================
const otpStore = new Map();

app.post('/api/send-otp', (req, res) => {
    const phone = String(req.body.phone || '').trim();
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Test mode: return the OTP so the existing frontend can display it.
    res.json({ success: true, otp, message: 'OTP generated successfully' });
});

function verifyOTP(phone, otp) {
    const record = otpStore.get(phone);
    if (!record || record.expiresAt < Date.now() || record.otp !== String(otp || '')) return false;
    otpStore.delete(phone);
    return true;
}

app.post('/api/signup', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const otp = String(req.body.otp || '');

    if (!name || !phone || !password || !otp) return res.status(400).json({ error: 'All fields are required' });
    if (!verifyOTP(phone, otp)) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const users = readJSON(USERS_FILE);
    if (users.some(u => u.phone === phone)) return res.status(409).json({ error: 'An account with this phone already exists' });

    const user = {
        id: Date.now(),
        name,
        phone,
        password: await bcrypt.hash(password, 8)
    };
    users.push(user);
    writeJSON(USERS_FILE, users);

    const safeUser = { id: user.id, name: user.name, phone: user.phone };
    const token = jwt.sign({ id: user.id, phone: user.phone, name: user.name }, SECRET_KEY, { expiresIn: '30d' });
    res.status(201).json({ token, user: safeUser });
});

app.post('/api/login', async (req, res) => {
    const phone = String(req.body.phone || '').trim();
    const password = String(req.body.password || '');
    const otp = String(req.body.otp || '');
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.phone === phone);

    if (!user) return res.status(401).json({ error: 'Invalid phone number or password' });
    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) return res.status(401).json({ error: 'Invalid phone number or password' });
    if (!verifyOTP(phone, otp)) return res.status(401).json({ error: 'Invalid or expired OTP' });

    const safeUser = { id: user.id, name: user.name, phone: user.phone };
    const token = jwt.sign({ id: user.id, phone: user.phone, name: user.name }, SECRET_KEY, { expiresIn: '30d' });
    res.json({ token, user: safeUser });
});

// =========================================
// ADMIN AUTH API
// =========================================
app.post('/api/admin/login', (req, res) => {
    const password = String(req.body.password || '');
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Invalid admin password' });
    const token = jwt.sign({ isAdmin: true, role: 'admin' }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ token, user: { name: 'Admin', isAdmin: true } });
});

// =========================================
// RAZORPAY
// =========================================
let razorpay = null;
if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && !RAZORPAY_KEY_ID.includes('YOUR_KEY_HERE') && !RAZORPAY_KEY_SECRET.includes('YOUR_SECRET_HERE')) {
    razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

app.get('/api/payment/config', (req, res) => {
    res.json({ keyId: RAZORPAY_KEY_ID });
});

app.post('/api/payment/create-order', async (req, res) => {
    try {
        if (!razorpay) return res.status(503).json({ error: 'Razorpay is not configured yet' });
        const amount = Math.round(Number(req.body.amount || 0) * 100);
        if (!amount) return res.status(400).json({ error: 'Valid amount is required' });
        const order = await razorpay.orders.create({ amount, currency: 'INR', receipt: 'BR_' + Date.now() });
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message || 'Unable to create payment order' });
    }
});

app.post('/api/payment/verify', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || RAZORPAY_KEY_SECRET.includes('YOUR_SECRET_HERE')) {
        return res.status(400).json({ success: false, error: 'Invalid payment data' });
    }
    const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
    const valid = expected === razorpay_signature;
    res.status(valid ? 200 : 400).json({ success: valid });
});

// ===== SETTINGS API =====
app.get('/api/settings', (req, res) => {
    res.json(readJSON(SETTINGS_FILE, {}));
});

app.put('/api/settings', verifyAdmin, (req, res) => {
    const settings = { ...readJSON(SETTINGS_FILE, {}), ...req.body };
    writeJSON(SETTINGS_FILE, settings);
    res.json(settings);
});

// Serve the existing static website. Keep API routes above this middleware.
app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API route not found' });
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Blissroot Ayurveda server running on port ${PORT}`);
});
