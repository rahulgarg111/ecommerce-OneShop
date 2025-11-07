# E-Commerce Application

A full-stack e-commerce application built with the MERN stack (MongoDB, Express, React, Node.js) featuring product catalog, shopping cart, Stripe payments, order management, and admin dashboard.

LIVE - https://vocal-sprinkles-a1fdcb.netlify.app/

## Features

### Core Functionality
- ✅ User authentication (register, login, JWT tokens, password reset)
- ✅ Product catalog with search, filters, and pagination
- ✅ Product detail pages with variants (size, color)
- ✅ Shopping cart (persisted for logged-in users, session-based for guests)
- ✅ Stripe payment integration with webhooks
- ✅ Order management and history
- ✅ Admin dashboard for managing products and orders
- ✅ Image upload with Cloudinary
- ✅ Responsive design (mobile-first)

### Technical Features
- ✅ TypeScript for type safety
- ✅ JWT access + refresh token authentication
- ✅ Rate limiting and security best practices
- ✅ Input validation and error handling
- ✅ RESTful API design
- ✅ Docker containerization
- ✅ MongoDB with Mongoose ODM
- ✅ React Query for data fetching
- ✅ Tailwind CSS for styling

## Tech Stack

### Backend
- **Runtime**: Node.js v20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT (jsonwebtoken, bcrypt)
- **Payments**: Stripe
- **File Upload**: Cloudinary
- **Caching**: Redis (optional)
- **Validation**: express-validator
- **Security**: Helmet, CORS, express-rate-limit

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **State Management**: React Query (@tanstack/react-query)
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **UI Icons**: Lucide React
- **Notifications**: React Hot Toast

### DevOps
- **Containerization**: Docker & Docker Compose
- **Database**: MongoDB 7.0
- **Cache**: Redis 7

## Project Structure

```
e-commerce-app/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files (database, env, logger)
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Custom middleware (auth, validation, error handling)
│   │   ├── models/         # Mongoose schemas (User, Product, Cart, Order)
│   │   ├── routes/         # API routes
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions (JWT, errors)
│   │   ├── app.ts          # Express app configuration
│   │   └── server.ts       # Server entry point
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/            # API client and endpoints
│   │   ├── components/     # React components
│   │   ├── context/        # React context (Auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── pages/          # Page components
│   │   ├── types/          # TypeScript interfaces
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main app component
│   │   └── main.tsx        # Entry point
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites
- Node.js v20 or higher
- MongoDB (local or Atlas)
- Stripe account (for payments)
- Cloudinary account (for image uploads)
- Docker & Docker Compose (optional)

### Installation

#### Option 1: Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd e-commerce-app
```

2. Create environment files:

**Backend** (`backend/.env`):
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://admin:password123@mongodb:27017/ecommerce?authSource=admin
JWT_ACCESS_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5173
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

#### Option 2: Manual Setup

1. **Install Backend Dependencies**:
```bash
cd backend
npm install
```

2. **Install Frontend Dependencies**:
```bash
cd frontend
npm install
```

3. **Start MongoDB** (if running locally):
```bash
mongod
```

4. **Start Backend**:
```bash
cd backend
npm run dev
```

5. **Start Frontend**:
```bash
cd frontend
npm run dev
```

## API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/me` - Get current user

### Product Endpoints
- `GET /api/v1/products` - Get all products (with filters)
- `GET /api/v1/products/:id` - Get product by ID
- `GET /api/v1/products/slug/:slug` - Get product by slug
- `POST /api/v1/products` - Create product (Admin)
- `PUT /api/v1/products/:id` - Update product (Admin)
- `DELETE /api/v1/products/:id` - Delete product (Admin)

### Cart Endpoints
- `GET /api/v1/cart` - Get user's cart
- `POST /api/v1/cart` - Add item to cart
- `PUT /api/v1/cart/:itemId` - Update cart item
- `DELETE /api/v1/cart/:itemId` - Remove item from cart
- `DELETE /api/v1/cart` - Clear cart
- `POST /api/v1/cart/merge` - Merge guest cart with user cart

### Order Endpoints
- `POST /api/v1/orders/checkout` - Create order and payment intent
- `GET /api/v1/orders` - Get user's orders
- `GET /api/v1/orders/:id` - Get order by ID
- `POST /api/v1/orders/:id/cancel` - Cancel order

### Admin Endpoints
- `GET /api/v1/admin/orders` - Get all orders with filters
- `PUT /api/v1/admin/orders/:id/fulfill` - Update order fulfillment
- `GET /api/v1/admin/analytics` - Get analytics data

### Webhook Endpoints
- `POST /api/v1/webhooks/stripe` - Stripe webhook handler

## Environment Variables

### Backend
| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | No |
| `PORT` | Server port | No |
| `MONGODB_URI` | MongoDB connection string | Yes |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Yes |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret | Yes |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `FRONTEND_URL` | Frontend URL for CORS | No |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Yes |

## Stripe Integration

### Setup
1. Create a Stripe account at https://stripe.com
2. Get your API keys from the Stripe Dashboard
3. Set up webhook endpoint:
   - URL: `https://your-domain.com/api/v1/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy webhook signing secret to `.env`

### Testing Locally
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## Deployment

### Backend (Render/Heroku)
1. Push code to GitHub
2. Create new Web Service
3. Connect repository
4. Set environment variables
5. Deploy

### Frontend (Vercel)
1. Push code to GitHub
2. Import project to Vercel
3. Set environment variables
4. Deploy

### Database (MongoDB Atlas)
1. Create free M0 cluster
2. Set up database user
3. Whitelist IP addresses
4. Update `MONGODB_URI` in backend

## Security Considerations

- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens with expiration
- ✅ HTTP-only cookies for refresh tokens
- ✅ CORS configuration
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ Helmet for security headers
- ✅ HTTPS in production (via hosting platform)

## Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend tests:
```bash
cd frontend
npm test
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Stripe for payment processing
- Cloudinary for image management
- MongoDB Atlas for database hosting
- Vercel/Render for deployment platforms
