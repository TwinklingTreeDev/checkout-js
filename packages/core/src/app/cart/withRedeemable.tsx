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
            setCachedTotalWithoutInsurance
        } = useInsuranceCache();

        // Calculate and cache totals for both states if not already cached
        useEffect(() => {
            if (cachedTotalWithInsurance === 0 && cachedTotalWithoutInsurance === 0) {
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
        }, [cachedTotalWithInsurance, cachedTotalWithoutInsurance, cachedInsuranceAmount, checkout, setCachedTotalWithInsurance, setCachedTotalWithoutInsurance]);

        // Use cached totals during transitions for instant switching
        let total = checkout.outstandingBalance; // Default to BigCommerce total
        
        if (isInsuranceTransitioning && lastOperation) {
            if (lastOperation === 'add') {
                total = cachedTotalWithInsurance || (checkout.outstandingBalance + cachedInsuranceAmount);
                console.log('Using cached total with insurance:', total);
            } else if (lastOperation === 'remove') {
                total = cachedTotalWithoutInsurance || (checkout.outstandingBalance - cachedInsuranceAmount);
                console.log('Using cached total without insurance:', total);
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
