# Kairux - Business in Flow

> **Where business connects and flows seamlessly**

A modern, AI-powered Cloud ERP system built with Next.js, TypeScript, and PostgreSQL. Kairux provides comprehensive business management with real-time collaboration, intelligent analytics, and enterprise-grade security.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white)](https://www.prisma.io/)

## 💫 What is Kairux?

**Kairux** (kai + rux) represents the "Connecting Flow" - where:
- **Kai** (Greek: καί) means "and" or "connection" 
- **Rux** derives from "flux," meaning "flow"

Together, Kairux embodies seamless integration and continuous movement of data, processes, and insights across your entire organization. Just as "kai" connects ideas, Kairux connects every aspect of your business, allowing data to flow naturally and decisions to emerge clearly.

## 🚀 Features

### Core Modules
- **👤 User Management**: Role-based access control (USER, ADMIN)
- **💼 Accounting & Finance**: Chart of accounts, journal entries, invoicing
- **📦 Inventory Management**: Product management, stock tracking, categories
- **👥 CRM**: Lead management, opportunity tracking, customer relationships
- **💰 Payroll System**: Employee time tracking, pay periods, automated calculations
- **🏪 Point of Sale (POS)**: Sales transactions, employee management, inventory integration
- **📊 Reporting**: Comprehensive business analytics and reports
- **🛠️ Project Management**: Project and task tracking with status management

### Technical Features
- **🔐 Security**: JWT authentication, encrypted data, secure headers, rate limiting
- **📱 Responsive Design**: Mobile-first UI with modern aesthetics
- **⚡ Performance**: Optimized database queries, connection pooling, lazy loading
- **🎨 UI/UX**: Radix UI components, Tailwind CSS, Framer Motion animations
- **🌐 API**: RESTful API with comprehensive error handling
- **📝 Type Safety**: Full TypeScript implementation across frontend and backend
- **🗄️ Database**: PostgreSQL with Prisma ORM for type-safe queries

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.x
- **ORM**: Prisma 6.x with PostgreSQL adapter
- **Database**: PostgreSQL (Neon, Railway, or local)
- **Authentication**: JWT with bcryptjs
- **Validation**: Zod schemas with express-validator
- **Security**: Helmet, CORS, rate limiting, cookie-parser
- **Logging**: Winston for structured logging
- **Real-time**: Socket.io
- **Payments**: Stripe integration
- **File Uploads**: Cloudinary

### Frontend
- **Framework**: Next.js 15.x (App Router)
- **Language**: TypeScript 5.x
- **UI Library**: React 19.x
- **Styling**: Tailwind CSS 4.x
- **Components**: Radix UI, Lucide React icons
- **Forms**: React Hook Form with Zod validation
- **State**: Zustand for global state management
- **Animations**: Framer Motion
- **Charts**: Recharts
- **HTTP Client**: Axios with interceptors

### Database Schema
- Comprehensive ERP models with relationships
- Optimized indexes for query performance
- Cascade deletion for data integrity
- JSON fields for flexible metadata
- Decimal types for financial calculations

## 📁 Project Structure

```
open-erp/
├── backend/                    # Express.js backend
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, validation, security
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic
│   │   ├── types/            # TypeScript definitions
│   │   └── utils/            # Helper functions, logger, db
│   ├── scripts/              # Database scripts (create users, seed)
│   └── prisma/              # Seed files
├── frontend/                  # Next.js frontend
│   ├── app/                  # App router pages
│   │   ├── erp/             # ERP modules
│   │   ├── admin/           # Admin panel
│   │   ├── api/             # API routes (server components)
│   │   └── ...              # Auth pages (login, register)
│   ├── components/           # React components
│   │   ├── ui/              # Reusable UI components
│   │   ├── erp/             # ERP-specific components
│   │   └── admin/           # Admin components
│   ├── lib/                  # Utilities and hooks
│   │   ├── hooks/           # Custom React hooks
│   │   ├── store/           # Zustand stores
│   │   ├── server/          # Server-side utilities
│   │   └── utils/           # Helper functions
│   └── public/              # Static assets
├── prisma/                   # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migrations
└── scripts/                  # Utility scripts
    ├── cleanup.sh           # Clean build artifacts
    └── backup-database.sh   # Database backup

```

## 🚀 Getting Started

### Prerequisites

- **Node.js**: 20.x or higher
- **npm**: 10.x or higher
- **PostgreSQL**: 14.x or higher (local or cloud)
- **Git**: For version control

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/open-erp.git
   cd open-erp
   ```

2. **Install dependencies**:
   ```bash
   chmod +x install-deps.sh
   ./install-deps.sh
   ```
   Or manually:
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```

3. **Configure environment variables**:
   
   **Backend** (`backend/.env`):
   ```env
   # Database (Required)
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=verify-full

   # JWT Secrets (Required - generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-at-least-32-characters-long
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # URLs
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:3001

   # Cloudinary (Optional - for image uploads)
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret

   # OpenAI (Optional - for AI features)
   OPENAI_API_KEY=your-openai-api-key

   # Payment Gateways (Optional)
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   PAYPAL_CLIENT_ID=your-paypal-client-id

   # Server
   NODE_ENV=development
   PORT=3001
   ```

   **Frontend** (`frontend/.env.local`):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=verify-full
   ```

4. **Initialize the database**:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

5. **Create an admin user** (backend):
   ```bash
   cd backend
   npm run create-admin
   ```

6. **Start development servers**:
   ```bash
   chmod +x start.sh
   ./start.sh
   ```
   Or manually:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

7. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - API Health: http://localhost:3001/api/health

## 📦 Available Scripts

### Root Level
- `npm run dev:backend` - Start backend development server
- `npm run dev:frontend` - Start frontend development server
- `npm run build:backend` - Build backend for production
- `npm run build:frontend` - Build frontend for production
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database with sample data
- `npm run clean` - Clean build artifacts and logs

### Backend
- `npm run dev` - Start with nodemon hot-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run production build
- `npm run create-admin` - Create admin user interactively
- `npm run prisma:studio` - Open Prisma Studio GUI

### Frontend
- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## 🏗️ Architecture

### Backend Architecture
- **Controller Layer**: Handles HTTP requests/responses
- **Service Layer**: Implements business logic
- **Middleware**: Authentication, validation, error handling
- **Database Layer**: Prisma ORM with connection pooling
- **Logging**: Structured logging with Winston

### Frontend Architecture
- **App Router**: Next.js 15 app directory structure
- **Server Components**: Default for better performance
- **Client Components**: Interactive UI with 'use client'
- **API Routes**: Server-side API handlers
- **State Management**: Zustand stores for global state
- **Form Handling**: React Hook Form with Zod validation

### Security Measures
- JWT-based authentication with refresh tokens
- Password hashing with bcryptjs
- Rate limiting on API endpoints
- CORS configuration for origin control
- Security headers (Helmet, CSP)
- Input validation and sanitization
- SQL injection prevention (Prisma)
- XSS protection

## 🚀 Deployment

### Database Setup
1. Create a PostgreSQL database (recommended: Neon, Railway, or Supabase)
2. Copy the DATABASE_URL connection string
3. Ensure SSL mode is set to `verify-full` for security

### Backend Deployment (Railway/Render/Fly.io)
1. Set environment variables in your hosting platform
2. Configure build command: `cd backend && npm install && npm run build`
3. Configure start command: `cd backend && npm run start`
4. Set PORT environment variable (usually auto-detected)

### Frontend Deployment (Netlify/Vercel)
1. Connect your Git repository
2. Set build command: `cd frontend && npm install && npm run build`
3. Set publish directory: `frontend/.next`
4. Add environment variables from `.env.local`
5. Configure PostgreSQL connection for server components

### Environment Variables for Production
Ensure all sensitive values are properly set:
- Generate secure JWT secrets (32+ characters)
- Use production database URL with SSL
- Set NODE_ENV=production
- Configure CORS with production URLs
- Add API keys for integrations (Cloudinary, Stripe, etc.)

## 🔧 Development Best Practices

### Code Style
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write descriptive commit messages
- Add JSDoc comments for complex functions

### Database
- Always create migrations for schema changes
- Test migrations in development first
- Back up production database before migrations
- Use transactions for complex operations

### Security
- Never commit `.env` files
- Rotate JWT secrets regularly
- Keep dependencies updated
- Review security advisories

### Testing
- Test API endpoints with proper error cases
- Validate form inputs on both client and server
- Test authentication flows thoroughly
- Check database constraints

## 📄 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### ERP Endpoints
- `/api/erp/products` - Product management
- `/api/erp/inventory` - Inventory operations
- `/api/erp/invoices` - Invoice management
- `/api/erp/leads` - CRM lead management
- `/api/erp/projects` - Project management

### Admin Endpoints
- `/api/admin/users` - User management
- `/api/admin/analytics` - System analytics

### Payroll Endpoints
- `/api/payroll/periods` - Pay period management
- `/api/payroll/records` - Payroll records

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- Code follows project style guidelines
- All tests pass
- Documentation is updated
- Commit messages are descriptive

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zod](https://zod.dev/) - Schema validation

## 📧 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing documentation
- Review API endpoints

---

**Built with ❤️ using modern web technologies**

## 📝 License

MIT License

Copyright (c) 2026 Open ERP Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
