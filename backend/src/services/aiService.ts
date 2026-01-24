import OpenAI from 'openai';
import { prisma } from '../utils/db';
import logger from '../utils/logger';

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({ apiKey });
};

/**
 * Get product knowledge base for AI context
 * Returns a formatted string with all available products
 */
export const getProductKnowledge = async (): Promise<string> => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 100, // Limit to prevent token overflow
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      return 'No products available in the store.';
    }

    // Use functional approach for better performance and readability
    const knowledge = products
      .map((product) => {
        const priceNum = Number(product.price);
        const lines = [
          `- Product ID: ${product.id}`,
          `  Name: ${product.name}`,
          `  Slug: ${product.slug}`,
          `  Price: $${isNaN(priceNum) ? String(product.price) : priceNum}`,
          `  Category: ${product.category?.name || 'Uncategorized'}`,
          `  Description: ${product.description?.substring(0, 200) || 'No description'}`,
          `  Stock: ${product.stock}`,
        ];
        if (product.tags && product.tags.length > 0) {
          lines.push(`  Tags: ${product.tags.join(', ')}`);
        }
        lines.push(`  Link: /products/${product.slug}`, '');
        return lines.join('\n');
      })
      .join('\n');
    
    return `Available Products:\n\n${knowledge}`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching product knowledge', { error: errorMessage });
    return 'Unable to fetch product information at the moment.';
  }
};

// Product search result type
interface ProductSearchResult {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  description: string;
  imageUrl: string;
  category: string;
  link: string;
}

/**
 * Get products by search query for AI recommendations
 */
export const searchProductsForAI = async (query: string, limit: number = 5): Promise<ProductSearchResult[]> => {
  try {
    const searchTerm = query.trim().toLowerCase();
    
    const products = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' as const } },
          { description: { contains: searchTerm, mode: 'insensitive' as const } },
          { tags: { has: searchTerm } },
          {
            category: {
              name: { contains: searchTerm, mode: 'insensitive' as const },
            },
          },
        ],
      },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product) => {
      const priceNum = Number(product.price);
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: isNaN(priceNum) ? String(product.price) : priceNum,
        description: product.description?.substring(0, 150) || '',
        imageUrl: product.imageUrls?.[0] || '',
        category: product.category?.name || 'Uncategorized',
        link: `/products/${product.slug}`,
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error searching products', { error: errorMessage, query });
    return [];
  }
};

/**
 * Get admin knowledge base (products, users, orders stats)
 */
const getAdminKnowledge = async (): Promise<string> => {
  try {
    const [
      products,
      users,
      orders,
      stats
    ] = await Promise.all([
      prisma.product.findMany({
        take: 50,
        include: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        where: { role: { not: 'MASTERMIND' } },
        take: 20,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.findMany({
        take: 20,
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCEEDED',
        },
      }),
    ]);

    const totalProducts = await prisma.product.count();
    const totalOrders = await prisma.order.count();
    const totalUsers = await prisma.user.count({ where: { role: { not: 'MASTERMIND' } } });
    const totalRevenue = stats._sum.amount || 0;

    // Type definitions for clarity
    type ProductInfo = { id: string; name: string; slug: string; price: number | string; stock: number; active: boolean; featured?: boolean };
    type UserInfo = { id: string; email: string; role: string; _count?: { orders: number } };
    type OrderInfo = { orderNumber: string; status: string; totalAmount: number | string; user?: { email?: string } };

    const knowledge = `STORE STATISTICS:\n- Total Products: ${totalProducts}\n- Total Orders: ${totalOrders}\n- Total Users: ${totalUsers}\n- Total Revenue: $${Number(totalRevenue).toFixed(2)}\n\nRECENT PRODUCTS (Sample):\n${products.slice(0, 10).map((p) => {
      const priceNum = Number(p.price);
      const stockNum = Number(p.stock);
      return `- ${p.name} (ID: ${p.id}, Slug: ${p.slug}, Price: $${isNaN(priceNum) ? String(p.price) : priceNum}, Stock: ${isNaN(stockNum) ? String(p.stock) : stockNum}, Active: ${p.active}, Featured: ${p.featured || false})`;
    }).join('\n')}\n\nRECENT USERS (Sample):\n${users.slice(0, 10).map((u) => {
      return `- ${u.email} (ID: ${u.id}, Role: ${u.role}, Orders: ${u._count?.orders || 0})`;
    }).join('\n')}\n\nRECENT ORDERS (Sample):\n${orders.slice(0, 10).map((o) => {
      return `- Order #${o.orderNumber} (Status: ${o.status}, Total: $${o.totalAmount}, Customer: ${o.user?.email || 'N/A'})`;
    }).join('\n')}`;

    return knowledge;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching admin knowledge', { error: errorMessage });
    return 'Unable to fetch store information at the moment.';
  }
};

/**
 * AI Chat completion with product knowledge
 */
export const generateAIResponse = async (
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  userRole?: string
): Promise<{ message: string; suggestedProducts?: ProductSearchResult[] }> => {
  try {
    const openai = getOpenAIClient();
    
    let systemPrompt: string;
    
    // Generate different prompts based on user role
    if (userRole === 'ADMIN') {
      // Admin-specific prompt with store management info
      const adminKnowledge = await getAdminKnowledge();
      
      systemPrompt = `You are an AI assistant for store administrators. Your job is to help admins manage their store, answer questions about products, users, orders, and store statistics.

You have access to the following store information:
${adminKnowledge}

Instructions:
1. Greet admin users professionally and ask how you can help with store management
2. Answer questions about:
   - Product details (name, price, stock, status, categories)
   - User information (email, role, order history)
   - Order details (status, totals, customer info)
   - Store statistics (total products, orders, users, revenue)
   - Inventory management (stock levels, low stock alerts)
3. When discussing products, provide product IDs, slugs, prices, stock levels, and status
4. When discussing users, provide user IDs, emails, roles, and order counts
5. When discussing orders, provide order numbers, status, totals, and customer info
6. Be professional, concise, and data-focused
7. Keep responses under 250 words
8. Use specific numbers and data from the store information provided
9. For product links, use format: /admin/products (for admin product management)

You can help with:
- Finding specific products by name, ID, or category
- Checking stock levels and inventory status
- Finding user information by email or ID
- Checking order status and details
- Providing store statistics and insights
- Product management tasks and information`;

    } else {
      // Customer prompt (existing shopping assistant)
      const productKnowledge = await getProductKnowledge();
      
      systemPrompt = `You are a helpful shopping assistant for an online store. Your job is to help customers find the products they're looking for.

You have access to the following product catalog:
${productKnowledge}

Instructions:
1. Greet customers warmly and ask what they're looking to buy today
2. Ask 1-2 clarifying questions if needed (e.g., category, price range, specific features)
3. Based on their responses, search through the product catalog and suggest relevant products
4. When suggesting products, provide the product name, price, and a brief description
5. Always provide product links in the format: /products/{slug}
6. If no products match, politely suggest similar items or ask for more details
7. Be friendly, concise, and helpful
8. Keep responses under 200 words
9. When you find matching products, mention them clearly with their links

Important: Always format product links as /products/{slug} so customers can click them easily.`;
    }

    // Build conversation messages
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using cheaper model for cost efficiency
      messages,
      temperature: 0.7,
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    // Extract product mentions from AI response and search for them
    const suggestedProducts = await extractAndSearchProducts(aiResponse, userMessage);

    return {
      message: aiResponse,
      suggestedProducts: suggestedProducts.length > 0 ? suggestedProducts : undefined,
    };
  } catch (error: any) {
    logger.error('OpenAI API error', { error: error.message, stack: error.stack });
    throw new Error(`AI service error: ${error.message || 'Failed to generate response'}`);
  }
};

/**
 * Extract product mentions from AI response and search for matching products
 */
const extractAndSearchProducts = async (
  aiResponse: string,
  userMessage: string
): Promise<any[]> => {
  try {
    // Search for products based on user message (primary) and AI response keywords
    // Extract keywords from AI response to improve search
    const keywords = extractKeywords(`${userMessage} ${aiResponse}`);
    const searchQuery = keywords.length > 0 ? keywords.join(' ') : userMessage;
    const products = await searchProductsForAI(searchQuery, 3);
    return products;
  } catch (error: any) {
    logger.error('Error extracting products', { error: error.message });
    return [];
  }
};

/**
 * Extract keywords from text for product search
 */
const extractKeywords = (text: string): string[] => {
  // Remove common words and extract meaningful terms
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'cannot', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word))
    .slice(0, 5); // Limit to 5 keywords
  
  return [...new Set(words)]; // Remove duplicates
};
