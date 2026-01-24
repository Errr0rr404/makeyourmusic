import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from backend/.env or frontend/.env.local
const backendEnv = path.join(__dirname, '../.env');
const frontendEnv = path.join(__dirname, '../../frontend/.env.local');
if (require('fs').existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else if (require('fs').existsSync(frontendEnv)) {
  dotenv.config({ path: frontendEnv });
} else {
  dotenv.config(); // Fallback to default .env
}

// Import Prisma client using the backend's db utility (handles adapter correctly)
const dbPath = path.resolve(__dirname, '../src/utils/db');
const { prisma } = require(dbPath);

async function createDummyData() {
  try {
    console.log('🌱 Creating dummy data...\n');

    // 1. Create dummy customer user
    console.log('📧 Creating dummy customer user...');
    const customerPassword = await bcrypt.hash('Customer123!', 12);
    const dummyCustomer = await prisma.user.upsert({
      where: { email: 'customer@example.com' },
      update: {
        passwordHash: customerPassword,
        name: 'John Customer',
        phone: '+1234567890',
        role: 'CUSTOMER',
      },
      create: {
        email: 'customer@example.com',
        passwordHash: customerPassword,
        name: 'John Customer',
        phone: '+1234567890',
        role: 'CUSTOMER',
      },
    });
    console.log('✅ Customer created:', dummyCustomer.email);

    // 2. Delete old products and categories
    console.log('\n🗑️  Cleaning up old products and categories...');
    
    // Delete products that belong to old categories (bakery and general)
    const oldCategorySlugs = ['electronics', 'clothing', 'books', 'bread', 'pastries', 'cakes', 'cookies', 'muffins', 'donuts'];
    const oldCategories = await prisma.category.findMany({
      where: { slug: { in: oldCategorySlugs } },
      include: {
        products: true,
      },
    });
    
    if (oldCategories.length > 0) {
      const oldCategoryIds = oldCategories.map(c => c.id);
      const oldProducts = oldCategories.flatMap(c => c.products);
      const oldProductIds = oldProducts.map(p => p.id);
      
      if (oldProductIds.length > 0) {
        // Delete related records first (order items, cart items, wishlist items, reviews, etc.)
        await prisma.orderItem.deleteMany({
          where: { productId: { in: oldProductIds } },
        });
        await prisma.cartItem.deleteMany({
          where: { productId: { in: oldProductIds } },
        });
        await prisma.wishlistItem.deleteMany({
          where: { productId: { in: oldProductIds } },
        });
        await prisma.review.deleteMany({
          where: { productId: { in: oldProductIds } },
        });
        await prisma.productRelation.deleteMany({
          where: {
            OR: [
              { productId: { in: oldProductIds } },
              { relatedId: { in: oldProductIds } },
            ],
          },
        });
        // Now delete the products
        await prisma.product.deleteMany({
          where: { id: { in: oldProductIds } },
        });
      }
      
      // Delete old categories
      await prisma.category.deleteMany({
        where: { slug: { in: oldCategorySlugs } },
      });
      console.log(`   ✅ Deleted ${oldCategories.length} old categories and ${oldProductIds.length} old products`);
    }

    // 2. Get or create categories
    console.log('\n📁 Creating/updating categories...');
    const coffee = await prisma.category.upsert({
      where: { slug: 'coffee' },
      update: {},
      create: {
        name: 'Coffee',
        slug: 'coffee',
        description: 'Freshly brewed coffee and espresso drinks',
      },
    });

    const tea = await prisma.category.upsert({
      where: { slug: 'tea' },
      update: {},
      create: {
        name: 'Tea',
        slug: 'tea',
        description: 'Premium teas and herbal infusions',
      },
    });

    const beverages = await prisma.category.upsert({
      where: { slug: 'beverages' },
      update: {},
      create: {
        name: 'Beverages',
        slug: 'beverages',
        description: 'Cold drinks, smoothies, and juices',
      },
    });

    const sandwiches = await prisma.category.upsert({
      where: { slug: 'sandwiches' },
      update: {},
      create: {
        name: 'Sandwiches',
        slug: 'sandwiches',
        description: 'Fresh sandwiches, paninis, and wraps',
      },
    });

    const salads = await prisma.category.upsert({
      where: { slug: 'salads' },
      update: {},
      create: {
        name: 'Salads',
        slug: 'salads',
        description: 'Fresh salads and healthy bowls',
      },
    });

    const snacks = await prisma.category.upsert({
      where: { slug: 'snacks' },
      update: {},
      create: {
        name: 'Snacks',
        slug: 'snacks',
        description: 'Pastries, muffins, and light snacks',
      },
    });
    console.log('✅ Categories ready');

    // 3. Create dummy products
    console.log('\n🛍️  Creating dummy products...');
    const products = [
      // Coffee category
      {
        name: 'Espresso',
        slug: 'espresso',
        description: 'Rich and bold espresso shot made from premium Arabica beans. Perfect balance of crema and intensity. Served in a demitasse cup.',
        price: 2.99,
        comparePrice: 3.99,
        stock: 200,
        imageUrls: [
          'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800',
          'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
        ],
        categoryId: coffee.id,
        sku: 'ESP-001',
        active: true,
        featured: true,
        tags: ['espresso', 'bold', 'arabica', 'classic'],
      },
      {
        name: 'Cappuccino',
        slug: 'cappuccino',
        description: 'Classic Italian cappuccino with equal parts espresso, steamed milk, and velvety foam. Topped with a dusting of cocoa powder. Perfect morning pick-me-up.',
        price: 4.49,
        comparePrice: 5.49,
        stock: 150,
        imageUrls: [
          'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800',
          'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
        ],
        categoryId: coffee.id,
        sku: 'CAP-001',
        active: true,
        featured: true,
        tags: ['cappuccino', 'italian', 'foam', 'classic'],
      },
      {
        name: 'Latte',
        slug: 'latte',
        description: 'Smooth and creamy latte made with espresso and steamed milk. Customizable with your choice of flavor syrup. Perfect for any time of day.',
        price: 4.99,
        comparePrice: 5.99,
        stock: 180,
        imageUrls: [
          'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',
          'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
        ],
        categoryId: coffee.id,
        sku: 'LAT-001',
        active: true,
        featured: false,
        tags: ['latte', 'creamy', 'smooth', 'customizable'],
      },
      {
        name: 'Americano',
        slug: 'americano',
        description: 'Bold espresso shots topped with hot water for a rich, full-bodied coffee experience. Stronger than drip coffee with a smooth finish.',
        price: 3.49,
        comparePrice: 4.49,
        stock: 170,
        imageUrls: [
          'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800',
          'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
        ],
        categoryId: coffee.id,
        sku: 'AMR-001',
        active: true,
        featured: false,
        tags: ['americano', 'bold', 'strong', 'smooth'],
      },
      {
        name: 'Mocha',
        slug: 'mocha',
        description: 'Rich espresso combined with premium chocolate and steamed milk. Topped with whipped cream and chocolate drizzle. A chocolate lover\'s dream.',
        price: 5.49,
        comparePrice: 6.49,
        stock: 140,
        imageUrls: [
          'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=800',
          'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
        ],
        categoryId: coffee.id,
        sku: 'MOC-001',
        active: true,
        featured: false,
        tags: ['mocha', 'chocolate', 'decadent', 'sweet'],
      },
      // Tea category
      {
        name: 'Green Tea',
        slug: 'green-tea',
        description: 'Premium Japanese green tea with delicate, grassy notes. Light and refreshing with natural antioxidants. Perfect for a calm moment.',
        price: 3.99,
        comparePrice: 4.99,
        stock: 120,
        imageUrls: [
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
          'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800',
        ],
        categoryId: tea.id,
        sku: 'GRT-001',
        active: true,
        featured: false,
        tags: ['green tea', 'japanese', 'refreshing', 'antioxidants'],
      },
      {
        name: 'Earl Grey',
        slug: 'earl-grey',
        description: 'Classic English tea with bergamot oil. Aromatic and citrusy with a smooth finish. Perfect for afternoon tea time.',
        price: 3.99,
        comparePrice: 4.99,
        stock: 110,
        imageUrls: [
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
          'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800',
        ],
        categoryId: tea.id,
        sku: 'ERG-001',
        active: true,
        featured: false,
        tags: ['earl grey', 'bergamot', 'classic', 'aromatic'],
      },
      {
        name: 'Chai Latte',
        slug: 'chai-latte',
        description: 'Spiced Indian chai with steamed milk. Warm blend of cinnamon, cardamom, and ginger. Comforting and aromatic.',
        price: 4.99,
        comparePrice: 5.99,
        stock: 100,
        imageUrls: [
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
          'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800',
        ],
        categoryId: tea.id,
        sku: 'CHL-001',
        active: true,
        featured: false,
        tags: ['chai', 'spiced', 'indian', 'warming'],
      },
      {
        name: 'Herbal Tea',
        slug: 'herbal-tea',
        description: 'Soothing herbal blend with chamomile, peppermint, and lemon balm. Caffeine-free and perfect for relaxation.',
        price: 3.49,
        comparePrice: 4.49,
        stock: 90,
        imageUrls: [
          'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800',
          'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800',
        ],
        categoryId: tea.id,
        sku: 'HRB-001',
        active: true,
        featured: false,
        tags: ['herbal', 'caffeine-free', 'soothing', 'relaxing'],
      },
      // Beverages category
      {
        name: 'Fresh Orange Juice',
        slug: 'fresh-orange-juice',
        description: 'Freshly squeezed orange juice served cold. Rich in vitamin C and naturally sweet. Perfect healthy start to your day.',
        price: 4.99,
        comparePrice: 5.99,
        stock: 80,
        imageUrls: [
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800',
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800',
        ],
        categoryId: beverages.id,
        sku: 'ORJ-001',
        active: true,
        featured: false,
        tags: ['juice', 'fresh', 'vitamin c', 'healthy'],
      },
      {
        name: 'Mango Smoothie',
        slug: 'mango-smoothie',
        description: 'Creamy mango smoothie blended with yogurt and ice. Tropical and refreshing with natural sweetness. Perfect for a midday boost.',
        price: 5.99,
        comparePrice: 6.99,
        stock: 70,
        imageUrls: [
          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800',
        ],
        categoryId: beverages.id,
        sku: 'MGS-001',
        active: true,
        featured: false,
        tags: ['smoothie', 'mango', 'tropical', 'refreshing'],
      },
      {
        name: 'Iced Coffee',
        slug: 'iced-coffee',
        description: 'Cold brewed coffee served over ice. Smooth and refreshing with a hint of sweetness. Perfect for hot days.',
        price: 4.49,
        comparePrice: 5.49,
        stock: 100,
        imageUrls: [
          'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?w=800',
          'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',
        ],
        categoryId: beverages.id,
        sku: 'ICO-001',
        active: true,
        featured: false,
        tags: ['iced coffee', 'cold brew', 'refreshing', 'smooth'],
      },
      {
        name: 'Lemonade',
        slug: 'lemonade',
        description: 'Freshly squeezed lemonade with a perfect balance of sweet and tart. Served ice-cold with a slice of lemon. Classic summer drink.',
        price: 3.99,
        comparePrice: 4.99,
        stock: 90,
        imageUrls: [
          'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=800',
          'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
        ],
        categoryId: beverages.id,
        sku: 'LEM-001',
        active: true,
        featured: false,
        tags: ['lemonade', 'fresh', 'refreshing', 'classic'],
      },
      // Sandwiches category
      {
        name: 'Turkey & Avocado Sandwich',
        slug: 'turkey-avocado-sandwich',
        description: 'Fresh roasted turkey with creamy avocado, lettuce, tomato, and mayo on artisan bread. A satisfying lunch option.',
        price: 8.99,
        comparePrice: 10.99,
        stock: 50,
        imageUrls: [
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
          'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
        ],
        categoryId: sandwiches.id,
        sku: 'TAS-001',
        active: true,
        featured: true,
        tags: ['turkey', 'avocado', 'fresh', 'lunch'],
      },
      {
        name: 'Caprese Panini',
        slug: 'caprese-panini',
        description: 'Classic Italian panini with fresh mozzarella, tomato, basil, and balsamic glaze. Pressed to perfection for a warm, melty experience.',
        price: 9.49,
        comparePrice: 11.49,
        stock: 45,
        imageUrls: [
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
          'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
        ],
        categoryId: sandwiches.id,
        sku: 'CAP-002',
        active: true,
        featured: true,
        tags: ['caprese', 'mozzarella', 'italian', 'panini'],
      },
      {
        name: 'Chicken Caesar Wrap',
        slug: 'chicken-caesar-wrap',
        description: 'Grilled chicken with crisp romaine lettuce, parmesan cheese, and creamy Caesar dressing wrapped in a soft tortilla. Perfect on-the-go meal.',
        price: 8.49,
        comparePrice: 10.49,
        stock: 55,
        imageUrls: [
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
          'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
        ],
        categoryId: sandwiches.id,
        sku: 'CCW-001',
        active: true,
        featured: false,
        tags: ['chicken', 'caesar', 'wrap', 'grilled'],
      },
      {
        name: 'Breakfast Sandwich',
        slug: 'breakfast-sandwich',
        description: 'Scrambled eggs, crispy bacon, and cheddar cheese on a toasted English muffin. The perfect way to start your day.',
        price: 6.99,
        comparePrice: 8.99,
        stock: 60,
        imageUrls: [
          'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
          'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
        ],
        categoryId: sandwiches.id,
        sku: 'BRS-001',
        active: true,
        featured: false,
        tags: ['breakfast', 'eggs', 'bacon', 'morning'],
      },
      // Salads category
      {
        name: 'Caesar Salad',
        slug: 'caesar-salad',
        description: 'Classic Caesar salad with crisp romaine lettuce, parmesan cheese, croutons, and creamy Caesar dressing. A timeless favorite.',
        price: 9.99,
        comparePrice: 11.99,
        stock: 40,
        imageUrls: [
          'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        ],
        categoryId: salads.id,
        sku: 'CAS-001',
        active: true,
        featured: false,
        tags: ['caesar', 'romaine', 'parmesan', 'classic'],
      },
      {
        name: 'Garden Salad',
        slug: 'garden-salad',
        description: 'Fresh mixed greens with cherry tomatoes, cucumbers, carrots, and red onions. Served with your choice of dressing. Light and healthy.',
        price: 8.49,
        comparePrice: 10.49,
        stock: 50,
        imageUrls: [
          'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        ],
        categoryId: salads.id,
        sku: 'GDS-001',
        active: true,
        featured: false,
        tags: ['garden', 'fresh', 'healthy', 'mixed greens'],
      },
      {
        name: 'Chicken Salad Bowl',
        slug: 'chicken-salad-bowl',
        description: 'Grilled chicken breast over mixed greens with quinoa, roasted vegetables, and a light vinaigrette. A complete and satisfying meal.',
        price: 11.99,
        comparePrice: 13.99,
        stock: 35,
        imageUrls: [
          'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=800',
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
        ],
        categoryId: salads.id,
        sku: 'CSB-001',
        active: true,
        featured: true,
        tags: ['chicken', 'quinoa', 'grilled', 'healthy'],
      },
      // Snacks category
      {
        name: 'Butter Croissant',
        slug: 'butter-croissant',
        description: 'Flaky, buttery croissant made with European butter. Light and airy layers with a golden exterior. Perfect with your coffee.',
        price: 3.49,
        comparePrice: 4.49,
        stock: 100,
        imageUrls: [
          'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
          'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800',
        ],
        categoryId: snacks.id,
        sku: 'BCR-001',
        active: true,
        featured: false,
        tags: ['croissant', 'butter', 'flaky', 'french'],
      },
      {
        name: 'Blueberry Muffin',
        slug: 'blueberry-muffin',
        description: 'Moist and fluffy blueberry muffin bursting with fresh berries. Topped with a sweet crumble. Perfect for breakfast or a snack.',
        price: 3.99,
        comparePrice: 5.49,
        stock: 85,
        imageUrls: [
          'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=800',
          'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800',
        ],
        categoryId: snacks.id,
        sku: 'BLM-001',
        active: true,
        featured: false,
        tags: ['blueberry', 'fresh', 'moist', 'breakfast'],
      },
      {
        name: 'Chocolate Chip Cookie',
        slug: 'chocolate-chip-cookie',
        description: 'Classic chocolate chip cookie with chunks of premium dark chocolate. Soft and chewy with crispy edges. Baked fresh daily.',
        price: 2.99,
        comparePrice: 3.99,
        stock: 120,
        imageUrls: [
          'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800',
          'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800',
        ],
        categoryId: snacks.id,
        sku: 'CCC-001',
        active: true,
        featured: false,
        tags: ['chocolate chip', 'classic', 'chewy', 'fresh'],
      },
      {
        name: 'Chocolate Cake Slice',
        slug: 'chocolate-cake-slice',
        description: 'Rich chocolate cake slice with chocolate frosting. Moist and decadent, perfect for a sweet treat with your coffee.',
        price: 5.99,
        comparePrice: 7.99,
        stock: 30,
        imageUrls: [
          'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
          'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=800',
        ],
        categoryId: snacks.id,
        sku: 'CCS-001',
        active: true,
        featured: false,
        tags: ['chocolate', 'cake', 'decadent', 'sweet'],
      },
    ];

    // Delete any products that don't match our bakery product slugs
    const bakeryProductSlugs = products.map(p => p.slug);
    const existingProducts = await prisma.product.findMany();
    const productsToDelete = existingProducts.filter(p => !cafeProductSlugs.includes(p.slug));
    
    if (productsToDelete.length > 0) {
      const idsToDelete = productsToDelete.map(p => p.id);
      // Delete related records first
      await prisma.orderItem.deleteMany({
        where: { productId: { in: idsToDelete } },
      });
      await prisma.cartItem.deleteMany({
        where: { productId: { in: idsToDelete } },
      });
      await prisma.wishlistItem.deleteMany({
        where: { productId: { in: idsToDelete } },
      });
      await prisma.review.deleteMany({
        where: { productId: { in: idsToDelete } },
      });
      await prisma.productRelation.deleteMany({
        where: {
          OR: [
            { productId: { in: idsToDelete } },
            { relatedId: { in: idsToDelete } },
          ],
        },
      });
      // Delete the products
      await prisma.product.deleteMany({
        where: { id: { in: idsToDelete } },
      });
      console.log(`   🗑️  Deleted ${productsToDelete.length} additional old products`);
    }

    const createdProducts = [];
    for (const product of products) {
      const created = await prisma.product.upsert({
        where: { slug: product.slug },
        update: {
          ...product,
        },
        create: product,
      });
      createdProducts.push(created);
      console.log(`   ✅ ${created.name} - $${created.price}`);
    }

    // 4. Create shipping and billing addresses for customer
    console.log('\n📍 Creating customer addresses...');
    const shippingAddress = await prisma.address.upsert({
      where: {
        id: `shipping-${dummyCustomer.id}`,
      },
      update: {},
      create: {
        userId: dummyCustomer.id,
        type: 'shipping',
        name: 'John Customer',
        line1: '123 Main Street',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        phone: '+1234567890',
        isDefault: true,
      },
    });

    const billingAddress = await prisma.address.upsert({
      where: {
        id: `billing-${dummyCustomer.id}`,
      },
      update: {},
      create: {
        userId: dummyCustomer.id,
        type: 'billing',
        name: 'John Customer',
        line1: '123 Main Street',
        line2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'United States',
        phone: '+1234567890',
        isDefault: true,
      },
    });
    console.log('✅ Addresses created');

    // 5. Create a dummy order with multiple items
    console.log('\n📦 Creating dummy order...');
    
    // Calculate order totals
    const product1 = createdProducts.find(p => p.slug === 'cappuccino')!;
    const product2 = createdProducts.find(p => p.slug === 'turkey-avocado-sandwich')!;
    const product3 = createdProducts.find(p => p.slug === 'butter-croissant')!;
    
    const item1Price = Number(product1.price);
    const item2Price = Number(product2.price);
    const item3Price = Number(product3.price);
    
    const quantity1 = 2;
    const quantity2 = 1;
    const quantity3 = 3;
    
    const subtotal = (item1Price * quantity1) + (item2Price * quantity2) + (item3Price * quantity3);
    const shippingCost = 15.99;
    const discount = 50.00; // Promo code discount
    const totalAmount = subtotal + shippingCost - discount;

    const order = await prisma.order.create({
      data: {
        userId: dummyCustomer.id,
        orderNumber: `ORD-${Date.now()}`,
        totalAmount,
        subtotal,
        shippingCost,
        discount,
        promoCode: 'WELCOME50',
        status: 'PROCESSING',
        shippingAddress: {
          name: shippingAddress.name,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postalCode,
          country: shippingAddress.country,
          phone: shippingAddress.phone,
        },
        billingAddress: {
          name: billingAddress.name,
          line1: billingAddress.line1,
          line2: billingAddress.line2,
          city: billingAddress.city,
          state: billingAddress.state,
          postal_code: billingAddress.postalCode,
          country: billingAddress.country,
          phone: billingAddress.phone,
        },
        paymentMethod: 'STRIPE',
        orderItems: {
          create: [
            {
              productId: product1.id,
              quantity: quantity1,
              priceAtPurchase: item1Price,
            },
            {
              productId: product2.id,
              quantity: quantity2,
              priceAtPurchase: item2Price,
            },
            {
              productId: product3.id,
              quantity: quantity3,
              priceAtPurchase: item3Price,
            },
          ],
        },
        statusHistory: {
          create: [
            {
              status: 'PENDING',
              note: 'Order placed',
            },
            {
              status: 'PROCESSING',
              note: 'Order confirmed and being prepared for shipment',
            },
          ],
        },
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        statusHistory: true,
      },
    });
    console.log(`✅ Order created: ${order.orderNumber}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Total: $${order.totalAmount.toFixed(2)}`);

    // 6. Create payment record
    console.log('\n💳 Creating payment record...');
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        paymentMethod: 'STRIPE',
        amount: totalAmount,
        currency: 'usd',
        status: 'SUCCEEDED',
        gatewayTransactionId: `txn_${Date.now()}`,
        stripePaymentIntentId: `pi_${Date.now()}`,
      },
    });
    console.log('✅ Payment created');

    // 7. Create notification for customer about order
    console.log('\n🔔 Creating notifications...');
    await prisma.notification.create({
      data: {
        userId: dummyCustomer.id,
        type: 'order',
        title: 'Order Confirmed',
        message: `Your order ${order.orderNumber} has been confirmed and is being processed.`,
        link: `/account/orders/${order.id}`,
        read: false,
      },
    });
    console.log('✅ Notifications created');

    console.log('\n🎉 Dummy data created successfully!\n');
    console.log('📋 Summary:');
    console.log(`   ✅ Customer: customer@example.com (Password: Customer123!)`);
    console.log(`   ✅ Products: ${createdProducts.length} products created`);
    console.log(`   ✅ Order: ${order.orderNumber} (Status: ${order.status})`);
    console.log(`   ✅ Payment: $${payment.amount.toFixed(2)} (Status: ${payment.status})\n`);
    console.log('🔑 Customer Credentials:');
    console.log('   Email: customer@example.com');
    console.log('   Password: Customer123!\n');
    console.log('💡 You can now:');
    console.log('   1. Login as admin (admin@gmail.com) to view the order');
    console.log('   2. Update order status to SHIPPED with tracking number');
    console.log('   3. Login as customer (customer@example.com) to see order status updates');
    console.log('   4. View products on the frontend\n');
  } catch (error) {
    console.error('❌ Error creating dummy data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDummyData();
