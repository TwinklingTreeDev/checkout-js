import React, { ComponentType, FunctionComponent, useEffect } from 'react';

import { OrderSummaryProps, OrderSummarySubtotalsProps } from '../order';
import { useInsuranceCache } from '../order/InsuranceCacheContext';
import { calculateInsuranceTotals } from '../order/calculateInsuranceTotals';

import { WithCheckoutCartSummaryProps } from './CartSummary';
import mapToOrderSummarySubtotalsProps from './mapToOrderSummarySubtotalsProps';
import Redeemable from './Redeemable';

export default function withRedeemable(
    OriginalComponent: ComponentType<OrderSummaryProps & OrderSummarySubtotalsProps>,
): FunctionComponent<WithCheckoutCartSummaryProps & { headerLink?: any }> {
    return (props) => {
        const {
            checkout,
            storeCurrency,
            shopperCurrency,
            headerLink,
            onRemovedCoupon,
            onRemovedGiftCertificate,
            storeCreditAmount,
            isUpdatedCartSummayModal = false,
            ...redeemableProps
        } = props;

        // Use insurance cache context to get cached values
        const { 
            cachedInsuranceAmount, 
            isInsuranceTransitioning, 
            lastOperation,
            cachedTotalWithInsurance,
            cachedTotalWithoutInsurance,
            setCachedTotalWithInsurance,
            setCachedTotalWithoutInsurance,
            isAdvancedCachingEnabled
        } = useInsuranceCache();

        // Calculate and cache totals for both states if advanced caching is enabled
        useEffect(() => {
            if (isAdvancedCachingEnabled && cachedTotalWithInsurance === 0 && cachedTotalWithoutInsurance === 0) {
                const insuranceAmount = cachedInsuranceAmount || 10.74; // Use cached amount or default
                try {
                    const { totalWithInsurance, totalWithoutInsurance } = calculateInsuranceTotals({
                        checkout,
                        insuranceAmount,
                    });
                    
                    setCachedTotalWithInsurance(totalWithInsurance);
                    setCachedTotalWithoutInsurance(totalWithoutInsurance);
                    
                    console.log('Initialized insurance totals cache:', { totalWithInsurance, totalWithoutInsurance });
                } catch (error) {
                    console.error('Error initializing insurance totals cache:', error);
                }
            }
        }, [isAdvancedCachingEnabled, cachedTotalWithInsurance, cachedTotalWithoutInsurance, cachedInsuranceAmount, checkout, setCachedTotalWithInsurance, setCachedTotalWithoutInsurance]);

        // Determine total based on feature flag
        let total = checkout.outstandingBalance; // Default to BigCommerce total
        
        if (isAdvancedCachingEnabled && isInsuranceTransitioning && lastOperation) {
            // Use advanced caching: pre-calculated totals for instant switching
            if (lastOperation === 'add') {
                total = cachedTotalWithInsurance || (checkout.outstandingBalance + cachedInsuranceAmount);
                console.log('Using advanced cached total with insurance:', total);
            } else if (lastOperation === 'remove') {
                total = cachedTotalWithoutInsurance || (checkout.outstandingBalance - cachedInsuranceAmount);
                console.log('Using advanced cached total without insurance:', total);
            }
        }

        return (
            <OriginalComponent
                {...mapToOrderSummarySubtotalsProps(checkout)}
                additionalLineItems={
                    <Redeemable
                        {...{
                            ...redeemableProps,
                            onRemovedCoupon,
                            onRemovedGiftCertificate,
                        }}
                    />
                }
                headerLink={headerLink}
                isUpdatedCartSummayModal={isUpdatedCartSummayModal}
                lineItems={checkout.cart.lineItems}
                onRemovedCoupon={onRemovedCoupon}
                onRemovedGiftCertificate={onRemovedGiftCertificate}
                shopperCurrency={shopperCurrency}
                storeCreditAmount={storeCreditAmount}
                storeCurrency={storeCurrency}
                total={total}
            />
        );
    };
}
