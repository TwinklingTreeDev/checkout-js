import classNames from 'classnames';
import { debounce } from 'lodash';
import { FieldProps, FormikProps, withFormik } from 'formik';
import React, { FunctionComponent, memo, ReactNode, useCallback, useState, useEffect } from 'react';
import { object, string } from 'yup';

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
    updateCheckout?(payload: any): Promise<any>;
    onUnhandledError?(error: Error): void;
}

export interface GuestFormValues {
    email: string;
    shouldSubscribe: boolean;
}

// Auto-save delay constant (same as other sections)
export const GUEST_AUTOSAVE_DELAY = 1700;

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
    updateCheckout,
    onUnhandledError,
    values,
    setFieldValue,
}) => {
    const [isUpdatingGuestData, setIsUpdatingGuestData] = useState(false);

    // Create debounced update function
    const debouncedUpdateGuestData = useCallback(
        debounce(
            async (email: string, shouldSubscribe: boolean) => {
                try {
                    if (updateCheckout) {
                        await updateCheckout({ 
                            customerMessage: '', // Keep existing customer message
                            email,
                            shouldSubscribe 
                        });
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
        [updateCheckout, onUnhandledError, guestAutosaveDelay],
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
                
                if (updateCheckout && value !== values.email) {
                    setIsUpdatingGuestData(true);
                    debouncedUpdateGuestData(value, values.shouldSubscribe);
                }
            }

            // Handle subscription changes
            if (fieldName === 'shouldSubscribe' && typeof value === 'boolean') {
                if (updateCheckout && value !== values.shouldSubscribe) {
                    setIsUpdatingGuestData(true);
                    debouncedUpdateGuestData(values.email, value);
                }
            }
        },
        [setFieldValue, values, onChangeEmail, updateCheckout, debouncedUpdateGuestData],
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
                        />

                        {(canSubscribe || requiresMarketingConsent) && (
                            <BasicFormField name="shouldSubscribe" render={renderField} />
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
