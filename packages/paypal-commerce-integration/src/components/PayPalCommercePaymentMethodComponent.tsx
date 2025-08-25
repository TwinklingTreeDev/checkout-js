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
    const [isValidated, setIsValidated] = useState(false);
    const [forceReinitialize, setForceReinitialize] = useState(0);

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

    // Initial validation check when PayPal is selected
    useEffect(() => {
        const performInitialValidation = async () => {
            
            // Check for validation errors immediately
            const hasErrors = hasValidationErrorsCheck();
            
            if (hasErrors) {
                setHasValidationErrors(true);
                setIsValidated(false);
                
                // Hide the PayPal container immediately
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'none';
                }
                
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
            } else {
                setHasValidationErrors(false);
                setIsValidated(true);
                
                // Show the PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'block';
                }
            }
        };

        // Perform initial validation with a small delay to ensure forms are loaded
        const timer = setTimeout(performInitialValidation, 100);
        
        return () => clearTimeout(timer);
    }, []);

    const initializePayment = async () => {
        // Don't initialize if there are validation errors
        if (hasValidationErrors) {
            return;
        }

        try {
            await checkoutService.initializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
                [providerOptionsKey]: {
                    container: '#checkout-payment-continue',
                    shouldRenderPayPalButtonOnInitialization: true, // Always render, we'll control visibility
                    onRenderButton: () => {
                        paymentForm.hidePaymentSubmitButton(method, true);
                        hasPayPalButton.current = true;
                        
                        // Apply styling based on current validation state
                        if (!hasValidationErrors && isValidated) {
                            const paypalContainer = document.querySelector('#checkout-payment-continue');
                            if (paypalContainer) {
                                paypalContainer.classList.remove('has-validation-errors');
                                const paypalIframe = paypalContainer.querySelector('iframe');
                                if (paypalIframe) {
                                    paypalIframe.classList.remove('paypal-iframe-disabled');
                                    paypalIframe.classList.add('paypal-iframe-enabled');
                                }
                            }
                        } else {
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
                        renderButtonRef.current = onRenderButton;
                    },
                    submitForm: () => {
                        paymentForm.setSubmitted(true);
                        paymentForm.submitForm();
                    },
                    onError: (error: Error) => {
                        paymentForm.disableSubmit(method, true);

                        // Use the new PayPal error handler
                        const errorInfo = handlePayPalError(error, language);

                        // Show user-friendly error message
                        onUnhandledError(new Error(errorInfo.userMessage));
                    },
                    onValidate: async (resolve: () => void, reject: () => void): Promise<void> => {
                        // Use existing validation system
                        const hasErrors = await triggerValidation();

                        if (hasErrors) {
                            paymentForm.setSubmitted(true);
                            
                            
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
                        buttonActionsRef.current = actions;
                        await validateButton();
                    },
                    getFieldsValues: () => fieldsValuesRef.current,
                    ...(providerOptionsData || {}),
                },
            });
            
            setIsInitialized(true);
        } catch (error) {
            // Enhanced error handling for initialization failures
            if (error instanceof Error) {
                const errorInfo = handlePayPalError(error, language);
                
                onUnhandledError(new Error(errorInfo.userMessage));
            } else {
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
        if (!hasValidationErrors && !isInitialized && isValidated) {
            void initializePayment();
        } else if (hasValidationErrors && isInitialized) {
            void deinitializePayment();
        }
    }, [hasValidationErrors, isInitialized, isValidated]);

    // Monitor validation changes and update PayPal state
    useEffect(() => {
        const checkAndUpdatePayPalState = async () => {
            const hasErrors = hasValidationErrorsCheck();
            
            if (hasErrors && !hasValidationErrors) {
                // Validation just failed
                setHasValidationErrors(true);
                setIsValidated(false);
                
                // Hide PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'none';
                }
                
                // Deinitialize if already initialized
                if (isInitialized) {
                    await deinitializePayment();
                }
            } else if (!hasErrors && hasValidationErrors) {
                // Validation just passed
                setHasValidationErrors(false);
                setIsValidated(true);
                
                // Show PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'block';
                }
                
                // Force re-initialization by incrementing the counter
                setForceReinitialize(prev => prev + 1);
                
                // Always re-initialize PayPal when validation passes
                await initializePayment();
            }
        };

        // Check validation state periodically
        const interval = setInterval(checkAndUpdatePayPalState, 500);
        
        return () => clearInterval(interval);
    }, [hasValidationErrors, isInitialized, isValidated]);

    // Enhanced validation monitoring that listens to all form changes
    useEffect(() => {
        const checkValidationOnFormChange = async () => {
            const hasErrors = hasValidationErrorsCheck();
            
            if (!hasErrors && !isInitialized) {
                // No validation errors and PayPal not initialized - initialize it
                setHasValidationErrors(false);
                setIsValidated(true);
                
                // Show PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'block';
                }
                
                await initializePayment();
            } else if (!hasErrors && hasValidationErrors) {
                // Validation just passed - update state and initialize
                setHasValidationErrors(false);
                setIsValidated(true);
                
                // Show PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'block';
                }
                
                // Force re-initialization
                setForceReinitialize(prev => prev + 1);
                await initializePayment();
            } else if (hasErrors && !hasValidationErrors) {
                // Validation just failed
                setHasValidationErrors(true);
                setIsValidated(false);
                
                // Hide PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'none';
                }
                
                // Deinitialize if already initialized
                if (isInitialized) {
                    await deinitializePayment();
                }
            }
        };

        // Set up observer to watch for form changes
        const observer = new MutationObserver(() => {
            setTimeout(checkValidationOnFormChange, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'value']
        });

        // Listen for input events with debouncing
        let inputTimeout: ReturnType<typeof setTimeout>;
        const handleInputChange = () => {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(checkValidationOnFormChange, 200);
        };

        document.addEventListener('input', handleInputChange);
        document.addEventListener('change', handleInputChange);
        document.addEventListener('blur', handleInputChange);
        document.addEventListener('keyup', handleInputChange);

        return () => {
            observer.disconnect();
            clearTimeout(inputTimeout);
            document.removeEventListener('input', handleInputChange);
            document.removeEventListener('change', handleInputChange);
            document.removeEventListener('blur', handleInputChange);
            document.removeEventListener('keyup', handleInputChange);
        };
    }, [hasValidationErrors, isInitialized, isValidated]);

    // Function to manually trigger PayPal rendering when validation passes
    const enablePayPalIframe = () => {
        const paypalContainer = document.querySelector('#checkout-payment-continue');
        if (paypalContainer && paypalContainer instanceof HTMLElement) {
            paypalContainer.style.display = 'block';
            paypalContainer.classList.remove('has-validation-errors');
            
            const paypalIframe = paypalContainer.querySelector('iframe');
            if (paypalIframe) {
                paypalIframe.classList.remove('paypal-iframe-disabled');
                paypalIframe.classList.add('paypal-iframe-enabled');
            }
        }
    };

    // Enable PayPal iframe when validation passes and PayPal is initialized
    useEffect(() => {
        if (!hasValidationErrors && isValidated && isInitialized) {
            enablePayPalIframe();
        }
    }, [hasValidationErrors, isValidated, isInitialized]);

    // Force re-initialization when validation passes
    useEffect(() => {
        if (!hasValidationErrors && isValidated && forceReinitialize > 0) {
            const timer = setTimeout(async () => {
                await initializePayment();
            }, 100);
            
            return () => clearTimeout(timer);
        }
    }, [forceReinitialize, hasValidationErrors, isValidated]);

    // Frequent validation check to ensure PayPal is initialized when needed
    useEffect(() => {
        const frequentValidationCheck = () => {
            const hasErrors = hasValidationErrorsCheck();
            
            // If no errors and PayPal is not initialized, initialize it
            if (!hasErrors && !isInitialized) {
                setHasValidationErrors(false);
                setIsValidated(true);
                
                // Show PayPal container
                const paypalContainer = document.querySelector('#checkout-payment-continue');
                if (paypalContainer && paypalContainer instanceof HTMLElement) {
                    paypalContainer.style.display = 'block';
                }
                
                void initializePayment();
            }
        };

        // Check every 1 second
        const interval = setInterval(frequentValidationCheck, 1000);
        
        return () => clearInterval(interval);
    }, [isInitialized]);

    // Listen for PayPal payment method selection and trigger validation immediately
    useEffect(() => {
        const handlePaymentMethodChange = (event: Event) => {
            const target = event.target as HTMLElement;
            
            // Check if PayPal payment method was selected
            if (target && (
                target.closest('[data-test="payment-method-paypalcommerce"]') ||
                target.closest('[data-test="payment-method-paypal"]') ||
                target.closest('[data-test="payment-method-paypalcredit"]') ||
                target.closest('[data-test="payment-method-paypalexpress"]') ||
                target.closest('input[value*="paypal"]') ||
                target.closest('input[value*="PayPal"]')
            )) {
                
                // Trigger validation immediately
                setTimeout(async () => {
                    const hasErrors = await triggerValidation();
                    
                    if (hasErrors) {
                        setHasValidationErrors(true);
                        setIsValidated(false);
                        
                        // Hide the PayPal container immediately
                        const paypalContainer = document.querySelector('#checkout-payment-continue');
                        if (paypalContainer && paypalContainer instanceof HTMLElement) {
                            paypalContainer.style.display = 'none';
                        }
                        
                        // Deinitialize PayPal if it was initialized
                        if (isInitialized) {
                            await deinitializePayment();
                        }
                        
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
                    } else {
                        setHasValidationErrors(false);
                        setIsValidated(true);
                        
                        // Show the PayPal container
                        const paypalContainer = document.querySelector('#checkout-payment-continue');
                        if (paypalContainer && paypalContainer instanceof HTMLElement) {
                            paypalContainer.style.display = 'block';
                        }
                        
                        // Initialize PayPal
                        await initializePayment();
                    }
                }, 50);
            }
        };

        // Listen for clicks on payment method options
        document.addEventListener('click', handlePaymentMethodChange, true);
        document.addEventListener('change', handlePaymentMethodChange, true);

        return () => {
            document.removeEventListener('click', handlePaymentMethodChange, true);
            document.removeEventListener('change', handlePaymentMethodChange, true);
        };
    }, [isInitialized]);

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
