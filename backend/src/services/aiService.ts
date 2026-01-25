// OpenAI is optional - install with: npm install openai
let OpenAI: any;
try {
  OpenAI = require('openai').default;
} catch {
  // OpenAI not installed, will use mock responses
  OpenAI = null;
}

import { prisma } from '../utils/db';
import logger from '../utils/logger';

// Initialize OpenAI client
const getOpenAIClient = () => {
  if (!OpenAI) {
    throw new Error('OpenAI package not installed. Run: npm install openai');
  }
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
      take: 100, // Limit to prevent token overflow
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      return 'No products available in the system.';
    }

    // Use functional approach for better performance and readability
    const knowledge = products
      .map((product: any) => {
        const priceNum = Number(product.price);
        const lines = [
          `- Product ID: ${product.id}`,
          `  Name: ${product.name}`,
          `  SKU: ${product.sku}`,
          `  Price: $${isNaN(priceNum) ? String(product.price) : priceNum}`,
          `  Description: ${product.description?.substring(0, 200) || 'No description'}`,
          `  Stock: ${product.stock}`,
        ];
        lines.push('');
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

// Product search result type (ERP schema compatible)
interface ProductSearchResult {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  description: string;
  stock: number;
}

/**
 * Get products by search query for AI recommendations
 */
export const searchProductsForAI = async (query: string, limit: number = 5): Promise<ProductSearchResult[]> => {
  try {
    const searchTerm = query.trim().toLowerCase();
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' as const } },
          { description: { contains: searchTerm, mode: 'insensitive' as const } },
          { sku: { contains: searchTerm, mode: 'insensitive' as const } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return products.map((product: any) => {
      const priceNum = Number(product.price);
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: isNaN(priceNum) ? String(product.price) : priceNum,
        description: product.description?.substring(0, 150) || '',
        stock: product.stock,
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
    ] = await Promise.all([
      prisma.product.findMany({
        take: 50,
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stock: true,
          description: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.findMany({
        take: 20,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalProducts = await prisma.product.count();
    const totalUsers = await prisma.user.count();

    const knowledge = `ERP STATISTICS:\n- Total Products: ${totalProducts}\n- Total Users: ${totalUsers}\n\nRECENT PRODUCTS:\n${products.slice(0, 10).map((p: any) => {
      const priceNum = Number(p.price);
      return `- ${p.name} (SKU: ${p.sku}, Price: $${isNaN(priceNum) ? String(p.price) : priceNum.toFixed(2)}, Stock: ${p.stock})`;
    }).join('\n')}\n\nRECENT USERS:\n${users.slice(0, 10).map((u: any) => {
      return `- ${u.email || u.name} (Role: ${u.role})`;
    }).join('\n')}`;

    return knowledge;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching admin knowledge', { error: errorMessage });
    return 'Unable to fetch ERP information at the moment.';
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
