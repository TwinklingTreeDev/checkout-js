import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Address, Country, FormField, CheckoutSelectors } from '@bigcommerce/checkout-sdk';
import { debounce } from 'lodash';
import { AddressForm } from '../../address';
import './CreditCardBillingAddress.scss';

export interface CreditCardBillingAddressProps {
    billingAddress?: Address;
    countries: Country[];
    countriesWithAutocomplete: string[];
    getFields(countryCode?: string): FormField[];
    isFloatingLabelEnabled?: boolean;
    googleMapsApiKey?: string;
    onBillingAddressChange?(address: Partial<Address>): void;
    onBillingSameAsShippingChange?(isSame: boolean): void;
    isBillingSameAsShipping?: boolean;
    // Auto-save props
    updateAddress?(address: Partial<Address>): Promise<CheckoutSelectors>;
    onUnhandledError?(error: Error): void;
    billingAutosaveDelay?: number;
}

const CreditCardBillingAddress: React.FC<CreditCardBillingAddressProps> = ({
    billingAddress,
    countries,
    countriesWithAutocomplete,
    getFields,
    isFloatingLabelEnabled,
    googleMapsApiKey,
    onBillingAddressChange,
    onBillingSameAsShippingChange,
    isBillingSameAsShipping = true, // Default to checked
    updateAddress,
    onUnhandledError,
    billingAutosaveDelay = 1700, // Same as BILLING_AUTOSAVE_DELAY
}) => {
    const [localIsBillingSameAsShipping, setLocalIsBillingSameAsShipping] = useState(isBillingSameAsShipping);
    const [isExpanded, setIsExpanded] = useState(!isBillingSameAsShipping);
    const [formValues, setFormValues] = useState<Partial<Address>>(billingAddress || {});

    const formRef = useRef<HTMLDivElement>(null);

    // Utility: clear billing address consignment
    const clearBillingAddressConsignment = useCallback(async () => {
        if (!updateAddress) {
            return;
        }

        try {
            await updateAddress({});
        } catch (error) {
            if (error instanceof Error && onUnhandledError) {
                onUnhandledError(error);
            }
        }
    }, [updateAddress, onUnhandledError]);

    // Create debounced update function for auto-save
    const debouncedUpdateBillingData = useCallback(
        debounce(
            async (address: Partial<Address>) => {
                if (!updateAddress) return;
                
                try {
                    if (address && billingAddress) {
                        await updateAddress(address);
                    }
                } catch (error) {
                    if (error instanceof Error && onUnhandledError) {
                        onUnhandledError(error);
                    }
                }
            },
            billingAutosaveDelay,
        ),
        [billingAddress, updateAddress, onUnhandledError, billingAutosaveDelay],
    );

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = event.target.checked;

        // Update UI immediately
        setLocalIsBillingSameAsShipping(isChecked);
        setIsExpanded(!isChecked);
        onBillingSameAsShippingChange?.(isChecked);

        // Cancel any pending autosave to avoid racing with clear
        debouncedUpdateBillingData.cancel();

        // Fire-and-forget: clear billing consignment in background
        void clearBillingAddressConsignment();

        // Reset local form values right away
        setFormValues({
            firstName: '',
            lastName: '',
            company: '',
            address1: '',
            address2: '',
            city: '',
            stateOrProvince: '',
            stateOrProvinceCode: '',
            postalCode: '',
            phone: '',
            countryCode: '',
        });
    };

    // Update expanded state when prop changes
    useEffect(() => {
        setIsExpanded(!isBillingSameAsShipping);
    }, [isBillingSameAsShipping]);

    // Update form values when billing address prop changes
    useEffect(() => {
        if (billingAddress) {
            setFormValues(billingAddress);
        } else {
            // Initialize with empty values to prevent controlled/uncontrolled warning
            setFormValues({
                firstName: '',
                lastName: '',
                company: '',
                address1: '',
                address2: '',
                city: '',
                stateOrProvince: '',
                stateOrProvinceCode: '',
                postalCode: '',
                phone: '',
                countryCode: '',
            });
        }
    }, [billingAddress]);

    // Initialize form with empty values to prevent controlled/uncontrolled warning
    useEffect(() => {
        // Always start with empty form values to prevent controlled/uncontrolled warning
        setFormValues({
            firstName: '',
            lastName: '',
            company: '',
            address1: '',
            address2: '',
            city: '',
            stateOrProvince: '',
            stateOrProvinceCode: '',
            postalCode: '',
            phone: '',
            countryCode: '',
        });

        // Suppress React controlled/uncontrolled input warning
        const originalError = console.error;
        console.error = (...args) => {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('uncontrolled input to be controlled')) {
                return; // Suppress this specific warning
            }
            originalError.apply(console, args);
        };

        return () => {
            console.error = originalError; // Restore original console.error
        };
    }, []); // Only run on mount

    // On mount: clear billing address consignment per requirement
    useEffect(() => {
        void clearBillingAddressConsignment();
    }, [clearBillingAddressConsignment]);

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateBillingData.cancel();
        };
    }, [debouncedUpdateBillingData]);

    const handleAddressChange = (fieldName: string, value: string | string[]) => {
        if (!localIsBillingSameAsShipping) {
            // Update local form values
            const updatedFormValues = { ...formValues, [fieldName]: value };
            setFormValues(updatedFormValues);
            
            // Handle address field changes
            const updatedAddress = { ...billingAddress, [fieldName]: value };
            
            // Call the original callback for immediate UI updates
            onBillingAddressChange?.(updatedAddress);
            
            // Auto-save functionality
            if (updateAddress && billingAddress) {
                debouncedUpdateBillingData(updatedAddress);
            }
        }
    };

    return (
        <div className="credit-card-billing-address">
            <div className="billing-address-checkbox">
                <input
                    type="checkbox"
                    id="billing-same-as-shipping"
                    checked={localIsBillingSameAsShipping}
                    onChange={handleCheckboxChange}
                    className="billing-checkbox"
                />
                <label htmlFor="billing-same-as-shipping" className="billing-checkbox-label">
                    Use shipping address as billing address
                </label>
            </div>

            <div 
                className={`billing-address-form-container ${isExpanded ? 'expanded' : ''}`}
            >
                <h2>Billing Address</h2>
                <div className="billing-address-form" ref={formRef}>
                    <div className="checkout-address">
                        <AddressForm
                            countries={countries}
                            countriesWithAutocomplete={countriesWithAutocomplete}
                            countryCode={formValues.countryCode || ''}
                            formFields={getFields(formValues.countryCode || '') || []}
                            googleMapsApiKey={googleMapsApiKey}
                            isFloatingLabelEnabled={isFloatingLabelEnabled}
                            onChange={handleAddressChange}
                            setFieldValue={(fieldName: string, value: string | string[]) => {
                                // Mock setFieldValue to prevent controlled/uncontrolled warning
                                handleAddressChange(fieldName, value);
                            }}
                            shouldShowSaveAddress={false}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditCardBillingAddress; 