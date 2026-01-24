import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Resolve Prisma client from root node_modules (where it's generated)
const rootNodeModules = path.resolve(__dirname, '../../node_modules');
const prismaClientPath = path.join(rootNodeModules, '@prisma/client');
const { PrismaClient: PrismaClientType } = require(prismaClientPath);

const prisma = new PrismaClientType();

async function listProducts() {
  try {
    console.log('📦 Fetching all products from database...\n');

    const products = await prisma.product.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (products.length === 0) {
      console.log('❌ No products found in the database.\n');
      return;
    }

    console.log(`✅ Found ${products.length} product(s):\n`);
    console.log('=' .repeat(100));
    
    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Slug: ${product.slug}`);
      console.log(`   SKU: ${product.sku || 'N/A'}`);
      console.log(`   Category: ${product.category?.name || 'No category'}`);
      console.log(`   Price: $${Number(product.price).toFixed(2)}`);
      if (product.comparePrice) {
        console.log(`   Compare Price: $${Number(product.comparePrice).toFixed(2)}`);
      }
      console.log(`   Stock: ${product.stock}`);
      console.log(`   Active: ${product.active ? '✅ Yes' : '❌ No'}`);
      console.log(`   Featured: ${product.featured ? '⭐ Yes' : 'No'}`);
      if (product.tags && product.tags.length > 0) {
        console.log(`   Tags: ${product.tags.join(', ')}`);
      }
      if (product.description) {
        const desc = product.description.length > 100 
          ? product.description.substring(0, 100) + '...' 
          : product.description;
        console.log(`   Description: ${desc}`);
      }
      console.log(`   Images: ${product.imageUrls.length} image(s)`);
      if (product.imageUrls.length > 0) {
        console.log(`   First Image: ${product.imageUrls[0]}`);
      }
      console.log(`   Created: ${product.createdAt.toLocaleString()}`);
      console.log(`   Updated: ${product.updatedAt.toLocaleString()}`);
      console.log('-'.repeat(100));
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total Products: ${products.length}`);
    console.log(`   Active Products: ${products.filter(p => p.active).length}`);
    console.log(`   Featured Products: ${products.filter(p => p.featured).length}`);
    
    const categories = new Set(products.map(p => p.category?.name).filter(Boolean));
    console.log(`   Categories: ${Array.from(categories).join(', ') || 'None'}`);
    
    const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
    console.log(`   Total Stock: ${totalStock}`);
    
    const totalValue = products.reduce((sum, p) => sum + (Number(p.price) * p.stock), 0);
    console.log(`   Total Inventory Value: $${totalValue.toFixed(2)}\n`);

  } catch (error) {
    console.error('❌ Error listing products:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

listProducts();