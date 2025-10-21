const express = require('express');
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection - using Vercel Postgres
// No need to initialize connection, @vercel/postgres handles it

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Maximum 5 files
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'crowslist-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Routes

// Serve main pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'home.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/verify-email', (req, res) => {
    res.sendFile(path.join(__dirname, 'verify-email.html'));
});

// Auth Routes
app.post('/api/register', async (req, res) => {
    const { email, password, firstName, lastName, phone, major, graduationYear, campus } = req.body;

    try {
        // Validate ASU email
        if (!email.endsWith('@asu.edu')) {
            return res.status(400).json({ error: 'Only ASU email addresses (@asu.edu) are allowed' });
        }

        // Check if user already exists
        const existingUser = await sql`SELECT * FROM users WHERE email = ${email}`;

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification code
        const verificationCode = crypto.randomBytes(32).toString('hex');

        // Create user
        const result = await sql`
            INSERT INTO users (email, password, first_name, last_name, phone, major, graduation_year, campus) 
            VALUES (${email}, ${hashedPassword}, ${firstName}, ${lastName}, ${phone}, ${major}, ${graduationYear}, ${campus})
            RETURNING id
        `;

        const userId = result.rows[0].id;

        // Store verification code
        await sql`
            INSERT INTO email_verifications (user_id, verification_code) 
            VALUES (${userId}, ${verificationCode})
        `;

        // In a real application, you would send an email here
        console.log(`Verification code for ${email}: ${verificationCode}`);

        res.json({
            success: true,
            message: 'Registration successful. Please check your email for verification.',
            verificationCode: verificationCode // Only for development - remove in production
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user
        const userResult = await sql`SELECT * FROM users WHERE email = ${email}`;
        
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        const user = userResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check if email is verified
        const verificationResult = await sql`
            SELECT * FROM email_verifications 
            WHERE user_id = ${user.id} AND verified = 1
        `;

        if (verificationResult.rows.length === 0) {
            return res.status(400).json({ error: 'Please verify your email before logging in' });
        }

        // Create session
        req.session.userId = user.id;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Email verification routes
app.post('/api/verify-email', async (req, res) => {
    const { email, verificationCode } = req.body;

    try {
        // Find user and verification record
        const verificationResult = await sql`
            SELECT ev.*, u.email 
            FROM email_verifications ev 
            JOIN users u ON ev.user_id = u.id 
            WHERE u.email = ${email} AND ev.verification_code = ${verificationCode} AND ev.verified = 0
        `;

        if (verificationResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        const verification = verificationResult.rows[0];

        // Mark as verified
        await sql`
            UPDATE email_verifications 
            SET verified = 1 
            WHERE id = ${verification.id}
        `;

        // Create session
        req.session.userId = verification.user_id;
        req.session.userEmail = email;

        res.json({
            success: true,
            message: 'Email verified successfully',
            user: { id: verification.user_id, email }
        });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Check authentication status
app.get('/api/auth/check', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            userId: req.session.userId,
            userEmail: req.session.userEmail
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Listings Routes
app.get('/api/listings', async (req, res) => {
    const { category, search, sort } = req.query;

    try {
        let query = sql`
            SELECT l.*, u.first_name, u.last_name, u.email 
            FROM listings l 
            JOIN users u ON l.user_id = u.id 
            WHERE l.status = 'active'
        `;

        if (category) {
            query = sql`
                SELECT l.*, u.first_name, u.last_name, u.email 
                FROM listings l 
                JOIN users u ON l.user_id = u.id 
                WHERE l.status = 'active' AND l.category = ${category}
            `;
        }

        if (search) {
            const searchTerm = `%${search}%`;
            query = sql`
                SELECT l.*, u.first_name, u.last_name, u.email 
                FROM listings l 
                JOIN users u ON l.user_id = u.id 
                WHERE l.status = 'active' 
                AND (l.title ILIKE ${searchTerm} OR l.description ILIKE ${searchTerm})
            `;
        }

        if (category && search) {
            const searchTerm = `%${search}%`;
            query = sql`
                SELECT l.*, u.first_name, u.last_name, u.email 
                FROM listings l 
                JOIN users u ON l.user_id = u.id 
                WHERE l.status = 'active' 
                AND l.category = ${category}
                AND (l.title ILIKE ${searchTerm} OR l.description ILIKE ${searchTerm})
            `;
        }

        // Add sorting
        let orderBy = 'ORDER BY l.created_at DESC';
        switch (sort) {
            case 'price_asc':
                orderBy = 'ORDER BY l.price ASC';
                break;
            case 'price_desc':
                orderBy = 'ORDER BY l.price DESC';
                break;
            case 'date_asc':
                orderBy = 'ORDER BY l.created_at ASC';
                break;
            case 'date_desc':
            default:
                orderBy = 'ORDER BY l.created_at DESC';
                break;
        }

        // Execute query with ordering
        const result = await sql`${query} ${sql.unsafe(orderBy)}`;
        
        // Parse images JSON for each listing
        const listings = result.rows.map(row => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : []
        }));
        
        res.json(listings);
    } catch (error) {
        console.error('Error fetching listings:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

app.get('/api/listings/my', requireAuth, async (req, res) => {
    try {
        const result = await sql`
            SELECT * FROM listings 
            WHERE user_id = ${req.session.userId} 
            ORDER BY created_at DESC
        `;
        
        // Parse images JSON for each listing
        const listings = result.rows.map(row => ({
            ...row,
            images: row.images ? JSON.parse(row.images) : []
        }));
        
        res.json(listings);
    } catch (error) {
        console.error('Error fetching user listings:', error);
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});

app.post('/api/listings', requireAuth, upload.array('images', 5), async (req, res) => {
    const { title, description, category, price } = req.body;

    try {
        // Validate category
        const validCategories = ['Job', 'Books', 'Furniture', 'Technology', 'Services', 'Miscellaneous'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: 'Invalid category' });
        }

        // Process uploaded images
        const images = req.files ? req.files.map(file => file.filename) : [];
        const imagesJson = JSON.stringify(images);

        const result = await sql`
            INSERT INTO listings (user_id, title, description, category, price, images) 
            VALUES (${req.session.userId}, ${title}, ${description}, ${category}, ${price || null}, ${imagesJson})
            RETURNING id
        `;

        res.json({
            success: true,
            listingId: result.rows[0].id,
            message: 'Listing created successfully'
        });
    } catch (error) {
        console.error('Error creating listing:', error);
        res.status(500).json({ error: 'Failed to create listing' });
    }
});

app.put('/api/listings/:id', requireAuth, async (req, res) => {
    const { title, description, category, price } = req.body;
    const listingId = req.params.id;

    try {
        // First check if the listing belongs to the user
        const listingResult = await sql`
            SELECT * FROM listings 
            WHERE id = ${listingId} AND user_id = ${req.session.userId}
        `;

        if (listingResult.rows.length === 0) {
            return res.status(404).json({ error: 'Listing not found or unauthorized' });
        }

        await sql`
            UPDATE listings 
            SET title = ${title}, description = ${description}, category = ${category}, 
                price = ${price || null}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${listingId}
        `;

        res.json({ success: true, message: 'Listing updated successfully' });
    } catch (error) {
        console.error('Error updating listing:', error);
        res.status(500).json({ error: 'Failed to update listing' });
    }
});

app.put('/api/listings/:id/status', requireAuth, async (req, res) => {
    const { status } = req.body;
    const listingId = req.params.id;

    try {
        const result = await sql`
            UPDATE listings 
            SET status = ${status}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${listingId} AND user_id = ${req.session.userId}
        `;

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Listing not found or unauthorized' });
        }

        res.json({ success: true, message: 'Listing status updated successfully' });
    } catch (error) {
        console.error('Error updating listing status:', error);
        res.status(500).json({ error: 'Failed to update listing status' });
    }
});

app.delete('/api/listings/:id', requireAuth, async (req, res) => {
    const listingId = req.params.id;

    try {
        const result = await sql`
            DELETE FROM listings 
            WHERE id = ${listingId} AND user_id = ${req.session.userId}
        `;

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Listing not found or unauthorized' });
        }

        res.json({ success: true, message: 'Listing deleted successfully' });
    } catch (error) {
        console.error('Error deleting listing:', error);
        res.status(500).json({ error: 'Failed to delete listing' });
    }
});

// User Profile Routes
app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const result = await sql`
            SELECT id, email, first_name, last_name, phone, major, graduation_year, campus, bio, preferred_contact, notifications, messages 
            FROM users 
            WHERE id = ${req.session.userId}
        `;

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

app.put('/api/profile', requireAuth, async (req, res) => {
    const {
        firstName, lastName, phone, major, graduationYear,
        campus, bio, preferredContact, notifications, messages
    } = req.body;

    try {
        await sql`
            UPDATE users SET 
                first_name = ${firstName}, last_name = ${lastName}, phone = ${phone}, major = ${major}, 
                graduation_year = ${graduationYear}, campus = ${campus}, bio = ${bio}, preferred_contact = ${preferredContact}, 
                notifications = ${notifications ? 1 : 0}, messages = ${messages ? 1 : 0}, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ${req.session.userId}
        `;

        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Crowslist server running on http://localhost:${PORT}`);
    console.log('📝 Run "npm run setup" to initialize the database');
    console.log('🏠 Visit http://localhost:3000 to view the site');
});