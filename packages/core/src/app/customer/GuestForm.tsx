import classNames from 'classnames';
import { debounce } from 'lodash';
import { FieldProps, FormikProps, withFormik } from 'formik';
import React, { FunctionComponent, memo, ReactNode, useCallback, useState, useEffect } from 'react';
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

    // Use centralized form state manager
    const { updateEmail } = useCheckoutForm();

    // Sync prefilled data to consignment on component mount
    useEffect(() => {
        const syncPrefilledData = async () => {
            if (values.email && values.email.trim()) {
                console.log('GuestForm: Syncing prefilled email to consignment on mount:', values.email);
                try {
                    // Use centralized form state manager
                    await updateEmail(values.email, values.shouldSubscribe);
                    
                    // Trigger subscription API if user wants to subscribe (same flow as button)
                    if (canSubscribe) {
                        console.log('GuestForm: Triggering subscription API for prefilled data:', values.email);
                        try {
                            // Use the actual continueAsGuest API for subscription (same as button)
                            await continueAsGuest({
                                email: values.email,
                                acceptsMarketingNewsletter: values.shouldSubscribe,
                                acceptsAbandonedCartEmails: values.shouldSubscribe,
                            });
                            
                            console.log('GuestForm: Subscription API called successfully for prefilled data');
                        } catch (subscriptionError) {
                            console.error('GuestForm: Error calling subscription API for prefilled data:', subscriptionError);
                            // Don't fail the main email update for subscription errors
                        }
                    }
                    
                    console.log('GuestForm: Prefilled data synced successfully');
                } catch (error) {
                    console.error('GuestForm: Error syncing prefilled data:', error);
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
        return email.trim() !== '' && EMAIL_REGEXP.test(email);
    }, []);

    // Create debounced update function using centralized form state manager
    const debouncedUpdateGuestData = useCallback(
        debounce(
            async (email: string, shouldSubscribe: boolean) => {
                // Only update if email is valid
                if (!isEmailValid(email)) {
                    console.log('GuestForm: Skipping update for invalid email:', email);
                    return;
                }

                try {
                    console.log('GuestForm: Starting centralized email sync for:', email, 'shouldSubscribe:', shouldSubscribe);
                    setIsUpdatingGuestData(true);
                    
                    // Use centralized form state manager (consignment API)
                    await updateEmail(email, shouldSubscribe);
                    
                    // Trigger subscription API if user wants to subscribe (same flow as button)
                    if (canSubscribe) {
                        console.log('GuestForm: Triggering subscription API for:', email);
                        try {
                            // Use the actual continueAsGuest API for subscription (same as button)
                            await continueAsGuest({
                                email,
                                acceptsMarketingNewsletter: shouldSubscribe,
                                acceptsAbandonedCartEmails: shouldSubscribe,
                            });
                            
                            console.log('GuestForm: Subscription API called successfully');
                        } catch (subscriptionError) {
                            console.error('GuestForm: Error calling subscription API:', subscriptionError);
                            // Don't fail the main email update for subscription errors
                        }
                    }
                    
                } catch (error) {
                    console.error('GuestForm: Error updating email:', error);
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
                console.log('GuestForm: handleFieldChange called for email:', value, 'current values.email:', values.email);
                onChangeEmail(value);
                
                // Only trigger auto-save when email is valid and not empty
                if (value.trim() && isEmailValid(value)) {
                    console.log('GuestForm: Email changed and valid, triggering auto-save:', value);
                    setIsUpdatingGuestData(true);
                    debouncedUpdateGuestData(value, values.shouldSubscribe);
                } else {
                    console.log('GuestForm: Email change condition not met - value.trim():', value.trim(), 'isValid:', isEmailValid(value));
                }
            }

            // Handle subscription changes
            if (fieldName === 'shouldSubscribe' && typeof value === 'boolean') {
                console.log('GuestForm: handleFieldChange called for shouldSubscribe:', value, 'current values.shouldSubscribe:', values.shouldSubscribe);
                
                // Only trigger auto-save when we have a valid email
                if (values.email && isEmailValid(values.email)) {
                    console.log('GuestForm: Marketing consent changed, triggering auto-save:', value);
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
            console.log('GuestForm: Email blur event for:', email);
            
            // Mark field as touched for validation
            setFieldTouched('email', true);
            
            // If email is valid, update immediately
            if (email.trim() && isEmailValid(email)) {
                console.log('GuestForm: Email blur - updating with valid email:', email);
                setIsUpdatingGuestData(true);
                try {
                    // Use centralized form state manager (consignment API)
                    await updateEmail(email, values.shouldSubscribe);
                    
                    // Trigger subscription API if user wants to subscribe (same flow as button)
                    if (canSubscribe) {
                        console.log('GuestForm: Triggering subscription API on blur for:', email);
                        try {
                            // Use the actual continueAsGuest API for subscription (same as button)
                            await continueAsGuest({
                                email,
                                acceptsMarketingNewsletter: values.shouldSubscribe,
                                acceptsAbandonedCartEmails: values.shouldSubscribe,
                            });
                            
                            console.log('GuestForm: Subscription API called successfully on blur');
                        } catch (subscriptionError) {
                            console.error('GuestForm: Error calling subscription API on blur:', subscriptionError);
                            // Don't fail the main email update for subscription errors
                        }
                    }
                } catch (error) {
                    console.error('GuestForm: Error updating email on blur:', error);
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

    const renderField = useCallback(
        (fieldProps: FieldProps<boolean>) => (
            <SubscribeField {...fieldProps} requiresMarketingConsent={requiresMarketingConsent} />
        ),
        [requiresMarketingConsent],
    );

    return (
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
