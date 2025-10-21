# Crowslist - ASU's Marketplace

A web-based marketplace application designed specifically for Arizona State University students to buy, sell, and trade items with fellow students.

## Features

### Frontend
- ✅ User-friendly interface with ASU branding
- ✅ Browse and search listings
- ✅ Category filtering
- ✅ Responsive design
- ✅ Modern Alan Sans typography

### Backend (NEW!)
- 🔐 **User Authentication** - Secure registration and login
- 📊 **Real Database Storage** - SQLite database for listings and users
- 🏠 **Listing Management** - Create, edit, delete, and mark listings as sold
- 👤 **User Profiles** - Complete profile management
- 🔍 **Search & Filter** - Real-time search and category filtering
- 🛡️ **Security** - Password hashing and session management

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set up the Database
```bash
npm run setup
```

### 3. Start the Server
```bash
npm start
```

### 4. Visit Your Site
Open your browser and go to: **http://localhost:3000**

## Development Mode

For development with auto-restart:
```bash
npm run dev
```

## Default Test Accounts

The setup creates two test accounts you can use:

**Account 1:**
- Email: `john.doe@asu.edu`
- Password: `password123`

**Account 2:**
- Email: `jane.smith@asu.edu`
- Password: `password123`

## Project Structure

```
crowslist/
├── server.js              # Main backend server
├── setup.js               # Database initialization
├── package.json            # Dependencies and scripts
├── .env                   # Environment variables
├── crowslist.db           # SQLite database (created after setup)
├── home.html              # Main browsing page
├── post-listing.html      # Create new listings
├── my-listings.html       # Manage user listings
├── profile.html           # User profile management
├── login.html             # User login
├── register.html          # User registration
├── logout.html            # Logout confirmation
└── assets/
    ├── logo.png
    └── logo_rect.png
```

## API Endpoints

### Authentication
- `POST /api/register` - Create new account
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/auth/check` - Check authentication status

### Listings
- `GET /api/listings` - Get all active listings (with search/filter)
- `GET /api/listings/my` - Get current user's listings
- `POST /api/listings` - Create new listing
- `PUT /api/listings/:id` - Update listing
- `PUT /api/listings/:id/status` - Update listing status (active/sold)
- `DELETE /api/listings/:id` - Delete listing

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## Database Schema

### Users Table
- User authentication and profile information
- ASU-specific fields (major, graduation year, campus)
- Preferences for notifications and messaging

### Listings Table
- Item listings with title, description, category, price
- Status tracking (active/sold)
- User ownership and timestamps

### Messages Table
- Ready for future messaging feature implementation

## Security Features

- 🔒 **Password Hashing** - bcrypt for secure password storage
- 🍪 **Session Management** - Secure session-based authentication
- 🔐 **Authorization** - Protected routes for user-specific actions
- ✅ **Input Validation** - Server-side validation for all inputs
- 🏫 **ASU Email Verification** - Only @asu.edu emails allowed

## Technology Stack

**Backend:**
- Node.js with Express.js
- SQLite database
- bcryptjs for password hashing
- express-session for authentication
- CORS enabled

**Frontend:**
- Vanilla HTML/CSS/JavaScript
- Alan Sans Google Font
- Responsive design
- Modern fetch API for backend communication

## Next Steps / Future Features

- 📱 Image upload for listings
- 💬 Direct messaging between users
- ⭐ User rating and review system
- 📧 Email notifications
- 🔍 Advanced search filters
- 📊 Analytics dashboard
- 🌙 Dark mode theme

## Development Notes

- The app uses SQLite for simplicity in development
- Sessions are stored in memory (use Redis in production)
- CORS is enabled for development
- Environment variables are in `.env` file

## Production Deployment

For production deployment, consider:
- Use PostgreSQL or MySQL instead of SQLite
- Implement Redis for session storage
- Set up HTTPS with proper SSL certificates
- Use environment variables for all secrets
- Implement rate limiting and security headers
- Set up proper logging and monitoring

---

**Built for ASU students, by ASU students** 🌵