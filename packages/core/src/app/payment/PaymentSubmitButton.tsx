import React, { FunctionComponent, memo } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { withCheckout } from '../checkout';
import { Button, ButtonSize, ButtonVariant } from '../ui/button';
import { IconBolt } from '../ui/icon';

import { PaymentMethodId, PaymentMethodType } from './paymentMethod';

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
    isDisabled?: boolean;
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
    isDisabled,
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
}) => (
        <Button
            className={
                providersWithCustomClasses.includes(methodId as PaymentMethodId)
                    ? `payment-submit-button-${methodId}`
                    : undefined
            }
            data-test="payment-submit-button"
            disabled={isInitializing || isSubmitting || isDisabled}
            id="checkout-payment-continue"
            isFullWidth
            isLoading={isSubmitting}
            size={ButtonSize.Large}
            type="submit"
            variant={ButtonVariant.Action}
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
