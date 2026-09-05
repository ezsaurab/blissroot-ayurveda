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