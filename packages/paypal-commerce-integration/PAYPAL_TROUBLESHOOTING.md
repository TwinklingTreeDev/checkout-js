# PayPal Payment Troubleshooting Guide

## Common PayPal Payment Errors

### 1. "The selected payment method is no longer valid" Error

**Error Code**: `E7737F9078ED0617762157ABD801BE398DEB64B6` (or similar)

**Symptoms**:
- User sees error modal when selecting PayPal
- Error message: "The selected payment method is no longer valid. Click OK to see the most up-to-date payment methods."
- PayPal payment method becomes unavailable

**Root Causes**:
1. **PayPal Configuration Issues**
   - Invalid or expired PayPal credentials
   - Incorrect PayPal environment (sandbox vs production)
   - Missing or incorrect PayPal client ID

2. **Initialization Failures**
   - PayPal SDK fails to load
   - Network connectivity issues
   - Browser compatibility problems

3. **Cart/Checkout State Issues**
   - Cart total changed during payment method selection
   - Checkout session expired
   - Inconsistent checkout state

4. **Backend API Issues**
   - PayPal API endpoints unavailable
   - Rate limiting or quota exceeded
   - Authentication failures

**Debugging Steps**:

1. **Check Browser Console**
   ```javascript
   // Look for these log messages:
   console.log('Initializing PayPal payment method:', {...});
   console.log('PayPal payment method initialized successfully');
   console.error('PayPal payment method initialization failed:', {...});
   ```

2. **Verify PayPal Configuration**
   - Check PayPal client ID in environment variables
   - Verify PayPal environment (sandbox/production)
   - Ensure PayPal account is properly configured

3. **Check Network Requests**
   - Monitor network tab for failed PayPal API calls
   - Look for 401, 403, or 500 status codes
   - Check for CORS issues

4. **Validate Checkout State**
   - Ensure cart is not empty
   - Verify checkout session is valid
   - Check if cart total changed recently

**Solutions**:

1. **Immediate Fixes**:
   ```javascript
   // Clear selected payment method and reload
   this.setState({ selectedMethod: undefined });
   await loadPaymentMethods();
   ```

2. **Configuration Fixes**:
   - Update PayPal credentials
   - Switch to correct environment
   - Verify PayPal account status

3. **Code Improvements**:
   - Add retry logic for network failures
   - Implement better error handling
   - Add user-friendly error messages

### 2. PayPal SDK Loading Issues

**Symptoms**:
- PayPal buttons don't render
- Console errors about PayPal SDK
- Payment method appears but doesn't work

**Solutions**:
1. Check PayPal SDK script loading
2. Verify PayPal domain configuration
3. Ensure HTTPS is enabled (required for PayPal)

### 3. Network Connectivity Issues

**Symptoms**:
- Timeout errors
- Connection failed messages
- Intermittent failures

**Solutions**:
1. Implement retry logic with exponential backoff
2. Add network status detection
3. Provide offline fallback options

## Error Handling Improvements

### Enhanced Error Messages

The codebase now includes better error handling with:

1. **Categorized Error Types**:
   - Payment method invalid
   - Network errors
   - Authentication failures
   - Configuration errors

2. **User-Friendly Messages**:
   - Clear, actionable error messages
   - Recovery suggestions
   - Support contact information

3. **Technical Logging**:
   - Detailed error logs for debugging
   - Error categorization
   - Stack traces for development

### Retry Logic

```javascript
// Example retry implementation
const retryPayPalOperation = async (operation, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries || !shouldRetryPayPalOperation(error, attempt)) {
                throw error;
            }
            
            const delay = getPayPalRetryDelay(attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};
```

## Monitoring and Alerting

### Key Metrics to Monitor

1. **PayPal Initialization Success Rate**
2. **Payment Method Invalid Error Frequency**
3. **Network Error Rates**
4. **User Recovery Actions**

### Recommended Alerts

1. **High Error Rate**: Alert when PayPal errors exceed 5% of attempts
2. **Configuration Issues**: Alert on authentication failures
3. **Network Problems**: Alert on consecutive timeout errors

## Best Practices

1. **Always handle errors gracefully**
2. **Provide clear user feedback**
3. **Implement retry logic for transient failures**
4. **Log errors for debugging**
5. **Monitor error rates and patterns**
6. **Keep PayPal SDK and configurations updated**

## Support Resources

- [PayPal Developer Documentation](https://developer.paypal.com/)
- [PayPal Status Page](https://status.paypal.com/)
- [BigCommerce Support](https://support.bigcommerce.com/)

## Common Configuration Issues

### Environment Variables

Ensure these are properly set:
```bash
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENVIRONMENT=sandbox|production
```

### PayPal Account Settings

1. **Webhook Configuration**: Ensure webhooks are properly configured
2. **IP Whitelisting**: Add your server IPs to PayPal allowlist
3. **Account Verification**: Ensure PayPal account is fully verified

### Browser Compatibility

PayPal requires:
- HTTPS connection
- Modern browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- No ad blockers interfering with PayPal scripts 