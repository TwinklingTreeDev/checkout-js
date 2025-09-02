import React, { FunctionComponent, memo, useEffect, useState } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { withCheckout } from '../checkout';
import { Button, ButtonSize, ButtonVariant } from '../ui/button';
import { IconBolt } from '../ui/icon';

import { PaymentMethodId, PaymentMethodType } from './paymentMethod';

// Simple global event listener for form-actions (submit button)
if (typeof window !== 'undefined') {
    const handlePaymentButtonClick = () => {
        // Trigger validation for all forms by clicking their submit buttons
        try {
            // Set a flag to indicate we're just validating, not actually submitting
            (window as any).__isValidatingForms = true;

            // Trigger customer/email form validation
            const customerContainer = document.querySelector('#checkout-customer-guest') as HTMLElement;
            if (customerContainer) {
                // Trigger validation by dispatching a custom event that the customer component can listen to
                const validationEvent = new CustomEvent('triggerValidation', { bubbles: true });
                customerContainer.dispatchEvent(validationEvent);
            }

            // Trigger shipping form validation
            const shippingContainer = document.querySelector('#checkoutShippingAddress') as HTMLElement;
            if (shippingContainer) {
                // Trigger validation by dispatching a custom event that the shipping component can listen to
                const validationEvent = new CustomEvent('triggerValidation', { bubbles: true });
                shippingContainer.dispatchEvent(validationEvent);
            }

            // Trigger credit card billing address form validation
            const creditCardBillingContainer = document.querySelector('.credit-card-billing-address') as HTMLElement;
            if (creditCardBillingContainer) {
                // Trigger validation by dispatching a custom event that the component can listen to
                const validationEvent = new CustomEvent('triggerValidation', { bubbles: true });
                creditCardBillingContainer.dispatchEvent(validationEvent);}

            // Trigger credit card form validation by submitting the payment form
            const paymentForm = document.querySelector('form[data-test="payment-form"]') as HTMLFormElement;
            if (paymentForm) {
                // Also dispatch triggerValidation event to enable smooth scrolling
                const validationEvent = new CustomEvent('triggerValidation', { bubbles: true });
                document.dispatchEvent(validationEvent);
               

            }

            // Wait a bit for validation to complete and errors to show
            setTimeout(() => {
                // Clear the validation flag
                (window as any).__isValidatingForms = false;
            }, 300);

        } catch (_validationError) {
            // Clear the validation flag in case of error
            (window as any).__isValidatingForms = false;
        }
    };

    // Add global document listener for form-actions clicks (the actual submit button)
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        
        // Check if the click is on the form-actions div (the submit button container)
        if (target.className.includes('form-actions') || target.closest('.form-actions')) {
            handlePaymentButtonClick();
        }
    });
}

interface PaymentSubmitButtonTextProps {
    methodGateway?: string;
    methodId?: string;
    methodType?: string;
    methodName?: string;
    initialisationStrategyType?: string;
    brandName?: string;
    isComplete?: boolean;
    isPaymentDataRequired?: boolean;
}

const providersWithCustomClasses = [PaymentMethodId.Bolt];

const PaymentSubmitButtonText: FunctionComponent<PaymentSubmitButtonTextProps> = memo(
    ({
        methodId,
        methodName,
        methodType,
        methodGateway,
        initialisationStrategyType,
        isPaymentDataRequired,
        brandName,
        isComplete,
    }) => {
        if (!isPaymentDataRequired) {
            return <TranslatedString id="payment.place_order_action" />;
        }

        if (methodName && initialisationStrategyType === 'none') {
            return <TranslatedString data={{ methodName }} id="payment.ppsdk_continue_action" />;
        }

        if (methodId === PaymentMethodId.AmazonPay) {
            return <TranslatedString id="payment.amazonpay_continue_action" />;
        }

        if (methodId === PaymentMethodId.Bolt) {
            return (
                <>
                    <IconBolt additionalClassName="payment-submit-button-bolt-icon" />
                    <TranslatedString id="payment.place_order_action" />
                </>
            );
        }

        if (methodGateway === PaymentMethodId.Barclaycard) {
            return <TranslatedString id="payment.barclaycard_continue_action" />;
        }

        if (methodGateway === PaymentMethodId.BlueSnapV2) {
            return <TranslatedString id="payment.bluesnap_v2_continue_action" />;
        }

        if (methodType === PaymentMethodType.VisaCheckout) {
            return <TranslatedString id="payment.visa_checkout_continue_action" />;
        }

        if (methodType === PaymentMethodType.Chasepay) {
            return <TranslatedString id="payment.chasepay_continue_action" />;
        }

        if (
            methodType === PaymentMethodType.PaypalVenmo ||
            methodId === PaymentMethodId.BraintreeVenmo
        ) {
            // Always show "Complete Order" for PayPal Venmo instead of PayPal-specific text
            return <TranslatedString id="payment.paypal_venmo_continue_action" />;
        }

        if (methodType === PaymentMethodType.Paypal) {
            // Always show "Complete Order" for PayPal instead of "Continue with PayPal"
            //return <TranslatedString id="payment.place_order_action" />;
            const continueActionId = methodId === PaymentMethodId.PaypalCommerce
                ? 'payment.place_order_action'
                : 'payment.paypal_continue_action';

            return <TranslatedString
                data={{ isComplete }}
                id={isComplete ? 'payment.paypal_complete_action' : continueActionId}
            />;
        }

        if (methodType === PaymentMethodType.PaypalCredit) {
            // Always show "Complete Order" for PayPal Credit instead of PayPal-specific text
            const continueTranslationId = brandName
            ? 'payment.continue_with_brand'
            : 'payment.paypal_pay_later_continue_action'
            const completeTranslationId = brandName
                ? 'payment.complete_with_brand'
                : 'payment.paypal_pay_later_complete_action'

            return (
                <TranslatedString
                    data={{ brandName, isComplete, continueTranslationId, completeTranslationId }}
                    id={
                        isComplete
                            ? completeTranslationId
                            : continueTranslationId
                    }
                />
            );
        }

        if (methodId === PaymentMethodId.PaypalExpress) {
            // Show PayPal continue action for PayPal Express
            return <TranslatedString id="payment.place_order_action" />;
        }

        if (methodId === PaymentMethodId.Opy) {
            return <TranslatedString data={{ methodName }} id="payment.opy_continue_action" />;
        }

        if (methodId === PaymentMethodId.Quadpay) {
            return <TranslatedString id="payment.quadpay_continue_action" />;
        }

        if (methodId === PaymentMethodId.Zip) {
            return <TranslatedString id="payment.zip_continue_action" />;
        }

        if (methodId === PaymentMethodId.Klarna) {
            return <TranslatedString id="payment.klarna_continue_action" />;
        }

        return <TranslatedString id="payment.place_order_action" />;
    },
);

export interface PaymentSubmitButtonProps {
    methodGateway?: string;
    methodId?: string;
    methodName?: string;
    methodType?: string;
    initialisationStrategyType?: string;
    isPaymentDataRequired?: boolean;
    brandName?: string;
    isComplete?: boolean;
}

interface WithCheckoutPaymentSubmitButtonProps {
    isInitializing?: boolean;
    isSubmitting?: boolean;
}

const PaymentSubmitButton: FunctionComponent<
    PaymentSubmitButtonProps & WithCheckoutPaymentSubmitButtonProps
> = ({
    isInitializing,
    isSubmitting,
    isPaymentDataRequired,
    methodGateway,
    methodId,
    methodName,
    methodType,
    initialisationStrategyType,
    brandName,
    isComplete,
}) => {
    const [hasFormErrors, setHasFormErrors] = useState(false);

    // Check if this is a PayPal payment method
    const isPayPalMethod = methodType === PaymentMethodType.Paypal || 
                          methodType === PaymentMethodType.PaypalCredit ||
                          methodId === PaymentMethodId.PaypalCommerce ||
                          methodId === PaymentMethodId.PaypalExpress;

    // Simple function to check if there are any validation errors using existing system
    const hasValidationErrors = (): boolean => {
        const errorElements = document.querySelectorAll('.form-field--error');
        return errorElements.length > 0;
    };

    // Monitor form validation errors for PayPal methods
    useEffect(() => {
        if (!isPayPalMethod) {
            return;
        }

        const checkValidation = () => {
            setHasFormErrors(hasValidationErrors());
        };

        // Initial check
        checkValidation();

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
    }, [isPayPalMethod]);

    // Enhanced click handler for PayPal methods (keeping as backup)
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        // Always prevent default for PayPal methods to handle validation
        if (isPayPalMethod) {
            event.preventDefault();
            event.stopPropagation();
            
            if (hasFormErrors) {
                // Trigger validation by clicking customer and shipping submit buttons
                // This will trigger the same validation system used by Form components
                const customerSubmitButton = document.querySelector('[data-test="customer-continue-button"]') as HTMLButtonElement;
                const shippingSubmitButton = document.querySelector('[data-test="shipping-continue-button"]') as HTMLButtonElement;
                

                if (customerSubmitButton) {
                    customerSubmitButton.click();
                }
                
                if (shippingSubmitButton) {
                    shippingSubmitButton.click();
                }
            }
            
            return false;
        }
    };

    // Determine if button should be disabled
    // We need the button to be clickable to trigger validation
    const shouldDisableButton = isInitializing || isSubmitting || (isPayPalMethod && hasFormErrors);

    return (
        <Button
            className={
                providersWithCustomClasses.includes(methodId as PaymentMethodId)
                    ? `payment-submit-button-${methodId}`
                    : undefined
            }
            data-test="payment-submit-button"
            disabled={shouldDisableButton}
            id="checkout-payment-continue"
            isFullWidth
            isLoading={isSubmitting}
            size={ButtonSize.Large}
            type="submit"
            variant={ButtonVariant.Action}
            onClick={handleClick}
        >

            <svg xmlns="http://www.w3.org/2000/svg" width="21" height="24" viewBox="0 0 21 24" fill="none">
                <g clipPath="url(#clip0_43_1339)">
                    <path fillRule="evenodd" clipRule="evenodd" d="M16.8418 10.708H17.8827C19.0319 10.708 19.9643 11.6198 19.9643 12.7437V20.8866C19.9643 22.0105 19.0319 22.9223 17.8827 22.9223H2.61734C1.46811 22.9223 0.535706 22.0105 0.535706 20.8866V12.7437C0.535706 11.6198 1.46811 10.708 2.61734 10.708H3.65815V7.65443C3.65815 4.10042 6.61581 1.20801 10.25 1.20801C13.8842 1.20801 16.8418 4.10042 16.8418 7.65443V10.708ZM6.55612 7.65443V10.708H13.9439V7.65443C13.9439 5.97073 12.5357 4.02943 10.25 4.02943C7.96428 4.02943 6.55612 5.97073 6.55612 7.65443ZM10.25 18.9223C9.61734 18.9223 9.10714 18.4461 9.10714 17.8556V15.4175C9.10714 14.827 9.61734 14.3508 10.25 14.3508C10.8827 14.3508 11.3929 14.827 11.3929 15.4175V17.8556C11.3929 18.4461 10.8827 18.9223 10.25 18.9223Z" fill="white" />
                </g>
                <defs>
                    <clipPath id="clip0_43_1339">
                        <rect width="20" height="22.8571" fill="white" transform="translate(0.25 0.540039)" />
                    </clipPath>
                </defs>
            </svg>

            <PaymentSubmitButtonText
                brandName={brandName}
                initialisationStrategyType={initialisationStrategyType}
                isComplete={isComplete}
                isPaymentDataRequired={isPaymentDataRequired}
                methodGateway={methodGateway}
                methodId={methodId}
                methodName={methodName}
                methodType={methodType}
            />
        </Button>
    );
};

export default withCheckout(({ checkoutState }) => {
    const {
        data: { isPaymentDataRequired },
        statuses: { isInitializingCustomer, isInitializingPayment, isSubmittingOrder },
    } = checkoutState;

    return {
        isInitializing: isInitializingCustomer() || isInitializingPayment(),
        isPaymentDataRequired: isPaymentDataRequired(),
        isSubmitting: isSubmittingOrder(),
    };
})(memo(PaymentSubmitButton));
