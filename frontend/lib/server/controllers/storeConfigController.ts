import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../utils/db';
import { AppError } from '../utils/errorHandler';
import { authenticate, requireMastermind } from '../middleware/auth';

/**
 * Get public store configuration (no auth required)
 */
export const getStoreConfig = async (req: NextRequest): Promise<NextResponse> => {
  try {
    let config = await prisma.storeConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // If no config exists, return default config
    if (!config) {
      return NextResponse.json({
        id: 'default',
        storeName: 'MakeYourPlatform',
        storeType: 'general',
        primaryColor: '221 83% 53%',
        currency: 'USD',
        currencySymbol: '$',
        country: 'US',
        language: 'en',
        showHero: true,
        showFeatures: true,
        showFeaturedProducts: true,
        showRecentlyViewed: true,
        featuresEnabled: true,
        chatbotEnabled: true,
        wishlistEnabled: true,
        reviewsEnabled: true,
        notificationsEnabled: true,
        recentlyViewedEnabled: true,
        featuredProductsLimit: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching store config:', error);
    // Return default config on error
    return NextResponse.json({
      id: 'default',
      storeName: 'MakeYourPlatform',
      storeType: 'general',
      primaryColor: '221 83% 53%',
      currency: 'USD',
      currencySymbol: '$',
      country: 'US',
      language: 'en',
      showHero: true,
      showFeatures: true,
      showFeaturedProducts: true,
      showRecentlyViewed: true,
      featuresEnabled: true,
      chatbotEnabled: true,
      wishlistEnabled: true,
      reviewsEnabled: true,
      notificationsEnabled: true,
      recentlyViewedEnabled: true,
      featuredProductsLimit: 8,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
};

/**
 * Get store configuration (mastermind only)
 */
export const getStoreConfigAdmin = async (req: NextRequest): Promise<NextResponse> => {
  const startTime = Date.now();
  console.log('[StoreConfig] getStoreConfigAdmin called at', new Date().toISOString());
  
  // FAST PATH: Return default config immediately if database is slow
  // This prevents any database-related hangs
  const fastTimeout = setTimeout(() => {
    console.warn('[StoreConfig] Fast timeout - database might be slow, returning default');
  }, 500);
  
  try {
    // Check authentication (synchronous, should be fast)
    console.log('[StoreConfig] Checking authentication...', `(${Date.now() - startTime}ms)`);
    const authResult = authenticate(req);
    if (authResult instanceof NextResponse) {
      clearTimeout(fastTimeout);
      console.log('[StoreConfig] Authentication failed - returning 401', `(${Date.now() - startTime}ms)`);
      return authResult;
    }

    const { user } = authResult;
    if (!user) {
      console.log('[StoreConfig] No user in auth result');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    console.log('[StoreConfig] User authenticated:', user.email, user.role, `(${Date.now() - startTime}ms)`);
    
    // Check if user is mastermind (synchronous, should be fast)
    console.log('[StoreConfig] Checking mastermind role...', `(${Date.now() - startTime}ms)`);
    const mastermindCheck = requireMastermind(user);
    if (mastermindCheck) {
      clearTimeout(fastTimeout);
      console.log('[StoreConfig] User is not mastermind - returning 403', `(${Date.now() - startTime}ms)`);
      return mastermindCheck;
    }
    console.log('[StoreConfig] Mastermind check passed', `(${Date.now() - startTime}ms)`);
    clearTimeout(fastTimeout);

    console.log('[StoreConfig] Starting database query...', `(${Date.now() - startTime}ms)`);
    
    // Try to fetch config with timeout protection (1 second max)
    let config;
    try {
      console.log('[StoreConfig] Checking Prisma client...', `(${Date.now() - startTime}ms)`);
      if (!prisma) {
        throw new Error('Prisma client not initialized');
      }
      console.log('[StoreConfig] Prisma client OK', `(${Date.now() - startTime}ms)`);
      
      console.log('[StoreConfig] Executing database query...', `(${Date.now() - startTime}ms)`);
      const queryPromise = prisma.storeConfig.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
      
      // Add aggressive timeout to database query (1 second)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.warn('[StoreConfig] Database query TIMEOUT after 1s');
          reject(new Error('Database query timeout after 1 second'));
        }, 1000)
      );
      
      config = await Promise.race([queryPromise, timeoutPromise]) as any;
      console.log('[StoreConfig] Config fetched:', config ? 'found' : 'not found', `(${Date.now() - startTime}ms)`);
    } catch (dbError: any) {
      console.error('[StoreConfig] Database query error:', dbError.message, `(${Date.now() - startTime}ms)`);
      // If database query fails, return default config immediately
      console.log('[StoreConfig] Returning default config due to database error');
      return NextResponse.json({
        storeName: 'MakeYourPlatform',
        storeType: 'general',
        primaryColor: '221 83% 53%',
        currency: 'USD',
        currencySymbol: '$',
        language: 'en',
        showHero: true,
        showFeatures: true,
        showFeaturedProducts: true,
        showRecentlyViewed: true,
        featuresEnabled: true,
        chatbotEnabled: true,
        wishlistEnabled: true,
        reviewsEnabled: true,
        notificationsEnabled: true,
        recentlyViewedEnabled: true,
        shippingEnabled: true,
        pickupEnabled: false,
        featuredProductsLimit: 4,
      }, { status: 200 });
    }

    // If no config exists, skip creation to avoid hanging - just return default
    if (!config) {
      console.log('[StoreConfig] No config found - returning default (skipping creation)', `(${Date.now() - startTime}ms)`);
      return NextResponse.json({
        storeName: 'MakeYourPlatform',
        storeType: 'general',
        primaryColor: '221 83% 53%',
        currency: 'USD',
        currencySymbol: '$',
        language: 'en',
        showHero: true,
        showFeatures: true,
        showFeaturedProducts: true,
        showRecentlyViewed: true,
        featuresEnabled: true,
        chatbotEnabled: true,
        wishlistEnabled: true,
        reviewsEnabled: true,
        notificationsEnabled: true,
        recentlyViewedEnabled: true,
        shippingEnabled: true,
        pickupEnabled: false,
        featuredProductsLimit: 4,
      }, { status: 200 });
    }

    console.log('[StoreConfig] Returning config', `(${Date.now() - startTime}ms)`);
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('[StoreConfig] Outer catch - Error fetching store config:', error);
    console.error('[StoreConfig] Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    }, `(${Date.now() - startTime}ms)`);
    
    // Return default config instead of throwing
    return NextResponse.json({
      storeName: 'MakeYourPlatform',
      storeType: 'general',
      primaryColor: '221 83% 53%',
      currency: 'USD',
      currencySymbol: '$',
      language: 'en',
      showHero: true,
      showFeatures: true,
      showFeaturedProducts: true,
      showRecentlyViewed: true,
      featuresEnabled: true,
      chatbotEnabled: true,
      wishlistEnabled: true,
      reviewsEnabled: true,
      notificationsEnabled: true,
      recentlyViewedEnabled: true,
      shippingEnabled: true,
      pickupEnabled: false,
      featuredProductsLimit: 4,
    }, { status: 200 });
  }
};

/**
 * Update store configuration (mastermind only)
 * Validates and updates only allowed fields
 */
export const updateStoreConfig = async (req: NextRequest): Promise<NextResponse> => {
  // Check authentication
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  
  // Check if user is mastermind
  const mastermindCheck = requireMastermind(user);
  if (mastermindCheck) {
    return mastermindCheck;
  }

  let body: any;
  try {
    body = await req.json();
    
    // Get existing config or create new one
    let config = await prisma.storeConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Build update data object - filter out read-only fields and validate
    const updateData: any = {};
    
    // Exclude read-only fields and fields that don't exist in StoreConfig schema
    const readonlyFields = ['id', 'createdAt', 'updatedAt'];
    const excludedFields = ['products']; // Fields that exist in frontend interface but not in schema
    
    // Fields that might not exist in database yet (will be added by migration)
    const optionalFields = ['themePreset'];
    
    // Process all fields from body, excluding readonly and invalid ones
    for (const [key, value] of Object.entries(body)) {
      if (readonlyFields.includes(key) || excludedFields.includes(key)) {
        continue; // Skip readonly and excluded fields
      }
      
      // Skip optional fields that might not exist in database yet
      // They'll be included if the migration has been applied
      if (optionalFields.includes(key)) {
        // Try to include it, but don't fail if column doesn't exist
        // The update will fail gracefully if column doesn't exist
      }
      
      // Only include defined values (not undefined)
      if (value !== undefined) {
        try {
          // Handle different types appropriately
          if (value === null) {
            updateData[key] = null;
          } else if (typeof value === 'boolean') {
            updateData[key] = value;
          } else if (typeof value === 'string') {
            // Handle Decimal fields that come as strings
            if (key === 'minimumOrderAmount' || key === 'promotionalDiscountValue' || 
                key === 'heroParticlesSpeed') {
              const numValue = parseFloat(value);
              updateData[key] = isNaN(numValue) ? null : numValue;
            } else if (key === 'promotionalDiscountValidFrom' || key === 'promotionalDiscountValidUntil' || 
                       key === 'holidayModeUntil') {
              // Convert ISO string to Date
              updateData[key] = value ? new Date(value) : null;
            } else {
              // Handle themePreset - allow null or empty string to clear it
              if (key === 'themePreset') {
                updateData[key] = value.trim() === '' ? null : value.trim();
              } else {
                updateData[key] = value.trim();
              }
            }
          } else if (typeof value === 'number') {
            updateData[key] = value;
          } else if (value instanceof Date) {
            // Handle DateTime fields
            updateData[key] = value;
          } else if (typeof value === 'object' && !Array.isArray(value)) {
            // Handle JSON fields (objects) and DateTime strings
            if (key === 'promotionalDiscountValidFrom' || key === 'promotionalDiscountValidUntil' || 
                key === 'holidayModeUntil') {
              // Convert ISO string to Date
              updateData[key] = value ? new Date(value as unknown as string) : null;
            } else {
              // Handle JSON fields (objects)
              updateData[key] = value;
            }
          } else if (Array.isArray(value)) {
            // Only allow arrays for known JSON array fields
            if (key === 'featuresJson' || key === 'navigationItems' || key === 'tippingDefaultPercentages' || 
                key === 'storeHours' || key === 'storePickupAddress') {
              updateData[key] = value;
            }
            // Skip other arrays that aren't valid StoreConfig fields
          }
        } catch (fieldError: any) {
          console.warn(`Error processing field ${key}:`, fieldError);
          // Skip this field if there's an error processing it
        }
      }
    }

    // Filter out themePreset if it might not exist in database
    const safeUpdateData = { ...updateData };
    
    // Try to update, but handle case where themePreset column doesn't exist
    try {
      if (!config) {
        config = await prisma.storeConfig.create({
          data: {
            storeName: 'MakeYourPlatform',
            storeType: 'general',
            primaryColor: '221 83% 53%',
            ...safeUpdateData,
          },
        });
      } else {
        config = await prisma.storeConfig.update({
          where: { id: config.id },
          data: safeUpdateData,
        });
      }
    } catch (error: any) {
      // If error is about missing column (themePreset), remove it and retry
      if (error.message?.includes('theme_preset') || error.message?.includes('themePreset') || 
          error.code === 'P2011' || error.message?.includes('does not exist')) {
        console.warn('themePreset column not found, removing from update. Please run migration: npx prisma migrate deploy');
        delete safeUpdateData.themePreset;
        
        if (!config) {
          config = await prisma.storeConfig.create({
            data: {
              storeName: 'MakeYourPlatform',
              storeType: 'general',
              primaryColor: '221 83% 53%',
              ...safeUpdateData,
            },
          });
        } else {
          config = await prisma.storeConfig.update({
            where: { id: config.id },
            data: safeUpdateData,
          });
        }
      } else {
        throw error;
      }
    }

    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error updating store config:', error);
    // Log more details in development
    if (process.env.NODE_ENV === 'development') {
      const updateDataKeys = body ? Object.keys(body) : [];
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        updateDataKeys,
        bodyKeys: body ? Object.keys(body).slice(0, 10) : [],
      });
    }
    
    // Provide more specific error messages
    let errorMessage = 'Failed to update store configuration';
    if (error.code === 'P2002') {
      errorMessage = 'A unique constraint violation occurred. Please check your input.';
    } else if (error.code === 'P2025') {
      errorMessage = 'Record not found. Please refresh and try again.';
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid reference. Please check your input.';
    } else if (error.message?.includes('Unknown argument')) {
      // Prisma validation error - unknown field
      const fieldMatch = error.message.match(/Unknown argument `(\w+)`/);
      if (fieldMatch) {
        errorMessage = `Invalid field: ${fieldMatch[1]}. This field may not exist in the schema.`;
      } else {
        errorMessage = error.message;
      }
    } else if (error.message?.includes('Invalid value')) {
      // Prisma type validation error
      errorMessage = `Invalid value provided: ${error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new AppError(errorMessage, 500);
  }
};

/**
 * Apply store preset (mastermind only)
 */
export const applyStorePreset = async (req: NextRequest): Promise<NextResponse> => {
  // Check authentication
  const authResult = authenticate(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  
  // Check if user is mastermind
  const mastermindCheck = requireMastermind(user);
  if (mastermindCheck) {
    return mastermindCheck;
  }

  try {
    const body = await req.json();
    const { preset, storeType } = body;
    
    // Get existing config or create new one
    let config = await prisma.storeConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // If storeType is provided, just update the storeType (simpler preset)
    if (storeType) {
      const updateData: any = {
        storeType,
        updatedAt: new Date(),
      };

      if (!config) {
        config = await prisma.storeConfig.create({
          data: {
            storeName: 'MakeYourPlatform',
            storeType,
            primaryColor: '221 83% 53%',
            ...updateData,
          },
        });
      } else {
        config = await prisma.storeConfig.update({
          where: { id: config.id },
          data: updateData,
        });
      }

      return NextResponse.json(config);
    }

    // If full preset object is provided, use it
    if (!preset) {
      throw new AppError('Either preset or storeType is required', 400);
    }

    // MERGE with existing config instead of replacing - preserve general info like storeName, tagline, description
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Process preset fields - dynamically get all boolean fields from preset
    // This allows us to accept any feature flag without maintaining a hardcoded list
    const validFields = new Set<string>();
    
    // Add all feature flags (any field ending with Enabled)
    Object.keys(preset).forEach(key => {
      if (key.endsWith('Enabled') || 
          ['storeType', 'primaryColor', 'secondaryColor', 'accentColor'].includes(key)) {
        validFields.add(key);
      }
    });

    // Only include valid fields from preset (merge, don't replace)
    for (const [key, value] of Object.entries(preset)) {
      if (validFields.has(key) && value !== undefined) {
        // Convert boolean strings to actual booleans
        if (key.endsWith('Enabled') && typeof value === 'string') {
          updateData[key] = value === 'true' || value === '1';
        } else {
          updateData[key] = value;
        }
      }
    }

    // Ensure storeType is set if provided
    if (preset.storeType) {
      updateData.storeType = preset.storeType;
    }

    // Ensure primaryColor is set if provided
    if (preset.primaryColor) {
      updateData.primaryColor = preset.primaryColor;
    }

    if (!config) {
      // Create new config with preset data
      config = await prisma.storeConfig.create({
        data: {
          storeName: 'MakeYourPlatform',
          primaryColor: '221 83% 53%',
          ...updateData,
        },
      });
    } else {
      // UPDATE existing config - merge preset features with existing general info
      // This preserves storeName, tagline, description, etc.
      // Prisma update only changes specified fields, others remain unchanged
      config = await prisma.storeConfig.update({
        where: { id: config.id },
        data: updateData, // Only update preset-related fields, keep everything else
      });
      
      // Fetch the full updated config to ensure all fields are returned
      config = await prisma.storeConfig.findUnique({
        where: { id: config.id },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error applying store preset:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to apply store preset', 500);
  }
};
