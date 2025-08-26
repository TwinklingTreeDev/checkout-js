import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Address, Country, FormField } from '@bigcommerce/checkout-sdk';
import { debounce } from 'lodash';
import { AddressForm } from '../../address';
import { useCheckoutForm } from '../../checkout/CheckoutFormContext';
import './CreditCardBillingAddress.scss';

export interface CreditCardBillingAddressProps {
    billingAddress?: Address;
    shippingAddress?: Address; // Add shipping address prop
    customerEmail?: string; // Add customer email prop
    countries: Country[];
    countriesWithAutocomplete: string[];
    getFields(countryCode?: string): FormField[];
    isFloatingLabelEnabled?: boolean;
    googleMapsApiKey?: string;
    onBillingAddressChange?(address: Partial<Address>): void;
    onBillingSameAsShippingChange?(isSame: boolean): void;
    isBillingSameAsShipping?: boolean;
    // Auto-save props
    onUnhandledError?(error: Error): void;
    billingAutosaveDelay?: number;
}

const CreditCardBillingAddress: React.FC<CreditCardBillingAddressProps> = ({
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
    isBillingSameAsShipping = true, // Default to checked
    onUnhandledError,
    billingAutosaveDelay = 500, // Reduced delay for better responsiveness
}) => {
    // Use centralized form state manager
    const { updateBillingAddress } = useCheckoutForm();
    const [localIsBillingSameAsShipping, setLocalIsBillingSameAsShipping] = useState(isBillingSameAsShipping);
    const [isExpanded, setIsExpanded] = useState(!isBillingSameAsShipping);
    const [formValues, setFormValues] = useState<Partial<Address>>(billingAddress || {});
    const [formKey, setFormKey] = useState(0); // Key to force re-render when clearing
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showValidation, setShowValidation] = useState(false);

    const formRef = useRef<HTMLDivElement>(null);
    const billingAddressRef = useRef(billingAddress);
    const updateBillingAddressRef = useRef(updateBillingAddress);
    const isSyncingFormRef = useRef(false);
    
    // Update the ref when the function changes
    useEffect(() => {
        updateBillingAddressRef.current = updateBillingAddress;
    }, [updateBillingAddress]);

    // Utility: sync current form data to billing consignment
    const syncFormDataToBilling = useCallback(async () => {
        try {
            // If form is empty, preserve existing billing address data
            const currentFormData = Object.keys(formValues).length > 0 ? formValues : (billingAddress || {});
            
            // Sync current form values to billing address consignment
            const formDataWithEmail = {
                ...currentFormData,
                // Always preserve email - prioritize customer email, then billing address email
                email: customerEmail || (billingAddress as any)?.email || '',
            };
            await updateBillingAddressRef.current(formDataWithEmail);
        } catch (error) {
            if (error instanceof Error && onUnhandledError) {
                onUnhandledError(error);
            }
        }
    }, [onUnhandledError, customerEmail, billingAddress, formValues]);

    // Create debounced update function for auto-save
    const debouncedUpdateBillingData = useMemo(
        () => debounce(
            async (address: Partial<Address>) => {
                try {
                    if (address) {
                        await updateBillingAddressRef.current(address);
                    }
                } catch (error) {
                    if (error instanceof Error && onUnhandledError) {
                        onUnhandledError(error);
                    }
                }
            },
            billingAutosaveDelay,
        ),
        [billingAutosaveDelay, onUnhandledError],
    );

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const isChecked = event.target.checked;

        // Update UI immediately
        setLocalIsBillingSameAsShipping(isChecked);
        setIsExpanded(!isChecked);
        onBillingSameAsShippingChange?.(isChecked);

        // Cancel any pending autosave
        debouncedUpdateBillingData.cancel();

        if (isChecked) {
            setFormKey(prev => prev + 1);
            // When checking "same as shipping", manually sync shipping address to billing
            if (shippingAddress) {
                // Preserve existing billing address data and sync shipping address fields
                const billingAddressWithEmail = {
                    ...billingAddress, // Preserve existing billing data
                    ...shippingAddress, // Override with shipping data
                    email: (billingAddress as any)?.email || customerEmail || (shippingAddress as any).email, // Preserve email priority
                };
                void updateBillingAddressRef.current(billingAddressWithEmail);
            }
            
            // Reset local form values to empty since we're not managing them
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
        } else {
            // When unchecking, clear the form and sync to billing consignment
            console.log('CreditCardBillingAddress: Unchecking checkbox - clearing form');
            isSyncingFormRef.current = true;
            
            // Reset local form values first
            const emptyFormValues = {
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
            };
            setFormValues(emptyFormValues);
            
            // Force re-render of the AddressForm by changing the key FIRST
            setFormKey(prev => prev + 1);
            
            // Clear form fields after a short delay to ensure the new form is rendered
            setTimeout(() => {
                
                            // Also call change handlers to ensure React state is updated
            const fieldNames = ['firstName', 'lastName', 'company', 'address1', 'address2', 'city', 'stateOrProvince', 'stateOrProvinceCode', 'postalCode', 'phone', 'countryCode'];
            fieldNames.forEach(fieldName => {
                console.log('CreditCardBillingAddress: Calling handleAddressChange for', fieldName, 'with empty value');
                handleAddressChange(fieldName, '');
            });
            
            // Force React to recognize the changes by triggering a synthetic change event on the form
            const formElement = formRef.current?.querySelector('form') || formRef.current;
            if (formElement) {
                console.log('CreditCardBillingAddress: Triggering synthetic form change event');
                formElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
                
                // Use another setTimeout to ensure this runs after any pending sync operations
                setTimeout(() => {
                    void syncFormDataToBilling();
                    // Reset the flag after syncing
                    setTimeout(() => {
                        isSyncingFormRef.current = false;
                        console.log('CreditCardBillingAddress: Form clearing completed, syncing flag reset');
                    }, 100);
                }, 50);
            }, 50);
        }
    };

    // Update expanded state when prop changes
    useEffect(() => {
        setIsExpanded(!isBillingSameAsShipping);
    }, [isBillingSameAsShipping]);

    // Update form values when billing address prop changes
    useEffect(() => {
        // Don't update form values if we're in the process of syncing the form
        if (isSyncingFormRef.current) {
            console.log('CreditCardBillingAddress: Skipping billingAddress update due to syncing flag');
            return;
        }
        
        if (billingAddress) {
            console.log('CreditCardBillingAddress: Updating form values from billingAddress:', billingAddress);
            setFormValues(billingAddress);
        } else {
            // Initialize with empty values to prevent controlled/uncontrolled warning
            console.log('CreditCardBillingAddress: Setting empty form values');
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

    // Initialize form with current billing address values
    useEffect(() => {
        if (billingAddress && Object.keys(billingAddress).length > 0) {
            // Initialize with current billing address values
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

        // Suppress React controlled/uncontrolled input warning and PayPal button rendering errors
        const originalError = console.error;
        console.error = (...args) => {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('uncontrolled input to be controlled')) {
                return; // Suppress this specific warning
            }
            if (args[0] && typeof args[0] === 'string' && args[0].includes('Do not render the PayPal button into a button element')) {
                return; // Suppress PayPal button rendering error
            }
            originalError.apply(console, args);
        };

        return () => {
            console.error = originalError; // Restore original console.error
        };
    }, []); // Only run on mount

    // Update ref when billingAddress changes
    useEffect(() => {
        billingAddressRef.current = billingAddress;
    }, [billingAddress]);

    // Sync shipping address to billing address when checkbox is checked and shipping changes
    useEffect(() => {
        if (localIsBillingSameAsShipping && shippingAddress) {
            // Preserve existing billing address data and sync shipping address fields
            const billingAddressWithEmail = {
                ...billingAddressRef.current, // Use ref to avoid infinite loop
                ...shippingAddress, // Override with shipping data
                email: (billingAddressRef.current as any)?.email || customerEmail || (shippingAddress as any).email, // Preserve email priority
            };
            void updateBillingAddressRef.current(billingAddressWithEmail);
        }
    }, [localIsBillingSameAsShipping, shippingAddress, customerEmail]); // Removed updateBillingAddress from dependencies

    // Simple validation function
    const validateForm = useCallback(() => {
        
        if (!isExpanded || localIsBillingSameAsShipping) {
            console.log('🔍 CreditCardBillingAddress: Skipping validation - form collapsed or same as shipping');
            // If form is collapsed or same as shipping is checked, no validation needed
            setValidationErrors({});
            setShowValidation(false);
            return true;
        }

        const errors: Record<string, string> = {};
        
        // Required field validation - use standard camelCase field names
        const firstName = formValues.firstName;
        const lastName = formValues.lastName;
        const address1 = formValues.address1;
        const city = formValues.city;
        const postalCode = formValues.postalCode;
        const phone = formValues.phone;
        const countryCode = formValues.countryCode;
        
        console.log('🔍 CreditCardBillingAddress: Field values - firstName:', firstName, 'lastName:', lastName, 'address1:', address1, 'city:', city, 'postalCode:', postalCode, 'phone:', phone, 'countryCode:', countryCode);
        
        if (!firstName?.trim()) {
            errors.firstName = 'First Name is required';
            console.log('🔍 CreditCardBillingAddress: firstName validation failed');
        }
        if (!lastName?.trim()) {
            errors.lastName = 'Last Name is required';
            console.log('🔍 CreditCardBillingAddress: lastName validation failed');
        }
        if (!address1?.trim()) {
            errors.address1 = 'Address is required';
            console.log('🔍 CreditCardBillingAddress: address1 validation failed');
        }
        if (!city?.trim()) {
            errors.city = 'City is required';
            console.log('🔍 CreditCardBillingAddress: city validation failed');
        }
        if (!postalCode?.trim()) {
            errors.postalCode = 'ZIP code is required';
            console.log('🔍 CreditCardBillingAddress: postalCode validation failed');
        }
        if (!phone?.trim()) {
            errors.phone = 'Phone is required';
            console.log('🔍 CreditCardBillingAddress: phone validation failed');
        }
        if (!countryCode?.trim()) {
            errors.countryCode = 'Country is required';
            console.log('🔍 CreditCardBillingAddress: countryCode validation failed');
        }

        console.log('🔍 CreditCardBillingAddress: Validation errors:', errors);
        setValidationErrors(errors);
        setShowValidation(true);
        
        const isValid = Object.keys(errors).length === 0;
        console.log('🔍 CreditCardBillingAddress: Form is valid:', isValid);
        return isValid;
    }, [isExpanded, localIsBillingSameAsShipping, formValues]);

    // Listen for validation trigger events
    useEffect(() => {
        const handleValidationTrigger = () => {
            console.log('🎯 CreditCardBillingAddress: triggerValidation event received!');
            console.log('🎯 CreditCardBillingAddress: formRef.current:', formRef.current);
            
            // Run validation and get errors directly
            const errors: Record<string, string> = {};
            
            if (!isExpanded || localIsBillingSameAsShipping) {
                console.log('🎯 CreditCardBillingAddress: Skipping validation - form collapsed or same as shipping');
                return;
            }
            
            // Required field validation - use standard camelCase field names
            const firstName = formValues.firstName;
            const lastName = formValues.lastName;
            const address1 = formValues.address1;
            const city = formValues.city;
            const postalCode = formValues.postalCode;
            const phone = formValues.phone;
            const countryCode = formValues.countryCode;
            
            console.log('🎯 CreditCardBillingAddress: Field values - firstName:', firstName, 'lastName:', lastName, 'address1:', address1, 'city:', city, 'postalCode:', postalCode, 'phone:', phone, 'countryCode:', countryCode);

            if (!firstName?.trim()) {
                errors.firstName = 'First Name is required';
            }
            if (!lastName?.trim()) {
                errors.lastName = 'Last Name is required';
            }
            if (!address1?.trim()) {
                errors.address1 = 'Address is required';
            }
            if (!city?.trim()) {
                errors.city = 'City is required';
            }
            if (!postalCode?.trim()) {
                errors.postalCode = 'ZIP code is required';
            }
            if (!phone?.trim()) {
                errors.phone = 'Phone is required';
            }
            if (!countryCode?.trim()) {
                errors.countryCode = 'Country is required';
            }
            
            console.log('🎯 CreditCardBillingAddress: Validation errors:', errors);
            const isValid = Object.keys(errors).length === 0;
            console.log('🎯 CreditCardBillingAddress: Validation result:', isValid);
            
            if (!isValid) {
                console.log('🎯 CreditCardBillingAddress: Form is invalid, adding error styling');
                // Add red borders to invalid fields and show error messages
                // Map validation errors to specific CSS selectors based on the actual HTML structure
                const fieldSelectors: Record<string, string> = {
                    firstName: '.dynamic-form-field--firstName .form-field',
                    lastName: '.dynamic-form-field--lastName .form-field',
                    address1: '.dynamic-form-field--addressLineAutocomplete .form-field',
                    city: '.dynamic-form-field--city .form-field',
                    postalCode: '.dynamic-form-field--postCode .form-field',
                    phone: '.dynamic-form-field--phone .form-field',
                    countryCode: '.dynamic-form-field--countryCode .form-field',
                };
                
                Object.keys(errors).forEach(fieldName => {
                    console.log('🎯 CreditCardBillingAddress: Processing field:', fieldName);
                    
                    const selector = fieldSelectors[fieldName];
                    if (!selector) {
                        console.log('🎯 CreditCardBillingAddress: No selector found for field:', fieldName);
                        return;
                    }
                    
                    console.log('🎯 CreditCardBillingAddress: Searching with selector:', selector);
                    console.log('🎯 CreditCardBillingAddress: formRef.current:', formRef.current);
                    const formFieldElement = formRef.current?.querySelector(selector) as HTMLElement;
                    console.log('🎯 CreditCardBillingAddress: Found form-field element for', fieldName, ':', formFieldElement);
                    
                    if (formFieldElement) {
                        // Add red border class to the inner .form-field div
                        formFieldElement.classList.add('form-field--error');
                        console.log('🎯 CreditCardBillingAddress: Added form-field--error class to form-field for', fieldName);
                        
                        // Add error message below the field
                        const errorMessage = errors[fieldName];
                        const existingError = formFieldElement.querySelector('.form-field-error-message');
                        if (!existingError) {
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'form-field-error-message';
                            errorDiv.innerHTML = `<label class="form-inlineMessage" role="alert">${errorMessage}</label>`;
                            formFieldElement.appendChild(errorDiv);
                            console.log('🎯 CreditCardBillingAddress: Added error message for', fieldName, ':', errorMessage);
                        }
                    } else {
                        console.log('🎯 CreditCardBillingAddress: Could not find form-field element for', fieldName, 'using selector:', selector);
                    }
                });
                
                                       // Scroll to first error
                       const firstErrorElement = formRef.current?.querySelector('.form-field--error') as HTMLElement;
                       if (firstErrorElement) {
                           firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                           firstErrorElement.focus();
                           console.log('🎯 CreditCardBillingAddress: Scrolled to first error element');
                       } else {
                           // Try to find any error element with the error class
                           const anyErrorElement = document.querySelector('.form-field--error') as HTMLElement;
                           if (anyErrorElement) {
                               anyErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                               anyErrorElement.focus();
                               console.log('🎯 CreditCardBillingAddress: Scrolled to error element found globally');
                           } else {
                               console.log('🎯 CreditCardBillingAddress: No error element found to scroll to');
                           }
                       }
            } else {
                console.log('🎯 CreditCardBillingAddress: Form is valid, removing error styling');
                // Remove all error styling when valid
                const errorFields = formRef.current?.querySelectorAll('.form-field--error');
                errorFields?.forEach(field => {
                    field.classList.remove('form-field--error');
                });
                
                const errorMessages = formRef.current?.querySelectorAll('.form-field-error-message');
                errorMessages?.forEach(message => {
                    message.remove();
                });
            }
        };

        // Find the correct container - the one with class "credit-card-billing-address"
        const container = formRef.current?.closest('.credit-card-billing-address') as HTMLElement;
        console.log('🎯 CreditCardBillingAddress: Setting up event listener on container:', container);
        if (container) {
            container.addEventListener('triggerValidation', handleValidationTrigger);
            console.log('🎯 CreditCardBillingAddress: Event listener added successfully');
        } else {
            console.log('🎯 CreditCardBillingAddress: No container found, cannot add event listener');
        }

        return () => {
            if (container) {
                container.removeEventListener('triggerValidation', handleValidationTrigger);
                console.log('🎯 CreditCardBillingAddress: Event listener removed');
            }
        };
    }, [validateForm]);

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateBillingData.cancel();
        };
    }, [debouncedUpdateBillingData]);

    // Ensure billing address fields have unique IDs to prevent label focus conflicts
    useEffect(() => {
        if (formRef.current && isExpanded) {
            const timeoutId = setTimeout(() => {
                const billingForm = formRef.current?.querySelector('.checkout-address');
                if (billingForm) {
                    const inputs = billingForm.querySelectorAll('input, select, textarea');
                    inputs.forEach((input) => {
                        const inputElement = input as HTMLElement;
                        const id = inputElement.getAttribute('id');
                        if (id && !id.startsWith('billing-')) {
                            inputElement.setAttribute('id', 'billing-' + id);
                        }
                    });
                    
                    const labels = billingForm.querySelectorAll('label');
                    labels.forEach((label) => {
                        const labelElement = label as HTMLLabelElement;
                        const forAttr = labelElement.getAttribute('for');
                        if (forAttr && !forAttr.startsWith('billing-')) {
                            labelElement.setAttribute('for', 'billing-' + forAttr);
                        }
                    });
                }
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [isExpanded, formKey]); // Re-run when form expands or key changes

    // Additional form clearing effect when form key changes (after clearing)
    useEffect(() => {
        if (formKey > 0 && !isExpanded) {
            // When form key changes (indicating a clear operation), ensure form is empty
            const timeoutId = setTimeout(() => {
                console.log('CreditCardBillingAddress: Form key changed, ensuring form is empty');
            }, 200);

            return () => clearTimeout(timeoutId);
        }
    }, [formKey, isExpanded]);

    const handleAddressChange = (fieldName: string, value: string | string[]) => {
        console.log('🎯 CreditCardBillingAddress: handleAddressChange called with fieldName:', fieldName, 'value:', value);
        if (!localIsBillingSameAsShipping) {
            // Only handle address changes when user wants different billing address
            // Update local form values
            const updatedFormValues = { ...formValues, [fieldName]: value };
            setFormValues(updatedFormValues);
            
            // Clear validation error for this field when user starts typing
            console.log('🎯 CreditCardBillingAddress: showValidation:', showValidation, 'validationErrors:', validationErrors, 'fieldName:', fieldName, 'hasError:', validationErrors[fieldName]);
            
            // Always try to clear error styling when user types, regardless of validation state
            if (value && value.toString().trim()) {
                // Use the same field selectors as in validation
                const fieldSelectors: Record<string, string> = {
                    firstName: '.dynamic-form-field--firstName .form-field',
                    lastName: '.dynamic-form-field--lastName .form-field',
                    address1: '.dynamic-form-field--addressLineAutocomplete .form-field',
                    city: '.dynamic-form-field--city .form-field',
                    postalCode: '.dynamic-form-field--postCode .form-field',
                    phone: '.dynamic-form-field--phone .form-field',
                    countryCode: '.dynamic-form-field--countryCode .form-field',
                };
                
                const selector = fieldSelectors[fieldName];
                if (selector) {
                    const formFieldElement = formRef.current?.querySelector(selector) as HTMLElement;
                    if (formFieldElement) {
                        formFieldElement.classList.remove('form-field--error');
                        const errorMessage = formFieldElement.querySelector('.form-field-error-message');
                        if (errorMessage) {
                            errorMessage.remove();
                        }
                        console.log('🎯 CreditCardBillingAddress: Removed error styling for', fieldName);
                    }
                }
                
                // Remove error from state if it exists
                if (validationErrors[fieldName]) {
                    const newErrors = { ...validationErrors };
                    delete newErrors[fieldName];
                    setValidationErrors(newErrors);
                }
            }
            
            // Create updated address using current form values to preserve all fields
            const updatedAddress = { 
                ...formValues, // Use current form values as base
                [fieldName]: value // Update the specific field
            };
            
            // Call the original callback for immediate UI updates
            onBillingAddressChange?.(updatedAddress);
            
            // Auto-save functionality - use the updated address with all current values
            debouncedUpdateBillingData(updatedAddress);
        }
        // When checkbox is checked, manually sync shipping address to billing address
        // This is handled by the useEffect that watches shippingAddress changes
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
                            key={formKey} // Force re-render when clearing form
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