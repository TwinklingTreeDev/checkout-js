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
    // Add billing address update functionality
    updateBillingAddress?(address: any): Promise<any>;
    billingAddress?: any;
    shippingAddress?: any;
    customer?: any;
}

const PaymentForm: FunctionComponent<
    PaymentFormProps & FormikProps<PaymentFormValues> & WithLanguageProps
> = ({
    availableStoreCredit = 0,
    didExceedSpamLimit,
    isEmbedded,
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
    shouldHidePaymentSubmitButton,
    shouldExecuteSpamCheck,
    termsConditionsText = '',
    termsConditionsUrl,
    usableStoreCredit = 0,
    values,
    // Add billing address update functionality
    updateBillingAddress,
    billingAddress,
    shippingAddress,
    customer,
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

    const brandName = useMemo(() => {
        if (!selectedMethod) {
            return;
        }

        return (
            selectedMethod.initializationData?.payPalCreditProductBrandName?.credit ||
            selectedMethod.initializationData?.payPalCreditProductBrandName
        );
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
                isPaymentDataRequired={isPaymentDataRequired}
                isUsingMultiShipping={isUsingMultiShipping}
                methods={methods}
                onMethodSelect={onMethodSelect}
                onUnhandledError={onUnhandledError}
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
                resetForm={resetForm}
                values={values}
                updateBillingAddress={updateBillingAddress}
                billingAddress={billingAddress}
                shippingAddress={shippingAddress}
                customer={customer}
            />

            {/* <PaymentRedeemables /> */}

            {isTermsConditionsRequired && (
                <TermsConditions
                    termsConditionsText={termsConditionsText}
                    termsConditionsUrl={termsConditionsUrl}
                />
            )}

            <div className="form-actions">
                {shouldHidePaymentSubmitButton ? (
                    <PaymentMethodSubmitButtonContainer />
                ) : (
                    <PaymentSubmitButton
                        brandName={brandName}
                        initialisationStrategyType={
                            selectedMethod && selectedMethod.initializationStrategy?.type
                        }
                        isComplete={!!selectedMethod?.initializationData?.isComplete}
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
    isUsingMultiShipping?: boolean;
    methods: PaymentMethod[];
    values: PaymentFormValues;
    isPaymentDataRequired(): boolean;
    onMethodSelect?(method: PaymentMethod): void;
    onUnhandledError?(error: Error): void;
    resetForm(nextValues?: PaymentFormValues): void;
    // Billing address callback
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
    // Add billing address update functionality
    updateBillingAddress?(address: any): Promise<any>;
    billingAddress?: any;
    shippingAddress?: any;
    customer?: any;
}

const PaymentMethodListFieldset: FunctionComponent<PaymentMethodListFieldsetProps> = ({
    isEmbedded,
    isPaymentDataRequired,
    isUsingMultiShipping,
    methods,
    onMethodSelect = noop,
    onUnhandledError,
    onBillingSameAsShippingChange,
    resetForm,
    values,
    // Add billing address update functionality
    updateBillingAddress,
    billingAddress,
    shippingAddress,
    customer,
}) => {
    const { setSubmitted } = useContext(FormContext);

    const commonValues = useMemo(() => ({ terms: values.terms }), [values.terms]);

    // Helper function to check if a method is PayPal
    const isPayPalMethod = useCallback((method: PaymentMethod): boolean => {
        const paypalMethodIds = [
            'paypal',
            'paypalcommerce',
            'paypalcommercecredit',
            'paypalcommercecreditcards',
            'paypalcommercealternativemethods',
            'paypalcommercevenmo',
            'paypalexpress',
            'paypalpaymentspro'
        ];
        
        const paypalMethodTypes = [
            'paypal',
            'paypal-credit',
            'paypal-venmo'
        ];
        
        return paypalMethodIds.includes(method.id) || 
               paypalMethodTypes.includes(method.method) ||
               method.gateway === 'paypal' ||
               method.gateway === 'paypalcommerce';
    }, []);

    const handlePaymentMethodSelect = useCallback(
        async (method: PaymentMethod) => {
            // Preserve email for Google Pay methods to allow auto-population
            const shouldPreserveEmail = method.id.startsWith('googlepay');
            const currentEmail = shouldPreserveEmail ? values.customerEmail : '';
            
            resetForm({
                ...commonValues,
                ccCustomerCode: '',
                ccCvv: '',
                ccDocument: '',
                customerEmail: currentEmail, // Preserve email for Google Pay
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
            
            // Automate billing address setup for PayPal methods
            if (isPayPalMethod(method)) {
                try {
                    
                    // 1. Set billing same as shipping to true
                    if (onBillingSameAsShippingChange) {
                        onBillingSameAsShippingChange(true);
                    }
                    
                    // 2. Update billing address with shipping address data
                    if (updateBillingAddress && shippingAddress && customer) {
                        const billingAddressWithEmail = {
                            ...shippingAddress,
                            email: (billingAddress as any)?.email || customer.email || (shippingAddress as any).email,
                        };
                        
                        await updateBillingAddress(billingAddressWithEmail);
                    }
                    
                } catch (error) {
                    if (onUnhandledError && error instanceof Error) {
                        onUnhandledError(error);
                    }
                }
            }
            
            onMethodSelect(method);
        },
        [commonValues, onMethodSelect, resetForm, setSubmitted, values.customerEmail, isPayPalMethod, onBillingSameAsShippingChange, updateBillingAddress, shippingAddress, billingAddress, customer, onUnhandledError],
    );

    return (
        <Fieldset>
            {!isPaymentDataRequired() && <StoreCreditOverlay />}

            <PaymentMethodList
                isEmbedded={isEmbedded}
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
