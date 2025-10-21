const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database
const db = new sqlite3.Database('crowslist.db');

console.log('Setting up Crowslist database...');

db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        phone TEXT,
        major TEXT,
        graduation_year INTEGER,
        campus TEXT,
        bio TEXT,
        preferred_contact TEXT DEFAULT 'email',
        notifications INTEGER DEFAULT 1,
        messages INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Listings table
    db.run(`CREATE TABLE IF NOT EXISTS listings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        price DECIMAL(10,2),
        status TEXT DEFAULT 'active',
        images TEXT, -- JSON array of image filenames
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Email verification table
    db.run(`CREATE TABLE IF NOT EXISTS email_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        verification_code TEXT NOT NULL,
        verified INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Messages table (for future use)
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        listing_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        recipient_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (listing_id) REFERENCES listings (id),
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (recipient_id) REFERENCES users (id)
    )`);

    // Create sample users
    const hashedPassword = bcrypt.hashSync('password123', 10);

    db.run(`INSERT OR IGNORE INTO users 
        (email, password, first_name, last_name, phone, major, graduation_year, campus, bio) 
        VALUES 
        ('john.doe@asu.edu', ?, 'John', 'Doe', '(480) 555-0123', 'Computer Science', 2025, 'Tempe', 'Computer Science student passionate about technology and innovation.')`,
        [hashedPassword]);

    db.run(`INSERT OR IGNORE INTO users 
        (email, password, first_name, last_name, phone, major, graduation_year, campus, bio) 
        VALUES 
        ('jane.smith@asu.edu', ?, 'Jane', 'Smith', '(480) 555-0124', 'Business', 2024, 'Tempe', 'Business student looking for internship opportunities.')`,
        [hashedPassword]);

    // Create sample listings
    db.run(`INSERT OR IGNORE INTO listings 
        (user_id, title, description, category, price, status) 
        VALUES 
        (1, 'Textbook: Calculus Early Transcendentals', 'Barely used textbook for MAT 270. Great condition, no highlighting or writing.', 'Books', 120.00, 'active')`);

    db.run(`INSERT OR IGNORE INTO listings 
        (user_id, title, description, category, price, status) 
        VALUES 
        (1, 'MacBook Pro 13" - Excellent Condition', '2019 MacBook Pro, barely used. Perfect for students. Includes original charger and box.', 'Technology', 800.00, 'active')`);

    db.run(`INSERT OR IGNORE INTO listings 
        (user_id, title, description, category, price, status) 
        VALUES 
        (2, 'Roommate Needed - Vista del Sol', 'Looking for a roommate to share a 2BR apartment near campus. $650/month including utilities.', 'Miscellaneous', 650.00, 'active')`);

    db.run(`INSERT OR IGNORE INTO listings 
        (user_id, title, description, category, price, status) 
        VALUES 
        (2, 'Tutor Needed for Computer Science', 'Need help with CSE 110 assignments. Flexible schedule, good pay.', 'Services', 25.00, 'active')`);

    db.run(`INSERT OR IGNORE INTO listings 
        (user_id, title, description, category, price, status) 
        VALUES 
        (1, 'Office Chair - Herman Miller', 'Ergonomic office chair in excellent condition. Perfect for long study sessions.', 'Furniture', 150.00, 'active')`);

    db.run(`INSERT OR IGNORE INTO listings 
        (user_id, title, description, category, price, status) 
        VALUES 
        (2, 'Part-time Research Assistant', 'Looking for undergraduate research assistant for psychology study. $15/hour.', 'Job', 15.00, 'active')`);

    console.log('Database setup complete!');
    console.log('Sample users created:');
    console.log('- john.doe@asu.edu (password: password123)');
    console.log('- jane.smith@asu.edu (password: password123)');
});

db.close();