import PaymentMethodId from './paymentMethod/PaymentMethodId';

export interface PaymentPreloaderConfig {
    // Payment methods that are safe to preload in the background
    preloadableMethodIds: string[];
    
    // Payment methods that should NOT be preloaded (can cause issues)
    nonPreloadableMethodIds: string[];
    
    // Delay before starting preloading (in milliseconds)
    preloadDelay: number;
    
    // Delay between individual method preloads (in milliseconds)
    methodPreloadDelay: number;
    
    // Whether preloading is enabled
    enabled: boolean;
}

export const DEFAULT_PAYMENT_PRELOADER_CONFIG: PaymentPreloaderConfig = {
    preloadableMethodIds: [
        PaymentMethodId.PaypalCommerce,
        PaymentMethodId.PaypalCommerceCreditCards,
        PaymentMethodId.Braintree,
        PaymentMethodId.StripeV3,
        PaymentMethodId.StripeUPE,
        PaymentMethodId.SquareV2,
        PaymentMethodId.AmazonPay,
        PaymentMethodId.Afterpay,
        PaymentMethodId.Clearpay,
        PaymentMethodId.Klarna,
        PaymentMethodId.Affirm,
        PaymentMethodId.Sezzle,
        PaymentMethodId.Zip,
        PaymentMethodId.Quadpay,
        PaymentMethodId.Laybuy,
        PaymentMethodId.Humm,
    ],
    
    nonPreloadableMethodIds: [
        PaymentMethodId.Bolt, // Requires user interaction
        PaymentMethodId.ApplePay, // Requires device capabilities check
        PaymentMethodId.ChasePay, // Requires user authentication
        PaymentMethodId.Masterpass, // Requires user authentication
        // Google Pay methods require device capabilities check
        PaymentMethodId.AdyenV2GooglePay,
        PaymentMethodId.AdyenV3GooglePay,
        PaymentMethodId.AuthorizeNetGooglePay,
        PaymentMethodId.BNZGooglePay,
        PaymentMethodId.BraintreeGooglePay,
        PaymentMethodId.PayPalCommerceGooglePay,
        PaymentMethodId.CheckoutcomGooglePay,
        PaymentMethodId.CybersourceV2GooglePay,
        PaymentMethodId.OrbitalGooglePay,
        PaymentMethodId.StripeGooglePay,
        PaymentMethodId.StripeUPEGooglePay,
        PaymentMethodId.WorldpayAccessGooglePay,
        PaymentMethodId.TdOnlineMartGooglePay,
    ],
    
    preloadDelay: 2000, // 2 seconds
    methodPreloadDelay: 100, // 100ms between methods
    enabled: true,
};

// Browser-safe environment variable access
const getEnvVar = (key: string): string | undefined => {
    try {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined' && typeof process === 'undefined') {
            // In browser, try to get from window object or return undefined
            return (window as any)[`__${key}__`] || undefined;
        }
        
        // In Node.js environment
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
        
        return undefined;
    } catch {
        return undefined;
    }
};

// Browser-safe configuration access
const getBrowserConfig = (): Partial<PaymentPreloaderConfig> => {
    try {
        if (typeof window !== 'undefined' && (window as any).__PAYMENT_PRELOADER_CONFIG__) {
            return (window as any).__PAYMENT_PRELOADER_CONFIG__;
        }
        return {};
    } catch {
        return {};
    }
};

// Environment-based configuration
export const getPaymentPreloaderConfig = (): PaymentPreloaderConfig => {
    const config = { ...DEFAULT_PAYMENT_PRELOADER_CONFIG };
    
    // Allow environment variables to override settings (browser-safe)
    const preloaderEnabled = getEnvVar('PAYMENT_PRELOADER_ENABLED');
    if (preloaderEnabled !== undefined) {
        config.enabled = preloaderEnabled === 'true';
    }
    
    const preloadDelay = getEnvVar('PAYMENT_PRELOADER_DELAY');
    if (preloadDelay !== undefined) {
        const delay = parseInt(preloadDelay, 10);
        if (!isNaN(delay)) {
            config.preloadDelay = delay;
        }
    }
    
    const methodPreloadDelay = getEnvVar('PAYMENT_PRELOADER_METHOD_DELAY');
    if (methodPreloadDelay !== undefined) {
        const methodDelay = parseInt(methodPreloadDelay, 10);
        if (!isNaN(methodDelay)) {
            config.methodPreloadDelay = methodDelay;
        }
    }
    
    // Allow browser configuration to override
    const browserConfig = getBrowserConfig();
    if (browserConfig.enabled !== undefined) {
        config.enabled = browserConfig.enabled;
    }
    if (browserConfig.preloadDelay !== undefined) {
        config.preloadDelay = browserConfig.preloadDelay;
    }
    if (browserConfig.methodPreloadDelay !== undefined) {
        config.methodPreloadDelay = browserConfig.methodPreloadDelay;
    }
    if (browserConfig.preloadableMethodIds) {
        config.preloadableMethodIds = browserConfig.preloadableMethodIds;
    }
    if (browserConfig.nonPreloadableMethodIds) {
        config.nonPreloadableMethodIds = browserConfig.nonPreloadableMethodIds;
    }
    
    return config;
}; 