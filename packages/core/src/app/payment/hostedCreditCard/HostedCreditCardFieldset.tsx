import React, { FunctionComponent, ReactNode } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';
import { Address, Country, FormField } from '@bigcommerce/checkout-sdk';

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

    // Auto-save props
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

    // Auto-save props
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
                placeholder="Card number"
            />

            {cardNameId && (
                <HostedCreditCardNameField
                    appearFocused={focusedFieldType === 'cardName'}
                    id={cardNameId}
                    name="hostedForm.errors.cardName"
                    placeholder="Name on card"
                />
            )}

            {additionalFields}

            <div className="form-ccFields-row">
                <HostedCreditCardExpiryField
                    appearFocused={focusedFieldType === 'cardExpiry'}
                    id={cardExpiryId}
                    name="hostedForm.errors.cardExpiry"
                    placeholder="Expiry date (MM / YY)"
                />

                {cardCodeId && (
                    <HostedCreditCardCodeField
                        appearFocused={focusedFieldType === 'cardCode'}
                        id={cardCodeId}
                        name="hostedForm.errors.cardCode"
                        placeholder="Security code"
                    />
                )}
            </div>
        </div>

        {/* Billing Address Section - Only show for credit card payment methods */}
        {countries && getFields && (
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

export default HostedCreditCardFieldset;
