import { Address, Country, FormField } from '@bigcommerce/checkout-sdk';
import { memoize } from '@bigcommerce/memoize';
import { forIn, noop } from 'lodash';
import React, { Component, createRef, ReactNode, RefObject } from 'react';

import { TranslatedString, withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';

import { AutocompleteItem } from '../ui/autocomplete';
import { CheckboxFormField, DynamicFormField, DynamicFormFieldType, Fieldset } from '../ui/form';

import { AddressKeyMap } from './address';
import {
    getAddressFormFieldInputId,
    getAddressFormFieldLegacyName,
} from './getAddressFormFieldInputId';
import { GoogleAutocompleteFormField, mapToAddress } from './googleAutocomplete';
import './AddressForm.scss';

export interface AddressFormProps {
    fieldName?: string;
    countryCode?: string;
    countriesWithAutocomplete?: string[];
    countries?: Country[];
    formFields: FormField[];
    googleMapsApiKey?: string;
    shouldShowSaveAddress?: boolean;
    isFloatingLabelEnabled?: boolean;
    onAutocompleteSelect?(address: Partial<Address>): void;
    onAutocompleteToggle?(state: { inputValue: string; isOpen: boolean }): void;
    onChange?(fieldName: string, value: string | string[]): void;
    setFieldValue?(fieldName: string, value: string | string[]): void;
}

const LABEL: AddressKeyMap = {
    address1: 'address.address_line_1_label',
    address2: 'address.address_line_2_label',
    city: 'address.city_label',
    company: 'address.company_name_label',
    countryCode: 'address.country_label',
    firstName: 'address.first_name_label',
    lastName: 'address.last_name_label',
    phone: 'address.phone_number_label',
    postalCode: 'address.postal_code_label',
    stateOrProvince: 'address.state_label',
    stateOrProvinceCode: 'address.state_label',
};

const AUTOCOMPLETE: AddressKeyMap = {
    address1: 'address-line1',
    address2: 'address-line2',
    city: 'address-level2',
    company: 'organization',
    countryCode: 'country',
    firstName: 'given-name',
    lastName: 'family-name',
    phone: 'tel',
    postalCode: 'postal-code',
    stateOrProvince: 'address-level1',
    stateOrProvinceCode: 'address-level1',
};

const PLACEHOLDER: AddressKeyMap = {
    countryCode: 'address.select_country_action',
    stateOrProvince: 'address.select_state_action',
    stateOrProvinceCode: 'address.select_state_action',
};

const AUTOCOMPLETE_FIELD_NAME = 'address1';

class AddressForm extends Component<AddressFormProps & WithLanguageProps> {
    private containerRef: RefObject<HTMLElement> = createRef();
    private nextElement?: HTMLElement | null;

    private handleDynamicFormFieldChange: (name: string) => (value: string | string[]) => void =
        memoize((name) => (value) => {
            this.syncNonFormikValue(name, value);
            
            // Clear validation error for this field when it has a value
            if (value && value.toString().trim()) {
                this.clearFieldValidationError(name);
            }
        });

    componentDidMount(): void {
        const { current } = this.containerRef;

        if (current) {
            this.nextElement = current.querySelector<HTMLElement>('[autocomplete="address-line2"]');
        }
        this.setupValidationListener();
    }

    componentWillUnmount(): void {
        this.cleanupValidationListener();
    }



    private setupValidationListener = (): void => {
        const { current } = this.containerRef;
        
        if (!current) return;

        // Find the correct container - the one with id "checkoutShippingAddress"
        const container = current.closest('#checkoutShippingAddress') as HTMLElement;
        if (container) {
            // Remove existing listener to avoid duplicates
            container.removeEventListener('triggerValidation', this.handleValidationTrigger);
            container.addEventListener('triggerValidation', this.handleValidationTrigger);
        }

        // Also listen for input changes to clear errors when fields become valid
        // Only attach listeners to inputs within the shipping address container
        const shippingContainer = current.closest('#checkoutShippingAddress');
        if (shippingContainer) {
            const shippingInputs = shippingContainer.querySelectorAll('input, select, textarea');
            shippingInputs.forEach(input => {
                input.addEventListener('input', this.handleInputChange);
                input.addEventListener('change', this.handleInputChange);
                input.addEventListener('blur', this.handleInputChange);
            });
        }
    };

    private getFormValues = (): Record<string, string> => {
        const { current } = this.containerRef;
        if (!current) return {};

        const formValues: Record<string, string> = {};
        
        // Get values from form inputs using the field names
        const fieldMappings: Record<string, string> = {
            'shippingAddress.firstName': 'firstName',
            'shippingAddress.lastName': 'lastName',
            'shippingAddress.countryCode': 'countryCode',
            'shippingAddress.address1': 'address1',
            'shippingAddress.city': 'city',
            'shippingAddress.stateOrProvinceCode': 'stateOrProvinceCode',
            'shippingAddress.postalCode': 'postalCode',
        };
        
        // Get values from form inputs
        const inputs = current.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const element = input as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
            const name = element.name || element.id;
            const value = element.value;
            
            
            
            if (name && fieldMappings[name]) {
                formValues[fieldMappings[name]] = value;
            } else if (name && (name.includes('shippingAddress.') || name.includes('billingAddress.'))) {
                // Handle other address fields
                const fieldName = name.replace('shippingAddress.', '').replace('billingAddress.', '');
                formValues[fieldName] = value;
            } else if (name && (name.includes('address1') || name.includes('addressLineAutocomplete') || name === 'addressLine1Input')) {
                // Handle address field with different naming patterns
                formValues['address1'] = value;
            }
        });



        return formValues;
    };

    private getFieldLabel = (fieldName: string): string => {
        const labels: Record<string, string> = {
            firstName: 'First Name',
            lastName: 'Last Name',
            countryCode: 'Country',
            address1: 'Address',
            city: 'City',
            stateOrProvinceCode: 'State/Province',
            postalCode: 'ZIP Code',
        };
        
        return labels[fieldName] || fieldName;
    };

    private cleanupValidationListener = (): void => {
        const { current } = this.containerRef;
        if (!current) return;

        const container = current.closest('#checkoutShippingAddress') as HTMLElement;
        if (container) {
            container.removeEventListener('triggerValidation', this.handleValidationTrigger);
        }

        // Remove input event listeners from shipping inputs only
        const shippingContainer = current.closest('#checkoutShippingAddress');
        if (shippingContainer) {
            const shippingInputs = shippingContainer.querySelectorAll('input, select, textarea');
            shippingInputs.forEach(input => {
                input.removeEventListener('input', this.handleInputChange);
                input.removeEventListener('change', this.handleInputChange);
                input.removeEventListener('blur', this.handleInputChange);
            });
        }
    };

    private handleValidationTrigger = (_event?: Event, specificFieldName?: string): void => {
        this.validateFields(specificFieldName);
    };

    private validateFields = (specificFieldName?: string): void => {
        const { current } = this.containerRef;
        
        if (!current) return;

        // Only run validation for shipping address form, not billing address
        const shippingContainer = current.closest('#checkoutShippingAddress');
        if (!shippingContainer) {
            // This is not a shipping address form, skip validation
            return;
        }

        // Check if there's an existing validation system that's already handling errors
        const existingErrorSystems = current.querySelectorAll('.form-field-errors');
        if (existingErrorSystems.length > 0) {
            // If existing error system is present, let it handle validation completely
            // Just trigger the existing validation system instead of adding our own
            return;
        }

        // Run validation and get errors directly
        const errors: Record<string, string> = {};
        
        // Get form values from the container
        const formData = this.getFormValues();
        
        // If a specific field is provided, only validate that field (for blur events)
        if (specificFieldName) {
            const value = formData[specificFieldName];
            if (!value?.trim()) {
                errors[specificFieldName] = `${this.getFieldLabel(specificFieldName)} is required`;
            }
        } else {
            // If no specific field provided, validate all fields (for triggerValidation events)
            const requiredFields = ['firstName', 'lastName', 'countryCode', 'address1', 'city', 'stateOrProvinceCode', 'postalCode', 'phone'];
            
            requiredFields.forEach(fieldName => {
                const value = formData[fieldName];
                if (!value?.trim()) {
                    errors[fieldName] = `${this.getFieldLabel(fieldName)} is required`;
                }
            });
        }
        
        const isValid = Object.keys(errors).length === 0;
        
        if (!isValid) {
            // Add red borders to invalid fields and show error messages
            const fieldSelectors: Record<string, string> = {
                firstName: '.dynamic-form-field--firstName .form-field',
                lastName: '.dynamic-form-field--lastName .form-field',
                countryCode: '.dynamic-form-field--countryCode .form-field',
                address1: '.dynamic-form-field--addressLineAutocomplete .form-field',
                city: '.dynamic-form-field--city .form-field',
                stateOrProvinceCode: '.dynamic-form-field--provinceCode .form-field',
                postalCode: '.dynamic-form-field--postCode .form-field',
            };
            
            Object.keys(errors).forEach(fieldName => {
                const selector = fieldSelectors[fieldName];
                if (!selector) {
                    return;
                }
                
                const formFieldElement = current.querySelector(selector) as HTMLElement;
                
                if (formFieldElement) {
                    // Add error styling and custom error message
                    formFieldElement.classList.add('form-field--error');
                    
                    // Add error message below the field - ensure only one error message per field
                    const errorMessage = errors[fieldName];
                    
                    // Remove any existing error messages for this field first
                    const existingErrors = formFieldElement.querySelectorAll('.form-field-error-message');
                    existingErrors.forEach(error => error.remove());
                    
                    // Add new error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'form-field-error-message';
                    errorDiv.innerHTML = `<label class="form-inlineMessage" role="alert">${errorMessage}</label>`;
                    formFieldElement.appendChild(errorDiv);
                }
            });
        } else {
            // Clear all validation errors when form is valid
            this.clearValidationErrors();
        }
    };

    private clearValidationErrors = (): void => {
        const { current } = this.containerRef;
        if (!current) return;

        // Only clear validation for shipping address form, not billing address
        const shippingContainer = current.closest('#checkoutShippingAddress');
        if (!shippingContainer) {
            // This is not a shipping address form, skip clearing
            return;
        }

        // Check if there's an existing validation system that's already handling errors
        const existingErrorSystems = current.querySelectorAll('.form-field-errors');
        if (existingErrorSystems.length > 0) {
            // If existing error system is present, let it handle validation completely
            return;
        }

        // Remove all error styling
        const errorFields = current.querySelectorAll('.form-field--error');
        errorFields?.forEach(field => {
            field.classList.remove('form-field--error');
        });
        
        // Remove all our custom error messages
        const errorMessages = current.querySelectorAll('.form-field-error-message');
        errorMessages?.forEach(message => {
            message.remove();
        });
    };

    private handleInputChange = (event: Event): void => {
        const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (!target) return;

        // Only handle input changes for shipping address form, not billing address
        const shippingContainer = target.closest('#checkoutShippingAddress');
        if (!shippingContainer) {
            // This is not a shipping address form, skip handling
            return;
        }

        // Get the field name from the input element
        const fieldName = this.getFieldNameFromElement(target);
        if (!fieldName) return;

        // Only handle blur events for validation, not input/change events
        if (event.type === 'blur') {
            // Check if the field has a value and clear its validation error
            if (target.value && target.value.trim()) {
                this.clearFieldValidationError(fieldName);
            } else {
                // If field is empty, trigger validation to show error for this specific field only
                setTimeout(() => {
                    this.validateFields(fieldName);
                }, 100);
            }
        } else {
            // For input/change events, only clear errors if field becomes valid
            if (target.value && target.value.trim()) {
                this.clearFieldValidationError(fieldName);
            }
        }
    };

    private getFieldNameFromElement = (element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string | null => {
        const name = element.name || element.id;
        if (!name) return null;

        // Extract the field name from the full name (e.g., "shippingAddress.firstName" -> "firstName")
        if (name.includes('shippingAddress.')) {
            return name.replace('shippingAddress.', '');
        }
        if (name.includes('billingAddress.')) {
            return name.replace('billingAddress.', '');
        }
        
        // Handle special case for address1 field which might have different naming
        if (name.includes('address1') || name.includes('addressLineAutocomplete') || name === 'addressLine1Input') {
            return 'address1';
        }
        
        return name;
    };

    private clearFieldValidationError = (fieldName: string): void => {
        const { current } = this.containerRef;
        if (!current) return;

        // Only clear validation for shipping address form, not billing address
        const shippingContainer = current.closest('#checkoutShippingAddress');
        if (!shippingContainer) {
            // This is not a shipping address form, skip clearing
            return;
        }

        // Check if there's an existing validation system that's already handling errors
        const existingErrorSystems = current.querySelectorAll('.form-field-errors');
        if (existingErrorSystems.length > 0) {
            // If existing error system is present, let it handle validation completely
            return;
        }

        // Map field names to selectors - handle both the logical field names and actual input IDs
        const fieldSelectors: Record<string, string> = {
            firstName: '.dynamic-form-field--firstName .form-field',
            lastName: '.dynamic-form-field--lastName .form-field',
            countryCode: '.dynamic-form-field--countryCode .form-field',
            address1: '.dynamic-form-field--addressLineAutocomplete .form-field',
            addressLine1Input: '.dynamic-form-field--addressLineAutocomplete .form-field', // Handle the actual input ID
            city: '.dynamic-form-field--city .form-field',
            stateOrProvinceCode: '.dynamic-form-field--provinceCode .form-field',
            postalCode: '.dynamic-form-field--postCode .form-field',
        };

        const selector = fieldSelectors[fieldName];
        if (!selector) return;

        const formFieldElement = current.querySelector(selector) as HTMLElement;
        if (formFieldElement) {
            // Remove error styling
            formFieldElement.classList.remove('form-field--error');
            
            // Remove our custom error message
            const errorMessage = formFieldElement.querySelector('.form-field-error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        }
    };

    render(): ReactNode {
        const {
            formFields,
            fieldName,
            countriesWithAutocomplete,
            countryCode,
            googleMapsApiKey,
            onAutocompleteToggle,
            shouldShowSaveAddress,
            isFloatingLabelEnabled,
        } = this.props;

        // Custom sort.
        const isShipping = formFields.length ? (formFields[0].id == 'field_14') : false;
        const isBilling = formFields.length ? (formFields[0].id == 'field_4') : false;
        const customShippingSortOrder = ['field_14', 'field_15', 'field_16', 'field_21', 'field_18', 'field_19', 'field_20', 'field_22', 'field_23', 'field_17'];
        const customBillingSortOrder = ['field_4', 'field_5', 'field_6', 'field_11', 'field_8', 'field_9', 'field_10', 'field_12', 'field_13', 'field_7'];
        let customSortedFormFields = [...formFields];
        if (isShipping) {
            customSortedFormFields.sort((a, b) => customShippingSortOrder.indexOf(a.id) - customShippingSortOrder.indexOf(b.id));
        } else if (isBilling) {
            customSortedFormFields.sort((a, b) => customBillingSortOrder.indexOf(a.id) - customBillingSortOrder.indexOf(b.id));
        }
        
        return (
            <>
                <Fieldset>
                    <div
                        className="checkout-address"
                        ref={this.containerRef as RefObject<HTMLDivElement>}
                    >
                        {customSortedFormFields.map((field) => {
                            const addressFieldName = field.name;
                            const translatedPlaceholderId = PLACEHOLDER[addressFieldName];

                            if (
                                addressFieldName === 'address1' &&
                                googleMapsApiKey &&
                                countriesWithAutocomplete
                            ) {
                                return (
                                    <GoogleAutocompleteFormField
                                        apiKey={googleMapsApiKey}
                                        countryCode={countryCode}
                                        field={field}
                                        isFloatingLabelEnabled={isFloatingLabelEnabled}
                                        key={field.id}
                                        nextElement={this.nextElement || undefined}
                                        onChange={this.handleAutocompleteChange}
                                        onSelect={this.handleAutocompleteSelect}
                                        onToggleOpen={onAutocompleteToggle}
                                        parentFieldName={fieldName}
                                        supportedCountries={countriesWithAutocomplete}
                                    />
                                );
                            }

                            return (
                                <DynamicFormField
                                    autocomplete={AUTOCOMPLETE[field.name]}
                                    extraClass={`dynamic-form-field--${getAddressFormFieldLegacyName(
                                        addressFieldName,
                                    )}`}
                                    field={field}
                                    inputId={(isBilling ? 'billing-' : '') + getAddressFormFieldInputId(addressFieldName)}
                                    // stateOrProvince can sometimes be a dropdown or input, so relying on id is not sufficient
                                    isFloatingLabelEnabled={isFloatingLabelEnabled}
                                    key={`${field.id}-${field.name}`}
                                    label={
                                        field.custom ? (
                                            field.label
                                        ) : (
                                            <TranslatedString id={LABEL[field.name]} />
                                        )
                                    }
                                    onChange={this.handleDynamicFormFieldChange(addressFieldName)}
                                    parentFieldName={
                                        field.custom
                                            ? fieldName
                                                ? `${fieldName}.customFields`
                                                : 'customFields'
                                            : fieldName
                                    }
                                    placeholder={this.getPlaceholderValue(
                                        field,
                                        translatedPlaceholderId,
                                    )}
                                    isBilling={isBilling}
                                />
                            );
                        })}
                    </div>
                </Fieldset>
                {shouldShowSaveAddress && (
                    <CheckboxFormField
                        labelContent={<TranslatedString id="address.save_in_addressbook" />}
                        name={fieldName ? `${fieldName}.shouldSaveAddress` : 'shouldSaveAddress'}
                    />
                )}
            </>
        );
    }

    private getPlaceholderValue(field: FormField, translatedPlaceholderId: string): string {
        const { language } = this.props;

        if (field.default && field.fieldType !== 'dropdown') {
            return field.default;
        }

        return translatedPlaceholderId && language.translate(translatedPlaceholderId);
    }

    private handleAutocompleteChange: (value: string, isOpen: boolean) => void = (
        value,
        isOpen,
    ) => {
        if (!isOpen) {
            this.syncNonFormikValue(AUTOCOMPLETE_FIELD_NAME, value);
        }
    };

    private handleAutocompleteSelect: (
        place: google.maps.places.PlaceResult,
        item: AutocompleteItem,
    ) => void = (place, { value: autocompleteValue }) => {
        const { countries, setFieldValue = noop, onChange = noop } = this.props;

        const address = mapToAddress(place, countries);

        forIn(address, (value, fieldName) => {
            setFieldValue(fieldName, value as string);
            onChange(fieldName, value as string);
        });

        if (autocompleteValue) {
            this.syncNonFormikValue(AUTOCOMPLETE_FIELD_NAME, autocompleteValue);
        }
    };

    // because autocomplete state is controlled by Downshift, we need to manually keep formik
    // value in sync when autocomplete value changes
    private syncNonFormikValue: (fieldName: string, value: string | string[]) => void = (
        fieldName,
        value,
    ) => {
        const { formFields, setFieldValue = noop, onChange = noop } = this.props;

        const dateFormFieldNames = formFields
            .filter((field) => field.custom && field.fieldType === DynamicFormFieldType.date)
            .map((field) => field.name);

        if (fieldName === AUTOCOMPLETE_FIELD_NAME || dateFormFieldNames.indexOf(fieldName) > -1) {
            setFieldValue(fieldName, value);
        }

        onChange(fieldName, value);
    };
}

export default withLanguage(AddressForm);
