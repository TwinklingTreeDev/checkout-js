import React, { FunctionComponent, useEffect } from 'react';

import {
    AccountInstrumentFieldset,
    StoreInstrumentFieldset,
} from '@bigcommerce/checkout/instrument-utils';
import { TranslatedHtml } from '@bigcommerce/checkout/locale';
import {
    PaymentMethodProps,
    PaymentMethodResolveId,
    toResolvableComponent,
} from '@bigcommerce/checkout/payment-integration-api';

import PayPalCommercePaymentMethodComponent from './components/PayPalCommercePaymentMethodComponent';
import usePaypalCommerceInstrument from './hooks/usePaypalCommerceInstruments';

const PayPalCommercePaymentMethod: FunctionComponent<PaymentMethodProps> = (props) => {
    const {
        checkoutState: {
            data: { isPaymentDataRequired, getCustomer, getInstruments },
        },
        method: {
            config: { isVaultingEnabled },
            initializationData: { isComplete },
        },
        method,
        checkoutService,
    } = props;

    const {
        trustedAccountInstruments,
        currentInstrument,
        handleSelectInstrument,
        handleUseNewInstrument,
        isInstrumentFeatureAvailable,
        shouldShowInstrumentFieldset,
        shouldConfirmInstrument,
    } = usePaypalCommerceInstrument(method);

    useEffect(() => {
        const loadInstrumentsOrThrow = async () => {
            try {
                await checkoutService.loadInstruments();
            } catch (error) {
                if (error instanceof Error) {
                    console.warn('Failed to load PayPal instruments:', error);
                    // Don't throw error for instrument loading failures as they're not critical
                    // onUnhandledError(error);
                }
            }
        };

        const { isGuest } = getCustomer() || {};

        const shouldLoadInstruments = !isGuest && isVaultingEnabled && !isComplete;

        if (shouldLoadInstruments) {
            void loadInstrumentsOrThrow();
        }
    }, []);

    if (!isPaymentDataRequired()) {
        return null;
    }

    const allInstruments = getInstruments() || [];

    return (
        <PayPalCommercePaymentMethodComponent
            currentInstrument={currentInstrument}
            providerOptionsKey="paypalcommerce"
            shouldConfirmInstrument={shouldConfirmInstrument}
            {...props}
        >
            {shouldShowInstrumentFieldset && (
                <AccountInstrumentFieldset
                    instruments={trustedAccountInstruments}
                    onSelectInstrument={handleSelectInstrument}
                    onUseNewInstrument={handleUseNewInstrument}
                    selectedInstrument={currentInstrument}
                />
            )}

            {shouldConfirmInstrument && (
                <div>
                    <TranslatedHtml id="payment.account_instrument_new_shipping_address" />
                </div>
            )}

            {isInstrumentFeatureAvailable && (
                <StoreInstrumentFieldset
                    instrumentId={currentInstrument?.bigpayToken}
                    instruments={allInstruments}
                    isAccountInstrument
                />
            )}
        </PayPalCommercePaymentMethodComponent>
    );
};

export default toResolvableComponent<PaymentMethodProps, PaymentMethodResolveId>(
    PayPalCommercePaymentMethod,
    [{ id: 'paypalcommerce' }],
);
