import { PaymentMethod } from '@bigcommerce/checkout-sdk';
import { noop } from 'lodash';
import React, { useEffect, useRef } from 'react';

import { CheckoutContextProps } from '@bigcommerce/checkout/payment-integration-api';

import { getPaymentPreloaderConfig, PaymentPreloaderConfig } from './PaymentPreloaderConfig';

interface PaymentPreloaderProps {
    methods: PaymentMethod[];
    checkoutService: CheckoutContextProps['checkoutService'];
    onUnhandledError?: (error: Error) => void;
    config?: Partial<PaymentPreloaderConfig>;
}

const PaymentPreloader: React.FC<PaymentPreloaderProps> = ({
    methods,
    checkoutService,
    onUnhandledError = noop,
    config: customConfig,
}) => {
    const preloadedMethods = useRef<Set<string>>(new Set());
    const isPreloading = useRef(false);

    useEffect(() => {
        let config: PaymentPreloaderConfig;
        
        try {
            // Merge default config with custom config
            config = { ...getPaymentPreloaderConfig(), ...customConfig };
        } catch (error) {
            console.warn('[PaymentPreloader] Failed to load configuration, using defaults:', error);
            config = { ...getPaymentPreloaderConfig() };
        }

        // Skip if preloading is disabled
        if (!config.enabled) {
            return;
        }

        const preloadCommonMethods = async () => {
            // Prevent multiple preloading attempts
            if (isPreloading.current) {
                return;
            }

            isPreloading.current = true;

            try {
                // Filter methods that are safe to preload
                const preloadableMethods = methods.filter(method => {
                    const methodId = method.id;
                    const isPreloadable = config.preloadableMethodIds.includes(methodId);
                    const isNotPreloadable = config.nonPreloadableMethodIds.includes(methodId);
                    const alreadyPreloaded = preloadedMethods.current.has(methodId);
                    
                    // Additional safety check: never preload PayPal methods
                    const isPayPalMethod = methodId.toLowerCase().includes('paypal') || 
                                         methodId.toLowerCase().includes('paypalcommerce');
                    
                    return isPreloadable && !isNotPreloadable && !alreadyPreloaded && !isPayPalMethod;
                });

                if (preloadableMethods.length === 0) {
                    return;
                }

                console.log('[PaymentPreloader] Preloading payment methods:', 
                    preloadableMethods.map(m => m.id));

                // Preload each method in parallel with configurable delay
                const preloadPromises = preloadableMethods.map(async (method, index) => {
                    try {
                        // Add configurable delay between preloads
                        if (config.methodPreloadDelay > 0) {
                            await new Promise(resolve => setTimeout(resolve, index * config.methodPreloadDelay));
                        }

                        // Initialize payment method without blocking UI
                        await checkoutService.initializePayment({
                            gatewayId: method.gateway,
                            methodId: method.id,
                        });

                        // Mark as preloaded
                        preloadedMethods.current.add(method.id);
                        
                        console.log('[PaymentPreloader] Successfully preloaded:', method.id);
                    } catch (error) {
                        // Silently handle preload errors - they shouldn't affect the main flow
                        console.warn('[PaymentPreloader] Failed to preload payment method:', method.id, error);
                        
                        // Still mark as attempted to avoid retrying
                        preloadedMethods.current.add(method.id);
                    }
                });

                // Wait for all preloads to complete (but don't block UI)
                await Promise.allSettled(preloadPromises);

            } catch (error) {
                console.warn('[PaymentPreloader] Error during preloading:', error);
                // Don't call onUnhandledError for preload failures as they shouldn't affect main flow
            } finally {
                isPreloading.current = false;
            }
        };

        // Start preloading after configurable delay
        const preloadTimeout = setTimeout(preloadCommonMethods, config.preloadDelay);

        return () => {
            clearTimeout(preloadTimeout);
        };
    }, [methods, checkoutService, onUnhandledError, customConfig]);

    // This component doesn't render anything
    return null;
};

export default PaymentPreloader; 