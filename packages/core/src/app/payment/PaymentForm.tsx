import { PaymentMethod } from '@bigcommerce/checkout-sdk';
import { FormikProps, withFormik, WithFormikConfig } from 'formik';
import { isNil, noop, omitBy } from 'lodash';
import React, { FunctionComponent, memo, useCallback, useContext, useMemo } from 'react';
import { ObjectSchema } from 'yup';

import { withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { FormContext } from '@bigcommerce/checkout/ui';

import { TermsConditions } from '../termsConditions';
import { Fieldset, Form } from '../ui/form';

import getPaymentValidationSchema from './getPaymentValidationSchema';
import {
    getPaymentMethodName,
    getUniquePaymentMethodId,
    PaymentMethodId,
    PaymentMethodList,
} from './paymentMethod';
// import PaymentRedeemables from './PaymentRedeemables';
import PaymentSubmitButton from './PaymentSubmitButton';
import SpamProtectionField from './SpamProtectionField';
import { StoreCreditField, StoreCreditOverlay } from './storeCredit';

export interface PaymentFormProps {
    availableStoreCredit?: number;
    defaultGatewayId?: string;
    defaultMethodId: string;
    didExceedSpamLimit?: boolean;
    isEmbedded?: boolean;
    isInitializingPayment?: boolean;
    isTermsConditionsRequired?: boolean;
    isUsingMultiShipping?: boolean;
    isStoreCreditApplied: boolean;
    methods: PaymentMethod[];
    selectedMethod?: PaymentMethod;
    shouldShowStoreCredit?: boolean;
    shouldDisableSubmit?: boolean;
    shouldHidePaymentSubmitButton?: boolean;
    shouldExecuteSpamCheck?: boolean;
    termsConditionsText?: string;
    termsConditionsUrl?: string;
    usableStoreCredit?: number;
    validationSchema?: ObjectSchema<Partial<PaymentFormValues>>;
    isPaymentDataRequired(): boolean;
    onMethodSelect?(method: PaymentMethod): void;
    onStoreCreditChange?(useStoreCredit?: boolean): void;
    onSubmit?(values: PaymentFormValues): void;
    onUnhandledError?(error: Error): void;
    // Billing address callback
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
}

const PaymentForm: FunctionComponent<
    PaymentFormProps & FormikProps<PaymentFormValues> & WithLanguageProps
> = ({
    availableStoreCredit = 0,
    didExceedSpamLimit,
    isEmbedded,
    isInitializingPayment,
    isPaymentDataRequired,
    isTermsConditionsRequired,
    isStoreCreditApplied,
    isUsingMultiShipping,
    language,
    methods,
    onMethodSelect,
    onStoreCreditChange,
    onUnhandledError,
    onBillingSameAsShippingChange,
    resetForm,
    selectedMethod,
    shouldDisableSubmit,
    shouldHidePaymentSubmitButton,
    shouldExecuteSpamCheck,
    termsConditionsText = '',
    termsConditionsUrl,
    usableStoreCredit = 0,
    values,
}) => {
    const selectedMethodId = useMemo(() => {
        if (!selectedMethod) {
            return;
        }

        switch (selectedMethod.id) {
            case PaymentMethodId.AmazonPay:
                if (selectedMethod.initializationData.paymentToken) {
                    return;
                }

                return selectedMethod.id;

            default:
                return selectedMethod.id;
        }
    }, [selectedMethod]);

    if (shouldExecuteSpamCheck) {
        return (
            <SpamProtectionField
                didExceedSpamLimit={didExceedSpamLimit}
                onUnhandledError={onUnhandledError}
            />
        );
    }

    return (
        <Form className="checkout-form" testId="payment-form">
            {usableStoreCredit > 0 && (
                <StoreCreditField
                    availableStoreCredit={availableStoreCredit}
                    isStoreCreditApplied={isStoreCreditApplied}
                    name="useStoreCredit"
                    onChange={onStoreCreditChange}
                    usableStoreCredit={usableStoreCredit}
                />
            )}

            <PaymentMethodListFieldset
                isEmbedded={isEmbedded}
                isInitializingPayment={isInitializingPayment}
                isPaymentDataRequired={isPaymentDataRequired}
                isUsingMultiShipping={isUsingMultiShipping}
                methods={methods}
                onMethodSelect={onMethodSelect}
                onUnhandledError={onUnhandledError}
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
                resetForm={resetForm}
                values={values}
            />

            {/* <PaymentRedeemables /> */}

            {isTermsConditionsRequired && (
                <TermsConditions
                    termsConditionsText={termsConditionsText}
                    termsConditionsUrl={termsConditionsUrl}
                />
            )}
            {/* Discount Offer Section */}
            <div className="discount-offer-section">
                <div className="discount-offer-container">
                    <input
                        type="checkbox"
                        id="discount-offer"
                        className="discount-offer-checkbox"
                    />
                    <div>
                        <div className="discount-offer-title">
                            Get 25% OFF on Your Next Order
                        </div>
                    </div>
                </div>
            </div>
            <div className="discount-offer-description">
                Want exclusive deals? Check this box to receive the best offers to your phone. You can reply STOP to cancel or HELP for help. Msg frequency varies. Msg & data rates may apply.
                See <a href="#" className="discount-offer-link discount-offer-link-terms">Terms</a>
                &amp;
                <a href="#" className="discount-offer-link discount-offer-link-privacy">Privacy</a>.
            </div>

            <div className="form-actions">
                {shouldHidePaymentSubmitButton ? (
                    <PaymentMethodSubmitButtonContainer />
                ) : (
                    <PaymentSubmitButton
                        initialisationStrategyType={
                            selectedMethod && selectedMethod.initializationStrategy?.type
                        }
                        isDisabled={shouldDisableSubmit}
                        methodGateway={selectedMethod && selectedMethod.gateway}
                        methodId={selectedMethodId}
                        methodName={
                            selectedMethod && getPaymentMethodName(language)(selectedMethod)
                        }
                        methodType={selectedMethod && selectedMethod.method}
                    />
                )}
            </div>
        </Form>
    );
};

const PaymentMethodSubmitButtonContainer: FunctionComponent = () => {
    return <div className="submitButtonContainer" id="checkout-payment-continue" />;
};

interface PaymentMethodListFieldsetProps {
    isEmbedded?: boolean;
    isInitializingPayment?: boolean;
    isUsingMultiShipping?: boolean;
    methods: PaymentMethod[];
    values: PaymentFormValues;
    isPaymentDataRequired(): boolean;
    onMethodSelect?(method: PaymentMethod): void;
    onUnhandledError?(error: Error): void;
    resetForm(nextValues?: PaymentFormValues): void;
    // Billing address callback
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
}

const PaymentMethodListFieldset: FunctionComponent<PaymentMethodListFieldsetProps> = ({
    isEmbedded,
    isInitializingPayment,
    isPaymentDataRequired,
    isUsingMultiShipping,
    methods,
    onMethodSelect = noop,
    onUnhandledError,
    onBillingSameAsShippingChange,
    resetForm,
    values,
}) => {
    const { setSubmitted } = useContext(FormContext);

    const commonValues = useMemo(() => ({ terms: values.terms }), [values.terms]);

    const handlePaymentMethodSelect = useCallback(
        (method: PaymentMethod) => {
            resetForm({
                ...commonValues,
                ccCustomerCode: '',
                ccCvv: '',
                ccDocument: '',
                customerEmail: '',
                customerMobile: '',
                ccExpiry: '',
                ccName: '',
                ccNumber: '',
                instrumentId: '',
                paymentProviderRadio: getUniquePaymentMethodId(method.id, method.gateway),
                shouldCreateAccount: true,
                shouldSaveInstrument: false,
                accountNumber: '',
                routingNumber: '',
            });

            setSubmitted(false);
            onMethodSelect(method);
        },
        [commonValues, onMethodSelect, resetForm, setSubmitted],
    );

    return (
        <Fieldset>
            {!isPaymentDataRequired() && <StoreCreditOverlay />}

            <PaymentMethodList
                isEmbedded={isEmbedded}
                isInitializingPayment={isInitializingPayment}
                isUsingMultiShipping={isUsingMultiShipping}
                methods={methods}
                onSelect={handlePaymentMethodSelect}
                onUnhandledError={onUnhandledError}
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
            />
        </Fieldset>
    );
};

const paymentFormConfig: WithFormikConfig<PaymentFormProps & WithLanguageProps, PaymentFormValues> =
    {
        mapPropsToValues: ({ defaultGatewayId, defaultMethodId }) => ({
            ccCustomerCode: '',
            ccCvv: '',
            ccDocument: '',
            customerEmail: '',
            customerMobile: '',
            ccExpiry: '',
            ccName: '',
            ccNumber: '',
            paymentProviderRadio: getUniquePaymentMethodId(defaultMethodId, defaultGatewayId),
            instrumentId: '',
            shouldCreateAccount: true,
            shouldSaveInstrument: false,
            terms: false,
            hostedForm: {
                cardType: '',
                errors: {
                    cardCode: '',
                    cardCodeVerification: '',
                    cardExpiry: '',
                    cardName: '',
                    cardNumber: '',
                    cardNumberVerification: '',
                },
            },
            accountNumber: '',
            routingNumber: '',
        }),

        handleSubmit: (values, { props: { onSubmit = noop } }) => {
            onSubmit(
                omitBy(
                    values,
                    (value, key) => isNil(value) || value === '' || key === 'hostedForm',
                ),
            );
        },

        validationSchema: ({
            language,
            isTermsConditionsRequired = false,
            validationSchema,
        }: PaymentFormProps & WithLanguageProps) =>
            getPaymentValidationSchema({
                additionalValidation: validationSchema,
                isTermsConditionsRequired,
                language,
            }),
    };

export default withLanguage(withFormik(paymentFormConfig)(memo(PaymentForm)));
