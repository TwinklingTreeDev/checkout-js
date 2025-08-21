import {
    Address,
    CheckoutSelectors,
    Country,
    Customer,
    FormField,
} from '@bigcommerce/checkout-sdk';
import { debounce } from 'lodash';
import { FormikProps, withFormik } from 'formik';
import React, { RefObject, useRef, useState, useCallback, useEffect } from 'react';
import { lazy } from 'yup';

import { TranslatedString, withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { usePayPalFastlaneAddress } from '@bigcommerce/checkout/paypal-fastlane-integration';
import { AddressFormSkeleton } from '@bigcommerce/checkout/ui';

import {
    AddressForm,
    AddressFormValues,
    AddressSelect,
    AddressType,
    getAddressFormFieldsValidationSchema,
    getTranslateAddressError,
    isValidCustomerAddress,
    mapAddressToFormValues,
    mapAddressFromFormValues,
    isEqualAddress,
} from '../address';
import { getCustomFormFieldsValidationSchema } from '../formFields';
import { OrderComments } from '../orderComments';
import { Button, ButtonVariant } from '../ui/button';
import { Fieldset, Form } from '../ui/form';
import { LoadingOverlay } from '../ui/loading';

import StaticBillingAddress from './StaticBillingAddress';

export type BillingFormValues = AddressFormValues & { orderComment: string };

export interface BillingFormProps {
    billingAddress?: Address;
    countries: Country[];
    countriesWithAutocomplete: string[];
    customer: Customer;
    customerMessage: string;
    googleMapsApiKey: string;
    isUpdating: boolean;
    methodId?: string;
    shouldShowOrderComments: boolean;
    isFloatingLabelEnabled?: boolean;
    billingAutosaveDelay?: number;
    getFields(countryCode?: string): FormField[];
    onSubmit(values: BillingFormValues): void;
    onUnhandledError(error: Error): void;
    updateAddress(address: Partial<Address>): Promise<CheckoutSelectors>;
    updateCheckout?(payload: any): Promise<CheckoutSelectors>;
}

// Auto-save delay constant (same as shipping)
export const BILLING_AUTOSAVE_DELAY = 1700;

const BillingForm = ({
    googleMapsApiKey,
    billingAddress,
    countriesWithAutocomplete,
    customer: { addresses, isGuest },
    getFields,
    countries,
    isUpdating,
    setFieldValue,
    shouldShowOrderComments,
    values,
    methodId,
    isFloatingLabelEnabled,
    updateAddress,
    updateCheckout,
    onUnhandledError,
    billingAutosaveDelay = BILLING_AUTOSAVE_DELAY,
}: BillingFormProps & WithLanguageProps & FormikProps<BillingFormValues>) => {
    const [isResettingAddress, setIsResettingAddress] = useState(false);
    const [isUpdatingBillingData, setIsUpdatingBillingData] = useState(false);
    const addressFormRef: RefObject<HTMLFieldSetElement> = useRef(null);
    const { isPayPalFastlaneEnabled, paypalFastlaneAddresses } = usePayPalFastlaneAddress();

    // Create debounced update function
    const debouncedUpdateBillingData = useCallback(
        debounce(
            async (address: Address, orderComment?: string) => {
                try {
                    console.log('BillingForm: Debounced update triggered for address:', address.address1);
                    const promises: Array<Promise<CheckoutSelectors>> = [];
                    
                    if (address && billingAddress && !isEqualAddress(address, billingAddress)) {
                        promises.push(updateAddress(address));
                    }

                    if (updateCheckout && orderComment !== undefined && orderComment !== values.orderComment) {
                        promises.push(updateCheckout({ customerMessage: orderComment }));
                    }

                    if (promises.length > 0) {
                        await Promise.all(promises);
                    }
                } catch (error) {
                    console.error('BillingForm: Error updating billing data:', error);
                    if (error instanceof Error) {
                        onUnhandledError(error);
                    }
                } finally {
                    setIsUpdatingBillingData(false);
                }
            },
            billingAutosaveDelay,
        ),
        [billingAddress, updateAddress, updateCheckout, onUnhandledError, billingAutosaveDelay, values.orderComment],
    );

    // Handle field changes for auto-save
    const handleFieldChange = useCallback(
        async (fieldName: string, value: string | string[]) => {
            // Update the form field
            setFieldValue(fieldName, value);

            // Wait for Formik to process the change
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Skip order comment field for now - handle in form submission
            if (fieldName === 'orderComment') {
                return;
            }

            // Check if the form is valid before auto-saving address
            const addressForm = { ...values };
            const { orderComment, ...addressFormValues } = addressForm; // Remove order comment from address form

            const updatedAddress = mapAddressFromFormValues(addressFormValues);
            
            if (updatedAddress && billingAddress && !isEqualAddress(updatedAddress, billingAddress)) {
                console.log('BillingForm: Triggering billing update for:', updatedAddress.address1);
                setIsUpdatingBillingData(true);
                debouncedUpdateBillingData(updatedAddress, values.orderComment);
            }
        },
        [setFieldValue, values, billingAddress, debouncedUpdateBillingData],
    );

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateBillingData.cancel();
        };
    }, [debouncedUpdateBillingData]);

    const shouldRenderStaticAddress = methodId === 'amazonpay';
    const allFormFields = getFields(values.countryCode);
    const customFormFields = allFormFields.filter(({ custom }) => custom);
    const hasCustomFormFields = customFormFields.length > 0;
    const editableFormFields =
        shouldRenderStaticAddress && hasCustomFormFields ? customFormFields : allFormFields;
    const billingAddresses = isPayPalFastlaneEnabled ? paypalFastlaneAddresses : addresses;
    const hasAddresses = billingAddresses?.length > 0;
    const hasValidCustomerAddress =
        billingAddress &&
        isValidCustomerAddress(
            billingAddress,
            billingAddresses,
            getFields(billingAddress.countryCode),
        );

    const handleSelectAddress = async (address: Partial<Address>) => {
        setIsResettingAddress(true);

        try {
            await updateAddress(address);
        } catch (error) {
            if (error instanceof Error) {
                onUnhandledError(error);
            }
        } finally {
            setIsResettingAddress(false);
        }
    };

    const handleUseNewAddress = () => {
        handleSelectAddress({});
    };

    return (
        <Form autoComplete="on">
            {shouldRenderStaticAddress && billingAddress && (
                <div className="form-fieldset">
                    <StaticBillingAddress address={billingAddress} />
                </div>
            )}

            <Fieldset id="checkoutBillingAddress" ref={addressFormRef}>
                {hasAddresses && !shouldRenderStaticAddress && (
                    <Fieldset id="billingAddresses">
                        <LoadingOverlay isLoading={isResettingAddress}>
                            <AddressSelect
                                addresses={billingAddresses}
                                onSelectAddress={handleSelectAddress}
                                onUseNewAddress={handleUseNewAddress}
                                selectedAddress={
                                    hasValidCustomerAddress ? billingAddress : undefined
                                }
                                type={AddressType.Billing}
                            />
                        </LoadingOverlay>
                    </Fieldset>
                )}

                {!hasValidCustomerAddress && (
                    <AddressFormSkeleton isLoading={isResettingAddress}>
                        <AddressForm
                            countries={countries}
                            countriesWithAutocomplete={countriesWithAutocomplete}
                            countryCode={values.countryCode}
                            formFields={editableFormFields}
                            googleMapsApiKey={googleMapsApiKey}
                            isFloatingLabelEnabled={isFloatingLabelEnabled}
                            setFieldValue={setFieldValue}
                            onChange={handleFieldChange}
                            shouldShowSaveAddress={!isGuest}
                        />
                    </AddressFormSkeleton>
                )}
            </Fieldset>

            {shouldShowOrderComments && <OrderComments />}

            <div className="form-actions">
                <Button
                    disabled={isUpdating || isResettingAddress || isUpdatingBillingData}
                    id="checkout-billing-continue"
                    isLoading={isUpdating || isResettingAddress || isUpdatingBillingData}
                    type="submit"
                    variant={ButtonVariant.Primary}
                >
                    <TranslatedString id="common.continue_action" />
                </Button>
            </div>
        </Form>
    );
};

export default withLanguage(
    withFormik<BillingFormProps & WithLanguageProps, BillingFormValues>({
        handleSubmit: (values, { props: { onSubmit } }) => {
            // Check if we're just validating forms, not actually submitting
            if ((window as any).__isValidatingForms) {
                return; // Don't actually submit, just let validation run
            }
            onSubmit(values);
        },
        mapPropsToValues: ({ getFields, customerMessage, billingAddress }) => {
            // Force empty country values to disable automatic country detection
            const addressWithEmptyCountry = billingAddress ? {
                ...billingAddress,
                countryCode: '',
                country: '',
            } : undefined;
            
            return {
                ...mapAddressToFormValues(
                    getFields(''), // Use empty string to get default fields
                    addressWithEmptyCountry,
                ),
                orderComment: customerMessage,
            };
        },
        isInitialValid: ({ billingAddress, getFields, language }) =>
            !!billingAddress &&
            getAddressFormFieldsValidationSchema({
                language,
                formFields: getFields(billingAddress.countryCode),
            }).isValidSync(billingAddress),
        validationSchema: ({
            language,
            getFields,
            methodId,
        }: BillingFormProps & WithLanguageProps) =>
            methodId === 'amazonpay'
                ? lazy<Partial<AddressFormValues>>((values) =>
                      getCustomFormFieldsValidationSchema({
                          translate: getTranslateAddressError(language),
                          formFields: getFields(values && values.countryCode),
                      }),
                  )
                : lazy<Partial<AddressFormValues>>((values) =>
                      getAddressFormFieldsValidationSchema({
                          language,
                          formFields: getFields(values && values.countryCode),
                      }),
                  ),
        enableReinitialize: true,
    })(BillingForm),
);
