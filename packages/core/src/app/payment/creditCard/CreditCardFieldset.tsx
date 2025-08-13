import React, { FunctionComponent, memo } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';
import { Address, Country, FormField } from '@bigcommerce/checkout-sdk';

import { Fieldset, Legend } from '../../ui/form';

import CreditCardCodeField from './CreditCardCodeField';
import CreditCardCustomerCodeField from './CreditCardCustomerCodeField';
import CreditCardExpiryField from './CreditCardExpiryField';
import CreditCardNameField from './CreditCardNameField';
import CreditCardNumberField from './CreditCardNumberField';
import CreditCardBillingAddress from './CreditCardBillingAddress';

export interface CreditCardFieldsetProps {
    shouldShowCardCodeField?: boolean;
    shouldShowCustomerCodeField?: boolean;
    shouldShowSaveCardField?: boolean;
    // Billing address props
    billingAddress?: Address;
    shippingAddress?: Address; // Add shipping address prop
    customerEmail?: string; // Add customer email prop
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
    onUnhandledError?(error: Error): void;
    billingAutosaveDelay?: number;
}

const CreditCardFieldset: FunctionComponent<CreditCardFieldsetProps> = ({
    shouldShowCardCodeField,
    shouldShowCustomerCodeField,
    // Billing address props
    billingAddress,
    shippingAddress,
    customerEmail,
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
    onUnhandledError,
    billingAutosaveDelay,
}) => (
    <Fieldset
        additionalClassName="creditCardFieldset"
        legend={
            <Legend hidden>
                <TranslatedString id="payment.credit_card_text" />
            </Legend>
        }
    >
        <div className="form-ccFields credit-card-fieldset">
            <CreditCardNumberField name="ccNumber" />

            <CreditCardExpiryField name="ccExpiry" />

            <CreditCardNameField name="ccName" />

            {shouldShowCardCodeField && <CreditCardCodeField name="ccCvv" />}

            {shouldShowCustomerCodeField && <CreditCardCustomerCodeField name="ccCustomerCode" />}
        </div>

        {/* Billing Address Section - Only show for credit card payment methods */}
        {shouldShowBillingAddress && countries && getFields && (
            <CreditCardBillingAddress
                billingAddress={billingAddress}
                shippingAddress={shippingAddress}
                customerEmail={customerEmail}
                countries={countries}
                countriesWithAutocomplete={countriesWithAutocomplete || []}
                getFields={getFields}
                isFloatingLabelEnabled={isFloatingLabelEnabled}
                googleMapsApiKey={googleMapsApiKey}
                onBillingAddressChange={onBillingAddressChange}
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
                isBillingSameAsShipping={isBillingSameAsShipping}
                onUnhandledError={onUnhandledError}
                billingAutosaveDelay={billingAutosaveDelay}
            />
        )}
    </Fieldset>
);

export default memo(CreditCardFieldset);
