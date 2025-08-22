// Browser-safe environment variable access for insurance configuration
export const getInsuranceConfig = () => {
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

  return {
    productId: getEnvVar('INSURANCE_PRODUCT_ID') || '',
    productPrice: getEnvVar('INSURANCE_PRODUCT_PRICE') || '',
    advancedCachingEnabled: getEnvVar('INSURANCE_ADVANCED_CACHING') === 'true',
  };
};
