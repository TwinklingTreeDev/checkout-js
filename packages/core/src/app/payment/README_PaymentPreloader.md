# Payment Preloader

The Payment Preloader is a background service that preloads common payment methods to improve the user experience when switching between payment options.

## Overview

The Payment Preloader addresses the delay issue when switching between payment methods by:

1. **Background Initialization**: Preloads payment methods in the background without blocking the UI
2. **Smart Method Selection**: Only preloads safe payment methods that don't require user interaction
3. **Configurable Behavior**: Allows customization of which methods to preload and timing
4. **Error Handling**: Gracefully handles preload failures without affecting the main payment flow

## Benefits

- ✅ **Instant Payment Method Switching**: Users can switch between payment methods without delay
- ✅ **Improved UX**: No waiting for iframe rendering or initialization
- ✅ **Resource Efficiency**: Only preloads commonly used payment methods
- ✅ **Safe Implementation**: Excludes payment methods that require user interaction
- ✅ **Configurable**: Easy to customize behavior via environment variables

## How It Works

1. **Component Mount**: PaymentPreloader component mounts with the Payment component
2. **Delay**: Waits for a configurable delay (default: 2 seconds) to ensure main payment flow is ready
3. **Method Filtering**: Filters available payment methods to only include safe, preloadable ones
4. **Background Preloading**: Initializes each method in the background with small delays between them
5. **Error Handling**: Logs warnings for failed preloads but doesn't affect the main flow

## Configuration

### Environment Variables

```bash
# Enable/disable preloading (default: true)
PAYMENT_PRELOADER_ENABLED=true

# Delay before starting preloading in milliseconds (default: 2000)
PAYMENT_PRELOADER_DELAY=2000

# Delay between individual method preloads in milliseconds (default: 100)
PAYMENT_PRELOADER_METHOD_DELAY=100
```

### Browser Configuration

For browser environments, you can also configure via the window object:

```javascript
// Configure before the PaymentPreloader loads
window.__PAYMENT_PRELOADER_CONFIG__ = {
    enabled: true,
    preloadDelay: 3000,
    methodPreloadDelay: 150,
    preloadableMethodIds: ['braintree', 'stripev3'],
    nonPreloadableMethodIds: ['bolt', 'applepay']
};

// Or set individual environment variables
window.__PAYMENT_PRELOADER_ENABLED__ = 'true';
window.__PAYMENT_PRELOADER_DELAY__ = '2000';
window.__PAYMENT_PRELOADER_METHOD_DELAY__ = '100';
```

### Emergency Disable

For emergency situations, you can globally disable the PaymentPreloader:

```javascript
import { disablePaymentPreloader, enablePaymentPreloader } from './PaymentPreloaderConfig';

// Disable globally
disablePaymentPreloader();

// Re-enable when needed
enablePaymentPreloader();
```

### Programmatic Configuration

```typescript
import { PaymentPreloader } from './PaymentPreloader';

<PaymentPreloader
    methods={methods}
    checkoutService={checkoutService}
    onUnhandledError={handleError}
    config={{
        enabled: true,
        preloadDelay: 3000,
        methodPreloadDelay: 150,
        preloadableMethodIds: ['paypalcommerce', 'braintree'],
        nonPreloadableMethodIds: ['bolt', 'applepay']
    }}
/>
```

## Preloadable Payment Methods

The following payment methods are considered safe to preload:

- Braintree
- Stripe V3
- Stripe UPE
- Square V2
- Amazon Pay
- Afterpay
- Clearpay
- Klarna
- Affirm
- Sezzle
- Zip
- Quadpay
- Laybuy
- Humm

**Note:** PayPal methods are excluded from preloading to avoid conflicts with their normal initialization process.

## Non-Preloadable Payment Methods

The following payment methods are excluded from preloading:

- Bolt (requires user interaction)
- Apple Pay (requires device capabilities check)
- PayPal methods (can cause conflicts with normal initialization):
  - PayPal Commerce, PayPal Commerce Credit Cards
  - PayPal Commerce Credit, PayPal Commerce Alternative Method
  - PayPal Commerce Venmo, PayPal Express
  - PayPal Payments Pro
- Google Pay methods (require device capabilities check):
  - AdyenV2GooglePay, AdyenV3GooglePay
  - AuthorizeNetGooglePay, BNZGooglePay
  - BraintreeGooglePay, PayPalCommerceGooglePay
  - CheckoutcomGooglePay, CybersourceV2GooglePay
  - OrbitalGooglePay, StripeGooglePay, StripeUPEGooglePay
  - WorldpayAccessGooglePay, TdOnlineMartGooglePay
- Chase Pay (requires user authentication)
- Masterpass (requires user authentication)

## Integration

The PaymentPreloader is automatically integrated into the Payment component:

```typescript
// In Payment.tsx
return (
    <PaymentContext.Provider value={this.getContextValue()}>
        {/* Payment Preloader for background initialization */}
        <PaymentPreloader
            methods={methods}
            checkoutService={checkoutService}
            onUnhandledError={this.handleError}
        />
        
        {/* Rest of payment form */}
        <PaymentForm {...props} />
    </PaymentContext.Provider>
);
```

## Testing

The PaymentPreloader includes comprehensive tests:

```bash
npm test PaymentPreloader.test.tsx
```

Tests cover:
- ✅ Renders nothing (invisible component)
- ✅ Preloads only safe payment methods
- ✅ Handles preload errors gracefully
- ✅ Doesn't preload the same method twice
- ✅ Prevents multiple simultaneous preloading attempts
- ✅ Cleans up timeout on unmount

## Monitoring

The PaymentPreloader logs its activity to the console:

```javascript
// Successful preload
[PaymentPreloader] Preloading payment methods: ['paypalcommerce', 'braintree']
[PaymentPreloader] Successfully preloaded: paypalcommerce
[PaymentPreloader] Successfully preloaded: braintree

// Failed preload (non-blocking)
[PaymentPreloader] Failed to preload payment method: paypalcommerce Error: Network error
```

## Performance Considerations

- **Memory Usage**: Minimal impact as preloaded methods are properly managed
- **Network Requests**: Only makes requests for methods that are actually available
- **CPU Usage**: Spreads initialization over time to avoid overwhelming the system
- **Error Recovery**: Failed preloads don't affect the main payment flow

## Troubleshooting

### Preloading Not Working

1. Check if `PAYMENT_PRELOADER_ENABLED=true`
2. Verify payment methods are in the preloadable list
3. Check console for error messages
4. Ensure checkout service is properly initialized

### Performance Issues

1. Increase `PAYMENT_PRELOADER_METHOD_DELAY` to reduce concurrent requests
2. Reduce the list of `preloadableMethodIds` to only essential methods
3. Increase `PAYMENT_PRELOADER_DELAY` to start preloading later

### Payment Method Issues

1. Add problematic methods to `nonPreloadableMethodIds`
2. Check if the method requires user interaction
3. Verify the method's initialization requirements

## Future Enhancements

- **Analytics Integration**: Track preload success/failure rates
- **Dynamic Configuration**: Load configuration from server
- **Smart Preloading**: Preload based on user behavior patterns
- **Progressive Enhancement**: Fallback for slower devices 