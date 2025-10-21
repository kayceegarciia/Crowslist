const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = new sqlite3.Database('crowslist.db');

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
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists with this email' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification code
        const verificationCode = crypto.randomBytes(32).toString('hex');

        // Create user
        const result = await new Promise((resolve, reject) => {
            db.run(`INSERT INTO users (email, password, first_name, last_name, phone, major, graduation_year, campus) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [email, hashedPassword, firstName, lastName, phone, major, graduationYear, campus],
                function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                }
            );
        });

        // Store verification code
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO email_verifications (user_id, verification_code) VALUES (?, ?)`,
                [result.id, verificationCode],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

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
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Check if email is verified
        const verification = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM email_verifications WHERE user_id = ? AND verified = 1', [user.id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!verification) {
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
        const verification = await new Promise((resolve, reject) => {
            db.get(`
                SELECT ev.*, u.email 
                FROM email_verifications ev 
                JOIN users u ON ev.user_id = u.id 
                WHERE u.email = ? AND ev.verification_code = ? AND ev.verified = 0
            `, [email, verificationCode], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!verification) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Mark as verified
        await new Promise((resolve, reject) => {
            db.run('UPDATE email_verifications SET verified = 1 WHERE id = ?', 
                [verification.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });

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
app.get('/api/listings', (req, res) => {
    const { category, search, sort } = req.query;
    let query = `
        SELECT l.*, u.first_name, u.last_name, u.email 
        FROM listings l 
        JOIN users u ON l.user_id = u.id 
        WHERE l.status = 'active'
    `;
    const params = [];

    if (category) {
        query += ' AND l.category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND (l.title LIKE ? OR l.description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    // Add sorting
    switch (sort) {
        case 'price_asc':
            query += ' ORDER BY l.price ASC';
            break;
        case 'price_desc':
            query += ' ORDER BY l.price DESC';
            break;
        case 'date_asc':
            query += ' ORDER BY l.created_at ASC';
            break;
        case 'date_desc':
        default:
            query += ' ORDER BY l.created_at DESC';
            break;
    }

    db.all(query, params, (err, rows) => {
        if (err) {
            console.error('Error fetching listings:', err);
            res.status(500).json({ error: 'Failed to fetch listings' });
        } else {
            // Parse images JSON for each listing
            const listings = rows.map(row => ({
                ...row,
                images: row.images ? JSON.parse(row.images) : []
            }));
            res.json(listings);
        }
    });
});

app.get('/api/listings/my', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM listings WHERE user_id = ? ORDER BY created_at DESC',
        [req.session.userId],
        (err, rows) => {
            if (err) {
                console.error('Error fetching user listings:', err);
                res.status(500).json({ error: 'Failed to fetch listings' });
            } else {
                // Parse images JSON for each listing
                const listings = rows.map(row => ({
                    ...row,
                    images: row.images ? JSON.parse(row.images) : []
                }));
                res.json(listings);
            }
        }
    );
});

app.post('/api/listings', requireAuth, upload.array('images', 5), (req, res) => {
    const { title, description, category, price } = req.body;

    // Validate category
    const validCategories = ['Job', 'Books', 'Furniture', 'Technology', 'Services', 'Miscellaneous'];
    if (!validCategories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => file.filename) : [];
    const imagesJson = JSON.stringify(images);

    db.run(
        'INSERT INTO listings (user_id, title, description, category, price, images) VALUES (?, ?, ?, ?, ?, ?)',
        [req.session.userId, title, description, category, price || null, imagesJson],
        function (err) {
            if (err) {
                console.error('Error creating listing:', err);
                res.status(500).json({ error: 'Failed to create listing' });
            } else {
                res.json({
                    success: true,
                    listingId: this.lastID,
                    message: 'Listing created successfully'
                });
            }
        }
    );
});

app.put('/api/listings/:id', requireAuth, (req, res) => {
    const { title, description, category, price } = req.body;
    const listingId = req.params.id;

    // First check if the listing belongs to the user
    db.get(
        'SELECT * FROM listings WHERE id = ? AND user_id = ?',
        [listingId, req.session.userId],
        (err, row) => {
            if (err || !row) {
                return res.status(404).json({ error: 'Listing not found or unauthorized' });
            }

            db.run(
                'UPDATE listings SET title = ?, description = ?, category = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [title, description, category, price || null, listingId],
                function (err) {
                    if (err) {
                        console.error('Error updating listing:', err);
                        res.status(500).json({ error: 'Failed to update listing' });
                    } else {
                        res.json({ success: true, message: 'Listing updated successfully' });
                    }
                }
            );
        }
    );
});

app.put('/api/listings/:id/status', requireAuth, (req, res) => {
    const { status } = req.body;
    const listingId = req.params.id;

    db.run(
        'UPDATE listings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [status, listingId, req.session.userId],
        function (err) {
            if (err) {
                console.error('Error updating listing status:', err);
                res.status(500).json({ error: 'Failed to update listing status' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Listing not found or unauthorized' });
            } else {
                res.json({ success: true, message: 'Listing status updated successfully' });
            }
        }
    );
});

app.delete('/api/listings/:id', requireAuth, (req, res) => {
    const listingId = req.params.id;

    db.run(
        'DELETE FROM listings WHERE id = ? AND user_id = ?',
        [listingId, req.session.userId],
        function (err) {
            if (err) {
                console.error('Error deleting listing:', err);
                res.status(500).json({ error: 'Failed to delete listing' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Listing not found or unauthorized' });
            } else {
                res.json({ success: true, message: 'Listing deleted successfully' });
            }
        }
    );
});

// User Profile Routes
app.get('/api/profile', requireAuth, (req, res) => {
    db.get(
        'SELECT id, email, first_name, last_name, phone, major, graduation_year, campus, bio, preferred_contact, notifications, messages FROM users WHERE id = ?',
        [req.session.userId],
        (err, row) => {
            if (err) {
                console.error('Error fetching profile:', err);
                res.status(500).json({ error: 'Failed to fetch profile' });
            } else if (!row) {
                res.status(404).json({ error: 'User not found' });
            } else {
                res.json(row);
            }
        }
    );
});

app.put('/api/profile', requireAuth, (req, res) => {
    const {
        firstName, lastName, phone, major, graduationYear,
        campus, bio, preferredContact, notifications, messages
    } = req.body;

    db.run(
        `UPDATE users SET 
            first_name = ?, last_name = ?, phone = ?, major = ?, 
            graduation_year = ?, campus = ?, bio = ?, preferred_contact = ?, 
            notifications = ?, messages = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [
            firstName, lastName, phone, major, graduationYear,
            campus, bio, preferredContact, notifications ? 1 : 0,
            messages ? 1 : 0, req.session.userId
        ],
        function (err) {
            if (err) {
                console.error('Error updating profile:', err);
                res.status(500).json({ error: 'Failed to update profile' });
            } else {
                res.json({ success: true, message: 'Profile updated successfully' });
            }
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Crowslist server running on http://localhost:${PORT}`);
    console.log('📝 Run "npm run setup" to initialize the database');
    console.log('🏠 Visit http://localhost:3000 to view the site');
});