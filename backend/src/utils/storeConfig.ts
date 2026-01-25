import { prisma } from './db';

/**
 * Get the current store configuration
 */
export const getStoreConfig = async () => {
  try {
    const config = await (prisma as any).storeConfig.findFirst({
      orderBy: { updatedAt: 'desc' },
    });
    return config;
  } catch (error) {
    // Return null if config doesn't exist or error
    return null;
  }
};

/**
 * Check if a feature is enabled in store config
 */
export const isFeatureEnabled = async (featureName: string): Promise<boolean> => {
  try {
    const config = await getStoreConfig();
    if (!config) {
      // Default to true for most features if config doesn't exist (backward compatibility)
      return true;
    }
    
    // Check the feature flag
    const isEnabled = config[featureName];
    
    // Return true if explicitly enabled, false if explicitly disabled, default to false for new features
    return isEnabled === true;
  } catch (error) {
    // On error, default to false for safety
    return false;
  }
};

/**
 * Get multiple feature flags at once
 */
export const getFeatureFlags = async (featureNames: string[]): Promise<Record<string, boolean>> => {
  try {
    const config = await getStoreConfig();
    if (!config) {
      // Return all false if config doesn't exist
      return featureNames.reduce((acc, name) => {
        acc[name] = false;
        return acc;
      }, {} as Record<string, boolean>);
    }
    
    const flags: Record<string, boolean> = {};
    for (const name of featureNames) {
      flags[name] = config[name] === true;
    }
    
    return flags;
  } catch (error) {
    // Return all false on error
    return featureNames.reduce((acc, name) => {
      acc[name] = false;
      return acc;
    }, {} as Record<string, boolean>);
  }
};

/**
 * Middleware to check if a feature is enabled
 */
export const requireFeature = (featureName: string) => {
  return async (_req: any, res: any, next: any) => {
    try {
      const isEnabled = await isFeatureEnabled(featureName);
      if (!isEnabled) {
        return res.status(403).json({
          success: false,
          error: `Feature "${featureName}" is not enabled for this store`,
        });
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
