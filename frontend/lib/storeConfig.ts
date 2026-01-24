/**
 * Store configuration utilities
 */

/**
 * Decode HTML entities in a string (e.g., &#x27; -> ', &quot; -> ", &amp; -> &)
 * Only works in browser environment
 */
function decodeHtmlEntities(str: string): string {
  if (typeof window === 'undefined') {
    // SSR - use simple regex replacement for common entities
    return str
      .replace(/&#x27;/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }
  // Safe HTML entity decoding using textarea pattern
  // This is safe because:
  // 1. The textarea is never inserted into the DOM
  // 2. We only extract the .value property (not innerHTML)
  // 3. The input comes from a trusted source (API, already sanitized)
  const textarea = document.createElement('textarea');
  // Additional safety: validate input is a string and not empty
  if (typeof str !== 'string' || str.length === 0) {
    return str;
  }
  textarea.textContent = str; // Use textContent instead of innerHTML for extra safety
  return textarea.value || str; // Fallback to original if decoding fails
}

export interface Feature {
  title: string;
  description: string;
  icon?: string;
}

export interface NavigationItem {
  label: string;
  url: string;
  visible: boolean;
}

export interface StoreConfig {
  id: string;
  storeName: string;
  storeType: string;
  tagline?: string;
  description?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  themePreset?: string; // Predefined theme ID
  logoUrl?: string;
  faviconUrl?: string;
  bannerImageUrl?: string;
  currency: string;
  currencySymbol: string;
  country?: string;
  language: string;
  email?: string;
  phone?: string;
  address?: string;
  businessHours?: string | { 'monday-friday'?: string; saturday?: string; sunday?: string };
  facebookUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  footerText?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  // Homepage Content
  heroTitle?: string;
  heroSubtitle?: string;
  heroButtonText?: string;
  heroButton2Text?: string;
  heroButton2Url?: string;
  // Hero Background Particles
  heroParticlesEnabled?: boolean;
  heroParticlesDensity?: number;
  heroParticlesSpeed?: number;
  heroParticlesColor?: string;
  heroParticlesType?: 'dots' | 'stars' | 'lines';
  // Features Section
  featuresEnabled?: boolean;
  featuresJson?: Feature[];
  // Homepage Sections Visibility
  showHero?: boolean;
  showFeatures?: boolean;
  showFeaturedProducts?: boolean;
  showRecentlyViewed?: boolean;
  // Featured Products Section
  featuredProductsTitle?: string;
  featuredProductsSubtitle?: string;
  featuredProductsLimit?: number;
  // Feature Flags
  chatbotEnabled?: boolean;
  wishlistEnabled?: boolean;
  reviewsEnabled?: boolean;
  notificationsEnabled?: boolean;
  recentlyViewedEnabled?: boolean;
  shippingEnabled?: boolean;
  pickupEnabled?: boolean;
  payAtStoreEnabled?: boolean;
  bookReservationEnabled?: boolean;
  helpPageEnabled?: boolean;
  privacyPageEnabled?: boolean;
  termsPageEnabled?: boolean;
  footerEnabled?: boolean;
  socialMediaEnabled?: boolean;
  themeToggleEnabled?: boolean;
  cartEnabled?: boolean;
  // Product Feature Flags
  productVariantsEnabled?: boolean;
  productCategoriesEnabled?: boolean;
  relatedProductsEnabled?: boolean;
  productSearchEnabled?: boolean;
  inventoryManagementEnabled?: boolean;
  // POS Feature Flags
  posEnabled?: boolean;
  employeeTimeTrackingEnabled?: boolean;
  posEmployeeManagementEnabled?: boolean;
  // Communication Feature Flags
  contactFormEnabled?: boolean;
  liveChatEnabled?: boolean;
  orderTrackingEnabled?: boolean;
  emailNotificationsEnabled?: boolean;
  // Advanced/Premium Feature Flags
  searchAutocompleteEnabled?: boolean;
  productQuickViewEnabled?: boolean;
  imageZoomEnabled?: boolean;
  backInStockNotificationsEnabled?: boolean;
  printReceiptEnabled?: boolean;
  breadcrumbsNavigationEnabled?: boolean;
  advancedPaginationEnabled?: boolean;
  savedPaymentMethodsEnabled?: boolean;
  multipleAddressesEnabled?: boolean;
  // Restaurant/Food & Beverage Feature Flags
  tableReservationsEnabled?: boolean;
  menuBuilderEnabled?: boolean;
  dietaryFiltersEnabled?: boolean;
  prepTimeEnabled?: boolean;
  deliveryTimeEnabled?: boolean;
  ingredientListEnabled?: boolean;
  allergenWarningsEnabled?: boolean;
  mealComboBuilderEnabled?: boolean;
  nutritionalInfoEnabled?: boolean;
  orderSchedulingEnabled?: boolean;
  multiLocationEnabled?: boolean;
  tippingEnabled?: boolean;
  loyaltyStampsEnabled?: boolean;
  // Marketing & Promotions Feature Flags
  promoCodesEnabled?: boolean;
  promotionalDiscountEnabled?: boolean;
  promotionalDiscountType?: string; // 'percentage' or 'fixed'
  promotionalDiscountValue?: number;
  promotionalDiscountValidFrom?: string;
  promotionalDiscountValidUntil?: string;
  promotionalDiscountActive?: boolean;
  // Store Pickup Address
  storePickupAddress?: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
    hours?: string;
  };
  // Payment Method Feature Flags
  stripeEnabled?: boolean;
  paypalEnabled?: boolean;
  applePayEnabled?: boolean;
  googlePayEnabled?: boolean;
  amazonPayEnabled?: boolean;
  bkashEnabled?: boolean;
  nagadEnabled?: boolean;
  rocketEnabled?: boolean;
  bitcoinEnabled?: boolean;
  ethereumEnabled?: boolean;
  manualCreditCardEnabled?: boolean;
  
  // Feature Flags - Service-Based Businesses
  appointmentBookingEnabled?: boolean;
  servicePackagesEnabled?: boolean;
  staffManagementEnabled?: boolean;
  serviceDurationEnabled?: boolean;
  clientHistoryEnabled?: boolean;
  recurringAppointmentsEnabled?: boolean;
  resourceBookingEnabled?: boolean;
  serviceAddonsEnabled?: boolean;
  cancellationPoliciesEnabled?: boolean;
  serviceRemindersEnabled?: boolean;
  beforeAfterPhotosEnabled?: boolean;
  serviceAreasEnabled?: boolean;
  
  // Feature Flags - Subscription Businesses
  subscriptionPlansEnabled?: boolean;
  recurringBillingEnabled?: boolean;
  trialPeriodsEnabled?: boolean;
  planUpgradesDowngradesEnabled?: boolean;
  pauseResumeSubscriptionsEnabled?: boolean;
  subscriptionDashboardEnabled?: boolean;
  prorationEnabled?: boolean;
  dunningManagementEnabled?: boolean;
  giftSubscriptionsEnabled?: boolean;
  familyGroupPlansEnabled?: boolean;
  
  // Feature Flags - Appointment-Based Businesses
  advancedCalendarEnabled?: boolean;
  bufferTimesEnabled?: boolean;
  waitingListsEnabled?: boolean;
  classWorkshopBookingsEnabled?: boolean;
  serviceCategoriesEnabled?: boolean;
  intakeFormsEnabled?: boolean;
  videoConsultationsEnabled?: boolean;
  appointmentRemindersEnabled?: boolean;
  noShowTrackingEnabled?: boolean;
  staffAvailabilityEnabled?: boolean;
  
  // Feature Flags - Digital Products
  instantDigitalDeliveryEnabled?: boolean;
  licenseKeyManagementEnabled?: boolean;
  downloadLimitsEnabled?: boolean;
  fileHostingEnabled?: boolean;
  courseProgressTrackingEnabled?: boolean;
  accessExpirationEnabled?: boolean;
  bulkLicensePurchasesEnabled?: boolean;
  affiliateSystemEnabled?: boolean;
  softwareUpdatesEnabled?: boolean;
  previewFreeSamplesEnabled?: boolean;
  
  // Feature Flags - Rental Businesses
  rentalDurationSelectionEnabled?: boolean;
  dateRangePickerEnabled?: boolean;
  availabilityCalendarEnabled?: boolean;
  depositSecurityHoldEnabled?: boolean;
  lateReturnFeesEnabled?: boolean;
  deliveryPickupSchedulingEnabled?: boolean;
  damageReportingEnabled?: boolean;
  rentalAgreementsEnabled?: boolean;
  maintenanceSchedulingEnabled?: boolean;
  rentalWaitingListsEnabled?: boolean;
  
  // Feature Flags - Marketplace/Multi-Vendor
  marketplaceEnabled?: boolean;
  vendorRegistrationEnabled?: boolean;
  commissionManagementEnabled?: boolean;
  vendorDashboardEnabled?: boolean;
  vendorReviewsEnabled?: boolean;
  splitPaymentsEnabled?: boolean;
  vendorAnalyticsEnabled?: boolean;
  vendorStorefrontsEnabled?: boolean;
  vendorMessagingEnabled?: boolean;
  disputeResolutionEnabled?: boolean;
  
  // Feature Flags - Event & Ticket Businesses
  eventCalendarEnabled?: boolean;
  seatTableSelectionEnabled?: boolean;
  ticketTypesEnabled?: boolean;
  eventCapacityManagementEnabled?: boolean;
  earlyBirdPricingEnabled?: boolean;
  groupDiscountsEnabled?: boolean;
  eventRemindersEnabled?: boolean;
  qrCodeTicketsEnabled?: boolean;
  eventWaitlistEnabled?: boolean;
  eventHostingEnabled?: boolean;
  eventPackagesEnabled?: boolean;
  
  // Feature Flags - Local Delivery Businesses
  deliveryZonesEnabled?: boolean;
  deliveryFeeCalculatorEnabled?: boolean;
  sameDayDeliveryEnabled?: boolean;
  deliveryDriverManagementEnabled?: boolean;
  realTimeTrackingEnabled?: boolean;
  deliveryInstructionsEnabled?: boolean;
  tipForDriverEnabled?: boolean;
  multiAddressOrdersEnabled?: boolean;
  scheduledDeliveriesEnabled?: boolean;
  minimumOrderFreeDeliveryEnabled?: boolean;
  
  // Feature Flags - Craft & Handmade Businesses
  customizationOptionsEnabled?: boolean;
  madeToOrderItemsEnabled?: boolean;
  customQuoteRequestsEnabled?: boolean;
  productionStatusEnabled?: boolean;
  materialsOriginInfoEnabled?: boolean;
  artistBrandStoriesEnabled?: boolean;
  commissionRequestsEnabled?: boolean;
  limitedEditionsEnabled?: boolean;
  inProgressPhotosEnabled?: boolean;
  backorderSupportEnabled?: boolean;
  
  // Feature Flags - B2B/Wholesale Businesses
  wholesalePricingTiersEnabled?: boolean;
  businessAccountRegistrationEnabled?: boolean;
  creditTermsEnabled?: boolean;
  poSupportEnabled?: boolean;
  bulkOrderFormsEnabled?: boolean;
  minimumOrderQuantitiesEnabled?: boolean;
  catalogPricingEnabled?: boolean;
  taxExemptHandlingEnabled?: boolean;
  salesRepAssignmentEnabled?: boolean;
  creditLimitsEnabled?: boolean;
  
  // Feature Flags - General E-Commerce Enhancements
  abandonedCartRecoveryEnabled?: boolean;
  productComparisonEnabled?: boolean;
  bulkOrderingEnabled?: boolean;
  preOrdersEnabled?: boolean;
  customerGroupsEnabled?: boolean;
  advancedFilteringEnabled?: boolean;
  giftRegistryEnabled?: boolean;
  socialSharingEnabled?: boolean;
  multiWarehouseInventoryEnabled?: boolean;
  barcodeQrScanningEnabled?: boolean;
  advancedAnalyticsEnabled?: boolean;
  emailMarketingIntegrationEnabled?: boolean;
  smsNotificationsEnabled?: boolean;
  customerSupportTicketsEnabled?: boolean;
  productQAEnabled?: boolean;
  videoProductDemosEnabled?: boolean;
  product360ViewsEnabled?: boolean;
  arVrProductPreviewEnabled?: boolean;
  
  // Feature Flags - ERP Modules (Mastermind Configurable)
  accountingEnabled?: boolean;
  crmEnabled?: boolean;
  projectsEnabled?: boolean;
  hrEnabled?: boolean;
  documentManagementEnabled?: boolean;
  workflowsEnabled?: boolean;
  aiInsightsEnabled?: boolean;
  businessIntelligenceEnabled?: boolean;

  // Navigation
  navigationItems?: NavigationItem[];
  createdAt: string;
  updatedAt: string;
}

let storeConfigCache: StoreConfig | null = null;

/**
 * Get default store configuration
 */
function getDefaultConfig(): StoreConfig {
  return {
    id: 'default',
    storeName: 'ModernShop',
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
      payAtStoreEnabled: false,
      bookReservationEnabled: false,
      helpPageEnabled: true,
      privacyPageEnabled: true,
      termsPageEnabled: true,
      footerEnabled: true,
      socialMediaEnabled: true,
      themeToggleEnabled: true,
      cartEnabled: true,
      featuredProductsLimit: 8,
      // Payment Method Feature Flags
      stripeEnabled: true,
      paypalEnabled: false,
      applePayEnabled: false,
      googlePayEnabled: false,
      amazonPayEnabled: false,
      bkashEnabled: false,
      nagadEnabled: false,
      rocketEnabled: false,
      bitcoinEnabled: false,
      ethereumEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
  } as StoreConfig;
}

/**
 * Get store configuration from API
 */
export async function getStoreConfig(): Promise<StoreConfig> {
  // Only use cache on client side
  if (typeof window !== 'undefined' && storeConfigCache) {
    return storeConfigCache;
  }

  // Return default config during SSR
  if (typeof window === 'undefined') {
    return getDefaultConfig();
  }

  try {
    const response = await fetch('/api/store-config/public', {
      cache: 'no-store',
    });
    
    if (!response.ok) {
      // Don't throw - just return default config
      console.warn('Failed to fetch store config, using defaults:', response.status, response.statusText);
      return getDefaultConfig();
    }
    
    const config = await response.json();
    
    // Decode HTML entities in display text fields (for existing data that might be escaped)
    if (config.storeName) {
      config.storeName = decodeHtmlEntities(config.storeName);
    }
    if (config.tagline) {
      config.tagline = decodeHtmlEntities(config.tagline);
    }
    if (config.description) {
      config.description = decodeHtmlEntities(config.description);
    }
    // Decode other display text fields as needed
    const textFields = ['heroTitle', 'heroSubtitle', 'heroButtonText', 'heroButton2Text', 
                       'featuredProductsTitle', 'featuredProductsSubtitle', 'footerText',
                       'metaTitle', 'metaDescription', 'metaKeywords', 'address'];
    textFields.forEach(field => {
      if (config[field]) {
        config[field] = decodeHtmlEntities(config[field]);
      }
    });
    
    storeConfigCache = config;
    return config;
  } catch (error) {
    // Network or other errors - return default config
    console.warn('Error fetching store config, using defaults:', error);
    // Return default config on error
    return getDefaultConfig();
  }
}

/**
 * Apply store configuration to CSS variables
 */
export function applyStoreConfig(config: StoreConfig) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  
  // Use colors from config (they're already set from theme preset if selected)
  // The mastermind config page handles setting colors when a theme is selected
  const primaryColor = config.primaryColor;
  const secondaryColor = config.secondaryColor;
  const accentColor = config.accentColor;
  
  // Apply primary color
  root.style.setProperty('--primary', primaryColor);
  
  // Apply ring color to match primary color (used for focus rings)
  root.style.setProperty('--ring', primaryColor);
  
  // Apply secondary color if available
  if (secondaryColor) {
    root.style.setProperty('--secondary', secondaryColor);
  } else {
    // Reset to default if not provided
    root.style.removeProperty('--secondary');
  }
  
  // Apply accent color if available
  if (accentColor) {
    root.style.setProperty('--accent', accentColor);
  } else {
    // Reset to default if not provided
    root.style.removeProperty('--accent');
  }
  
  // Apply favicon if available
  if (config.faviconUrl) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = config.faviconUrl;
    } else {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = config.faviconUrl;
      document.head.appendChild(newLink);
    }
  }
}

/**
 * Clear store config cache (useful after updates)
 */
export function clearStoreConfigCache() {
  storeConfigCache = null;
}
