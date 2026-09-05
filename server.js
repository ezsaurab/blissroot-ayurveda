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
        if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2)); return fallback; }
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch { return fallback; }
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
    } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
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
    } catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

// =========================================
//  PRODUCTS API
// =========================================

app.get('/api/products', (req, res) => {
    res.json(readJSON(PRODUCTS_FILE));
});

app.get('/api/products/:id', (req, res) => {
    const products = readJSON(PRODUCTS_FILE);
    const product = products.find(p => p.id === parseInt(req.params.id));
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
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
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
    products = products.filter(p => p.id !== parseInt(req.params.id));
    writeJSON(PRODUCTS_FILE, products);
    res.status(204).send();
});

// =========================================
//  ORDERS API
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
        customerPhone: req.body.customerPhone || '',
        items: req.body.items || [],
        subtotal: parseFloat(req.body.subtotal) || 0,
        shipping: parseFloat(req.body.shipping) || 0,
        tax: parseFloat(req.body.tax) || 0,
        total: parseFloat(req.body.total) || 0,
        paymentId: req.body.paymentId || 'mock',
        paymentMethod: req.body.paymentMethod || 'razorpay',
        status: 'Processing',
        createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
});

app.put('/api/orders/:id', verifyAdmin, (req, res) => {
    const orders = readJSON(ORDERS_FILE);
    const index = orders.findIndex(o => o.id === parseInt(req.params.id));
    if (index === -1) return res.status(404).json({ error: 'Order not found' });

    if (req.body.status) orders[index].status = req.body.status;
    writeJSON(ORDERS_FILE, orders);
    res.json(orders[index]);
});

// =========================================
//  SETTINGS API
// =========================================

const DEFAULT_SETTINGS = {
    storeName: 'Blissroot Ayurveda',
    tagline: 'Rooted in Ayurveda. Made for Modern Living.',
    email: 'hello@blissroot.in',
    phone: '+91 9999999999',
    freeShippingAbove: 499,
    shippingFee: 50,
    returnWindow: 7,
    fssaiLicense: '12345678901234',
    announcementBar: '🌿 Free Shipping on orders above ₹499 | Use code AYUR10 for 10% off',
    couponCode: 'AYUR10',
    couponDiscount: 10,
    instagram: 'https://instagram.com/blissroot',
    facebook: 'https://facebook.com/blissroot',
    whatsapp: '919999999999'
};

app.get('/api/settings', (req, res) => {
    const settings = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    res.json(settings);
});

app.put('/api/settings', verifyAdmin, (req, res) => {
    const current = readJSON(SETTINGS_FILE, DEFAULT_SETTINGS);
    const updated = { ...current, ...req.body };
    writeJSON(SETTINGS_FILE, updated);
    res.json(updated);
});

// =========================================
//  CUSTOMERS API (read-only for admin)
// =========================================

app.get('/api/customers', verifyAdmin, (req, res) => {
    const users = readJSON(USERS_FILE);
    // Strip passwords before sending
    const safeUsers = users.map(u => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        createdAt: u.createdAt || null
    }));
    res.json(safeUsers);
});

// =========================================
//  ADMIN AUTH
// =========================================

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Incorrect password' });

    const token = jwt.sign({ isAdmin: true, role: 'admin' }, SECRET_KEY, { expiresIn: '12h' });
    res.json({ message: 'Admin login successful', token });
});

// =========================================
//  USER AUTH (OTP-based)
// =========================================

const otps = {};

app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[phone] = otp;

    console.log(`\n=========================================`);
    console.log(`📱 [SMS SIMULATION] OTP for ${phone}`);
    console.log(`🔑 Your OTP is: ${otp}`);
    console.log(`=========================================\n`);

    res.json({ message: 'OTP sent successfully', otp });
});

app.post('/api/signup', (req, res) => {
    const { name, phone, password, otp } = req.body;
    if (!name || !phone || !password || !otp) return res.status(400).json({ error: 'All fields including OTP are required' });
    if (otps[phone] !== otp) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const users = readJSON(USERS_FILE);
    if (users.find(u => u.phone === phone)) return res.status(400).json({ error: 'Phone number already in use' });

    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = { id: Date.now(), name, phone, password: hashedPassword, createdAt: new Date().toISOString() };
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    delete otps[phone];

    const token = jwt.sign({ id: newUser.id, phone: newUser.phone }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ message: 'Signup successful', token, user: { name: newUser.name, phone: newUser.phone } });
});

app.post('/api/login', (req, res) => {
    const { phone, password, otp } = req.body;
    if (!phone || !password || !otp) return res.status(400).json({ error: 'Phone, password, and OTP required' });
    if (otps[phone] !== otp) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.phone === phone);
    if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    delete otps[phone];
    const token = jwt.sign({ id: user.id, phone: user.phone }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token, user: { name: user.name, phone: user.phone } });
});

// =========================================
//  RAZORPAY PAYMENT GATEWAY
// =========================================

let razorpayInstance = null;
try {
    if (RAZORPAY_KEY_ID !== 'rzp_test_YOUR_KEY_HERE') {
        razorpayInstance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    } else {
        console.log("⚠️  Razorpay keys not configured — using Mock Payment Mode.");
    }
} catch (e) { console.log("Error initializing Razorpay:", e.message); }

app.get('/api/config/razorpay', (req, res) => {
    res.json({ key_id: RAZORPAY_KEY_ID });
});

app.post('/api/create-order', async (req, res) => {
    try {
        const { amount } = req.body;
        if (!razorpayInstance || RAZORPAY_KEY_ID === 'rzp_test_YOUR_KEY_HERE') {
            return res.json({ id: 'order_mock_' + Date.now(), amount: amount * 100, currency: 'INR', mock: true });
        }
        const order = await razorpayInstance.orders.create({ amount: amount * 100, currency: 'INR', receipt: 'receipt_' + Date.now() });
        res.json(order);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock } = req.body;
    if (mock) return res.json({ success: true, message: 'Mock Payment verified successfully' });

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET).update(sign).digest("hex");
    if (razorpay_signature === expectedSign) return res.json({ success: true, message: 'Payment verified successfully' });
    else return res.status(400).json({ success: false, message: 'Invalid signature' });
});

// =========================================
//  PRODUCTION: Serve Frontend Static Files
// =========================================

const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// =========================================
//  START SERVER
// =========================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🌿 Blissroot Ayurveda Server running on port ${PORT}`);
    console.log(`   API: http://localhost:${PORT}/api/products`);
    console.log(`   Admin Password: ${ADMIN_PASSWORD}\n`);
});
