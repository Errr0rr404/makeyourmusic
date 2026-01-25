import { Request, Response } from 'express';

/**
 * API Documentation endpoint
 * GET /api/docs
 *
 * Returns comprehensive API documentation
 */
export const getApiDocs = (_req: Request, res: Response) => {
  const docs = {
    version: '1.0.0',
    title: 'AI Cloud ERP API Documentation',
    description: 'Complete API documentation for the AI Cloud ERP platform',
    baseUrl: process.env.BACKEND_URL || 'http://localhost:3001',

    endpoints: {
      authentication: {
        register: {
          method: 'POST',
          path: '/api/auth/register',
          description: 'Register a new user account',
          body: {
            email: 'string (required)',
            password: 'string (required, min 8 chars)',
            name: 'string (optional)'
          },
          response: {
            user: 'User object',
            accessToken: 'JWT token'
          }
        },
        login: {
          method: 'POST',
          path: '/api/auth/login',
          description: 'Login to existing account',
          body: {
            email: 'string (required)',
            password: 'string (required)'
          },
          response: {
            user: 'User object',
            accessToken: 'JWT token'
          }
        },
        getMe: {
          method: 'GET',
          path: '/api/auth/me',
          description: 'Get current user profile',
          auth: 'Bearer token required',
          response: 'User object'
        }
      },

      products: {
        list: {
          method: 'GET',
          path: '/api/products',
          description: 'List all products with pagination',
          queryParams: {
            page: 'number (default: 1)',
            limit: 'number (default: 20)',
            search: 'string (optional)',
            category: 'string (optional)',
            featured: 'boolean (optional)',
            minPrice: 'number (optional)',
            maxPrice: 'number (optional)',
            sortBy: 'string (optional: price, name, createdAt)',
            sortOrder: 'string (optional: asc, desc)'
          },
          response: {
            products: 'Product[]',
            pagination: 'Pagination object'
          }
        },
        get: {
          method: 'GET',
          path: '/api/products/:slug',
          description: 'Get single product by slug',
          response: 'Product object'
        },
        create: {
          method: 'POST',
          path: '/api/products',
          description: 'Create new product (Admin only)',
          auth: 'Admin role required',
          body: {
            name: 'string (required)',
            slug: 'string (required)',
            price: 'number (required)',
            description: 'string (optional)',
            stock: 'number (required)',
            categoryId: 'string (optional)',
            imageUrls: 'string[] (optional)'
          }
        }
      },

      cart: {
        get: {
          method: 'GET',
          path: '/api/cart',
          description: 'Get current user cart',
          auth: 'Bearer token required',
          response: {
            items: 'CartItem[]',
            subtotal: 'number'
          }
        },
        add: {
          method: 'POST',
          path: '/api/cart',
          description: 'Add item to cart',
          auth: 'Bearer token required',
          body: {
            productId: 'string (required)',
            quantity: 'number (required)',
            variantId: 'string (optional)'
          }
        },
        update: {
          method: 'PUT',
          path: '/api/cart/:itemId',
          description: 'Update cart item quantity',
          auth: 'Bearer token required',
          body: {
            quantity: 'number (required)'
          }
        },
        remove: {
          method: 'DELETE',
          path: '/api/cart/:itemId',
          description: 'Remove item from cart',
          auth: 'Bearer token required'
        }
      },

      orders: {
        create: {
          method: 'POST',
          path: '/api/orders',
          description: 'Create new order',
          auth: 'Bearer token required',
          body: {
            items: 'OrderItem[] (required)',
            shippingAddress: 'Address object (required)',
            billingAddress: 'Address object (required)',
            paymentMethod: 'string (required)',
            deliveryMethod: 'DELIVERY | PICKUP'
          }
        },
        list: {
          method: 'GET',
          path: '/api/orders',
          description: 'List user orders',
          auth: 'Bearer token required',
          queryParams: {
            page: 'number',
            limit: 'number',
            status: 'string'
          }
        },
        get: {
          method: 'GET',
          path: '/api/orders/:id',
          description: 'Get order details',
          auth: 'Bearer token required'
        }
      },

      erp: {
        accounting: {
          method: 'GET',
          path: '/api/erp/accounting/*',
          description: 'Accounting module endpoints',
          auth: 'CFO, ANALYST, ADMIN, or MASTERMIND role required'
        },
        crm: {
          method: 'GET',
          path: '/api/erp/crm/*',
          description: 'CRM module endpoints',
          auth: 'SALES_MANAGER, ANALYST, ADMIN, or MASTERMIND role required'
        },
        projects: {
          method: 'GET',
          path: '/api/erp/projects/*',
          description: 'Project management endpoints',
          auth: 'PROJECT_MANAGER, ANALYST, ADMIN, or MASTERMIND role required'
        },
        hr: {
          method: 'GET',
          path: '/api/erp/hr/*',
          description: 'HR management endpoints',
          auth: 'HR_MANAGER, ADMIN, or MASTERMIND role required'
        }
      },

      pos: {
        sessions: {
          method: 'GET',
          path: '/api/pos/sessions',
          description: 'POS session management',
          auth: 'Manager or higher role required'
        },
        transactions: {
          method: 'POST',
          path: '/api/pos/orders',
          description: 'Create POS order',
          auth: 'Manager or higher role required'
        }
      },

      health: {
        health: {
          method: 'GET',
          path: '/api/health',
          description: 'Comprehensive health check with system metrics',
          response: {
            status: 'ok | degraded | error',
            database: 'Connection status',
            memory: 'Memory usage',
            system: 'System information'
          }
        },
        ready: {
          method: 'GET',
          path: '/api/ready',
          description: 'Readiness probe for Kubernetes',
          response: {
            status: 'ready | not_ready'
          }
        },
        live: {
          method: 'GET',
          path: '/api/live',
          description: 'Liveness probe for Kubernetes',
          response: {
            status: 'alive'
          }
        }
      }
    },

    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer {token}',
      description: 'Include JWT token in Authorization header for authenticated endpoints'
    },

    userRoles: {
      CUSTOMER: 'Regular customer - can browse, shop, and manage own orders',
      ADMIN: 'Store administrator - full access to store management',
      MASTERMIND: 'Platform owner - can configure all features',
      MANAGER: 'Store manager - can manage POS and staff',
      CFO: 'Chief Financial Officer - access to accounting module',
      HR_MANAGER: 'HR Manager - access to HR module',
      SALES_MANAGER: 'Sales Manager - access to CRM module',
      OPERATIONS_MANAGER: 'Operations Manager - access to inventory module',
      PROJECT_MANAGER: 'Project Manager - access to project module',
      ANALYST: 'Data Analyst - read-only access to analytics'
    },

    errorCodes: {
      400: 'Bad Request - Invalid input data',
      401: 'Unauthorized - Authentication required',
      403: 'Forbidden - Insufficient permissions',
      404: 'Not Found - Resource not found',
      500: 'Internal Server Error - Server error occurred'
    },

    rateLimits: {
      general: '100 requests per 15 minutes per IP',
      auth: '5 login attempts per 15 minutes per IP'
    }
  };

  res.json(docs);
};
