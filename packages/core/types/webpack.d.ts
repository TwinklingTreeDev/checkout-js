declare let __webpack_public_path__: string;

// Environment variables injected by webpack DefinePlugin
declare namespace NodeJS {
  interface ProcessEnv {
    INSURANCE_PRODUCT_ID?: string;
    INSURANCE_PRODUCT_PRICE?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
  }
}
