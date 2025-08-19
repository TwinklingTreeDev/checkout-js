import {
    AccountInstrument,
    HostedInstrument,
    PayPalCommerceAlternativeMethodsPaymentOptions,
    PayPalCommerceCreditPaymentInitializeOptions,
    PayPalCommercePaymentInitializeOptions,
    PayPalCommerceVenmoPaymentInitializeOptions,
} from '@bigcommerce/checkout-sdk';
import React, { FunctionComponent, useCallback, useEffect, useRef } from 'react';

import { PaymentMethodProps } from '@bigcommerce/checkout/payment-integration-api';

import { handlePayPalError } from '../utils/paypalErrorHandler';

type PayPalCommerceProvidersPaymentInitializeOptions =
    PayPalCommerceAlternativeMethodsPaymentOptions &
        PayPalCommerceCreditPaymentInitializeOptions &
        PayPalCommercePaymentInitializeOptions &
        PayPalCommerceVenmoPaymentInitializeOptions;

interface PayPalCommercePaymentMethodComponentProps {
    providerOptionsKey: string;
    providerOptionsData?: Partial<PayPalCommerceProvidersPaymentInitializeOptions>;
    currentInstrument?: AccountInstrument;
    shouldConfirmInstrument?: boolean;
}

interface ButtonActions {
    disable: () => void;
    enable: () => void;
}

const PayPalCommercePaymentMethodComponent: FunctionComponent<
    PaymentMethodProps & PayPalCommercePaymentMethodComponentProps
> = ({
    method,
    checkoutService,
    paymentForm,
    onUnhandledError,
    providerOptionsKey,
    providerOptionsData,
    children,
    currentInstrument,
    language,
    shouldConfirmInstrument,
}) => {
    const buttonActionsRef = useRef<ButtonActions | null>(null);
    const fieldsValuesRef = useRef<HostedInstrument | null>(null);
    const renderButtonRef = useRef<(() => void) | null>(null);
    const hasPayPalButton = useRef(false);

    const termsValue = paymentForm.getFieldValue('terms');
    const shouldSaveInstrument = paymentForm.getFieldValue('shouldSaveInstrument');

    const validateForm = async () => {
        const validationErrors = await paymentForm.validateForm();

        return Object.keys(validationErrors);
    };

    const validateButton = async () => {
        if (!buttonActionsRef.current) return;

        const keysValidation = await validateForm();

        if (keysValidation.length) {
            buttonActionsRef.current.disable();
        } else {
            buttonActionsRef.current.enable();
        }
    };

    const togglePaypalButton = useCallback(() => {
        // Always show the native submit button; avoid rendering PayPal-branded button
        paymentForm.hidePaymentSubmitButton(method, false);
        hasPayPalButton.current = false;
    }, [currentInstrument]);

    useEffect(() => {
        togglePaypalButton();
    }, [togglePaypalButton, renderButtonRef.current]);

    useEffect(() => {
        void validateButton();
    }, [termsValue]);

    useEffect(() => {
        fieldsValuesRef.current = {
            shouldSaveInstrument: shouldConfirmInstrument || Boolean(shouldSaveInstrument),
        };
    }, [shouldSaveInstrument, shouldConfirmInstrument]);

    const initializePayment = async () => {
        console.log('Initializing PayPal payment method:', {
            methodId: method.id,
            gateway: method.gateway,
            providerOptionsKey,
            hasProviderData: !!providerOptionsData
        });

        try {
            await checkoutService.initializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
                [providerOptionsKey]: {
                    container: '#checkout-payment-continue',
                    shouldRenderPayPalButtonOnInitialization: false,
                    // Do not render PayPal button or hide native submit button
                    onRenderButton: () => {},
                    onInit: (onRenderButton: () => void) => {
                        console.log('PayPal initialization callback received');
                        renderButtonRef.current = onRenderButton;
                    },
                    submitForm: () => {
                        console.log('PayPal form submission triggered');
                        paymentForm.setSubmitted(true);
                        paymentForm.submitForm();
                    },
                    onError: (error: Error) => {
                        paymentForm.disableSubmit(method, true);

                        // Use the new PayPal error handler
                        const errorInfo = handlePayPalError(error, language);
                        
                        console.warn('PayPal error occurred:', {
                            error: error.message,
                            technicalMessage: errorInfo.technicalMessage,
                            isRecoverable: errorInfo.isRecoverable,
                            methodId: method.id,
                            gateway: method.gateway
                        });

                        // Show user-friendly error message
                        onUnhandledError(new Error(errorInfo.userMessage));
                    },
                    onValidate: async (resolve: () => void, reject: () => void): Promise<void> => {
                        const keysValidation = await validateForm();

                        if (keysValidation.length) {
                            paymentForm.setSubmitted(true);
                            keysValidation.forEach((key) => paymentForm.setFieldTouched(key));

                            return reject();
                        }

                        return resolve();
                    },
                    onInitButton: async (actions: ButtonActions) => {
                        console.log('PayPal button actions received');
                        buttonActionsRef.current = actions;
                        await validateButton();
                    },
                    getFieldsValues: () => fieldsValuesRef.current,
                    ...(providerOptionsData || {}),
                },
            });
            
            console.log('PayPal payment method initialized successfully');
        } catch (error) {
            // Enhanced error handling for initialization failures
            if (error instanceof Error) {
                const errorInfo = handlePayPalError(error, language);
                
                console.error('PayPal payment method initialization failed:', {
                    error: error.message,
                    technicalMessage: errorInfo.technicalMessage,
                    isRecoverable: errorInfo.isRecoverable,
                    methodId: method.id,
                    gateway: method.gateway,
                    stack: error.stack
                });
                
                onUnhandledError(new Error(errorInfo.userMessage));
            } else {
                console.error('PayPal initialization failed with non-Error object:', error);
                onUnhandledError(new Error('PayPal initialization failed'));
            }
        }
    };

    const deinitializePayment = async () => {
        try {
            await checkoutService.deinitializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
            });
        } catch (error) {
            if (error instanceof Error) {
                onUnhandledError(error);
            }
        }
    };

    useEffect(() => {
        void initializePayment();

        return () => {
            void deinitializePayment();
        };
    }, []);

    return children ? <>{children}</> : <></>;
};

export default PayPalCommercePaymentMethodComponent;
