# Crowslist - ASU Marketplace

A full-stack marketplace platform exclusive to Arizona State University students, faculty, and affiliates.

## Features

- **ASU Email Verification**: Only @asu.edu emails can register
- **Browse Listings**: Anyone can browse without registration
- **Post Listings**: Registered users can post items with images
- **Manage Listings**: Edit, delete, and mark items as sold
- **Categories**: Job, Books, Furniture, Technology, Services, Miscellaneous
- **Search & Filter**: Find listings by category and keywords
- **Image Upload**: Up to 5 images per listing

## Tech Stack

- **Backend**: Node.js, Express
- **Database**: Vercel Postgres (PostgreSQL)
- **Frontend**: HTML, CSS, JavaScript
- **File Upload**: Multer
- **Authentication**: Express Sessions, bcryptjs
- **Deployment**: Vercel

## Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Crowslist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Run database migration**
   ```bash
   npm run migrate
   ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Visit** `http://localhost:3000`

## Deployment to Vercel

### Prerequisites
- Vercel account
- GitHub repository

### Steps

1. **Push your code to GitHub**

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect it's a Node.js app

3. **Add Vercel Postgres Database**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Add Postgres to your project
   vercel storage create postgres
   ```

4. **Set Environment Variables**
   In your Vercel dashboard, add:
   - `SESSION_SECRET`: Any random string
   - `NODE_ENV`: `production`
   - `POSTGRES_URL`: Automatically provided by Vercel

5. **Deploy**
   - Vercel will automatically deploy on every push to main
   - Or manually deploy: `vercel --prod`

6. **Run Database Migration**
   After deployment, run the migration:
   ```bash
   vercel env pull .env.local
   npm run migrate
   ```

## Database Schema

### Users Table
- `id` (SERIAL PRIMARY KEY)
- `email` (TEXT UNIQUE)
- `password` (TEXT)
- `first_name`, `last_name` (TEXT)
- `phone`, `major`, `campus` (TEXT)
- `graduation_year` (INTEGER)
- `bio`, `preferred_contact` (TEXT)
- `notifications`, `messages` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

### Listings Table
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `title`, `description`, `category` (TEXT)
- `price` (DECIMAL)
- `status` (TEXT, DEFAULT 'active')
- `images` (TEXT, JSON array)
- `created_at`, `updated_at` (TIMESTAMP)

### Email Verifications Table
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER, FOREIGN KEY)
- `verification_code` (TEXT)
- `verified` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMP)

## API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - Login user
- `POST /api/logout` - Logout user
- `POST /api/verify-email` - Verify email
- `GET /api/auth/check` - Check auth status

### Listings
- `GET /api/listings` - Get all listings (with filters)
- `GET /api/listings/my` - Get user's listings
- `POST /api/listings` - Create listing
- `PUT /api/listings/:id` - Update listing
- `PUT /api/listings/:id/status` - Update listing status
- `DELETE /api/listings/:id` - Delete listing

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## Sample Users

After migration, these users are available:
- `john.doe@asu.edu` (password: `password123`)
- `jane.smith@asu.edu` (password: `password123`)

## Development Notes

- Email verification codes are logged to console in development
- File uploads are stored in `/uploads` directory
- Images are limited to 5MB each, max 5 images per listing
- All user input is sanitized and validated

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
