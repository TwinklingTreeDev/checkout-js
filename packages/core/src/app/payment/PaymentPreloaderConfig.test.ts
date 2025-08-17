import { getPaymentPreloaderConfig, DEFAULT_PAYMENT_PRELOADER_CONFIG } from './PaymentPreloaderConfig';

describe('PaymentPreloaderConfig', () => {
    let originalProcess: any;
    let originalWindow: any;

    beforeEach(() => {
        // Save original globals
        originalProcess = global.process;
        originalWindow = global.window;
    });

    afterEach(() => {
        // Restore original globals
        global.process = originalProcess;
        global.window = originalWindow;
        
        // Clean up any test configurations
        if (global.window) {
            delete (global.window as any).__PAYMENT_PRELOADER_CONFIG__;
            delete (global.window as any).__PAYMENT_PRELOADER_ENABLED__;
            delete (global.window as any).__PAYMENT_PRELOADER_DELAY__;
            delete (global.window as any).__PAYMENT_PRELOADER_METHOD_DELAY__;
        }
    });

    it('returns default config when no environment variables are set', () => {
        // Mock browser environment
        global.process = undefined;
        global.window = {};

        const config = getPaymentPreloaderConfig();
        
        expect(config).toEqual(DEFAULT_PAYMENT_PRELOADER_CONFIG);
    });

    it('handles Node.js environment variables', () => {
        // Mock Node.js environment
        global.process = {
            env: {
                PAYMENT_PRELOADER_ENABLED: 'false',
                PAYMENT_PRELOADER_DELAY: '5000',
                PAYMENT_PRELOADER_METHOD_DELAY: '200',
            },
        };
        global.window = undefined;

        const config = getPaymentPreloaderConfig();
        
        expect(config.enabled).toBe(false);
        expect(config.preloadDelay).toBe(5000);
        expect(config.methodPreloadDelay).toBe(200);
    });

    it('handles browser window configuration', () => {
        // Mock browser environment with window config
        global.process = undefined;
        global.window = {
            __PAYMENT_PRELOADER_CONFIG__: {
                enabled: false,
                preloadDelay: 3000,
                methodPreloadDelay: 150,
            },
        };

        const config = getPaymentPreloaderConfig();
        
        expect(config.enabled).toBe(false);
        expect(config.preloadDelay).toBe(3000);
        expect(config.methodPreloadDelay).toBe(150);
    });

    it('handles browser environment variables', () => {
        // Mock browser environment with individual env vars
        global.process = undefined;
        global.window = {
            __PAYMENT_PRELOADER_ENABLED__: 'false',
            __PAYMENT_PRELOADER_DELAY__: '4000',
            __PAYMENT_PRELOADER_METHOD_DELAY__: '250',
        };

        const config = getPaymentPreloaderConfig();
        
        expect(config.enabled).toBe(false);
        expect(config.preloadDelay).toBe(4000);
        expect(config.methodPreloadDelay).toBe(250);
    });

    it('prioritizes browser config over environment variables', () => {
        // Mock mixed environment
        global.process = {
            env: {
                PAYMENT_PRELOADER_ENABLED: 'true',
                PAYMENT_PRELOADER_DELAY: '1000',
            },
        };
        global.window = {
            __PAYMENT_PRELOADER_CONFIG__: {
                enabled: false,
                preloadDelay: 5000,
            },
        };

        const config = getPaymentPreloaderConfig();
        
        // Browser config should take precedence
        expect(config.enabled).toBe(false);
        expect(config.preloadDelay).toBe(5000);
        expect(config.methodPreloadDelay).toBe(DEFAULT_PAYMENT_PRELOADER_CONFIG.methodPreloadDelay);
    });

    it('handles invalid numeric values gracefully', () => {
        // Mock browser environment with invalid values
        global.process = undefined;
        global.window = {
            __PAYMENT_PRELOADER_DELAY__: 'invalid',
            __PAYMENT_PRELOADER_METHOD_DELAY__: 'not-a-number',
        };

        const config = getPaymentPreloaderConfig();
        
        // Should fall back to defaults
        expect(config.preloadDelay).toBe(DEFAULT_PAYMENT_PRELOADER_CONFIG.preloadDelay);
        expect(config.methodPreloadDelay).toBe(DEFAULT_PAYMENT_PRELOADER_CONFIG.methodPreloadDelay);
    });

    it('handles errors gracefully', () => {
        // Mock environment that throws errors
        global.process = undefined;
        global.window = {
            get __PAYMENT_PRELOADER_CONFIG__() {
                throw new Error('Access denied');
            },
        };

        const config = getPaymentPreloaderConfig();
        
        // Should return default config
        expect(config).toEqual(DEFAULT_PAYMENT_PRELOADER_CONFIG);
    });
}); 