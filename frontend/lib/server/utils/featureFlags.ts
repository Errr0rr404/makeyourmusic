// Feature flag helper - returns true for all features in ERP
// Note: storeConfig model doesn't exist in ERP schema, so we enable all features by default

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function checkFeatureFlag(flagName: string): Promise<boolean> {
  // All features enabled for ERP system
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isFeatureEnabled(flagName: string): boolean {
  // All features enabled for ERP system
  return true;
}
