import {
    ExtensionRegion,
    LineItemMap,
    ShopperCurrency,
    StoreCurrency,
} from '@bigcommerce/checkout-sdk';
import React, { FunctionComponent, ReactNode, useEffect, useMemo } from 'react';

import { ExtensionRegionContainer, useExtensions } from '@bigcommerce/checkout/checkout-extension';

import OrderSummaryHeader from './OrderSummaryHeader';
import OrderSummaryItems from './OrderSummaryItems';
import OrderSummarySection from './OrderSummarySection';
import OrderSummarySubtotals, { OrderSummarySubtotalsProps } from './OrderSummarySubtotals';
import OrderSummaryTotal from './OrderSummaryTotal';
import removeBundledItems from './removeBundledItems';

export interface OrderSummaryProps {
    lineItems: LineItemMap;
    total: number;
    headerLink: ReactNode;
    storeCurrency: StoreCurrency;
    shopperCurrency: ShopperCurrency;
    additionalLineItems?: ReactNode;
}

const OrderSummary: FunctionComponent<OrderSummaryProps & OrderSummarySubtotalsProps> = ({
    isTaxIncluded,
    taxes,
    storeCurrency,
    shopperCurrency,
    headerLink,
    additionalLineItems,
    lineItems,
    total,
    ...orderSummarySubtotalsProps
}) => {
    const { extensionService, isExtensionEnabled } = useExtensions();
    const isSummaryLastItemAfterExtensionRegionEnabled = Boolean(
        isExtensionEnabled() &&
            extensionService.isRegionEnabled(ExtensionRegion.SummaryLastItemAfter),
    );
    const nonBundledLineItems = useMemo(() => removeBundledItems(lineItems), [lineItems]);

    useEffect(() => {
        if (isSummaryLastItemAfterExtensionRegionEnabled) {
            void extensionService.renderExtension(
                ExtensionRegionContainer.SummaryLastItemAfter,
                ExtensionRegion.SummaryLastItemAfter,
            );

            return () => {
                extensionService.removeListeners(ExtensionRegion.SummaryLastItemAfter);
            };
        }
    }, [extensionService, isSummaryLastItemAfterExtensionRegionEnabled]);

    return (
        <article className="cart optimizedCheckout-orderSummary" data-test="cart">
            <OrderSummaryHeader>{headerLink}</OrderSummaryHeader>

            <OrderSummarySection>
                <OrderSummaryItems displayLineItemsCount items={nonBundledLineItems} />
            </OrderSummarySection>

            {isSummaryLastItemAfterExtensionRegionEnabled && (
                <div id={ExtensionRegionContainer.SummaryLastItemAfter} />
            )}

            <OrderSummarySection>
                <OrderSummarySubtotals isTaxIncluded={isTaxIncluded} taxes={taxes} {...orderSummarySubtotalsProps} />
            </OrderSummarySection>

            <OrderSummarySection>
                <OrderSummaryTotal
                    orderAmount={total}
                    shopperCurrencyCode={shopperCurrency.code}
                    storeCurrencyCode={storeCurrency.code}
                />
                {additionalLineItems}
            </OrderSummarySection>
        </article>
    );
};

export default OrderSummary;
