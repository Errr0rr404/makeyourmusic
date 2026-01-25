# Complete ERP System Architecture & Implementation Plan

**A comprehensive blueprint for building a SAP-like Enterprise Resource Planning (ERP) system**

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagrams](#architecture-diagrams)
3. [Complete Feature List](#complete-feature-list)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Technology Stack](#technology-stack)
7. [Module Specifications](#module-specifications)
8. [Security Architecture](#security-architecture)
9. [Deployment Plan](#deployment-plan)
10. [Development Roadmap](#development-roadmap)
11. [Testing Strategy](#testing-strategy)
12. [Performance Optimization](#performance-optimization)

---

## 🎯 System Overview

### Project Name
**NexusERP** - Enterprise Resource Planning System

### Vision
A comprehensive, multi-tenant ERP system that integrates all core business processes including Finance, Inventory, Sales, HR, Manufacturing, and Analytics.

### Core Principles
- **Multi-tenancy**: Complete data isolation per company
- **Modularity**: Independent, integrable modules
- **Scalability**: Handle thousands of users and transactions
- **Security**: Enterprise-grade security and compliance
- **Real-time**: Live updates and collaboration
- **Extensibility**: Plugin architecture for custom modules

### Target Users
- Small to Medium Enterprises (SMEs)
- Multi-location businesses
- Manufacturing companies
- Retail businesses
- Service-based organizations

---

## 🏗️ Architecture Diagrams

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Web App    │  │  Mobile App  │  │  API Clients │                  │
│  │  (Next.js)   │  │  (React      │  │  (External)  │                  │
│  │              │  │   Native)    │  │              │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼──────────────────┼──────────────────┼─────────────────────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │      API GATEWAY / LOAD BALANCER     │
          │  - Authentication                    │
          │  - Rate Limiting                    │
          │  - Request Routing                  │
          │  - SSL Termination                  │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │         APPLICATION LAYER            │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │   Frontend   │  │   Backend    │ │
          │  │   Service    │  │   API        │ │
          │  │  (Next.js)   │  │  (Express)   │ │
          │  └──────────────┘  └──────────────┘ │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │  Real-time   │  │  Background  │ │
          │  │  Service     │  │  Jobs        │ │
          │  │  (Socket.io)  │  │  (BullMQ)    │ │
          │  └──────────────┘  └──────────────┘ │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │         BUSINESS LOGIC LAYER         │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │   Finance    │  │  Inventory  │ │
          │  │   Module     │  │   Module    │ │
          │  └──────────────┘  └──────────────┘ │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │    Sales     │  │      HR      │ │
          │  │   Module     │  │    Module    │ │
          │  └──────────────┘  └──────────────┘ │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │Manufacturing │  │  Reporting   │ │
          │  │   Module     │  │   Module     │ │
          │  └──────────────┘  └──────────────┘ │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────▼──────────────────┐
          │         DATA LAYER                   │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │  PostgreSQL  │  │    Redis     │ │
          │  │  (NeonDB)    │  │   (Cache)   │ │
          │  └──────────────┘  └──────────────┘ │
          │  ┌──────────────┐  ┌──────────────┐ │
          │  │   File       │  │   Search     │ │
          │  │  Storage     │  │   Engine    │ │
          │  │  (S3/Cloud)  │  │  (Elastic)  │ │
          │  └──────────────┘  └──────────────┘ │
          └─────────────────────────────────────┘
```

### Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERP CORE SYSTEM                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              CORE SERVICES                                │  │
│  │  - Authentication & Authorization                        │  │
│  │  - Multi-tenancy Management                               │  │
│  │  - Audit Logging                                          │  │
│  │  - Notification Service                                   │  │
│  │  - Workflow Engine                                        │  │
│  │  - Integration Hub                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Finance  │  │Inventory │  │  Sales   │  │    HR    │      │
│  │ Module   │  │ Module   │  │ Module   │  │  Module  │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Manufact.│  │Purchase   │  │Reporting │  │  CRM     │      │
│  │ Module   │  │ Module    │  │ Module   │  │ Module   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Request
    │
    ▼
API Gateway
    │
    ▼
Authentication Service
    │
    ▼
Tenant Resolution
    │
    ▼
Module Router
    │
    ├──► Finance Module
    ├──► Inventory Module
    ├──► Sales Module
    ├──► HR Module
    └──► Other Modules
    │
    ▼
Business Logic Layer
    │
    ▼
Data Access Layer (Prisma)
    │
    ▼
PostgreSQL Database
    │
    ▼
Cache Layer (Redis)
    │
    ▼
Response to User
```

### Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TENANT ISOLATION                          │
│                                                               │
│  Company A                    Company B                       │
│  ┌─────────────┐            ┌─────────────┐                │
│  │  Users      │            │  Users      │                │
│  │  Data       │            │  Data       │                │
│  │  Settings   │            │  Settings   │                │
│  │  Modules    │            │  Modules    │                │
│  └─────────────┘            └─────────────┘                │
│         │                          │                         │
│         └──────────┬───────────────┘                         │
│                    │                                         │
│         ┌──────────▼───────────┐                             │
│         │  Shared Database     │                             │
│         │  (Row-level Security)│                            │
│         │  companyId filtering │                             │
│         └──────────────────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Complete Feature List

### 1. CORE SYSTEM FEATURES

#### 1.1 Authentication & Authorization
- [ ] User registration and login
- [ ] Multi-factor authentication (MFA)
- [ ] Password reset and recovery
- [ ] Session management
- [ ] Role-based access control (RBAC)
- [ ] Permission management
- [ ] Single Sign-On (SSO) support
- [ ] OAuth integration (Google, Microsoft)
- [ ] API key management
- [ ] User activity logging

#### 1.2 Multi-Tenancy
- [ ] Company/organization management
- [ ] Tenant isolation (data, users, settings)
- [ ] Company settings and configuration
- [ ] Subscription management
- [ ] Billing integration
- [ ] Usage tracking
- [ ] Data export per tenant
- [ ] Tenant migration tools

#### 1.3 User Management
- [ ] User CRUD operations
- [ ] User profiles and preferences
- [ ] User roles and permissions
- [ ] User groups/teams
- [ ] User hierarchy (manager-employee)
- [ ] User activity tracking
- [ ] User deactivation/archival
- [ ] Bulk user operations

#### 1.4 Audit & Logging
- [ ] Comprehensive audit trail
- [ ] User action logging
- [ ] Data change tracking
- [ ] Login/logout logging
- [ ] System event logging
- [ ] Audit report generation
- [ ] Compliance reporting
- [ ] Log retention policies

#### 1.5 Notifications
- [ ] In-app notifications
- [ ] Email notifications
- [ ] SMS notifications (optional)
- [ ] Push notifications
- [ ] Notification preferences
- [ ] Notification history
- [ ] Real-time notification delivery
- [ ] Notification templates

#### 1.6 Workflow Engine
- [ ] Custom workflow builder
- [ ] Approval workflows
- [ ] Automated task assignment
- [ ] Workflow templates
- [ ] Conditional logic
- [ ] Workflow execution tracking
- [ ] Workflow notifications
- [ ] Workflow analytics

---

### 2. FINANCIAL MANAGEMENT MODULE (FI)

#### 2.1 Chart of Accounts
- [ ] Account hierarchy management
- [ ] Account types (Asset, Liability, Equity, Revenue, Expense)
- [ ] Account codes and numbering
- [ ] Account activation/deactivation
- [ ] Account grouping
- [ ] Multi-currency accounts
- [ ] Account templates
- [ ] Account import/export

#### 2.2 General Ledger
- [ ] Journal entry creation
- [ ] Double-entry bookkeeping
- [ ] Journal entry approval workflow
- [ ] Recurring journal entries
- [ ] Journal entry templates
- [ ] Journal entry reversal
- [ ] Journal entry search and filter
- [ ] Journal entry attachments

#### 2.3 Accounts Payable (AP)
- [ ] Vendor management
- [ ] Purchase invoice entry
- [ ] Invoice approval workflow
- [ ] Payment processing
- [ ] Payment terms management
- [ ] Aging reports
- [ ] Vendor statements
- [ ] 1099 reporting (US)
- [ ] Early payment discounts
- [ ] Payment reminders

#### 2.4 Accounts Receivable (AR)
- [ ] Customer management
- [ ] Sales invoice creation
- [ ] Invoice templates
- [ ] Payment receipt entry
- [ ] Payment application
- [ ] Aging reports
- [ ] Customer statements
- [ ] Collection management
- [ ] Credit limit management
- [ ] Bad debt write-off

#### 2.5 Financial Reporting
- [ ] Balance Sheet
- [ ] Profit & Loss Statement
- [ ] Cash Flow Statement
- [ ] Trial Balance
- [ ] General Ledger Report
- [ ] Account Statement
- [ ] Financial Dashboard
- [ ] Custom financial reports
- [ ] Comparative reports (period comparison)
- [ ] Budget vs Actual reports
- [ ] Financial report scheduling
- [ ] PDF/Excel export

#### 2.6 Budgeting & Forecasting
- [ ] Budget creation
- [ ] Budget templates
- [ ] Budget approval workflow
- [ ] Budget vs Actual tracking
- [ ] Budget revisions
- [ ] Multi-period budgeting
- [ ] Department-wise budgeting
- [ ] Budget reports
- [ ] Forecast models

#### 2.7 Banking
- [ ] Bank account management
- [ ] Bank reconciliation
- [ ] Bank statement import
- [ ] Payment processing
- [ ] Check printing
- [ ] Electronic payments
- [ ] Bank transfer management
- [ ] Bank fee tracking

#### 2.8 Tax Management
- [ ] Tax code setup
- [ ] Tax rate management
- [ ] Tax calculation
- [ ] Tax reporting
- [ ] Sales tax management
- [ ] VAT management
- [ ] Tax return preparation
- [ ] Tax compliance tracking

---

### 3. INVENTORY MANAGEMENT MODULE

#### 3.1 Product Management
- [ ] Product catalog
- [ ] Product categories and subcategories
- [ ] Product variants (size, color, etc.)
- [ ] Product attributes
- [ ] Product images and media
- [ ] Product descriptions
- [ ] SKU management
- [ ] Barcode/QR code support
- [ ] Product pricing
- [ ] Product cost tracking
- [ ] Product templates
- [ ] Bulk product import/export

#### 3.2 Warehouse Management
- [ ] Warehouse/location setup
- [ ] Multi-warehouse support
- [ ] Warehouse zones
- [ ] Bin location management
- [ ] Warehouse capacity planning
- [ ] Warehouse transfer
- [ ] Warehouse reports
- [ ] Warehouse analytics

#### 3.3 Stock Management
- [ ] Stock level tracking
- [ ] Stock movements (in/out/transfer)
- [ ] Stock adjustments
- [ ] Stock valuation methods (FIFO, LIFO, Average)
- [ ] Stock reorder points
- [ ] Stock alerts (low stock, out of stock)
- [ ] Stock reservation
- [ ] Stock allocation
- [ ] Stock reconciliation
- [ ] Stock reports
- [ ] Real-time stock levels

#### 3.4 Purchase Management
- [ ] Purchase requisition
- [ ] Purchase order creation
- [ ] Purchase order approval workflow
- [ ] Purchase order templates
- [ ] Vendor selection
- [ ] Purchase order tracking
- [ ] Goods receipt
- [ ] Purchase invoice matching
- [ ] Purchase returns
- [ ] Purchase reports
- [ ] Vendor performance analysis

#### 3.5 Inventory Valuation
- [ ] Cost calculation
- [ ] Inventory valuation reports
- [ ] Cost of Goods Sold (COGS) calculation
- [ ] Inventory aging
- [ ] Inventory write-off
- [ ] Inventory adjustments
- [ ] Valuation methods configuration

#### 3.6 Inventory Reports
- [ ] Stock level reports
- [ ] Stock movement reports
- [ ] Inventory valuation reports
- [ ] Slow-moving items
- [ ] Fast-moving items
- [ ] Stock aging reports
- [ ] Inventory turnover
- [ ] ABC analysis

---

### 4. SALES & DISTRIBUTION MODULE (SD)

#### 4.1 Customer Management
- [ ] Customer master data
- [ ] Customer categories
- [ ] Customer credit limits
- [ ] Customer payment terms
- [ ] Customer contact management
- [ ] Customer address management
- [ ] Customer history
- [ ] Customer segmentation
- [ ] Customer import/export

#### 4.2 Sales Quotation
- [ ] Quotation creation
- [ ] Quotation templates
- [ ] Quotation approval workflow
- [ ] Quotation conversion to order
- [ ] Quotation validity period
- [ ] Quotation tracking
- [ ] Quotation reports

#### 4.3 Sales Order Management
- [ ] Sales order creation
- [ ] Sales order from quotation
- [ ] Sales order approval workflow
- [ ] Order line items
- [ ] Order pricing and discounts
- [ ] Order status tracking
- [ ] Order modification
- [ ] Order cancellation
- [ ] Order templates
- [ ] Bulk order processing

#### 4.4 Delivery Management
- [ ] Delivery note creation
- [ ] Delivery scheduling
- [ ] Delivery tracking
- [ ] Partial delivery
- [ ] Delivery confirmation
- [ ] Shipping labels
- [ ] Delivery reports

#### 4.5 Invoicing
- [ ] Sales invoice creation
- [ ] Invoice from delivery
- [ ] Invoice templates
- [ ] Invoice numbering
- [ ] Invoice printing
- [ ] E-invoice generation
- [ ] Invoice emailing
- [ ] Invoice cancellation
- [ ] Credit note creation
- [ ] Invoice reports

#### 4.6 Pricing Management
- [ ] Price lists
- [ ] Customer-specific pricing
- [ ] Volume discounts
- [ ] Promotional pricing
- [ ] Price rules
- [ ] Price history
- [ ] Price approval workflow

#### 4.7 Sales Reports
- [ ] Sales dashboard
- [ ] Sales by customer
- [ ] Sales by product
- [ ] Sales by region
- [ ] Sales by salesperson
- [ ] Sales trend analysis
- [ ] Sales forecast
- [ ] Commission reports

---

### 5. HUMAN RESOURCES MODULE (HR)

#### 5.1 Employee Management
- [ ] Employee master data
- [ ] Employee profiles
- [ ] Employee documents
- [ ] Employee hierarchy
- [ ] Employee status (active, inactive, terminated)
- [ ] Employee import/export
- [ ] Employee search and filter

#### 5.2 Organization Structure
- [ ] Department management
- [ ] Job positions
- [ ] Reporting structure
- [ ] Organization chart
- [ ] Location/branch management
- [ ] Cost center assignment

#### 5.3 Attendance Management
- [ ] Attendance tracking
- [ ] Time clock (check-in/check-out)
- [ ] Leave management
- [ ] Leave types (sick, vacation, etc.)
- [ ] Leave balance tracking
- [ ] Leave approval workflow
- [ ] Attendance reports
- [ ] Overtime tracking

#### 5.4 Payroll Management
- [ ] Payroll structure setup
- [ ] Salary components
- [ ] Payroll calculation
- [ ] Payroll processing
- [ ] Payslip generation
- [ ] Payroll reports
- [ ] Tax deductions
- [ ] Benefits management
- [ ] Payroll approval workflow

#### 5.5 Recruitment
- [ ] Job posting
- [ ] Applicant tracking
- [ ] Resume management
- [ ] Interview scheduling
- [ ] Candidate evaluation
- [ ] Offer letter generation
- [ ] Onboarding process

#### 5.6 Performance Management
- [ ] Performance reviews
- [ ] Goal setting
- [ ] KPI tracking
- [ ] Performance ratings
- [ ] 360-degree feedback
- [ ] Performance reports

#### 5.7 Training & Development
- [ ] Training programs
- [ ] Course management
- [ ] Training attendance
- [ ] Certification tracking
- [ ] Training reports

---

### 6. MANUFACTURING MODULE

#### 6.1 Bill of Materials (BOM)
- [ ] BOM creation
- [ ] Multi-level BOM
- [ ] BOM versioning
- [ ] BOM templates
- [ ] BOM cost calculation
- [ ] BOM comparison

#### 6.2 Production Planning
- [ ] Production order creation
- [ ] Production scheduling
- [ ] Capacity planning
- [ ] Resource allocation
- [ ] Production routing
- [ ] Work center management

#### 6.3 Production Execution
- [ ] Production order tracking
- [ ] Material issue
- [ ] Material receipt
- [ ] Work in progress (WIP) tracking
- [ ] Quality inspection
- [ ] Production reporting

#### 6.4 Shop Floor Control
- [ ] Machine management
- [ ] Operator assignment
- [ ] Production time tracking
- [ ] Machine downtime tracking
- [ ] Efficiency monitoring

---

### 7. PURCHASING MODULE

#### 7.1 Vendor Management
- [ ] Vendor master data
- [ ] Vendor categories
- [ ] Vendor evaluation
- [ ] Vendor performance tracking
- [ ] Vendor contracts
- [ ] Vendor import/export

#### 7.2 Purchase Requisition
- [ ] Requisition creation
- [ ] Requisition approval workflow
- [ ] Requisition tracking
- [ ] Requisition reports

#### 7.3 Purchase Orders
- [ ] PO creation from requisition
- [ ] PO approval workflow
- [ ] PO tracking
- [ ] PO modification
- [ ] PO cancellation

#### 7.4 Goods Receipt
- [ ] GRN (Goods Receipt Note) creation
- [ ] Quality inspection
- [ ] GRN approval
- [ ] Stock update

#### 7.5 Purchase Returns
- [ ] Return authorization
- [ ] Return processing
- [ ] Credit note generation

---

### 8. CUSTOMER RELATIONSHIP MANAGEMENT (CRM)

#### 8.1 Lead Management
- [ ] Lead capture
- [ ] Lead qualification
- [ ] Lead assignment
- [ ] Lead conversion
- [ ] Lead tracking
- [ ] Lead reports

#### 8.2 Opportunity Management
- [ ] Opportunity creation
- [ ] Opportunity pipeline
- [ ] Opportunity stages
- [ ] Win probability
- [ ] Opportunity forecasting
- [ ] Opportunity reports

#### 8.3 Contact Management
- [ ] Contact database
- [ ] Contact history
- [ ] Contact segmentation
- [ ] Contact import/export

#### 8.4 Activity Management
- [ ] Task management
- [ ] Calendar integration
- [ ] Meeting scheduling
- [ ] Call logging
- [ ] Email integration
- [ ] Activity reports

---

### 9. REPORTING & ANALYTICS MODULE

#### 9.1 Financial Reports
- [ ] Balance Sheet
- [ ] Profit & Loss
- [ ] Cash Flow
- [ ] Trial Balance
- [ ] Financial Dashboard

#### 9.2 Sales Reports
- [ ] Sales Dashboard
- [ ] Sales by Customer
- [ ] Sales by Product
- [ ] Sales Trend
- [ ] Sales Forecast

#### 9.3 Inventory Reports
- [ ] Stock Levels
- [ ] Stock Movements
- [ ] Inventory Valuation
- [ ] ABC Analysis

#### 9.4 HR Reports
- [ ] Employee Reports
- [ ] Attendance Reports
- [ ] Payroll Reports
- [ ] Performance Reports

#### 9.5 Custom Reports
- [ ] Report Builder
- [ ] Custom queries
- [ ] Report scheduling
- [ ] Report distribution
- [ ] Report templates

#### 9.6 Analytics Dashboard
- [ ] Executive Dashboard
- [ ] KPI tracking
- [ ] Trend analysis
- [ ] Comparative analysis
- [ ] Real-time metrics

---

### 10. SYSTEM ADMINISTRATION

#### 10.1 System Configuration
- [ ] Company settings
- [ ] System parameters
- [ ] Module configuration
- [ ] Feature flags
- [ ] System preferences

#### 10.2 Data Management
- [ ] Data backup
- [ ] Data restore
- [ ] Data export
- [ ] Data import
- [ ] Data archiving
- [ ] Data purging

#### 10.3 Integration Management
- [ ] API management
- [ ] Webhook configuration
- [ ] Third-party integrations
- [ ] Integration logs
- [ ] Integration testing

#### 10.4 System Monitoring
- [ ] Performance monitoring
- [ ] Error tracking
- [ ] System logs
- [ ] Health checks
- [ ] Alert configuration

---

## 🗄️ Database Schema

### Core Tables

```prisma
// ============================================
// CORE SYSTEM TABLES
// ============================================

model Company {
  id                String   @id @default(uuid())
  name              String
  legalName         String?
  registrationNumber String?
  taxId            String?
  email             String
  phone             String?
  address           Json?    // {street, city, state, zip, country}
  logo              String?
  website           String?
  timezone          String   @default("UTC")
  currency          String   @default("USD")
  fiscalYearStart   DateTime
  subscriptionPlan  String   @default("FREE")
  subscriptionStatus String  @default("ACTIVE")
  settings          Json?    // Company-specific settings
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  users             User[]
  modules           CompanyModule[]
  financialAccounts FinancialAccount[]
  products          Product[]
  customers         Customer[]
  vendors           Vendor[]
  employees         Employee[]
  projects          Project[]
}

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password      String
  firstName     String
  lastName      String
  phone         String?
  avatar        String?
  timezone      String   @default("UTC")
  language      String   @default("en")
  isActive      Boolean  @default(true)
  lastLogin     DateTime?
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  roleId        String
  role          Role     @relation(fields: [roleId], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  permissions   UserPermission[]
  sessions      Session[]
  auditLogs     AuditLog[]
  notifications Notification[]
  tasks         Task[]
  createdBy     String?
  updatedBy     String?
}

model Role {
  id          String   @id @default(uuid())
  name        String
  description String?
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  isSystem    Boolean  @default(false)
  permissions RolePermission[]
  users       User[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Permission {
  id          String   @id @default(uuid())
  name        String   @unique
  module      String
  action      String
  description String?
  rolePermissions RolePermission[]
  userPermissions UserPermission[]
  createdAt   DateTime @default(now())
}

model RolePermission {
  id           String   @id @default(uuid())
  roleId       String
  role         Role     @relation(fields: [roleId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])
  createdAt    DateTime @default(now())
  
  @@unique([roleId, permissionId])
}

model UserPermission {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])
  createdAt    DateTime @default(now())
  
  @@unique([userId, permissionId])
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  token     String   @unique
  ipAddress String?
  userAgent String?
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(uuid())
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  companyId   String
  action      String   // CREATE, UPDATE, DELETE, VIEW, etc.
  entityType  String   // User, Product, Invoice, etc.
  entityId    String?
  changes      Json?    // Before/after values
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())
  
  @@index([companyId, createdAt])
  @@index([userId, createdAt])
  @@index([entityType, entityId])
}

model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String
  title     String
  message   String   @db.Text
  data      Json?
  read      Boolean  @default(false)
  readAt    DateTime?
  createdAt DateTime @default(now())
  
  @@index([userId, read, createdAt])
}

model CompanyModule {
  id        String   @id @default(uuid())
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  module    String    // FINANCE, INVENTORY, SALES, HR, etc.
  isActive  Boolean  @default(true)
  config     Json?
  activatedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([companyId, module])
}

// ============================================
// FINANCIAL MODULE TABLES
// ============================================

model FinancialAccount {
  id            String   @id @default(uuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  code          String
  name          String
  type          AccountType
  parentId      String?
  parent        FinancialAccount? @relation("AccountHierarchy", fields: [parentId], references: [id])
  children      FinancialAccount[] @relation("AccountHierarchy")
  isActive      Boolean  @default(true)
  balance       Decimal  @default(0) @db.Decimal(15, 2)
  currency      String   @default("USD")
  description   String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  journalEntries JournalEntryLine[]
  
  @@unique([companyId, code])
  @@index([companyId, type])
}

enum AccountType {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

model JournalEntry {
  id          String   @id @default(uuid())
  companyId   String
  entryNumber String
  date        DateTime
  description String?  @db.Text
  reference   String?
  status      JournalEntryStatus @default(DRAFT)
  approvedBy  String?
  approvedAt  DateTime?
  postedBy    String?
  postedAt    DateTime?
  lines       JournalEntryLine[]
  attachments String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  updatedBy   String?
  
  @@unique([companyId, entryNumber])
  @@index([companyId, date])
  @@index([companyId, status])
}

enum JournalEntryStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  POSTED
  REVERSED
  CANCELLED
}

model JournalEntryLine {
  id              String   @id @default(uuid())
  journalEntryId  String
  journalEntry    JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  accountId        String
  account          FinancialAccount @relation(fields: [accountId], references: [id])
  debit            Decimal  @default(0) @db.Decimal(15, 2)
  credit           Decimal  @default(0) @db.Decimal(15, 2)
  description      String?  @db.Text
  reference        String?
  createdAt        DateTime @default(now())
}

model Invoice {
  id            String   @id @default(uuid())
  companyId     String
  invoiceNumber String
  type          InvoiceType
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  vendorId      String?
  vendor        Vendor?  @relation(fields: [vendorId], references: [id])
  date          DateTime
  dueDate       DateTime
  status        InvoiceStatus @default(DRAFT)
  subtotal      Decimal  @default(0) @db.Decimal(15, 2)
  tax           Decimal  @default(0) @db.Decimal(15, 2)
  discount      Decimal  @default(0) @db.Decimal(15, 2)
  total         Decimal  @default(0) @db.Decimal(15, 2)
  currency      String   @default("USD")
  paymentTerms  String?
  items         InvoiceItem[]
  payments      Payment[]
  notes         String?  @db.Text
  attachments   String[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  updatedBy     String?
  
  @@unique([companyId, invoiceNumber])
  @@index([companyId, type, status])
  @@index([customerId])
  @@index([vendorId])
}

enum InvoiceType {
  SALES
  PURCHASE
}

enum InvoiceStatus {
  DRAFT
  PENDING
  SENT
  PARTIALLY_PAID
  PAID
  OVERDUE
  CANCELLED
  REFUNDED
}

model InvoiceItem {
  id          String   @id @default(uuid())
  invoiceId   String
  invoice     Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Decimal  @db.Decimal(15, 2)
  discount    Decimal  @default(0) @db.Decimal(15, 2)
  tax         Decimal  @default(0) @db.Decimal(15, 2)
  total       Decimal  @db.Decimal(15, 2)
  createdAt   DateTime @default(now())
}

model Payment {
  id            String   @id @default(uuid())
  companyId     String
  paymentNumber String
  type          PaymentType
  invoiceId     String?
  invoice       Invoice? @relation(fields: [invoiceId], references: [id])
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  vendorId      String?
  vendor        Vendor?  @relation(fields: [vendorId], references: [id])
  amount        Decimal  @db.Decimal(15, 2)
  currency      String   @default("USD")
  paymentMethod String
  paymentDate   DateTime
  reference     String?
  notes         String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  
  @@unique([companyId, paymentNumber])
  @@index([companyId, type, paymentDate])
}

enum PaymentType {
  RECEIPT
  PAYMENT
}

model Budget {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  fiscalYear  Int
  period      String   // MONTHLY, QUARTERLY, YEARLY
  status      BudgetStatus @default(DRAFT)
  items       BudgetItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  approvedBy  String?
  approvedAt  DateTime?
  
  @@index([companyId, fiscalYear])
}

enum BudgetStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  ACTIVE
  CLOSED
}

model BudgetItem {
  id          String   @id @default(uuid())
  budgetId    String
  budget      Budget   @relation(fields: [budgetId], references: [id], onDelete: Cascade)
  accountId   String
  account     FinancialAccount @relation(fields: [accountId], references: [id])
  period      String   // Month or quarter
  amount      Decimal  @db.Decimal(15, 2)
  actual      Decimal  @default(0) @db.Decimal(15, 2)
  variance    Decimal  @default(0) @db.Decimal(15, 2)
  createdAt   DateTime @default(now())
  
  @@unique([budgetId, accountId, period])
}

// ============================================
// INVENTORY MODULE TABLES
// ============================================

model Product {
  id            String   @id @default(uuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  sku           String
  name          String
  description   String?  @db.Text
  categoryId    String?
  category      ProductCategory? @relation(fields: [categoryId], references: [id])
  type          ProductType @default(STOCK)
  unit          String   @default("PCS")
  cost          Decimal  @default(0) @db.Decimal(15, 2)
  price         Decimal  @default(0) @db.Decimal(15, 2)
  images        String[]
  barcode       String?
  isActive      Boolean  @default(true)
  trackInventory Boolean @default(true)
  reorderPoint  Decimal? @db.Decimal(10, 2)
  reorderQuantity Decimal? @db.Decimal(10, 2)
  attributes    Json?    // {color, size, etc.}
  variants      ProductVariant[]
  stockMovements StockMovement[]
  invoiceItems  InvoiceItem[]
  orderItems    OrderItem[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  updatedBy     String?
  
  @@unique([companyId, sku])
  @@index([companyId, categoryId])
  @@index([companyId, isActive])
}

enum ProductType {
  STOCK
  SERVICE
  BUNDLE
}

model ProductCategory {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  description String?  @db.Text
  parentId    String?
  parent      ProductCategory? @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    ProductCategory[] @relation("CategoryHierarchy")
  products    Product[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, name])
}

model ProductVariant {
  id          String   @id @default(uuid())
  productId   String
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku         String
  name        String
  attributes  Json     // {color: "Red", size: "L"}
  price       Decimal? @db.Decimal(15, 2)
  cost        Decimal? @db.Decimal(15, 2)
  stock       Decimal  @default(0) @db.Decimal(10, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([productId, sku])
}

model Warehouse {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  code        String
  address     Json?
  isActive    Boolean  @default(true)
  stockItems  StockItem[]
  movements   StockMovement[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, code])
}

model StockItem {
  id          String   @id @default(uuid())
  companyId   String
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  warehouseId String
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])
  quantity    Decimal  @default(0) @db.Decimal(10, 2)
  reserved    Decimal  @default(0) @db.Decimal(10, 2)
  available   Decimal  @default(0) @db.Decimal(10, 2)
  cost        Decimal  @default(0) @db.Decimal(15, 2)
  valuation   Decimal  @default(0) @db.Decimal(15, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, productId, warehouseId])
  @@index([companyId, warehouseId])
}

model StockMovement {
  id            String   @id @default(uuid())
  companyId     String
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  warehouseId   String
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id])
  type          StockMovementType
  quantity      Decimal  @db.Decimal(10, 2)
  cost          Decimal  @db.Decimal(15, 2)
  reference     String?  // PO, SO, Adjustment, etc.
  referenceId   String?
  notes         String?  @db.Text
  createdAt     DateTime @default(now())
  createdBy     String
  
  @@index([companyId, productId, createdAt])
  @@index([companyId, type, createdAt])
}

enum StockMovementType {
  IN
  OUT
  TRANSFER
  ADJUSTMENT
  RETURN
}

// ============================================
// SALES MODULE TABLES
// ============================================

model Customer {
  id            String   @id @default(uuid())
  companyId     String
  code          String
  name          String
  email         String?
  phone         String?
  address       Json?
  creditLimit   Decimal? @db.Decimal(15, 2)
  paymentTerms  String?
  taxId         String?
  isActive      Boolean  @default(true)
  invoices      Invoice[]
  payments      Payment[]
  orders        Order[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  updatedBy     String?
  
  @@unique([companyId, code])
  @@index([companyId, isActive])
}

model Order {
  id            String   @id @default(uuid())
  companyId     String
  orderNumber   String
  type          OrderType
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id])
  vendorId      String?
  vendor        Vendor?  @relation(fields: [vendorId], references: [id])
  date          DateTime
  status        OrderStatus @default(DRAFT)
  subtotal      Decimal  @default(0) @db.Decimal(15, 2)
  tax           Decimal  @default(0) @db.Decimal(15, 2)
  discount      Decimal  @default(0) @db.Decimal(15, 2)
  total         Decimal  @default(0) @db.Decimal(15, 2)
  currency      String   @default("USD")
  items         OrderItem[]
  notes         String?  @db.Text
  attachments   String[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  updatedBy     String?
  
  @@unique([companyId, orderNumber])
  @@index([companyId, type, status])
  @@index([customerId])
  @@index([vendorId])
}

enum OrderType {
  SALES
  PURCHASE
}

enum OrderStatus {
  DRAFT
  PENDING
  CONFIRMED
  IN_PROGRESS
  SHIPPED
  DELIVERED
  COMPLETED
  CANCELLED
}

model OrderItem {
  id          String   @id @default(uuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String?
  product     Product? @relation(fields: [productId], references: [id])
  description String
  quantity    Decimal  @db.Decimal(10, 2)
  unitPrice   Decimal  @db.Decimal(15, 2)
  discount    Decimal  @default(0) @db.Decimal(15, 2)
  tax         Decimal  @default(0) @db.Decimal(15, 2)
  total       Decimal  @db.Decimal(15, 2)
  createdAt   DateTime @default(now())
}

model Vendor {
  id            String   @id @default(uuid())
  companyId     String
  code          String
  name          String
  email         String?
  phone         String?
  address       Json?
  paymentTerms  String?
  taxId         String?
  isActive      Boolean  @default(true)
  invoices      Invoice[]
  payments      Payment[]
  orders        Order[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  updatedBy     String?
  
  @@unique([companyId, code])
  @@index([companyId, isActive])
}

// ============================================
// HR MODULE TABLES
// ============================================

model Employee {
  id            String   @id @default(uuid())
  companyId     String
  company       Company  @relation(fields: [companyId], references: [id])
  employeeNumber String
  firstName     String
  lastName      String
  email         String
  phone         String?
  dateOfBirth   DateTime?
  hireDate      DateTime
  departmentId  String?
  department    Department? @relation(fields: [departmentId], references: [id])
  positionId    String?
  position      Position? @relation(fields: [positionId], references: [id])
  managerId     String?
  manager       Employee? @relation("EmployeeHierarchy", fields: [managerId], references: [id])
  subordinates  Employee[] @relation("EmployeeHierarchy")
  status        EmployeeStatus @default(ACTIVE)
  salary        Decimal? @db.Decimal(15, 2)
  address       Json?
  documents     String[]
  attendance    Attendance[]
  leaves        Leave[]
  payroll       Payroll[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  createdBy     String
  updatedBy     String?
  
  @@unique([companyId, employeeNumber])
  @@index([companyId, departmentId])
  @@index([companyId, status])
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
  TERMINATED
  ON_LEAVE
}

model Department {
  id          String   @id @default(uuid())
  companyId   String
  name        String
  code        String
  description String?  @db.Text
  managerId   String?
  isActive    Boolean  @default(true)
  employees   Employee[]
  positions   Position[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, code])
}

model Position {
  id          String   @id @default(uuid())
  companyId   String
  departmentId String
  department  Department @relation(fields: [departmentId], references: [id])
  title       String
  code        String
  description String?  @db.Text
  employees   Employee[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, code])
}

model Attendance {
  id          String   @id @default(uuid())
  companyId   String
  employeeId String
  employee    Employee @relation(fields: [employeeId], references: [id])
  date        DateTime
  checkIn     DateTime?
  checkOut    DateTime?
  hours       Decimal? @db.Decimal(5, 2)
  status      AttendanceStatus @default(PRESENT)
  notes       String?  @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([companyId, employeeId, date])
  @@index([companyId, date])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  ON_LEAVE
}

model Leave {
  id          String   @id @default(uuid())
  companyId   String
  employeeId String
  employee    Employee @relation(fields: [employeeId], references: [id])
  type        LeaveType
  startDate   DateTime
  endDate     DateTime
  days        Decimal  @db.Decimal(5, 2)
  status      LeaveStatus @default(PENDING)
  reason      String?  @db.Text
  approvedBy  String?
  approvedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  
  @@index([companyId, employeeId, status])
  @@index([companyId, status])
}

enum LeaveType {
  SICK
  VACATION
  PERSONAL
  MATERNITY
  PATERNITY
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

model Payroll {
  id          String   @id @default(uuid())
  companyId   String
  employeeId String
  employee    Employee @relation(fields: [employeeId], references: [id])
  payPeriod   String   // "2024-01" for January 2024
  grossSalary Decimal  @db.Decimal(15, 2)
  deductions  Decimal  @default(0) @db.Decimal(15, 2)
  netSalary   Decimal  @db.Decimal(15, 2)
  status      PayrollStatus @default(DRAFT)
  paidDate    DateTime?
  payslipUrl  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  processedBy String
  
  @@unique([companyId, employeeId, payPeriod])
  @@index([companyId, payPeriod, status])
}

enum PayrollStatus {
  DRAFT
  PROCESSED
  APPROVED
  PAID
}

// ============================================
// ADDITIONAL TABLES
// ============================================

model Task {
  id          String   @id @default(uuid())
  companyId   String
  title       String
  description String?  @db.Text
  assigneeId  String?
  assignee    User?    @relation(fields: [assigneeId], references: [id])
  status      TaskStatus @default(TODO)
  priority    Priority @default(MEDIUM)
  dueDate     DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  updatedBy   String?
  
  @@index([companyId, assigneeId, status])
  @@index([companyId, status])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model Project {
  id          String   @id @default(uuid())
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  name        String
  description String?  @db.Text
  startDate   DateTime
  endDate     DateTime?
  status      ProjectStatus @default(PLANNING)
  budget      Decimal? @db.Decimal(15, 2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String
  updatedBy   String?
  
  @@index([companyId, status])
}

enum ProjectStatus {
  PLANNING
  ACTIVE
  ON_HOLD
  COMPLETED
  CANCELLED
}
```

---

## 🔌 API Endpoints

### Authentication Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/verify-email
POST   /api/auth/mfa/enable
POST   /api/auth/mfa/verify
GET    /api/auth/me
PUT    /api/auth/profile
```

### Company Management

```
GET    /api/companies
POST   /api/companies
GET    /api/companies/:id
PUT    /api/companies/:id
DELETE /api/companies/:id
GET    /api/companies/:id/settings
PUT    /api/companies/:id/settings
GET    /api/companies/:id/modules
PUT    /api/companies/:id/modules
```

### User Management

```
GET    /api/users
POST   /api/users
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
PUT    /api/users/:id/activate
PUT    /api/users/:id/deactivate
GET    /api/users/:id/permissions
PUT    /api/users/:id/permissions
```

### Role & Permission Management

```
GET    /api/roles
POST   /api/roles
GET    /api/roles/:id
PUT    /api/roles/:id
DELETE /api/roles/:id
GET    /api/permissions
GET    /api/roles/:id/permissions
PUT    /api/roles/:id/permissions
```

### Financial Module Endpoints

```
# Chart of Accounts
GET    /api/finance/accounts
POST   /api/finance/accounts
GET    /api/finance/accounts/:id
PUT    /api/finance/accounts/:id
DELETE /api/finance/accounts/:id
GET    /api/finance/accounts/tree

# Journal Entries
GET    /api/finance/journal-entries
POST   /api/finance/journal-entries
GET    /api/finance/journal-entries/:id
PUT    /api/finance/journal-entries/:id
DELETE /api/finance/journal-entries/:id
POST   /api/finance/journal-entries/:id/approve
POST   /api/finance/journal-entries/:id/post
POST   /api/finance/journal-entries/:id/reverse

# Invoices
GET    /api/finance/invoices
POST   /api/finance/invoices
GET    /api/finance/invoices/:id
PUT    /api/finance/invoices/:id
DELETE /api/finance/invoices/:id
POST   /api/finance/invoices/:id/send
POST   /api/finance/invoices/:id/pay
GET    /api/finance/invoices/:id/pdf

# Payments
GET    /api/finance/payments
POST   /api/finance/payments
GET    /api/finance/payments/:id
PUT    /api/finance/payments/:id
DELETE /api/finance/payments/:id

# Budgets
GET    /api/finance/budgets
POST   /api/finance/budgets
GET    /api/finance/budgets/:id
PUT    /api/finance/budgets/:id
DELETE /api/finance/budgets/:id
POST   /api/finance/budgets/:id/approve

# Financial Reports
GET    /api/finance/reports/balance-sheet
GET    /api/finance/reports/profit-loss
GET    /api/finance/reports/cash-flow
GET    /api/finance/reports/trial-balance
GET    /api/finance/reports/general-ledger
GET    /api/finance/reports/account-statement
```

### Inventory Module Endpoints

```
# Products
GET    /api/inventory/products
POST   /api/inventory/products
GET    /api/inventory/products/:id
PUT    /api/inventory/products/:id
DELETE /api/inventory/products/:id
GET    /api/inventory/products/:id/stock
POST   /api/inventory/products/import
GET    /api/inventory/products/export

# Categories
GET    /api/inventory/categories
POST   /api/inventory/categories
GET    /api/inventory/categories/:id
PUT    /api/inventory/categories/:id
DELETE /api/inventory/categories/:id

# Warehouses
GET    /api/inventory/warehouses
POST   /api/inventory/warehouses
GET    /api/inventory/warehouses/:id
PUT    /api/inventory/warehouses/:id
DELETE /api/inventory/warehouses/:id

# Stock Management
GET    /api/inventory/stock
GET    /api/inventory/stock/:productId
POST   /api/inventory/stock/adjust
POST   /api/inventory/stock/transfer
GET    /api/inventory/stock/movements
GET    /api/inventory/stock/reports

# Purchase Orders
GET    /api/inventory/purchase-orders
POST   /api/inventory/purchase-orders
GET    /api/inventory/purchase-orders/:id
PUT    /api/inventory/purchase-orders/:id
DELETE /api/inventory/purchase-orders/:id
POST   /api/inventory/purchase-orders/:id/approve
POST   /api/inventory/purchase-orders/:id/receive
```

### Sales Module Endpoints

```
# Customers
GET    /api/sales/customers
POST   /api/sales/customers
GET    /api/sales/customers/:id
PUT    /api/sales/customers/:id
DELETE /api/sales/customers/:id

# Sales Orders
GET    /api/sales/orders
POST   /api/sales/orders
GET    /api/sales/orders/:id
PUT    /api/sales/orders/:id
DELETE /api/sales/orders/:id
POST   /api/sales/orders/:id/confirm
POST   /api/sales/orders/:id/ship
POST   /api/sales/orders/:id/deliver

# Sales Invoices
GET    /api/sales/invoices
POST   /api/sales/invoices
GET    /api/sales/invoices/:id
PUT    /api/sales/invoices/:id
POST   /api/sales/invoices/:id/send
GET    /api/sales/invoices/:id/pdf

# Sales Reports
GET    /api/sales/reports/dashboard
GET    /api/sales/reports/by-customer
GET    /api/sales/reports/by-product
GET    /api/sales/reports/trends
```

### HR Module Endpoints

```
# Employees
GET    /api/hr/employees
POST   /api/hr/employees
GET    /api/hr/employees/:id
PUT    /api/hr/employees/:id
DELETE /api/hr/employees/:id

# Departments
GET    /api/hr/departments
POST   /api/hr/departments
GET    /api/hr/departments/:id
PUT    /api/hr/departments/:id
DELETE /api/hr/departments/:id

# Attendance
GET    /api/hr/attendance
POST   /api/hr/attendance/check-in
POST   /api/hr/attendance/check-out
GET    /api/hr/attendance/reports

# Leaves
GET    /api/hr/leaves
POST   /api/hr/leaves
GET    /api/hr/leaves/:id
PUT    /api/hr/leaves/:id
DELETE /api/hr/leaves/:id
POST   /api/hr/leaves/:id/approve
POST   /api/hr/leaves/:id/reject

# Payroll
GET    /api/hr/payroll
POST   /api/hr/payroll/process
GET    /api/hr/payroll/:id
GET    /api/hr/payroll/:id/payslip
```

### Reporting Endpoints

```
GET    /api/reports/financial/balance-sheet
GET    /api/reports/financial/profit-loss
GET    /api/reports/financial/cash-flow
GET    /api/reports/sales/dashboard
GET    /api/reports/sales/by-customer
GET    /api/reports/sales/by-product
GET    /api/reports/inventory/stock-levels
GET    /api/reports/inventory/valuation
GET    /api/reports/hr/attendance
GET    /api/reports/hr/payroll
GET    /api/reports/custom
POST   /api/reports/custom
```

### System Administration

```
GET    /api/admin/audit-logs
GET    /api/admin/system-health
GET    /api/admin/statistics
POST   /api/admin/backup
POST   /api/admin/restore
GET    /api/admin/integrations
POST   /api/admin/integrations
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript 5.9+
- **UI Library**: React 19+
- **Styling**: Tailwind CSS 3.4+
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: Zustand 4.5+, TanStack React Query 5.0+
- **Forms**: React Hook Form 7.54+, Zod 3.24+
- **Tables**: TanStack Table 8.0+
- **Charts**: Recharts 2.12+, Chart.js 4.4+
- **Date Handling**: date-fns 3.0+
- **File Upload**: react-dropzone
- **PDF Generation**: jsPDF, react-pdf
- **Excel Export**: xlsx
- **Real-time**: Socket.io Client 4.8+

### Backend
- **Runtime**: Node.js 20+ (LTS)
- **Framework**: Express.js 4.21+
- **Language**: TypeScript 5.9+
- **ORM**: Prisma 6.1+
- **Database**: PostgreSQL 16+ (NeonDB)
- **Cache**: Redis 7.0+
- **Queue**: BullMQ 5.0+
- **Authentication**: JWT (jsonwebtoken 9.0+), bcryptjs 2.4+
- **Validation**: Zod 3.24+
- **File Storage**: AWS S3 or Cloudinary
- **Email**: Nodemailer 7.0+ or Resend
- **PDF Generation**: PDFKit or Puppeteer
- **Excel Processing**: xlsx
- **Real-time**: Socket.io 4.8+
- **Logging**: Winston 3.11+
- **Security**: Helmet 7.1+, CORS 2.8+, express-rate-limit 7.1+

### DevOps & Infrastructure
- **Database**: NeonDB (PostgreSQL)
- **Backend Hosting**: Railway
- **Frontend Hosting**: Netlify
- **Cache/Queue**: Railway Redis or Upstash
- **File Storage**: AWS S3 or Cloudinary
- **CDN**: Cloudflare or Netlify CDN
- **Monitoring**: Sentry (optional)
- **CI/CD**: GitHub Actions

---

## 📐 Module Specifications

### Module 1: Financial Management (FI)

#### Features
- Chart of Accounts with hierarchical structure
- Double-entry bookkeeping
- Journal entries with approval workflow
- Accounts Payable (AP) management
- Accounts Receivable (AR) management
- Financial reporting (Balance Sheet, P&L, Cash Flow)
- Budgeting and forecasting
- Banking and reconciliation
- Tax management

#### Business Rules
- All journal entries must balance (debit = credit)
- Journal entries require approval before posting
- Posted entries cannot be modified (only reversed)
- Financial reports are generated from posted entries only
- Budgets must be approved before activation

#### Integration Points
- Integrates with Inventory (COGS calculation)
- Integrates with Sales (AR invoices)
- Integrates with Purchasing (AP invoices)
- Integrates with HR (Payroll expenses)

### Module 2: Inventory Management

#### Features
- Product catalog with variants
- Multi-warehouse support
- Stock level tracking
- Stock movements (in/out/transfer)
- Inventory valuation (FIFO, LIFO, Average)
- Purchase order management
- Stock alerts and reorder points
- Inventory reports

#### Business Rules
- Stock cannot go negative (configurable)
- Stock movements must have reference (PO, SO, Adjustment)
- Inventory valuation method is set per company
- Reorder points trigger purchase requisitions

#### Integration Points
- Integrates with Sales (stock allocation)
- Integrates with Purchasing (goods receipt)
- Integrates with Finance (inventory valuation)

### Module 3: Sales & Distribution (SD)

#### Features
- Customer management
- Sales quotation
- Sales order management
- Delivery management
- Sales invoicing
- Payment receipt
- Pricing management
- Sales reporting

#### Business Rules
- Sales orders check stock availability
- Invoices are created from deliveries
- Payments are applied to invoices
- Credit limits are enforced

#### Integration Points
- Integrates with Inventory (stock allocation)
- Integrates with Finance (AR invoices)
- Integrates with CRM (customer data)

### Module 4: Human Resources (HR)

#### Features
- Employee management
- Organization structure
- Attendance tracking
- Leave management
- Payroll processing
- Performance management
- Recruitment
- Training & development

#### Business Rules
- Employees must belong to a department
- Leave requests require approval
- Payroll is processed monthly
- Attendance is tracked daily

#### Integration Points
- Integrates with Finance (payroll expenses)
- Integrates with Projects (resource allocation)

---

## 🔒 Security Architecture

### Authentication
- JWT-based authentication
- Refresh token rotation
- Multi-factor authentication (MFA)
- Session management
- Password policies

### Authorization
- Role-based access control (RBAC)
- Permission-based authorization
- Row-level security (multi-tenancy)
- API key management

### Data Security
- Encryption at rest (database)
- Encryption in transit (HTTPS/TLS)
- Password hashing (bcrypt)
- Sensitive data masking
- Audit logging

### API Security
- Rate limiting
- Input validation
- SQL injection prevention (Prisma)
- XSS protection
- CSRF protection
- API authentication

### Compliance
- GDPR compliance
- Data retention policies
- Data export capabilities
- Audit trails
- Access logs

---

## 🚀 Deployment Plan

### Phase 1: Infrastructure Setup

1. **Database Setup (NeonDB)**
   - Create PostgreSQL database
   - Run Prisma migrations
   - Set up connection pooling
   - Configure backups

2. **Backend Setup (Railway)**
   - Deploy Express.js API
   - Configure environment variables
   - Set up Redis for caching
   - Configure BullMQ for jobs

3. **Frontend Setup (Netlify)**
   - Deploy Next.js application
   - Configure environment variables
   - Set up build pipeline
   - Configure CDN

4. **File Storage**
   - Set up AWS S3 or Cloudinary
   - Configure bucket policies
   - Set up CDN

### Phase 2: Core System Deployment

1. **Authentication System**
   - Deploy auth endpoints
   - Configure JWT
   - Set up MFA
   - Test login/logout

2. **Multi-tenancy**
   - Deploy company management
   - Test tenant isolation
   - Configure row-level security

3. **User Management**
   - Deploy user CRUD
   - Deploy role management
   - Test permissions

### Phase 3: Module Deployment

1. **Financial Module**
   - Deploy chart of accounts
   - Deploy journal entries
   - Deploy invoicing
   - Deploy reporting

2. **Inventory Module**
   - Deploy product management
   - Deploy stock tracking
   - Deploy purchase orders

3. **Sales Module**
   - Deploy customer management
   - Deploy sales orders
   - Deploy invoicing

4. **HR Module**
   - Deploy employee management
   - Deploy attendance
   - Deploy payroll

### Phase 4: Advanced Features

1. **Reporting**
   - Deploy financial reports
   - Deploy sales reports
   - Deploy custom reports

2. **Real-time Features**
   - Deploy WebSocket server
   - Deploy live updates
   - Deploy notifications

3. **Integration**
   - Deploy API endpoints
   - Deploy webhooks
   - Deploy third-party integrations

---

## 📅 Development Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] Project setup and configuration
- [ ] Database schema design
- [ ] Authentication system
- [ ] Multi-tenancy implementation
- [ ] User management
- [ ] Role and permission system
- [ ] Basic UI framework

### Phase 2: Core Modules (Weeks 5-12)
- [ ] Financial module (Chart of Accounts, Journal Entries)
- [ ] Inventory module (Products, Stock)
- [ ] Sales module (Customers, Orders)
- [ ] HR module (Employees, Attendance)

### Phase 3: Advanced Features (Weeks 13-16)
- [ ] Invoicing and payments
- [ ] Purchase orders
- [ ] Reporting system
- [ ] Dashboard and analytics

### Phase 4: Integration & Polish (Weeks 17-20)
- [ ] Module integration
- [ ] Real-time features
- [ ] Performance optimization
- [ ] Testing and bug fixes
- [ ] Documentation

---

## 🧪 Testing Strategy

### Unit Tests
- Business logic functions
- Utility functions
- Data validation
- Calculations

### Integration Tests
- API endpoints
- Database operations
- Module interactions
- Third-party integrations

### E2E Tests
- User workflows
- Critical business processes
- Multi-tenant scenarios
- Performance testing

### Test Coverage Goals
- Unit tests: 80%+
- Integration tests: 70%+
- E2E tests: Critical paths 100%

---

## ⚡ Performance Optimization

### Database
- Index optimization
- Query optimization
- Connection pooling
- Read replicas (if needed)

### Caching
- Redis for frequently accessed data
- API response caching
- Query result caching
- Session caching

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- CDN for static assets

### API
- Request batching
- Pagination
- Field selection
- Response compression

---

## 📊 Success Metrics

### Performance
- API response time < 200ms (p95)
- Page load time < 2s
- Database query time < 100ms (p95)
- Real-time update latency < 100ms

### Reliability
- Uptime > 99.9%
- Error rate < 0.1%
- Data consistency 100%

### User Experience
- Task completion rate > 95%
- User satisfaction > 4.5/5
- Support tickets < 5% of users/month

---

## 🎯 Implementation Guidelines

### Code Structure
```
backend/
├── src/
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/         # Data models
│   ├── routes/          # API routes
│   ├── middleware/      # Middleware functions
│   ├── utils/           # Utility functions
│   ├── validators/      # Input validation
│   └── types/           # TypeScript types

frontend/
├── app/                 # Next.js app router
│   ├── (auth)/          # Auth pages
│   ├── (dashboard)/    # Dashboard pages
│   └── api/             # API routes
├── components/          # React components
├── lib/                 # Utilities and helpers
└── hooks/              # Custom React hooks
```

### Naming Conventions
- **Files**: kebab-case (user-controller.ts)
- **Classes**: PascalCase (UserController)
- **Functions**: camelCase (getUserById)
- **Constants**: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)
- **Database**: snake_case (user_id, created_at)

### API Design Principles
- RESTful conventions
- Consistent error handling
- Versioning (v1, v2)
- Pagination for lists
- Filtering and sorting
- Field selection

### Database Design Principles
- Normalization (3NF)
- Indexes on foreign keys
- Soft deletes where appropriate
- Audit fields (created_at, updated_at, created_by, updated_by)
- Row-level security for multi-tenancy

---

## 📝 Additional Notes

### Scalability Considerations
- Horizontal scaling for API servers
- Database read replicas
- Caching strategy
- Queue system for background jobs
- CDN for static assets

### Maintenance
- Regular database backups
- Log rotation
- Monitoring and alerting
- Performance monitoring
- Security updates

### Future Enhancements
- Mobile applications
- Advanced analytics (ML/AI)
- Workflow automation
- Third-party marketplace
- API marketplace
- White-label solution

---

**This document serves as a complete blueprint for building a comprehensive ERP system. Follow this plan systematically to create a production-ready enterprise resource planning solution.**
