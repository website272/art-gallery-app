const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const multer = require('multer');
const basicAuth = require('express-basic-auth'); 
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();

// UPGRADED FOR RENDER: Render requires a dynamic port
const PORT = process.env.PORT || 3000;

// --- CLOUDINARY CONFIG ---
// Replace these with your actual credentials from your Cloudinary API Keys page
cloudinary.config({
    cloud_name: 'YOUR_CLOUD_NAME',
    api_key: 'YOUR_API_KEY',
    api_secret: 'YOUR_API_SECRET'
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'art_gallery',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

// --- SECURITY: THE ADMIN BOUNCER ---
const adminAuth = basicAuth({
    users: { 'admin': 'gallery2026' }, 
    challenge: true,
    unauthorizedResponse: 'Access Denied: You are not the gallery owner.'
});

app.use('/admin.html', adminAuth);
app.use('/api/financials', adminAuth);
app.use('/api/artworks/:id', (req, res, next) => {
    if (req.method === 'DELETE') return adminAuth(req, res, next);
    next();
});

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- EXPLICIT HTML ROUTES ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/about.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/more.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'more.html')));
// THE MISSING CART ROUTE IS ADDED HERE:
app.get('/cart.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));

// --- DATABASE SETUP (PostgreSQL Production Upgrade) ---
const sequelize = process.env.DATABASE_URL 
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        protocol: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        }
      })
    : new Sequelize('art_gallery_db', 'postgres', 'your_local_password', {
        dialect: 'postgres',
        host: 'localhost',
        logging: false
      });
// --- NEW: USER DATABASE MODEL ---
const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
    role: { type: DataTypes.STRING, defaultValue: 'customer' } // 'customer' or 'admin'
});

// Create relationships (A User can have many Orders/Cart items later)
// Make sure PostgreSQL builds the new table
sequelize.sync({ alter: true })
    .then(() => console.log('PostgreSQL database connected and synced!'))
    .catch(err => console.error('Database connection error:', err));
const Artwork = sequelize.define('Artwork', {
    title: { type: DataTypes.STRING, allowNull: false },
    artist: { type: DataTypes.STRING, allowNull: false },
    medium: { type: DataTypes.STRING },
    price: { type: DataTypes.FLOAT, allowNull: false },
    costToGallery: { type: DataTypes.FLOAT, allowNull: false },
    imageUrl: { type: DataTypes.STRING },
    imagePublicId: { type: DataTypes.STRING }, 
    isSold: { type: DataTypes.BOOLEAN, defaultValue: false }
});

sequelize.sync({ alter: true })
    .then(() => console.log('PostgreSQL database connected and synced!'))
    .catch(err => console.error('Database connection error:', err));


// --- API ROUTES ---

// 1. Add Artwork (Uploads directly to Cloudinary)
app.post('/api/artworks', adminAuth, upload.single('image'), async (req, res) => {
    try {
        const newArtwork = await Artwork.create({
            title: req.body.title,
            artist: req.body.artist,
            medium: req.body.medium,
            price: Number(req.body.price),
            costToGallery: Number(req.body.costToGallery),
            imageUrl: req.file ? req.file.path : null,         
            imagePublicId: req.file ? req.file.filename : null 
        });
        res.status(201).json(newArtwork);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
    const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'super_secret_gallery_key_2026'; // In production, this goes in your .env file

// REGISTER NEW CUSTOMER
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        // 1. Check if email already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already in use' });

        // 2. Encrypt the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Save user to database
        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone
        });

        res.status(201).json({ message: 'Account created successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// CUSTOMER LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        // 2. Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) return res.status(401).json({ error: 'Invalid password' });

        // 3. Generate VIP Pass (JWT)
        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

        res.status(200).json({ message: 'Login successful', token, name: user.name });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
});

// 2. View Gallery (Public)
app.get('/api/artworks', async (req, res) => {
    try {
        const artworks = await Artwork.findAll({ where: { isSold: false } });
        res.status(200).json(artworks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Checkout (Public)
app.post('/api/checkout/:id', async (req, res) => {
    try {
        const artwork = await Artwork.findByPk(req.params.id);
        if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
        if (artwork.isSold) return res.status(400).json({ error: 'Artwork is already sold' });

        const vatAmount = artwork.price * 0.15;
        artwork.isSold = true;
        await artwork.save();

        res.status(200).json({
            message: 'Purchase successful!',
            receipt: { subtotal: artwork.price, vat: vatAmount, totalPaid: artwork.price + vatAmount },
            financials: { profitMargin: artwork.price - artwork.costToGallery }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Financial Ledger (Locked)
app.get('/api/financials', async (req, res) => {
    try {
        const soldArt = await Artwork.findAll({ where: { isSold: true } });
        let totalRevenue = 0, totalCosts = 0, totalVatLiability = 0;

        soldArt.forEach(art => {
            totalRevenue += art.price;
            totalCosts += art.costToGallery;
            totalVatLiability += (art.price * 0.15);
        });

        res.status(200).json({
            sales: soldArt,
            summary: { revenue: totalRevenue, costOfGoods: totalCosts, vatLiability: totalVatLiability, grossProfit: totalRevenue - totalCosts }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. DELETE Artwork (Deletes record + removes image from Cloudinary cloud storage)
app.delete('/api/artworks/:id', async (req, res) => {
    try {
        const artwork = await Artwork.findByPk(req.params.id);
        if (!artwork) return res.status(404).json({ error: 'Artwork not found' });

        if (artwork.imagePublicId) {
            await cloudinary.uploader.destroy(artwork.imagePublicId);
        }

        await artwork.destroy();
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- START SERVER ---
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));