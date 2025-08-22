# Insurance Caching Feature Toggle

This feature allows you to control how insurance total calculations are handled using an environment variable.

## Environment Variables

Add these to your `.env` file:

```env
# Insurance Product Configuration
INSURANCE_PRODUCT_ID=114
INSURANCE_PRODUCT_PRICE=10.74

# Insurance Advanced Caching Feature Flag
INSURANCE_ADVANCED_CACHING=true
```

## Modes

### 1. Advanced Caching Enabled (`INSURANCE_ADVANCED_CACHING=true`)

**Behavior:**
- Pre-calculates totals for both states (with/without insurance)
- Uses cached totals for instant switching during transitions
- Provides immediate UI feedback with accurate calculations
- Falls back to BigCommerce API after transitions complete

**Benefits:**
- ✅ Zero delay in total updates
- ✅ Instant switching between insurance states
- ✅ Accurate calculations based on current cart state
- ✅ Smooth user experience

**Console Logs:**
```
Initialized insurance totals cache: { totalWithInsurance: 120.69, totalWithoutInsurance: 109.95 }
Using advanced cached total with insurance: 120.69
Updated insurance totals cache (advanced): { totalWithInsurance: 120.69, totalWithoutInsurance: 109.95 }
```

### 2. Advanced Caching Disabled (`INSURANCE_ADVANCED_CACHING=false` or not set)

**Behavior:**
- **No total caching** - totals only update after BigCommerce API responses
- **Cached item display still works** - insurance item appears in order summary immediately
- No immediate total updates (no glitch)
- Relies on BigCommerce API for total calculations

**Benefits:**
- ✅ No immediate total updates (no glitch)
- ✅ Cached item still appears in order summary for better UX
- ✅ Always uses BigCommerce's latest total calculations
- ✅ Reliable API-driven total behavior
- ✅ Best of both worlds: instant item display + accurate totals

**Console Logs:**
```
Setting cached insurance amount to: 10.74
Advanced caching disabled - not setting transition state
Added cached insurance item to display
Using BigCommerce total (no caching): 120.69
```

## Configuration Examples

### Enable Advanced Caching
```env
INSURANCE_ADVANCED_CACHING=true
INSURANCE_PRODUCT_ID=114
INSURANCE_PRODUCT_PRICE=10.74
```

### Disable Advanced Caching
```env
INSURANCE_ADVANCED_CACHING=false
INSURANCE_PRODUCT_ID=114
INSURANCE_PRODUCT_PRICE=10.74
```

### Default (No Advanced Caching)
```env
INSURANCE_PRODUCT_ID=114
INSURANCE_PRODUCT_PRICE=10.74
# INSURANCE_ADVANCED_CACHING not set = disabled
```

## How It Works

1. **Environment Variable Exposure:** Webpack `DefinePlugin` exposes environment variables to the browser
2. **Feature Flag Check:** System checks `INSURANCE_ADVANCED_CACHING` environment variable
3. **Mode Selection:** Routes to appropriate caching strategy
4. **Total Calculation:** Uses selected method for calculating totals
5. **UI Updates:** Displays appropriate total based on mode
6. **API Sync:** Eventually syncs with BigCommerce API

## Webpack Configuration

The environment variables are exposed to the browser through webpack's `DefinePlugin` in `webpack.config.js`:

```javascript
new DefinePlugin({
    'process.env.INSURANCE_PRODUCT_ID': JSON.stringify(process.env.INSURANCE_PRODUCT_ID || ''),
    'process.env.INSURANCE_PRODUCT_PRICE': JSON.stringify(process.env.INSURANCE_PRODUCT_PRICE || ''),
    'process.env.INSURANCE_ADVANCED_CACHING': JSON.stringify(process.env.INSURANCE_ADVANCED_CACHING || ''),
}),
```

**Important:** After changing environment variables, you must rebuild the project for changes to take effect.

## Testing

### Test Advanced Caching
1. Set `INSURANCE_ADVANCED_CACHING=true`
2. Toggle insurance on/off
3. Check console for "advanced cached total" messages
4. Verify instant total updates

### Test No Caching
1. Set `INSURANCE_ADVANCED_CACHING=false`
2. Toggle insurance on/off
3. Check console for "Advanced caching disabled" messages
4. Verify totals only update after API responses (no immediate changes)
5. Verify cached item still appears in order summary immediately

### Test Default Behavior
1. Remove `INSURANCE_ADVANCED_CACHING` from .env
2. Toggle insurance on/off
3. Check console for "Advanced caching disabled" messages
4. Verify totals only update after API responses
5. Verify cached item still appears in order summary immediately

## Troubleshooting

### Issue: Totals not updating instantly
- Check if `INSURANCE_ADVANCED_CACHING=true` is set
- Verify console logs show "advanced cached total" messages
- Ensure environment variable is properly loaded
- Rebuild the project after changing environment variables

### Issue: Totals updating too slowly
- Set `INSURANCE_ADVANCED_CACHING=true` for instant updates
- Check network tab for API response delays
- Verify insurance product ID and price are correct

### Issue: Totals are incorrect
- Check `INSURANCE_PRODUCT_PRICE` value
- Verify `INSURANCE_PRODUCT_ID` matches actual product
- Review console logs for calculation errors
- Ensure environment variables are properly exposed in webpack config
