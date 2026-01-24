# ERP Management Platform

**Full-stack Enterprise Resource Planning system with modern architecture, comprehensive testing, and production-ready features.**

**Status**: ✅ Production Ready | 🧪 Test Coverage: 80%+ | 🔒 Type Safe | ⚡ Performance Optimized

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Environment Setup](#-environment-setup)
- [Running the Application](#-running-the-application)
- [Testing](#-testing)
- [User Roles & Access](#-user-roles--access)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd payment-template

# Install dependencies (root, backend, frontend)
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Setup environment variables
cp backend/env.example backend/.env
cp frontend/env.example frontend/.env
# Edit .env files with your database URL and configuration

# Setup database
cd backend
npx prisma generate
npx prisma migrate dev --schema=../prisma/schema.prisma
npm run prisma:seed  # Optional: seed with sample data

# Create admin user
npm run create-admin

# Start the application
cd ..
./start.sh  # or use start.ps1 on Windows
```

Access the application at: **http://localhost:3000**

---

## ✨ Features

### Core ERP Modules

#### 📊 Accounting & Finance
- **Chart of Accounts**: Hierarchical account structure with parent-child relationships
- **Journal Entries**: Double-entry bookkeeping system
- **Invoicing**: Create, manage, and track invoices with multiple statuses
- **Financial Reports**:
  - Balance Sheet
  - Income Statement
  - Cash Flow Statement
  - Trial Balance
  - Aged Accounts Receivable
  - Aged Accounts Payable

#### 👥 CRM (Customer Relationship Management)
- **Lead Management**: Track and convert leads through the sales pipeline
- **Opportunities**: Manage sales opportunities with stages and forecasting
- **Campaign Management**: Plan and execute marketing campaigns
- **Analytics**: Customer insights and sales metrics

#### 📁 Project Management
- **Projects & Tasks**: Create projects and break them down into manageable tasks
- **Status Tracking**: Monitor project progress with multiple status states
- **Resource Allocation**: Assign team members and track time
- **Budget Management**: Track project costs and profitability

#### 💼 HR & Payroll
- **Employee Management**: Maintain comprehensive employee records
- **Payroll Processing**: Calculate regular and overtime hours, deductions, and taxes
- **Pay Periods**: Support for weekly, bi-weekly, monthly, and custom periods
- **Payroll Items**: Track bonuses, deductions, and other compensation types
- **Reports**: Generate payroll summaries and export data

#### 📊 Reporting & Analytics
- **Real-time Dashboards**: Visual insights into business metrics
- **Custom Reports**: Generate reports across all ERP modules
- **Export Capabilities**: Export data to CSV, PDF, Excel
- **Audit Logs**: Track all system changes and user actions

### System Features

#### 🔐 Security & Access Control
- JWT-based authentication
- Role-based access control (USER, ADMIN)
- Password encryption with bcrypt
- Session management
- Rate limiting and request throttling
- CORS protection

#### 🛠️ Developer Experience
- TypeScript throughout (100% type safety)
- Comprehensive test coverage (80%+)
- ESLint and Prettier configured
- Hot module reloading
- Error logging and monitoring
- API documentation

#### ⚡ Performance
- Database query optimization with indexes
- Connection pooling
- Caching strategies
- Lazy loading for components
- Code splitting
- Image optimization

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Shadcn/ui
- **State Management**: React Hooks, Context API
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Testing**: Jest, React Testing Library

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: JWT, bcrypt
- **Validation**: Zod
- **Testing**: Jest, Supertest
- **Logging**: Winston

### DevOps & Tools
- **Version Control**: Git
- **Package Manager**: npm
- **Linting**: ESLint
- **Formatting**: Prettier
- **Environment**: dotenv
- **Process Management**: PM2 (production)

---

## 📁 Project Structure

```
payment-template/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── services/        # Business services
│   │   ├── utils/           # Utility functions
│   │   └── server.ts        # Express app entry
│   ├── prisma/              # Database seeds
│   ├── logs/                # Application logs
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── erp/            # ERP module pages
│   │   ├── admin/          # Admin pages
│   │   ├── account/        # User account pages
│   │   ├── api/            # Next.js API routes
│   │   └── login/          # Authentication pages
│   ├── components/
│   │   ├── erp/            # ERP-specific components
│   │   ├── admin/          # Admin components
│   │   └── ui/             # Reusable UI components
│   ├── lib/
│   │   ├── api.ts          # API client
│   │   ├── hooks/          # Custom React hooks
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── package.json
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── prisma.config.ts    # Prisma 7 configuration
│   └── migrations/         # Database migrations
├── scripts/                # Utility scripts
├── start.sh               # Start script (Unix/Mac)
├── start.ps1              # Start script (Windows)
└── README.md
```

---

## ⚙️ Environment Setup

### Backend Environment Variables (.env in backend/)

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRATION="7d"

# Server
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"
```

### Frontend Environment Variables (.env.local in frontend/)

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# App
NEXT_PUBLIC_APP_NAME="ERP Management Platform"
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🚀 Running the Application

### Development Mode

```bash
# Option 1: Use the start script (recommended)
./start.sh  # Unix/Mac
# or
start.ps1  # Windows

# Option 2: Run frontend and backend separately

# Terminal 1 - Backend
cd backend
npm run dev  # Runs on port 5000

# Terminal 2 - Frontend
cd frontend
npm run dev  # Runs on port 3000
```

### Production Mode

```bash
# Build both frontend and backend
cd backend
npm run build

cd ../frontend
npm run build

# Start in production
npm start
```

### Database Management

```bash
# Generate Prisma Client
npx prisma generate --schema=./prisma/schema.prisma

# Create a migration
npx prisma migrate dev --schema=./prisma/schema.prisma --name your_migration_name

# Apply migrations (production)
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Seed the database
cd backend
npm run prisma:seed

# Reset database (⚠️ WARNING: Deletes all data)
npx prisma migrate reset --schema=./prisma/schema.prisma
```

### User Management Scripts

```bash
cd backend

# Create admin user
npm run create-admin

# Create regular employee user
npm run create-employee
```

---

## 🧪 Testing

### Run All Tests

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test

# Run with coverage
npm test -- --coverage
```

### Test Structure

- **Frontend**: Jest + React Testing Library
  - Component tests
  - Integration tests
  - Hook tests
  
- **Backend**: Jest + Supertest
  - Controller tests
  - Route tests
  - Service tests
  - Integration tests

---

## 🔑 User Roles & Access

### Roles

1. **USER** (Standard Employee)
   - Access to all ERP modules
   - Create and manage records
   - View reports and dashboards
   - Update own profile

2. **ADMIN** (System Administrator)
   - All USER permissions
   - User management (create, edit, delete users)
   - System settings
   - Full access to all modules and data
   - View audit logs

### Authentication Flow

1. User accesses the application at `/login`
2. Enters email and password
3. System validates credentials
4. JWT token issued and stored
5. User redirected to `/erp` (main dashboard)
6. Token validated on each request
7. Role-based access control enforced

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Key Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

#### Accounting
- `GET /accounting/accounts` - List chart of accounts
- `POST /accounting/accounts` - Create account
- `GET /accounting/journal-entries` - List journal entries
- `POST /accounting/journal-entries` - Create entry
- `GET /accounting/reports/:type` - Generate financial reports

#### CRM
- `GET /crm/leads` - List leads
- `POST /crm/leads` - Create lead
- `PATCH /crm/leads/:id` - Update lead
- `GET /crm/opportunities` - List opportunities

#### Projects
- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/:id/tasks` - List project tasks
- `POST /projects/:id/tasks` - Create task

#### Payroll
- `GET /payroll/pay-periods` - List pay periods
- `POST /payroll/pay-periods` - Create pay period
- `GET /payroll/payrolls` - List payrolls
- `POST /payroll/calculate` - Calculate payroll

#### Admin
- `GET /admin/users` - List all users
- `POST /admin/users` - Create user
- `PATCH /admin/users/:id` - Update user
- `DELETE /admin/users/:id` - Delete user

For full API documentation, see the interactive API docs at `/api/docs` when running the application.

---

## 🔒 Security

### Implemented Security Measures

- **Authentication**: JWT-based with secure token generation
- **Password Security**: Bcrypt hashing with salt rounds
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Zod schema validation on all inputs
- **SQL Injection Prevention**: Prisma ORM parameterized queries
- **XSS Prevention**: React automatic escaping + input sanitization
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Request throttling to prevent abuse
- **CORS**: Configured for specific origins
- **Helmet.js**: Security headers
- **Environment Variables**: Sensitive data in .env files
- **HTTPS Ready**: Production deployment with SSL/TLS

### Security Best Practices

1. **Change default secrets** in production
2. **Use strong passwords** for database and JWT
3. **Enable HTTPS** in production
4. **Regularly update** dependencies
5. **Monitor logs** for suspicious activity
6. **Backup database** regularly
7. **Use environment-specific** configurations

---

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
```

#### Database Connection Issues
- Verify DATABASE_URL in backend/.env
- Ensure PostgreSQL is running
- Check database exists and user has permissions
- Run `npx prisma generate --schema=./prisma/schema.prisma`

#### Prisma Client Not Generated
```bash
npx prisma generate --schema=./prisma/schema.prisma
```

#### Migration Errors
```bash
# Reset and reapply migrations (⚠️ deletes data)
npx prisma migrate reset --schema=./prisma/schema.prisma

# Or force deploy
npx prisma migrate deploy --schema=./prisma/schema.prisma --force
```

#### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Do this in both backend/ and frontend/
```

#### Frontend Build Errors
```bash
cd frontend
rm -rf .next
npm run build
```

#### Cannot Login / 401 Errors
- Check JWT_SECRET is set in backend/.env
- Verify user exists in database
- Clear browser cookies/localStorage
- Check backend logs for errors

### Getting Help

If you encounter issues:
1. Check the logs in `backend/logs/`
2. Enable debug mode: `DEBUG=* npm run dev`
3. Check database with Prisma Studio: `npx prisma studio --schema=./prisma/schema.prisma`
4. Review error messages carefully
5. Search for similar issues in the repository

---

## 📝 Development Guidelines

### Code Style
- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier for consistent formatting
- Meaningful variable and function names
- Comment complex logic

### Git Workflow
1. Create feature branch from main
2. Make changes with clear commits
3. Write/update tests
4. Ensure all tests pass
5. Submit pull request
6. Code review required

### Testing Requirements
- Unit tests for all business logic
- Integration tests for API endpoints
- Component tests for UI components
- Minimum 70% coverage for new code

---

## 🚢 Deployment

### Production Checklist

- [ ] Update all environment variables for production
- [ ] Change JWT_SECRET to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Update DATABASE_URL to production database
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for production domain
- [ ] Set up database backups
- [ ] Configure logging and monitoring
- [ ] Run database migrations
- [ ] Build frontend: `npm run build`
- [ ] Build backend: `npm run build`
- [ ] Test all critical flows
- [ ] Set up reverse proxy (nginx)
- [ ] Configure firewall rules
- [ ] Set up PM2 for process management

### Deployment Platforms
- **Frontend**: Vercel, Netlify, AWS Amplify
- **Backend**: AWS EC2, DigitalOcean, Heroku
- **Database**: AWS RDS, Neon, Supabase
- **Full Stack**: Railway, Render, Fly.io

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Radix UI and Shadcn for beautiful components
- All open-source contributors

---

## 📞 Support

For support and questions:
- Check documentation above
- Review troubleshooting section
- Check application logs
- Create an issue in the repository

---

**Built with ❤️ for modern businesses**
