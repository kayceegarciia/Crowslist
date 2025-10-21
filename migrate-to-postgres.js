const { sql } = require('@vercel/postgres');

async function migrateToPostgres() {
    try {
        console.log('Starting migration to Postgres...');

        // Create users table
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        console.log('✅ Users table created');

        // Create listings table
        await sql`
            CREATE TABLE IF NOT EXISTS listings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                category TEXT NOT NULL,
                price DECIMAL(10,2),
                status TEXT DEFAULT 'active',
                images TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;
        console.log('✅ Listings table created');

        // Create email_verifications table
        await sql`
            CREATE TABLE IF NOT EXISTS email_verifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                verification_code TEXT NOT NULL,
                verified INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `;
        console.log('✅ Email verifications table created');

        // Create messages table
        await sql`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                listing_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                recipient_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (listing_id) REFERENCES listings (id),
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (recipient_id) REFERENCES users (id)
            )
        `;
        console.log('✅ Messages table created');

        // Insert sample users
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('password123', 10);

        await sql`
            INSERT INTO users (email, password, first_name, last_name, phone, major, graduation_year, campus, bio)
            VALUES 
            ('john.doe@asu.edu', ${hashedPassword}, 'John', 'Doe', '(480) 555-0123', 'Computer Science', 2025, 'Tempe', 'Computer Science student passionate about technology and innovation.'),
            ('jane.smith@asu.edu', ${hashedPassword}, 'Jane', 'Smith', '(480) 555-0124', 'Business', 2024, 'Tempe', 'Business student looking for internship opportunities.')
            ON CONFLICT (email) DO NOTHING
        `;
        console.log('✅ Sample users created');

        // Insert sample listings
        await sql`
            INSERT INTO listings (user_id, title, description, category, price, status)
            VALUES 
            (1, 'Textbook: Calculus Early Transcendentals', 'Barely used textbook for MAT 270. Great condition, no highlighting or writing.', 'Books', 120.00, 'active'),
            (1, 'MacBook Pro 13" - Excellent Condition', '2019 MacBook Pro, barely used. Perfect for students. Includes original charger and box.', 'Technology', 800.00, 'active'),
            (2, 'Roommate Needed - Vista del Sol', 'Looking for a roommate to share a 2BR apartment near campus. $650/month including utilities.', 'Miscellaneous', 650.00, 'active'),
            (2, 'Tutor Needed for Computer Science', 'Need help with CSE 110 assignments. Flexible schedule, good pay.', 'Services', 25.00, 'active'),
            (1, 'Office Chair - Herman Miller', 'Ergonomic office chair in excellent condition. Perfect for long study sessions.', 'Furniture', 150.00, 'active'),
            (2, 'Part-time Research Assistant', 'Looking for undergraduate research assistant for psychology study. $15/hour.', 'Job', 15.00, 'active')
            ON CONFLICT DO NOTHING
        `;
        console.log('✅ Sample listings created');

        console.log('🎉 Migration completed successfully!');
        console.log('Sample users:');
        console.log('- john.doe@asu.edu (password: password123)');
        console.log('- jane.smith@asu.edu (password: password123)');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateToPostgres();
}

module.exports = { migrateToPostgres };
