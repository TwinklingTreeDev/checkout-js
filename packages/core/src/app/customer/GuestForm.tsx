import classNames from 'classnames';
import { debounce } from 'lodash';
import { FieldProps, FormikProps, withFormik } from 'formik';
import React, { FunctionComponent, memo, ReactNode, useCallback, useState, useEffect, useRef } from 'react';
import { object, string } from 'yup';
import { useCheckoutForm } from '../checkout/CheckoutFormContext';

import { TranslatedString, withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';

import { getPrivacyPolicyValidationSchema, PrivacyPolicyField } from '../privacyPolicy';
import { Button, ButtonVariant } from '../ui/button';
import { BasicFormField, Fieldset, Form, Legend } from '../ui/form';

import EmailField from './EmailField';
import SubscribeField from './SubscribeField';
import { SubscribeSessionStorage } from './SubscribeSessionStorage';

function getShouldSubscribeValue(requiresMarketingConsent: boolean, defaultShouldSubscribe: boolean) {
    if (SubscribeSessionStorage.getSubscribeStatus()) {
        return true;
    }

    return requiresMarketingConsent ? false : defaultShouldSubscribe
}

export interface GuestFormProps {
    canSubscribe: boolean;
    checkoutButtons?: ReactNode;
    continueAsGuestButtonLabelId: string;
    requiresMarketingConsent: boolean;
    defaultShouldSubscribe: boolean;
    email?: string;
    isLoading: boolean;
    privacyPolicyUrl?: string;
    isExpressPrivacyPolicy: boolean;
    isFloatingLabelEnabled?: boolean;
    guestAutosaveDelay?: number;
    onChangeEmail(email: string): void;
    onContinueAsGuest(data: GuestFormValues): void;
    onShowLogin(): void;
    continueAsGuest(credentials: any): Promise<any>; // Add the actual subscription API
    hasBillingId: boolean; // Add this for subscription logic
    onUnhandledError?(error: Error): void;
}

export interface GuestFormValues {
    email: string;
    shouldSubscribe: boolean;
}

// Auto-save delay constant (same as other sections)
export const GUEST_AUTOSAVE_DELAY = 1700;

// Email validation regex for checking if email is complete
const EMAIL_REGEXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;

const GuestForm: FunctionComponent<
    GuestFormProps & WithLanguageProps & FormikProps<GuestFormValues>
> = ({
    canSubscribe,
    checkoutButtons,
    continueAsGuestButtonLabelId,
    isLoading,
    onChangeEmail,
    onShowLogin,
    privacyPolicyUrl,
    requiresMarketingConsent,
    isExpressPrivacyPolicy,
    isFloatingLabelEnabled,
    guestAutosaveDelay = GUEST_AUTOSAVE_DELAY,
    continueAsGuest,
    hasBillingId,
    onUnhandledError,
    values,
    setFieldValue,
    setFieldTouched,
}) => {
    const [isUpdatingGuestData, setIsUpdatingGuestData] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    // Use centralized form state manager
    const { updateEmail } = useCheckoutForm();

    // Sync prefilled data to consignment on component mount
    useEffect(() => {
        const syncPrefilledData = async () => {
            if (values.email && values.email.trim()) {
                try {
                    // Use centralized form state manager
                    await updateEmail(values.email, values.shouldSubscribe);
                    
                    // Trigger subscription API if user wants to subscribe (same flow as button)
                    if (canSubscribe) {
                        try {
                            // Use the actual continueAsGuest API for subscription (same as button)
                            await continueAsGuest({
                                email: values.email,
                                acceptsMarketingNewsletter: values.shouldSubscribe,
                                acceptsAbandonedCartEmails: values.shouldSubscribe,
                            });
                            
                        } catch (subscriptionError) {
                            // Don't fail the main email update for subscription errors
                        }
                    }
                    
                } catch (error) {
                    if (error instanceof Error && onUnhandledError) {
                        onUnhandledError(error);
                    }
                }
            }
        };

        // Run sync after a short delay to ensure component is fully mounted
        const timeoutId = setTimeout(syncPrefilledData, 100);
        
        return () => clearTimeout(timeoutId);
    }, [updateEmail, values.email, values.shouldSubscribe, continueAsGuest, canSubscribe]); // Include dependencies

    // Helper function to check if email is valid
    const isEmailValid = useCallback((email: string): boolean => {
        const isValid = email.trim() !== '' && EMAIL_REGEXP.test(email);
        return isValid;
    }, []);

    // Validation methods for guest form
    const handleValidationTrigger = useCallback((_event?: Event, specificFieldName?: string): void => {
        // Ignore the event parameter if not needed
        validateFields(specificFieldName);
    }, []);

    const validateFields = useCallback((specificFieldName?: string): void => {
        const { current } = formRef;
        if (!current) return;

        
        // Only run validation for guest form
        const guestContainer = current.querySelector('#checkout-customer-guest') || current.closest('#checkout-customer-guest');
        if (!guestContainer) {
            return;
        }

        // Check if there's an existing validation system that's already handling errors
        const existingErrorSystems = current.querySelectorAll('.form-field-errors');
        if (existingErrorSystems.length > 0) {
            // If existing error system is present, let it handle validation completely
            return;
        }

        // Run validation and get errors directly
        const errors: Record<string, string> = {};
        
        // Get email value directly from DOM input to ensure we have the current value
        const emailInput = current.querySelector('input[name="email"], input[id="email"]') as HTMLInputElement;
        const emailValue = emailInput?.value || values.email;
        
        // If a specific field is provided, only validate that field (for blur events)
        if (specificFieldName) {
            if (specificFieldName === 'email') {
                if (!emailValue?.trim()) {
                    errors.email = 'Email address is required';
                } else if (!isEmailValid(emailValue)) {
                    errors.email = 'Please enter a valid email address';
                }
            }
        } else {
            // If no specific field provided, validate all fields (for triggerValidation events)
            if (!emailValue?.trim()) {
                errors.email = 'Email address is required';
            } else if (!isEmailValid(emailValue)) {
                errors.email = 'Please enter a valid email address';
            }
        }
        
        const isValid = Object.keys(errors).length === 0;
        
        if (!isValid) {
            // Add red borders to invalid fields and show error messages
            const fieldSelectors: Record<string, string> = {
                email: '.form-field, .customerEmail-container .form-field',
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
            // Clear validation error for the specific field when it becomes valid
            if (specificFieldName) {
                clearFieldValidationError(specificFieldName);
            }
        }
    }, [values.email, isEmailValid]);

    const clearFieldValidationError = useCallback((fieldName: string): void => {
        const { current } = formRef;
        if (!current) return;

        // Only clear validation for guest form
        const guestContainer = current.querySelector('#checkout-customer-guest') || current.closest('#checkout-customer-guest');
        if (!guestContainer) {
            return;
        }

        // Check if there's an existing validation system that's already handling errors
        const existingErrorSystems = current.querySelectorAll('.form-field-errors');
        if (existingErrorSystems.length > 0) {
            // If existing error system is present, let it handle validation completely
            return;
        }

        // Map field names to selectors
        const fieldSelectors: Record<string, string> = {
            email: '.form-field, .customerEmail-container .form-field',
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
    }, []);



    const handleInputChange = useCallback((event: Event): void => {
        const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (!target) return;

        // Only handle input changes for guest form
        const guestContainer = target.closest('#checkout-customer-guest');
        if (!guestContainer) {
            return;
        }

        // Get the field name from the input element
        const fieldName = target.name || target.id;
        if (!fieldName) {
            return;
        }
        // Only show validation errors on blur events, not while typing
        if (event.type === 'blur') {
            // Check if the field has a valid value and clear its validation error
            if (target.value && target.value.trim()) {
                // For email field, check if it's actually valid before clearing error
                if (fieldName === 'email') {
                    if (isEmailValid(target.value)) {
                        clearFieldValidationError(fieldName);
                    } else {
                        // Trigger validation to show error for invalid email (specific field only)
                        setTimeout(() => {
                            validateFields(fieldName);
                        }, 100);
                    }
                } else {
                    // For non-email fields, clear error if they have any value
                    clearFieldValidationError(fieldName);
                }
            } else {
                // If field is empty, trigger validation to show error (specific field only)
                setTimeout(() => {
                    validateFields(fieldName);
                }, 100);
            }
        } else {
            // For input/change events, only clear errors if field becomes valid
            if (target.value && target.value.trim()) {
                if (fieldName === 'email' && isEmailValid(target.value)) {
                    clearFieldValidationError(fieldName);
                } else if (fieldName !== 'email') {
                    clearFieldValidationError(fieldName);
                }
            }
        }
    }, [clearFieldValidationError, validateFields, isEmailValid]);

    // Create debounced update function using centralized form state manager
    const debouncedUpdateGuestData = useCallback(
        debounce(
            async (email: string, shouldSubscribe: boolean) => {
                // Only update if email is valid
                if (!isEmailValid(email)) {
                    return;
                }

                try {
                    setIsUpdatingGuestData(true);
                    
                    // Use centralized form state manager (consignment API)
                    await updateEmail(email, shouldSubscribe);
                    
                    // Trigger subscription API if user wants to subscribe (same flow as button)
                    if (canSubscribe) {
                        try {
                            // Use the actual continueAsGuest API for subscription (same as button)
                            await continueAsGuest({
                                email,
                                acceptsMarketingNewsletter: shouldSubscribe,
                                acceptsAbandonedCartEmails: shouldSubscribe,
                            });
                            
                        } catch (_subscriptionError) {
                           // Don't fail the main email update for subscription errors
                        }
                    }
                    
                } catch (error) {
                    if (error instanceof Error && onUnhandledError) {
                        onUnhandledError(error);
                    }
                } finally {
                    setIsUpdatingGuestData(false);
                }
            },
            guestAutosaveDelay,
        ),
        [updateEmail, onUnhandledError, guestAutosaveDelay, isEmailValid, continueAsGuest, canSubscribe, hasBillingId],
    );

    // Handle field changes for auto-save
    const handleFieldChange = useCallback(
        async (fieldName: string, value: string | boolean) => {
            // Update the form field
            setFieldValue(fieldName, value);

            // Wait for Formik to process the change
            await new Promise((resolve) => setTimeout(resolve, 0));

            // Handle email changes
            if (fieldName === 'email' && typeof value === 'string') {
                onChangeEmail(value);
                
                // Only trigger auto-save when email is valid and not empty
                if (value.trim() && isEmailValid(value)) {
                    setIsUpdatingGuestData(true);
                    debouncedUpdateGuestData(value, values.shouldSubscribe);
                }
            }

            // Handle subscription changes
            if (fieldName === 'shouldSubscribe' && typeof value === 'boolean') {
                
                // Only trigger auto-save when we have a valid email
                if (values.email && isEmailValid(values.email)) {
                    setIsUpdatingGuestData(true);
                    debouncedUpdateGuestData(values.email, value);
                }
            }
        },
        [setFieldValue, values, onChangeEmail, debouncedUpdateGuestData, isEmailValid],
    );

    // Handle email field blur - validate and update when user finishes typing
    const handleEmailBlur = useCallback(
        async (email: string) => {
            // Mark field as touched for validation
            setFieldTouched('email', true);
            
            // If email is valid, update immediately
            if (email.trim() && isEmailValid(email)) {
                setIsUpdatingGuestData(true);
                try {
                    // Use centralized form state manager (consignment API)
                    await updateEmail(email, values.shouldSubscribe);
                    
                    // Trigger subscription API if user wants to subscribe (same flow as button)
                    if (canSubscribe) {
                        try {
                            // Use the actual continueAsGuest API for subscription (same as button)
                            await continueAsGuest({
                                email,
                                acceptsMarketingNewsletter: values.shouldSubscribe,
                                acceptsAbandonedCartEmails: values.shouldSubscribe,
                            });
                            
                        } catch (_subscriptionError) {
                                // Don't fail the main email update for subscription errors
                        }
                    }
                } catch (error) {
                    if (error instanceof Error && onUnhandledError) {
                        onUnhandledError(error);
                    }
                } finally {
                    setIsUpdatingGuestData(false);
                }
            }
        },
        [setFieldTouched, isEmailValid, updateEmail, values.shouldSubscribe, onUnhandledError, continueAsGuest, canSubscribe, hasBillingId],
    );

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateGuestData.cancel();
        };
    }, [debouncedUpdateGuestData]);

    // Set up validation listener for guest form
    useEffect(() => {
        const { current } = formRef;
        if (!current) return;

        // Find the correct container - the one with id "checkout-customer-guest"
        const container = (current.querySelector('#checkout-customer-guest') || current.closest('#checkout-customer-guest')) as HTMLElement;
        if (container) {
            // Remove existing listener to avoid duplicates
            container.removeEventListener('triggerValidation', handleValidationTrigger);
            container.addEventListener('triggerValidation', handleValidationTrigger);
        }

        // Only attach listeners to inputs within the guest form container
        const guestInputs = current.querySelectorAll('input, select, textarea');
        guestInputs.forEach(input => {
            input.addEventListener('input', handleInputChange);
            input.addEventListener('change', handleInputChange);
            input.addEventListener('blur', handleInputChange);
        });

        return () => {
            if (container) {
                container.removeEventListener('triggerValidation', handleValidationTrigger);
            }

            // Remove input event listeners from guest inputs only
            const guestInputs = current.querySelectorAll('input, select, textarea');
            guestInputs.forEach(input => {
                input.removeEventListener('input', handleInputChange);
                input.removeEventListener('change', handleInputChange);
                input.removeEventListener('blur', handleInputChange);
            });
        };
    }, [handleValidationTrigger, handleInputChange, validateFields]);

    const renderField = useCallback(
        (fieldProps: FieldProps<boolean>) => (
            <SubscribeField {...fieldProps} requiresMarketingConsent={requiresMarketingConsent} />
        ),
        [requiresMarketingConsent],
    );

    return (
        <div ref={formRef}>
            <Form
                className="checkout-form"
                id="checkout-customer-guest"
                testId="checkout-customer-guest"
            >
            <Fieldset
                legend={
                    <Legend hidden>
                        <TranslatedString id="customer.guest_customer_text" />
                    </Legend>
                }
            >
                <div className="customerEmail-container">
                    <div className="customerEmail-body">
                        <EmailField 
                            isFloatingLabelEnabled={isFloatingLabelEnabled} 
                            onChange={(email) => handleFieldChange('email', email)}
                            onBlur={(email) => handleEmailBlur(email)}
                        />

                        {(canSubscribe || requiresMarketingConsent) && (
                            <BasicFormField 
                                name="shouldSubscribe" 
                                render={renderField}
                                onChange={(value) => handleFieldChange('shouldSubscribe', value)}
                            />
                        )}
                    </div>

                    <div
                        className={classNames('form-actions customerEmail-action', {
                            'customerEmail-floating--enabled': isFloatingLabelEnabled,
                        })}
                    >
                        <Button
                            className="customerEmail-button"
                            id="checkout-customer-continue"
                            isLoading={isLoading || isUpdatingGuestData}
                            testId="customer-continue-as-guest-button"
                            type="submit"
                            variant={ButtonVariant.Primary}
                        >
                            <TranslatedString id={continueAsGuestButtonLabelId} />
                        </Button>

                        <Button
                            className="customerEmail-button"
                            id="checkout-customer-signin"
                            onClick={onShowLogin}
                            testId="customer-signin-link"
                            type="button"
                            variant={ButtonVariant.Secondary}
                        >
                            <TranslatedString id="customer.sign_in_text" />
                        </Button>
                    </div>

                    {checkoutButtons && (
                        <div className="customerEmail-checkoutButtons">
                            {checkoutButtons}
                        </div>
                    )}
                </div>
            </Fieldset>

            {privacyPolicyUrl && (
                <PrivacyPolicyField
                    isExpressPrivacyPolicy={isExpressPrivacyPolicy}
                    url={privacyPolicyUrl}
                />
            )}
        </Form>
        </div>
    );
};

export default withLanguage(
    withFormik<GuestFormProps & WithLanguageProps, GuestFormValues>({
        mapPropsToValues: ({
            email = '',
            defaultShouldSubscribe = false,
            requiresMarketingConsent,
        }) => ({
            email,
            shouldSubscribe: getShouldSubscribeValue(requiresMarketingConsent, defaultShouldSubscribe),
            privacyPolicy: false,
        }),
        handleSubmit: (values, { props: { onContinueAsGuest } }) => {
            // Check if we're just validating forms, not actually submitting
            if ((window as any).__isValidatingForms) {
                return; // Don't actually submit, just let validation run
            }
            onContinueAsGuest(values);
        },
        validationSchema: ({ language, privacyPolicyUrl, isExpressPrivacyPolicy }: GuestFormProps & WithLanguageProps) => {
            const email = string()
                .email(language.translate('customer.email_invalid_error'))
                .max(256)
                .required(language.translate('customer.email_required_error'));

            const baseSchema = object({ email });

            if (privacyPolicyUrl && !isExpressPrivacyPolicy) {
                return baseSchema.concat(
                    getPrivacyPolicyValidationSchema({
                        isRequired: !!privacyPolicyUrl,
                        language,
                    }),
                );
            }

            return baseSchema;
        },
    })(memo(GuestForm)),
);
