import { NextRequest, NextResponse } from 'next/server';

/**
 * Default ERP configuration (storeConfig model doesn't exist in ERP schema)
 */
const defaultConfig = {
  id: 'default',
  storeName: 'Kairux ERP',
  storeType: 'erp',
  primaryColor: '221 83% 53%',
  currency: 'USD',
  currencySymbol: '$',
  country: 'US',
  language: 'en',
  showHero: true,
  showFeatures: true,
  featuresEnabled: true,
  posEmployeeManagementEnabled: true,
  advancedReportsEnabled: true,
  payrollEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Get store configuration (returns default ERP config)
 */
export const getStoreConfig = async (): Promise<NextResponse> => {
  return NextResponse.json(defaultConfig);
};

/**
 * Get store configuration for caching (returns default ERP config)
 */
export const getStoreConfigCached = async (): Promise<NextResponse> => {
  return NextResponse.json(defaultConfig);
};

/**
 * Get admin store configuration (returns default ERP config)
 */
export const getStoreConfigAdmin = async (): Promise<NextResponse> => {
  return NextResponse.json(defaultConfig);
};

/**
 * Update store configuration (no-op for ERP, returns current config)
 */
export const updateStoreConfig = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = await req.json();
    // Return merged config (doesn't persist since model doesn't exist)
    return NextResponse.json({
      ...defaultConfig,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(defaultConfig);
  }
};

/**
 * Update theme preset (no-op for ERP)
 */
export const updateThemePreset = async (req: NextRequest): Promise<NextResponse> => {
  try {
    const body = await req.json();
    return NextResponse.json({
      ...defaultConfig,
      themePreset: body.themePreset || 'default',
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(defaultConfig);
  }
};
