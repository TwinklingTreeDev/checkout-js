import React, { FunctionComponent, ReactNode } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';
import { Address, Country, FormField, CheckoutSelectors } from '@bigcommerce/checkout-sdk';

import { Fieldset, Legend } from '../../ui/form';

import HostedCreditCardCodeField from './HostedCreditCardCodeField';
import HostedCreditCardExpiryField from './HostedCreditCardExpiryField';
import HostedCreditCardNameField from './HostedCreditCardNameField';
import HostedCreditCardNumberField from './HostedCreditCardNumberField';
import CreditCardBillingAddress from '../creditCard/CreditCardBillingAddress';

export interface HostedCreditCardFieldsetProps {
    additionalFields?: ReactNode;
    cardCodeId?: string;
    cardExpiryId: string;
    cardNameId?: string;
    cardNumberId: string;
    focusedFieldType?: string;
    // Billing address props
    billingAddress?: Address;
    countries?: Country[];
    countriesWithAutocomplete?: string[];
    getFields?(countryCode?: string): FormField[];
    isFloatingLabelEnabled?: boolean;
    googleMapsApiKey?: string;
    onBillingAddressChange?(address: Partial<Address>): void;
    onBillingSameAsShippingChange?(isSame: boolean): void;
    isBillingSameAsShipping?: boolean;
    shouldShowBillingAddress?: boolean;
    // Auto-save props
    updateAddress?(address: Partial<Address>): Promise<CheckoutSelectors>;
    onUnhandledError?(error: Error): void;
    billingAutosaveDelay?: number;
}

const HostedCreditCardFieldset: FunctionComponent<HostedCreditCardFieldsetProps> = ({
    additionalFields,
    cardCodeId,
    cardExpiryId,
    cardNameId,
    cardNumberId,
    focusedFieldType,
    // Billing address props
    billingAddress,
    countries,
    countriesWithAutocomplete,
    getFields,
    isFloatingLabelEnabled,
    googleMapsApiKey,
    onBillingAddressChange,
    onBillingSameAsShippingChange,
    isBillingSameAsShipping = true,
    shouldShowBillingAddress = false,
    // Auto-save props
    updateAddress,
    onUnhandledError,
    billingAutosaveDelay,
}) => (
    <Fieldset
        legend={
            <Legend hidden>
                <TranslatedString id="payment.credit_card_text" />
            </Legend>
        }
    >
        <div className="form-ccFields hosted-credit-card-fieldset">
            <HostedCreditCardNumberField
                appearFocused={focusedFieldType === 'cardNumber'}
                id={cardNumberId}
                name="hostedForm.errors.cardNumber"
            />

            <HostedCreditCardExpiryField
                appearFocused={focusedFieldType === 'cardExpiry'}
                id={cardExpiryId}
                name="hostedForm.errors.cardExpiry"
            />

            {cardNameId && (
                <HostedCreditCardNameField
                    appearFocused={focusedFieldType === 'cardName'}
                    id={cardNameId}
                    name="hostedForm.errors.cardName"
                />
            )}

            {cardCodeId && (
                <HostedCreditCardCodeField
                    appearFocused={focusedFieldType === 'cardCode'}
                    id={cardCodeId}
                    name="hostedForm.errors.cardCode"
                />
            )}

            {additionalFields}
        </div>

        {/* Billing Address Section - Only show for credit card payment methods */}
        {shouldShowBillingAddress && countries && getFields && (
            <CreditCardBillingAddress
                billingAddress={billingAddress}
                countries={countries}
                countriesWithAutocomplete={countriesWithAutocomplete || []}
                getFields={getFields}
                isFloatingLabelEnabled={isFloatingLabelEnabled}
                googleMapsApiKey={googleMapsApiKey}
                onBillingAddressChange={onBillingAddressChange}
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
                isBillingSameAsShipping={isBillingSameAsShipping}
                updateAddress={updateAddress}
                onUnhandledError={onUnhandledError}
                billingAutosaveDelay={billingAutosaveDelay}
            />
        )}
    </Fieldset>
);

export default HostedCreditCardFieldset;
