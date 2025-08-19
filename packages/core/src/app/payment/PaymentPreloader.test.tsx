import { PaymentMethod } from '@bigcommerce/checkout-sdk';
import { mount } from 'enzyme';
import React from 'react';

import { CheckoutService } from '@bigcommerce/checkout-sdk';

import PaymentMethodId from './paymentMethod/PaymentMethodId';
import PaymentPreloader from './PaymentPreloader';

describe('PaymentPreloader', () => {
    let defaultProps: {
        methods: PaymentMethod[];
        checkoutService: CheckoutService;
        onUnhandledError: jest.Mock;
    };

    beforeEach(() => {
        defaultProps = {
            methods: [
                {
                    id: PaymentMethodId.PaypalCommerce,
                    gateway: 'paypalcommerce',
                    type: 'PAYMENT_TYPE_API',
                    config: {},
                    method: 'paypal',
                    supportedCards: [],
                    initializationData: {},
                    logoUrl: '',
                    clientToken: undefined,
                    nonce: undefined,
                    returnUrl: undefined,
                },
                {
                    id: PaymentMethodId.Braintree,
                    gateway: 'braintree',
                    type: 'PAYMENT_TYPE_API',
                    config: {},
                    method: 'credit-card',
                    supportedCards: [],
                    initializationData: {},
                    logoUrl: '',
                    clientToken: undefined,
                    nonce: undefined,
                    returnUrl: undefined,
                },
                {
                    id: PaymentMethodId.Bolt,
                    gateway: 'bolt',
                    type: 'PAYMENT_TYPE_API',
                    config: {},
                    method: 'credit-card',
                    supportedCards: [],
                    initializationData: {},
                    logoUrl: '',
                    clientToken: undefined,
                    nonce: undefined,
                    returnUrl: undefined,
                },
            ],
            checkoutService: {
                initializePayment: jest.fn().mockResolvedValue({}),
                deinitializePayment: jest.fn().mockResolvedValue({}),
                subscribe: jest.fn(),
                loadCheckout: jest.fn(),
                loadPaymentMethods: jest.fn(),
                submitOrder: jest.fn(),
                finalizeOrderIfNeeded: jest.fn(),
                applyStoreCredit: jest.fn(),
                clearError: jest.fn(),
            } as any,
            onUnhandledError: jest.fn(),
        };
    });

    it('renders nothing (invisible component)', () => {
        const component = mount(<PaymentPreloader {...defaultProps} />);
        
        expect(component.html()).toBe('');
    });

    it('preloads only safe payment methods', async () => {
        jest.useFakeTimers();
        
        const component = mount(<PaymentPreloader {...defaultProps} />);
        
        // Fast-forward past the initial delay
        jest.advanceTimersByTime(2100);
        
        // Wait for async operations
        await new Promise(resolve => setImmediate(resolve));
        
        // Should only preload PaypalCommerce and Braintree, not Bolt
        expect(defaultProps.checkoutService.initializePayment).toHaveBeenCalledTimes(2);
        expect(defaultProps.checkoutService.initializePayment).toHaveBeenCalledWith({
            gatewayId: 'paypalcommerce',
            methodId: PaymentMethodId.PaypalCommerce,
        });
        expect(defaultProps.checkoutService.initializePayment).toHaveBeenCalledWith({
            gatewayId: 'braintree',
            methodId: PaymentMethodId.Braintree,
        });
        
        jest.useRealTimers();
    });

    it('handles preload errors gracefully', async () => {
        jest.useFakeTimers();
        
        defaultProps.checkoutService.initializePayment = jest.fn().mockRejectedValue(new Error('Preload failed'));
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const component = mount(<PaymentPreloader {...defaultProps} />);
        
        // Fast-forward past the initial delay
        jest.advanceTimersByTime(2100);
        
        // Wait for async operations
        await new Promise(resolve => setImmediate(resolve));
        
        // Should log warning but not call onUnhandledError
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to preload payment method'),
            expect.any(String),
            expect.any(Error)
        );
        expect(defaultProps.onUnhandledError).not.toHaveBeenCalled();
        
        consoleSpy.mockRestore();
        jest.useRealTimers();
    });

    it('does not preload the same method twice', async () => {
        jest.useFakeTimers();
        
        const component = mount(<PaymentPreloader {...defaultProps} />);
        
        // Fast-forward past the initial delay
        jest.advanceTimersByTime(2100);
        
        // Wait for async operations
        await new Promise(resolve => setImmediate(resolve));
        
        // Unmount and remount
        component.unmount();
        
        const newComponent = mount(<PaymentPreloader {...defaultProps} />);
        
        // Fast-forward again
        jest.advanceTimersByTime(2100);
        
        // Wait for async operations
        await new Promise(resolve => setImmediate(resolve));
        
        // Should still only call initializePayment twice (once per method)
        expect(defaultProps.checkoutService.initializePayment).toHaveBeenCalledTimes(2);
        
        jest.useRealTimers();
    });

    it('prevents multiple simultaneous preloading attempts', async () => {
        jest.useFakeTimers();
        
        const component = mount(<PaymentPreloader {...defaultProps} />);
        
        // Fast-forward past the initial delay multiple times
        jest.advanceTimersByTime(2100);
        jest.advanceTimersByTime(2100);
        jest.advanceTimersByTime(2100);
        
        // Wait for async operations
        await new Promise(resolve => setImmediate(resolve));
        
        // Should only preload once despite multiple timer advances
        expect(defaultProps.checkoutService.initializePayment).toHaveBeenCalledTimes(2);
        
        jest.useRealTimers();
    });

    it('cleans up timeout on unmount', () => {
        jest.useFakeTimers();
        
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        
        const component = mount(<PaymentPreloader {...defaultProps} />);
        component.unmount();
        
        expect(clearTimeoutSpy).toHaveBeenCalled();
        
        clearTimeoutSpy.mockRestore();
        jest.useRealTimers();
    });
}); 