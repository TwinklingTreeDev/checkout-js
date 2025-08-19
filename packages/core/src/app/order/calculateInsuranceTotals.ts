import { Checkout } from '@bigcommerce/checkout-sdk';

interface CalculateInsuranceTotalsParams {
  checkout: Checkout;
  insuranceAmount: number;
}

interface InsuranceTotals {
  totalWithInsurance: number;
  totalWithoutInsurance: number;
}

export const calculateInsuranceTotals = ({
  checkout,
  insuranceAmount,
}: CalculateInsuranceTotalsParams): InsuranceTotals => {
  // Get the insurance product ID
  const productId = (process.env.INSURANCE_PRODUCT_ID || '').trim();
  
  // Find existing insurance item in cart
  const existingInsuranceItem = checkout.cart.lineItems?.digitalItems?.find(
    (item) => String(item.productId) === productId
  );
  
  // Calculate base total (excluding insurance)
  let baseTotal = checkout.subtotal;
  if (existingInsuranceItem) {
    baseTotal -= (existingInsuranceItem.extendedSalePrice || existingInsuranceItem.extendedListPrice || 0);
  }
  
  // Add shipping cost
  if (checkout.shippingCostBeforeDiscount) {
    baseTotal += checkout.shippingCostBeforeDiscount;
  }

  // Add handling cost
  if (checkout.handlingCostTotal) {
    baseTotal += checkout.handlingCostTotal;
  }

  // Add gift wrapping cost
  if (checkout.giftWrappingCostTotal) {
    baseTotal += checkout.giftWrappingCostTotal;
  }

  // Add taxes (if not included in subtotal)
  if (checkout.taxes && !checkout.cart.isTaxIncluded) {
    baseTotal += checkout.taxes.reduce((sum, tax) => sum + tax.amount, 0);
  }

  // Add fees
  if (checkout.fees) {
    baseTotal += checkout.fees.reduce((sum, fee) => sum + fee.cost, 0);
  }

  // Subtract discounts
  if (checkout.cart.discountAmount) {
    baseTotal -= checkout.cart.discountAmount;
  }

  // Subtract gift certificates
  if (checkout.giftCertificates) {
    baseTotal -= checkout.giftCertificates.reduce((sum, gc) => sum + gc.used, 0);
  }

  // Subtract store credit if applied
  if (checkout.isStoreCreditApplied && checkout.customer?.storeCredit) {
    const storeCreditAmount = Math.min(baseTotal, checkout.customer.storeCredit);
    baseTotal -= storeCreditAmount;
  }

  // Calculate totals for both states
  const totalWithoutInsurance = Math.max(0, baseTotal);
  const totalWithInsurance = Math.max(0, baseTotal + insuranceAmount);

  console.log('Calculated insurance totals:', {
    baseTotal,
    insuranceAmount,
    totalWithInsurance,
    totalWithoutInsurance,
    existingInsuranceInCart: !!existingInsuranceItem
  });

  return {
    totalWithInsurance,
    totalWithoutInsurance,
  };
}; 