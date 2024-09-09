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
        brandName,
        isComplete,
        isPaymentDataRequired,
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
            return <TranslatedString id="payment.paypal_venmo_continue_action" />;
        }

        if (methodType === PaymentMethodType.Paypal) {
            const continueActionId = methodId === PaymentMethodId.PaypalCommerce
                ? 'payment.place_order_action'
                : 'payment.paypal_continue_action';

            return <TranslatedString
                data={{ isComplete }}
                id={isComplete ? 'payment.paypal_complete_action' : continueActionId}
            />;
        }

        if (methodType === PaymentMethodType.PaypalCredit) {
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
    brandName?: string;
    isComplete?: boolean;
    isPaymentDataRequired?: boolean;
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

        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="13" fill="none">
            <path
                d="M8.499 4.667h-.584V3.5a2.918 2.918 0 00-5.833 0v1.167h-.583A1.17 1.17 0 00.332 5.834v5.833a1.17 1.17 0 001.167 1.167h7a1.17 1.17 0 001.166-1.167V5.834A1.17 1.17 0 008.5 4.667zm-3.5 5.25A1.17 1.17 0 013.832 8.75a1.17 1.17 0 011.167-1.167A1.17 1.17 0 016.165 8.75 1.17 1.17 0 015 9.917zm1.808-5.25H3.19V3.5a1.81 1.81 0 013.617 0v1.167z"
                fill="#908F8F" />
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
