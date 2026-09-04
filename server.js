import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const dbFile = path.join(__dirname, 'products.json');

// Read products
const getProducts = () => {
    try {
        const data = fs.readFileSync(dbFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Write products
const saveProducts = (products) => {
    fs.writeFileSync(dbFile, JSON.stringify(products, null, 2));
};

// GET all products
app.get('/api/products', (req, res) => {
    res.json(getProducts());
});

// GET single product
app.get('/api/products/:id', (req, res) => {
    const products = getProducts();
    const product = products.find(p => p.id === parseInt(req.params.id));
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

// POST new product
app.post('/api/products', (req, res) => {
    const products = getProducts();
    const newProduct = {
        id: Date.now(),
        name: req.body.name,
        description: req.body.description,
        price: parseFloat(req.body.price),
        image: req.body.image
    };
    products.push(newProduct);
    saveProducts(products);
    res.status(201).json(newProduct);
});

// PUT (update) product
app.put('/api/products/:id', (req, res) => {
    const products = getProducts();
    const index = products.findIndex(p => p.id === parseInt(req.params.id));
    if (index !== -1) {
        products[index] = {
            ...products[index],
            name: req.body.name,
            description: req.body.description,
            price: parseFloat(req.body.price),
            image: req.body.image
        };
        saveProducts(products);
        res.json(products[index]);
    } else {
        res.status(404).json({ message: 'Product not found' });
    }
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
    let products = getProducts();
    products = products.filter(p => p.id !== parseInt(req.params.id));
    saveProducts(products);
    res.status(204).send();
});

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const USERS_FILE = path.join(__dirname, 'users.json');
const SECRET_KEY = 'blissroot_ayurveda_secret_key';

// Read users
const getUsers = () => {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, '[]');
        return [];
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Write users
const saveUsers = (users) => {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const otps = {}; // In-memory store for OTPs

// Send OTP Route
app.post('/api/send-otp', (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otps[phone] = otp;
    
    console.log(`\n=========================================`);
    console.log(`📱 [SMS SIMULATION] OTP for ${phone}`);
    console.log(`🔑 Your OTP is: ${otp}`);
    console.log(`=========================================\n`);
    
    // Returning the OTP in the JSON so the frontend can show it in an alert for testing
    res.json({ message: 'OTP sent successfully', otp: otp });
});

// Signup Route
app.post('/api/signup', (req, res) => {
    const { name, phone, password, otp } = req.body;
    if (!name || !phone || !password || !otp) return res.status(400).json({ error: 'All fields including OTP are required' });

    if (otps[phone] !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const users = getUsers();
    if (users.find(u => u.phone === phone)) {
        return res.status(400).json({ error: 'Phone number already in use' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = { id: Date.now(), name, phone, password: hashedPassword };
    users.push(newUser);
    saveUsers(users);
    
    delete otps[phone]; // Clear OTP after successful use

    const token = jwt.sign({ id: newUser.id, phone: newUser.phone }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ message: 'Signup successful', token, user: { name: newUser.name, phone: newUser.phone } });
});

// Login Route
app.post('/api/login', (req, res) => {
    const { phone, password, otp } = req.body;
    if (!phone || !password || !otp) return res.status(400).json({ error: 'Phone, password, and OTP required' });

    if (otps[phone] !== otp) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const users = getUsers();
    const user = users.find(u => u.phone === phone);

    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    delete otps[phone]; // Clear OTP after successful use

    const token = jwt.sign({ id: user.id, phone: user.phone }, SECRET_KEY, { expiresIn: '24h' });
    res.json({ message: 'Login successful', token, user: { name: user.name, phone: user.phone } });
});

// --- Payment Gateway (Razorpay) ---
import Razorpay from 'razorpay';
import crypto from 'crypto';

// Setup Razorpay keys via Environment Variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'YOUR_SECRET_HERE';

let razorpayInstance = null;
try {
    if (RAZORPAY_KEY_ID !== 'rzp_test_YOUR_KEY_HERE') {
        razorpayInstance = new Razorpay({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET
        });
    } else {
        console.log("⚠️ No Razorpay keys found in .env! Using Mock Payment Mode.");
    }
} catch (e) {
    console.log("Error initializing Razorpay:", e.message);
}

// Endpoint so frontend can dynamically get the Key ID
app.get('/api/config/razorpay', (req, res) => {
    res.json({ key_id: RAZORPAY_KEY_ID });
});

app.post('/api/create-order', async (req, res) => {
    try {
        const { amount } = req.body; 
        
        if (!razorpayInstance || RAZORPAY_KEY_ID === 'rzp_test_YOUR_KEY_HERE') {
            return res.json({
                id: 'order_mock_' + Date.now(),
                amount: amount * 100,
                currency: 'INR',
                mock: true
            });
        }

        const options = {
            amount: amount * 100,
            currency: 'INR',
            receipt: 'receipt_' + Date.now()
        };

        const order = await razorpayInstance.orders.create(options);
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mock } = req.body;
    
    if (mock) {
        return res.json({ success: true, message: 'Mock Payment verified successfully' });
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature === expectedSign) {
        return res.json({ success: true, message: 'Payment verified successfully' });
    } else {
        return res.status(400).json({ success: false, message: 'Invalid signature sent!' });
    }
});

// --- DEPLOYMENT SETUP ---
// Serve frontend static files from "dist" folder (if built via Vite)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA fallback: (not strictly needed since we use multiple HTML files, but good practice)
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
