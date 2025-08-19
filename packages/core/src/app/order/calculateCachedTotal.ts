import { Checkout } from '@bigcommerce/checkout-sdk';

interface CalculateCachedTotalParams {
  checkout: Checkout;
  cachedInsuranceAmount: number;
  isInsuranceTransitioning: boolean;
}

export const calculateCachedTotal = ({
  checkout,
  cachedInsuranceAmount,
  isInsuranceTransitioning,
}: CalculateCachedTotalParams): number => {
  // Always use cached calculation during transitions, regardless of API state
  if (isInsuranceTransitioning) {
    console.log('Using cached total calculation during transition');
  } else {
    // If not transitioning, return the original total
    return checkout.outstandingBalance;
  }

  // During transition, we need to calculate the total manually
  // Start with the subtotal, but exclude any existing insurance items
  const productId = (process.env.INSURANCE_PRODUCT_ID || '').trim();
  const existingInsuranceItem = checkout.cart.lineItems?.digitalItems?.find(
    (item) => String(item.productId) === productId
  );
  
  // Calculate subtotal excluding insurance items
  let subtotalWithoutInsurance = checkout.subtotal;
  if (existingInsuranceItem) {
    subtotalWithoutInsurance -= (existingInsuranceItem.extendedSalePrice || existingInsuranceItem.extendedListPrice || 0);
  }
  
  let total = subtotalWithoutInsurance;

  // Add shipping cost
  if (checkout.shippingCostBeforeDiscount) {
    total += checkout.shippingCostBeforeDiscount;
  }

  // Add handling cost
  if (checkout.handlingCostTotal) {
    total += checkout.handlingCostTotal;
  }

  // Add gift wrapping cost
  if (checkout.giftWrappingCostTotal) {
    total += checkout.giftWrappingCostTotal;
  }

  // Add taxes (if not included in subtotal)
  if (checkout.taxes && !checkout.cart.isTaxIncluded) {
    total += checkout.taxes.reduce((sum, tax) => sum + tax.amount, 0);
  }

  // Add fees
  if (checkout.fees) {
    total += checkout.fees.reduce((sum, fee) => sum + fee.cost, 0);
  }

  // Add cached insurance amount
  const insuranceAmount = typeof cachedInsuranceAmount === 'number' ? cachedInsuranceAmount : 0;
  total += insuranceAmount;
  
  console.log('Cached total calculation:', {
    subtotalWithoutInsurance,
    insuranceAmount,
    cachedInsuranceAmount,
    isInsuranceTransitioning,
    finalTotal: total
  });

  // Subtract discounts
  if (checkout.cart.discountAmount) {
    total -= checkout.cart.discountAmount;
  }

  // Subtract gift certificates
  if (checkout.giftCertificates) {
    total -= checkout.giftCertificates.reduce((sum, gc) => sum + gc.used, 0);
  }

  // Subtract store credit if applied
  if (checkout.isStoreCreditApplied && checkout.customer?.storeCredit) {
    const storeCreditAmount = Math.min(total, checkout.customer.storeCredit);
    total -= storeCreditAmount;
  }

  return Math.max(0, total);
}; 