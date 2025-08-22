import {
    AccountInstrument,
    HostedInstrument,
    PayPalCommerceAlternativeMethodsPaymentOptions,
    PayPalCommerceCreditPaymentInitializeOptions,
    PayPalCommercePaymentInitializeOptions,
    PayPalCommerceVenmoPaymentInitializeOptions,
} from '@bigcommerce/checkout-sdk';
import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';

import { PaymentMethodProps } from '@bigcommerce/checkout/payment-integration-api';

import { handlePayPalError } from '../utils/paypalErrorHandler';

import './PayPalCommercePaymentMethodComponent.scss';

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
    const [hasValidationErrors, setHasValidationErrors] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    const termsValue = paymentForm.getFieldValue('terms');
    const shouldSaveInstrument = paymentForm.getFieldValue('shouldSaveInstrument');

    // Simple function to check if there are any validation errors using existing system
    const hasValidationErrorsCheck = (): boolean => {
        const errorElements = document.querySelectorAll('.form-field--error');
        return errorElements.length > 0;
    };

    // Function to trigger existing validation system
    const triggerValidation = async (): Promise<boolean> => {
        try {
            // Set a flag to indicate we're just validating, not actually submitting
            (window as any).__isValidatingForms = true;

            // Trigger customer/email form validation
            const customerSubmitButton = document.querySelector('[data-test="customer-continue-as-guest-button"]') as HTMLButtonElement;
            if (customerSubmitButton && !customerSubmitButton.disabled) {
                customerSubmitButton.click();
            }

            // Trigger shipping form validation
            const shippingSubmitButton = document.querySelector('#checkout-shipping-continue') as HTMLButtonElement;
            if (shippingSubmitButton && !shippingSubmitButton.disabled) {
                shippingSubmitButton.click();
            }

            // Wait a bit for validation to complete and errors to show
            await new Promise(resolve => setTimeout(resolve, 300));

            // Clear the validation flag
            (window as any).__isValidatingForms = false;

            // Check if there are any validation errors
            return hasValidationErrorsCheck();
        } catch (error) {
            console.error('Error during validation:', error);
            (window as any).__isValidatingForms = false;
            return false;
        }
    };

    const validateForm = async () => {
        const validationErrors = await paymentForm.validateForm();
        return Object.keys(validationErrors);
    };

    const validateButton = async () => {
        if (!buttonActionsRef.current) return;

        // Check payment form validation
        const paymentValidationErrors = await validateForm();
        
        // Check other forms using existing validation system
        const hasOtherFormErrors = hasValidationErrorsCheck();

        if (paymentValidationErrors.length > 0 || hasOtherFormErrors) {
            console.log('PayPal button disabled due to validation errors');
            buttonActionsRef.current.disable();
            
            // Hide PayPal iframe when validation errors exist
            const paypalContainer = document.querySelector('#checkout-payment-continue');
            if (paypalContainer) {
                paypalContainer.classList.add('has-validation-errors');
                const paypalIframe = paypalContainer.querySelector('iframe');
                if (paypalIframe) {
                    paypalIframe.classList.add('paypal-iframe-disabled');
                    paypalIframe.classList.remove('paypal-iframe-enabled');
                }
            }
        } else {
            console.log('PayPal button enabled - all forms valid');
            buttonActionsRef.current.enable();
            
            // Show PayPal iframe when no validation errors
            const paypalContainer = document.querySelector('#checkout-payment-continue');
            if (paypalContainer) {
                paypalContainer.classList.remove('has-validation-errors');
                const paypalIframe = paypalContainer.querySelector('iframe');
                if (paypalIframe) {
                    paypalIframe.classList.remove('paypal-iframe-disabled');
                    paypalIframe.classList.add('paypal-iframe-enabled');
                }
            }
        }
    };

    const togglePaypalButton = useCallback(() => {
        // Only show native button if we have a vaulted instrument that doesn't need confirmation
        if (currentInstrument && !shouldConfirmInstrument) {
            paymentForm.hidePaymentSubmitButton(method, false);
            hasPayPalButton.current = false;
        }
        // For all other cases, let the PayPal iframe button handle the rendering
    }, [currentInstrument, shouldConfirmInstrument, paymentForm, method]);

    useEffect(() => {
        togglePaypalButton();
    }, [togglePaypalButton]);

    useEffect(() => {
        void validateButton();
    }, [termsValue]);

    // Monitor for form changes and validate button
    useEffect(() => {
        const checkValidation = () => {
            const hasErrors = hasValidationErrorsCheck();
            setHasValidationErrors(hasErrors);
            void validateButton();
        };

        // Set up observer to watch for form changes
        const observer = new MutationObserver(checkValidation);
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });

        // Listen for input events
        const handleInputChange = () => {
            setTimeout(checkValidation, 100);
        };

        document.addEventListener('input', handleInputChange);
        document.addEventListener('change', handleInputChange);
        document.addEventListener('blur', handleInputChange);

        return () => {
            observer.disconnect();
            document.removeEventListener('input', handleInputChange);
            document.removeEventListener('change', handleInputChange);
            document.removeEventListener('blur', handleInputChange);
        };
    }, []);

    useEffect(() => {
        fieldsValuesRef.current = {
            shouldSaveInstrument: shouldConfirmInstrument || Boolean(shouldSaveInstrument),
        };
    }, [shouldSaveInstrument, shouldConfirmInstrument]);

    // Add a more aggressive approach - hide the PayPal container when validation errors exist
    useEffect(() => {
        const paypalContainer = document.querySelector('#checkout-payment-continue');
        if (paypalContainer && paypalContainer instanceof HTMLElement) {
            if (hasValidationErrors) {
                paypalContainer.style.display = 'none';
            } else {
                paypalContainer.style.display = 'block';
            }
        }
    }, [hasValidationErrors]);

    // Add event listeners to prevent PayPal iframe clicks when validation errors exist
    useEffect(() => {
        const preventPayPalClicks = (event: Event) => {
            if (hasValidationErrors) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                
                console.warn('PayPal iframe click prevented due to validation errors');
                
                // Scroll to the first error
                const errorElements = document.querySelectorAll('.form-field--error');
                if (errorElements.length > 0) {
                    const firstError = errorElements[0] as HTMLElement;
                    if (firstError) {
                        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // Focus on the first error input
                        const errorInput = firstError.querySelector('input, select, textarea') as HTMLElement;
                        if (errorInput) {
                            errorInput.focus();
                        }
                    }
                }
                
                return false;
            }
        };

        // Add event listeners to the PayPal container
        const paypalContainer = document.querySelector('#checkout-payment-continue');
        if (paypalContainer) {
            paypalContainer.addEventListener('click', preventPayPalClicks, true);
            paypalContainer.addEventListener('mousedown', preventPayPalClicks, true);
            paypalContainer.addEventListener('mouseup', preventPayPalClicks, true);
            paypalContainer.addEventListener('touchstart', preventPayPalClicks, true);
            paypalContainer.addEventListener('touchend', preventPayPalClicks, true);
        }

        return () => {
            if (paypalContainer) {
                paypalContainer.removeEventListener('click', preventPayPalClicks, true);
                paypalContainer.removeEventListener('mousedown', preventPayPalClicks, true);
                paypalContainer.removeEventListener('mouseup', preventPayPalClicks, true);
                paypalContainer.removeEventListener('touchstart', preventPayPalClicks, true);
                paypalContainer.removeEventListener('touchend', preventPayPalClicks, true);
            }
        };
    }, [hasValidationErrors]);

    const initializePayment = async () => {
        // Don't initialize if there are validation errors
        if (hasValidationErrors) {
            console.log('Skipping PayPal initialization due to validation errors');
            return;
        }

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
                    shouldRenderPayPalButtonOnInitialization: true,
                    onRenderButton: () => {
                        paymentForm.hidePaymentSubmitButton(method, true);
                        hasPayPalButton.current = true;
                        
                        // Apply initial styling based on validation state
                        if (hasValidationErrors) {
                            const paypalContainer = document.querySelector('#checkout-payment-continue');
                            if (paypalContainer) {
                                paypalContainer.classList.add('has-validation-errors');
                                const paypalIframe = paypalContainer.querySelector('iframe');
                                if (paypalIframe) {
                                    paypalIframe.classList.add('paypal-iframe-disabled');
                                    paypalIframe.classList.remove('paypal-iframe-enabled');
                                }
                            }
                        }
                    },
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
                        // Use existing validation system
                        const hasErrors = await triggerValidation();

                        if (hasErrors) {
                            paymentForm.setSubmitted(true);
                            
                            console.warn('Form validation failed - please complete all required fields');
                            
                            // Scroll to the first error using existing system
                            const errorElements = document.querySelectorAll('.form-field--error');
                            if (errorElements.length > 0) {
                                const firstError = errorElements[0] as HTMLElement;
                                if (firstError) {
                                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    
                                    // Focus on the first error input
                                    const errorInput = firstError.querySelector('input, select, textarea') as HTMLElement;
                                    if (errorInput) {
                                        errorInput.focus();
                                    }
                                }
                            }

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
            
            setIsInitialized(true);
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
            setIsInitialized(false);
        } catch (error) {
            if (error instanceof Error) {
                onUnhandledError(error);
            }
        }
    };

    // Initialize payment when validation errors are resolved
    useEffect(() => {
        if (!hasValidationErrors && !isInitialized) {
            void initializePayment();
        } else if (hasValidationErrors && isInitialized) {
            void deinitializePayment();
        }
    }, [hasValidationErrors, isInitialized]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isInitialized) {
                void deinitializePayment();
            }
        };
    }, [isInitialized]);

    return children ? <>{children}</> : <></>;
};

export default PayPalCommercePaymentMethodComponent;
