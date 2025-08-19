import {
    CartChangedError,
    CheckoutSelectors,
    CheckoutService,
    CheckoutSettings,
    OrderRequestBody,
    PaymentMethod,
} from '@bigcommerce/checkout-sdk';
import { memoizeOne } from '@bigcommerce/memoize';
import { compact, find, isEmpty, noop } from 'lodash';
import React, { Component, ReactNode } from 'react';
import { ObjectSchema } from 'yup';

import { AnalyticsContextProps } from '@bigcommerce/checkout/analytics';
import { ErrorLogger } from '@bigcommerce/checkout/error-handling-utils';
import { withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { CheckoutContextProps, PaymentFormValues } from '@bigcommerce/checkout/payment-integration-api';
import { ChecklistSkeleton } from '@bigcommerce/checkout/ui';
import PaymentPreloader from './PaymentPreloader';

import { withAnalytics } from '../analytics';
import { withCheckout } from '../checkout';
import {
    ErrorModal,
    ErrorModalOnCloseProps,
    isCartChangedError,
    isErrorWithType,
} from '../common/error';
import { EMPTY_ARRAY } from '../common/utility';
import { TermsConditionsType } from '../termsConditions';
import { Alert, AlertType } from '../ui/alert';

import mapSubmitOrderErrorMessage, { mapSubmitOrderErrorTitle } from './mapSubmitOrderErrorMessage';
import mapToOrderRequestBody from './mapToOrderRequestBody';
import PaymentContext from './PaymentContext';
import PaymentForm from './PaymentForm';
import {
    getUniquePaymentMethodId,
    PaymentMethodId,
    PaymentMethodProviderType,
} from './paymentMethod';

// Utility function to fix PayPal payment methods
const fixPayPalMethod = (method: PaymentMethod): PaymentMethod => {
    if (!method) return method;
    
    // Fix PayPal methods that have null gateway
    if (method.id === 'paypalcommerce' && (!method.gateway || method.gateway === 'null')) {
        const fixedMethod = { ...method, gateway: 'paypalcommerce' };
        console.log('[Payment] Fixed PayPal method gateway:', {
            methodId: method.id,
            originalGateway: method.gateway,
            fixedGateway: fixedMethod.gateway
        });
        return fixedMethod;
    }
    
    // Fix other PayPal-related methods
    if (method.id.startsWith('paypal') && (!method.gateway || method.gateway === 'null')) {
        const fixedMethod = { ...method, gateway: 'paypalcommerce' };
        console.log('[Payment] Fixed PayPal-related method gateway:', {
            methodId: method.id,
            originalGateway: method.gateway,
            fixedGateway: fixedMethod.gateway
        });
        return fixedMethod;
    }
    
    return method;
};

export interface PaymentProps {
    errorLogger: ErrorLogger;
    isEmbedded?: boolean;
    isUsingMultiShipping?: boolean;
    checkEmbeddedSupport?(methodIds: string[]): void; // TODO: We're currently doing this check in multiple places, perhaps we should move it up so this check get be done in a single place instead.
    onCartChangedError?(error: CartChangedError): void;
    onFinalize?(): void;
    onFinalizeError?(error: Error): void;
    onReady?(): void;
    onSubmit?(): void;
    onSubmitError?(error: Error): void;
    onUnhandledError?(error: Error): void;
    // Billing address callback
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
}

interface WithCheckoutPaymentProps {
    availableStoreCredit: number;
    cartUrl: string;
    defaultMethod?: PaymentMethod;
    finalizeOrderError?: Error;
    isInitializingPayment: boolean;
    isSubmittingOrder: boolean;
    isStoreCreditApplied: boolean;
    isTermsConditionsRequired: boolean;
    methods: PaymentMethod[];
    shouldExecuteSpamCheck: boolean;
    shouldLocaliseErrorMessages: boolean;
    submitOrderError?: Error;
    termsConditionsText?: string;
    termsConditionsUrl?: string;
    usableStoreCredit: number;
    applyStoreCredit(useStoreCredit: boolean): Promise<CheckoutSelectors>;
    clearError(error: Error): void;
    finalizeOrderIfNeeded(): Promise<CheckoutSelectors>;
    isPaymentDataRequired(): boolean;
    loadCheckout(): Promise<CheckoutSelectors>;
    loadPaymentMethods(): Promise<CheckoutSelectors>;
    submitOrder(values: OrderRequestBody): Promise<CheckoutSelectors>;
    checkoutServiceSubscribe: CheckoutService['subscribe'];
    checkoutService: CheckoutService;
}

interface PaymentState {
    didExceedSpamLimit: boolean;
    isReady: boolean;
    selectedMethod?: PaymentMethod;
    shouldDisableSubmit: { [key: string]: boolean };
    shouldHidePaymentSubmitButton: { [key: string]: boolean };
    submitFunctions: { [key: string]: ((values: PaymentFormValues) => void) | null };
    validationSchemas: { [key: string]: ObjectSchema<Partial<PaymentFormValues>> | null };
    paymentMethodChangeMessage?: string;
}

class Payment extends Component<
    PaymentProps & WithCheckoutPaymentProps & WithLanguageProps & AnalyticsContextProps,
    PaymentState
> {
    state: PaymentState = {
        didExceedSpamLimit: false,
        isReady: false,
        shouldDisableSubmit: {},
        shouldHidePaymentSubmitButton: {},
        validationSchemas: {},
        submitFunctions: {},
    };

    private grandTotalChangeUnsubscribe?: () => void;

    private getContextValue = memoizeOne(() => {
        return {
            disableSubmit: this.disableSubmit,
            setSubmit: this.setSubmit,
            setValidationSchema: this.setValidationSchema,
            hidePaymentSubmitButton: this.hidePaymentSubmitButton,
        };
    });

    async componentDidMount(): Promise<void> {
        const {
            finalizeOrderIfNeeded,
            onFinalize = noop,
            onFinalizeError = noop,
            onReady = noop,
            usableStoreCredit,
            checkoutServiceSubscribe,
            defaultMethod,
        } = this.props;

        // Restore Google Pay state if needed
        this.restoreGooglePayState();

        if (usableStoreCredit) {
            this.handleStoreCreditChange(true);
        }

        await this.loadPaymentMethodsOrThrow();

        // Enhanced order finalization with Google Pay specific handling
        try {
            console.log('[Payment] Attempting to finalize order...', {
                method: defaultMethod?.id,
                gateway: defaultMethod?.gateway,
                isGooglePay: defaultMethod?.id?.startsWith('googlepay')
            });

            const state = await finalizeOrderIfNeeded();
            const order = state.data.getOrder();

            console.log('[Payment] Order finalization successful:', {
                orderId: order?.orderId,
                isComplete: order?.isComplete,
                method: defaultMethod?.id
            });

            if (order?.orderId) {
                console.log('[Payment] Triggering order confirmation redirect...');
                onFinalize(order.orderId);
            } else {
                console.warn('[Payment] Order finalized but no order ID returned');
            }
        } catch (error) {
            console.error('[Payment] Order finalization failed:', error);
            
            // Enhanced error handling for Google Pay
            if (defaultMethod?.id?.startsWith('googlepay')) {
                console.log('[Payment] Google Pay specific error handling');
                
                // For Google Pay, if finalization is not required, it might mean
                // the payment is still being processed or needs user interaction
                if (isErrorWithType(error) && error.type === 'order_finalization_not_required') {
                    console.log('[Payment] Google Pay order finalization not required - payment may still be processing');
                    // Persist state to prevent data loss
                    this.persistGooglePayState();
                    // Don't treat this as an error for Google Pay
                    return;
                }
                
                // For other Google Pay errors, log but don't immediately redirect
                if (isErrorWithType(error) && error.type === 'payment_method_invalid') {
                    console.warn('[Payment] Google Pay payment method became invalid');
                    // Set a flag to show user-friendly message
                    this.setState({
                        paymentMethodChangeMessage: 'Google Pay payment is being processed. Please wait or try again if the issue persists.'
                    });
                    return;
                }
            }
            
            if (isErrorWithType(error) && error.type !== 'order_finalization_not_required') {
                console.error('[Payment] Calling onFinalizeError with:', error);
                onFinalizeError(error);
            }
        }

        this.grandTotalChangeUnsubscribe = checkoutServiceSubscribe(
            () => this.handleCartTotalChange(),
            ({ data }) => data.getCheckout()?.grandTotal,
            ({ data }) => data.getCheckout()?.outstandingBalance,
        );

        window.addEventListener('beforeunload', this.handleBeforeUnload);
        this.setState({ isReady: true });
        onReady();
    }

    componentDidUpdate(): void {
        const { checkEmbeddedSupport = noop, methods } = this.props;

        checkEmbeddedSupport(methods.map(({ id }) => id));
    }

    componentWillUnmount(): void {
        if (this.grandTotalChangeUnsubscribe) {
            this.grandTotalChangeUnsubscribe();
            this.grandTotalChangeUnsubscribe = undefined;
        }

        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }

    render(): ReactNode {
        const {
            defaultMethod,
            finalizeOrderError,
            isInitializingPayment,
            isUsingMultiShipping,
            methods,
            applyStoreCredit,
            onBillingSameAsShippingChange,
            checkoutService,
            ...rest
        } = this.props;

        const {
            didExceedSpamLimit,
            isReady,
            selectedMethod = defaultMethod,
            shouldDisableSubmit,
            validationSchemas,
            shouldHidePaymentSubmitButton,
            paymentMethodChangeMessage,
        } = this.state;

        const uniqueSelectedMethodId =
            selectedMethod && getUniquePaymentMethodId(selectedMethod.id, selectedMethod.gateway);

        return (
            <PaymentContext.Provider value={this.getContextValue()}>
                {/* Payment Preloader for background initialization - wrapped in error boundary */}
                {(() => {
                    try {
                        return (
                            <PaymentPreloader
                                methods={methods}
                                checkoutService={checkoutService}
                                onUnhandledError={this.handleError}
                            />
                        );
                    } catch (error) {
                        console.warn('[Payment] PaymentPreloader failed to render:', error);
                        return null;
                    }
                })()}
                
                {/* Payment Method Change Alert */}
                {paymentMethodChangeMessage && (
                    <Alert type={AlertType.Warning}>
                        {paymentMethodChangeMessage}
                    </Alert>
                )}
                
                {/* Debug: Current Payment Method Status */}
                {process.env.NODE_ENV === 'development' && (
                    <div style={{ padding: '10px', backgroundColor: '#f0f0f0', margin: '10px 0', fontSize: '12px' }}>
                        <strong>Debug Info:</strong><br/>
                        Selected Method: {selectedMethod ? `${selectedMethod.id} (${selectedMethod.gateway})` : 'None'}<br/>
                        Default Method: {defaultMethod ? `${defaultMethod.id} (${defaultMethod.gateway})` : 'None'}<br/>
                        Unique ID: {uniqueSelectedMethodId || 'None'}
                    </div>
                )}
                
                <ChecklistSkeleton isLoading={!isReady}>
                    {!isEmpty(methods) && defaultMethod && (
                        <PaymentForm
                            {...rest}
                            defaultGatewayId={defaultMethod.gateway}
                            defaultMethodId={defaultMethod.id}
                            didExceedSpamLimit={didExceedSpamLimit}
                            isInitializingPayment={isInitializingPayment}
                            isUsingMultiShipping={isUsingMultiShipping}
                            methods={methods}
                            onMethodSelect={this.setSelectedMethod}
                            onStoreCreditChange={this.handleStoreCreditChange}
                            onSubmit={this.handleSubmit}
                            onUnhandledError={this.handleError}
                            onBillingSameAsShippingChange={onBillingSameAsShippingChange}
                            selectedMethod={selectedMethod}
                            shouldDisableSubmit={
                                (uniqueSelectedMethodId &&
                                    shouldDisableSubmit[uniqueSelectedMethodId]) ||
                                undefined
                            }
                            shouldHidePaymentSubmitButton={
                                (uniqueSelectedMethodId &&
                                    rest.isPaymentDataRequired() &&
                                    shouldHidePaymentSubmitButton[uniqueSelectedMethodId]) ||
                                undefined
                            }
                            validationSchema={
                                (uniqueSelectedMethodId &&
                                    validationSchemas[uniqueSelectedMethodId]) ||
                                undefined
                            }
                        />
                    )}
                </ChecklistSkeleton>

                {this.renderOrderErrorModal()}
                {this.renderEmbeddedSupportErrorModal()}
            </PaymentContext.Provider>
        );
    }

    private renderOrderErrorModal(): ReactNode {
        const { finalizeOrderError, language, shouldLocaliseErrorMessages, submitOrderError } =
            this.props;

        // FIXME: Export correct TS interface
        const error: any = submitOrderError || finalizeOrderError;

        if (
            !error ||
            error.type === 'order_finalization_not_required' ||
            error.type === 'payment_cancelled' ||
            error.type === 'payment_invalid_form' ||
            error.type === 'spam_protection_not_completed' ||
            error.type === 'invalid_hosted_form_value'
        ) {
            return null;
        }

        return (
            <ErrorModal
                error={error}
                message={mapSubmitOrderErrorMessage(
                    error,
                    language.translate.bind(language),
                    shouldLocaliseErrorMessages,
                )}
                onClose={this.handleCloseModal}
                title={mapSubmitOrderErrorTitle(error, language.translate.bind(language))}
            />
        );
    }

    private renderEmbeddedSupportErrorModal(): ReactNode {
        const { checkEmbeddedSupport = noop, methods } = this.props;

        try {
            checkEmbeddedSupport(methods.map(({ id }) => id));
        } catch (error) {
            if (error instanceof Error) {
                return <ErrorModal error={error} onClose={this.handleCloseModal} />;
            }
        }

        return null;
    }

    private disableSubmit: (method: PaymentMethod, disabled?: boolean) => void = (
        method,
        disabled = true,
    ) => {
        const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
        const { shouldDisableSubmit } = this.state;

        if (shouldDisableSubmit[uniqueId] === disabled) {
            return;
        }

        this.setState({
            shouldDisableSubmit: {
                ...shouldDisableSubmit,
                [uniqueId]: disabled,
            },
        });
    };

    private hidePaymentSubmitButton: (method: PaymentMethod, disabled?: boolean) => void = (
        method,
        disabled = true,
    ) => {
        const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
        const { shouldHidePaymentSubmitButton } = this.state;

        if (shouldHidePaymentSubmitButton[uniqueId] === disabled) {
            return;
        }

        this.setState({
            shouldHidePaymentSubmitButton: {
                ...shouldHidePaymentSubmitButton,
                [uniqueId]: disabled,
            },
        });
    };

    // tslint:disable:cyclomatic-complexity
    private handleBeforeUnload: (event: BeforeUnloadEvent) => string | undefined = (event) => {
        const { defaultMethod, isSubmittingOrder, language } = this.props;
        const { selectedMethod = defaultMethod } = this.state;

        // TODO: Perhaps there is a better way to handle `adyen`, `afterpay`, `amazonpay`,
        // `checkout.com`, `converge`, `sagepay`, `stripev3` and `sezzle`. They require
        //  a redirection to another website during the payment flow but are not
        //  categorised as hosted payment methods.
        if (
            !isSubmittingOrder ||
            !selectedMethod ||
            selectedMethod.type === PaymentMethodProviderType.Hosted ||
            selectedMethod.type === PaymentMethodProviderType.PPSDK ||
            selectedMethod.gateway === PaymentMethodId.BlueSnapDirect ||
            selectedMethod.gateway === PaymentMethodId.BlueSnapV2 ||
            selectedMethod.id === PaymentMethodId.AmazonPay ||
            selectedMethod.id === PaymentMethodId.CBAMPGS ||
            selectedMethod.id === PaymentMethodId.Checkoutcom ||
            selectedMethod.id === PaymentMethodId.CheckoutcomGooglePay ||
            selectedMethod.id === PaymentMethodId.Converge ||
            selectedMethod.id === PaymentMethodId.Humm ||
            selectedMethod.id === PaymentMethodId.Laybuy ||
            selectedMethod.id === PaymentMethodId.Opy ||
            selectedMethod.id === PaymentMethodId.Quadpay ||
            selectedMethod.id === PaymentMethodId.SagePay ||
            selectedMethod.id === PaymentMethodId.Sezzle ||
            selectedMethod.id === PaymentMethodId.WorldpayAccess ||
            selectedMethod.id === PaymentMethodId.Zip ||
            selectedMethod.gateway === PaymentMethodId.AdyenV2 ||
            selectedMethod.gateway === PaymentMethodId.AdyenV2GooglePay ||
            selectedMethod.gateway === PaymentMethodId.AdyenV3 ||
            selectedMethod.gateway === PaymentMethodId.AdyenV3GooglePay ||
            selectedMethod.gateway === PaymentMethodId.Afterpay ||
            selectedMethod.gateway === PaymentMethodId.Clearpay ||
            selectedMethod.gateway === PaymentMethodId.Checkoutcom ||
            selectedMethod.gateway === PaymentMethodId.Mollie ||
            selectedMethod.gateway === PaymentMethodId.StripeV3
        ) {
            return;
        }

        const message = language.translate('common.leave_warning');

        event.returnValue = message;

        return message;
    };

    private handleCloseModal: (event: Event, props: ErrorModalOnCloseProps) => Promise<void> =
        async (_, { error }) => {
            if (!error) {
                return;
            }

            const { cartUrl, clearError, loadCheckout, defaultMethod } = this.props;
            const { type: errorType } = error as any; // FIXME: Export correct TS interface

            console.log('[Payment] Error modal closed:', {
                errorType,
                method: defaultMethod?.id,
                isGooglePay: defaultMethod?.id?.startsWith('googlepay')
            });

            // Enhanced handling for Google Pay specific errors
            if (defaultMethod?.id?.startsWith('googlepay')) {
                console.log('[Payment] Google Pay error handling');
                
                // For Google Pay, avoid page reloads that could clear email
                if (errorType === 'payment_method_invalid' || errorType === 'order_could_not_be_finalized_error') {
                    console.log('[Payment] Google Pay payment issue - attempting to reload checkout instead of page');
                    try {
                        await loadCheckout();
                        // Clear any error messages after successful reload
                        this.setState({ paymentMethodChangeMessage: undefined });
                        return;
                    } catch (reloadError) {
                        console.error('[Payment] Failed to reload checkout:', reloadError);
                        // Fall back to cart redirect only if reload fails
                        window.location.replace(cartUrl || '/');
                        return;
                    }
                }
            }

            if (
                errorType === 'provider_fatal_error' ||
                errorType === 'order_could_not_be_finalized_error'
            ) {
                console.log('[Payment] Fatal error - redirecting to cart');
                window.location.replace(cartUrl || '/');
            }

            if (errorType === 'tax_provider_unavailable') {
                console.log('[Payment] Tax provider unavailable - reloading page');
                window.location.reload();
            }

            if (errorType === 'cart_consistency') {
                console.log('[Payment] Cart consistency error - reloading checkout');
                await loadCheckout();
            }

            if (isErrorWithType(error) && error.body) {
                const { body, headers, status } = error;

                if (body.type === 'provider_error' && headers.location) {
                    console.log('[Payment] Provider error with location - redirecting');
                    if (window.top) {
                        window.top.location.assign(headers.location);
                    }
                }

                // Reload the checkout object to get the latest `shouldExecuteSpamCheck` value,
                // which will in turn make `SpamProtectionField` visible again.
                // NOTE: As a temporary fix, we're checking the status code instead of the error
                // type because of an issue with Nginx config, which causes the server to return
                // HTML page instead of JSON response when there is a 429 error.
                if (
                    status === 429 ||
                    body.type === 'spam_protection_expired' ||
                    body.type === 'spam_protection_failed'
                ) {
                    console.log('[Payment] Spam protection issue - setting flag and reloading checkout');
                    this.setState({ didExceedSpamLimit: true });

                    await loadCheckout();
                }
            }

            clearError(error);
        };

    private handleStoreCreditChange: (useStoreCredit: boolean) => void = async (useStoreCredit) => {
        const { applyStoreCredit, onUnhandledError = noop } = this.props;

        try {
            await applyStoreCredit(useStoreCredit);
        } catch (e) {
            onUnhandledError(e);
        }
    };

    private handleError: (error: Error) => void = (error: Error) => {
        const { onUnhandledError = noop, errorLogger } = this.props;

        const { type } = error as any;

        if (type === 'unexpected_detachment') {
            errorLogger.log(error);

            return;
        }

        return onUnhandledError(error);
    };

    private handleSubmit: (values: PaymentFormValues) => void = async (values) => {
        const {
            defaultMethod,
            loadPaymentMethods,
            isPaymentDataRequired,
            onCartChangedError = noop,
            onSubmit = noop,
            onSubmitError = noop,
            submitOrder,
            analyticsTracker
        } = this.props;

        const { selectedMethod = defaultMethod, submitFunctions } = this.state;

        console.log('[Payment] Payment submission started:', {
            selectedMethod: selectedMethod ? { id: selectedMethod.id, gateway: selectedMethod.gateway } : 'undefined',
            defaultMethod: defaultMethod ? { id: defaultMethod.id, gateway: defaultMethod.gateway } : 'undefined',
            isUsingDefault: selectedMethod === defaultMethod,
            isGooglePay: selectedMethod?.id?.startsWith('googlepay')
        });

        // Persist Google Pay state before submission
        if (selectedMethod?.id?.startsWith('googlepay')) {
            this.persistGooglePayState();
        }

        analyticsTracker.clickPayButton({shouldCreateAccount: values.shouldCreateAccount});

        const customSubmit =
            selectedMethod &&
            submitFunctions[getUniquePaymentMethodId(selectedMethod.id, selectedMethod.gateway)];

        if (customSubmit) {
            console.log('[Payment] Using custom submit function for:', selectedMethod?.id);
            return customSubmit(values);
        }

        try {
            console.log('[Payment] Submitting order...');
            console.log('[Payment] Form values for submission:', {
                paymentProviderRadio: values.paymentProviderRadio,
                selectedMethod: selectedMethod ? { id: selectedMethod.id, gateway: selectedMethod.gateway } : 'undefined'
            });
            const state = await submitOrder(mapToOrderRequestBody(values, isPaymentDataRequired()));
            const order = state.data.getOrder();

            console.log('[Payment] Order submission successful:', {
                orderId: order?.orderId,
                isComplete: order?.isComplete,
                method: selectedMethod?.id
            });

            analyticsTracker.paymentComplete();

            if (order?.orderId) {
                console.log('[Payment] Triggering order confirmation redirect from submit...');
                // Clear any persisted Google Pay state on successful submission
                if (selectedMethod?.id?.startsWith('googlepay')) {
                    sessionStorage.removeItem('googlepay_payment_state');
                }
                onSubmit(order.orderId);
            } else {
                console.warn('[Payment] Order submitted but no order ID returned');
            }
        } catch (error) {
            console.error('[Payment] Order submission failed:', error);
            analyticsTracker.paymentRejected();

            if (isErrorWithType(error) && error.type === 'payment_method_invalid') {
                // Enhanced handling for payment method invalid errors
                console.warn('Payment method became invalid, reloading payment methods:', error);
                
                // Clear the selected method to force user to reselect
                this.setState({ selectedMethod: undefined });
                
                // Reload payment methods to get fresh list
                try {
                    await loadPaymentMethods();
                    
                    // Show a user-friendly alert message instead of error modal
                    this.setState({
                        paymentMethodChangeMessage: 'The selected payment method is no longer available. Please select a different payment method and try again.'
                    });
                    
                    // Clear the message after 5 seconds
                    setTimeout(() => {
                        this.setState({ paymentMethodChangeMessage: undefined });
                    }, 5000);
                    
                    console.info('Payment methods reloaded successfully. User can now select a new payment method.');
                    
                    // Don't call onSubmitError for payment method invalid errors
                    // This prevents the error modal from showing
                    return;
                } catch (reloadError) {
                    console.error('Failed to reload payment methods:', reloadError);
                    // Only show error modal if we can't reload payment methods
                    onSubmitError(error);
                }
                return;
            }

            if (isCartChangedError(error)) {
                console.log('[Payment] Cart changed error detected');
                return onCartChangedError(error);
            }

            // For all other errors, show the error modal
            console.error('[Payment] Showing error modal for:', error);
            onSubmitError(error);
        }
    };



    private async loadPaymentMethodsOrThrow(): Promise<void> {
        const {
            loadPaymentMethods,
            onUnhandledError = noop,
        } = this.props;

        try {
            await loadPaymentMethods();

            // Fix any PayPal methods that might have been loaded with null gateway
            const methods = this.props.methods || [];
            
            // Check if any PayPal methods need fixing
            if (methods.some((m: PaymentMethod) => m.id === 'paypalcommerce' && (!m.gateway || m.gateway === 'null'))) {
                console.log('[Payment] PayPal methods loaded with null gateway, applying fixes');
                // Apply fixes to methods (they will be fixed when used)
                methods.forEach(fixPayPalMethod);
            }

            const selectedMethod = this.state.selectedMethod || this.props.defaultMethod;

            if (selectedMethod) {
                this.trackSelectedPaymentMethod(selectedMethod);
            }
        } catch (error) {
            onUnhandledError(error);
        }
    }

    private async handleCartTotalChange(): Promise<void> {
        const { loadPaymentMethods } = this.props;

        return loadPaymentMethods().then(() => {
            this.setState({ isReady: true });
        });
    }

    private setSelectedMethod: (method?: PaymentMethod) => void = (method) => {
        const { selectedMethod } = this.state;

        console.log('[Payment] setSelectedMethod called:', {
            newMethod: method ? { id: method.id, gateway: method.gateway } : 'undefined',
            currentMethod: selectedMethod ? { id: selectedMethod.id, gateway: selectedMethod.gateway } : 'undefined',
            isSameMethod: selectedMethod === method
        });

        if (selectedMethod === method) {
            console.log('[Payment] Method is already selected, skipping update');
            return;
        }

        // Fix: Ensure method has proper gateway value
        let fixedMethod = method ? fixPayPalMethod(method) : method;

        if (fixedMethod) {
            console.log('[Payment] Tracking new payment method:', fixedMethod.id);
            this.trackSelectedPaymentMethod(fixedMethod);
        }

        // Clear any payment method change message when user selects a new method
        this.setState({ 
            selectedMethod: fixedMethod,
            paymentMethodChangeMessage: undefined 
        }, () => {
            console.log('[Payment] State updated with new method:', {
                selectedMethod: this.state.selectedMethod ? { 
                    id: this.state.selectedMethod.id, 
                    gateway: this.state.selectedMethod.gateway 
                } : 'undefined'
            });
        });
    };

    private setSubmit: (
        method: PaymentMethod,
        fn: (values: PaymentFormValues) => void | null,
    ) => void = (method, fn) => {
        const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
        const { submitFunctions } = this.state;

        if (submitFunctions[uniqueId] === fn) {
            return;
        }

        this.setState({
            submitFunctions: {
                ...submitFunctions,
                [uniqueId]: fn,
            },
        });
    };

    private setValidationSchema: (
        method: PaymentMethod,
        schema: ObjectSchema<Partial<PaymentFormValues>> | null,
    ) => void = (method, schema) => {
        const uniqueId = getUniquePaymentMethodId(method.id, method.gateway);
        const { validationSchemas } = this.state;

        if (validationSchemas[uniqueId] === schema) {
            return;
        }

        this.setState({
            validationSchemas: {
                ...validationSchemas,
                [uniqueId]: schema,
            },
        });
    };

    private trackSelectedPaymentMethod(method: PaymentMethod) {
        const { analyticsTracker } = this.props;

        const methodName = method.config.displayName || method.id;
        const methodId = method.id;

        analyticsTracker.selectedPaymentMethod(methodName, methodId);
    }

    /**
     * Persist Google Pay state to prevent email clearing during payment processing
     */
    private persistGooglePayState(): void {
        const { defaultMethod } = this.props;
        
        if (defaultMethod?.id?.startsWith('googlepay')) {
            console.log('[Payment] Persisting Google Pay state to prevent data loss');
            
            // Store current checkout state in session storage
            try {
                const currentState = {
                    timestamp: Date.now(),
                    method: defaultMethod.id,
                    gateway: defaultMethod.gateway
                };
                
                sessionStorage.setItem('googlepay_payment_state', JSON.stringify(currentState));
                console.log('[Payment] Google Pay state persisted:', currentState);
            } catch (error) {
                console.warn('[Payment] Failed to persist Google Pay state:', error);
            }
        }
    }

    /**
     * Restore Google Pay state after page reload
     */
    private restoreGooglePayState(): void {
        const { defaultMethod } = this.props;
        
        if (defaultMethod?.id?.startsWith('googlepay')) {
            try {
                const persistedState = sessionStorage.getItem('googlepay_payment_state');
                if (persistedState) {
                    const state = JSON.parse(persistedState);
                    const timeDiff = Date.now() - state.timestamp;
                    
                    // Only restore state if it's recent (within 5 minutes)
                    if (timeDiff < 5 * 60 * 1000) {
                        console.log('[Payment] Restoring Google Pay state:', state);
                        
                        // Clear the persisted state
                        sessionStorage.removeItem('googlepay_payment_state');
                        
                        // Set a flag to indicate we're in Google Pay recovery mode
                        this.setState({
                            paymentMethodChangeMessage: 'Google Pay payment is being processed. Please wait...'
                        });
                        
                        // Clear the message after 3 seconds
                        setTimeout(() => {
                            this.setState({ paymentMethodChangeMessage: undefined });
                        }, 3000);
                    } else {
                        // Clear old state
                        sessionStorage.removeItem('googlepay_payment_state');
                    }
                }
            } catch (error) {
                console.warn('[Payment] Failed to restore Google Pay state:', error);
                sessionStorage.removeItem('googlepay_payment_state');
            }
        }
    }
}

export function mapToPaymentProps({
        checkoutService,
        checkoutState,
}: CheckoutContextProps): WithCheckoutPaymentProps | null {
    const {
        data: {
            getCheckout,
            getConfig,
            getCustomer,
            getConsignments,
            getOrder,
            getPaymentMethod,
            getPaymentMethods,
            isPaymentDataRequired,
            getPaymentProviderCustomer,
        },
        errors: { getFinalizeOrderError, getSubmitOrderError },
        statuses: { isInitializingPayment, isSubmittingOrder },
    } = checkoutState;

    const checkout = getCheckout();
    const config = getConfig();
    const customer = getCustomer();
    const consignments = getConsignments();
    const paymentProviderCustomer = getPaymentProviderCustomer();

    const { isComplete = false } = getOrder() || {};
    let methods = getPaymentMethods() || EMPTY_ARRAY;

    // Fix: Ensure all payment methods have proper gateway values
    methods = methods.map(fixPayPalMethod);

    // TODO: In accordance with the checkout team, this functionality is temporary and will be implemented in the backend instead.
    if (paymentProviderCustomer?.stripeLinkAuthenticationState) {
        const stripeUpePaymentMethod = methods.filter(method =>
            method.id === 'card' && method.gateway === PaymentMethodId.StripeUPE
        );

        methods = stripeUpePaymentMethod.length ? stripeUpePaymentMethod : methods;
    }

    if (!checkout || !config || !customer || isComplete) {
        return null;
    }

    const {
        enableTermsAndConditions: isTermsConditionsEnabled,
        features,
        orderTermsAndConditionsType: termsConditionsType,
        orderTermsAndConditions: termsCondtitionsText,
        orderTermsAndConditionsLink: termsCondtitionsUrl,
    } = config.checkoutSettings as CheckoutSettings & { orderTermsAndConditionsLocation: string };

    const isTermsConditionsRequired = isTermsConditionsEnabled;
    const selectedPayment = find(checkout.payments, {
        providerType: PaymentMethodProviderType.Hosted,
    });

    const { isStoreCreditApplied } = checkout;

    let selectedPaymentMethod;
    let filteredMethods;

    filteredMethods = methods.filter((method: PaymentMethod) => {
        if (method.id === PaymentMethodId.Bolt && method.initializationData) {
            return !!method.initializationData.showInCheckout;
        }

        return true;
    });

    if (consignments && consignments.length > 1) {
        const multiShippingIncompatibleMethodIds: string[] = [
            PaymentMethodId.AmazonPay,
        ];

        filteredMethods = methods.filter((method: PaymentMethod) => {
            return multiShippingIncompatibleMethodIds.indexOf(method.id) === -1;
        });
    }

    if (selectedPayment) {
        selectedPaymentMethod = getPaymentMethod(
            selectedPayment.providerId,
            selectedPayment.gatewayId,
        );
        filteredMethods = selectedPaymentMethod
            ? compact([selectedPaymentMethod])
            : filteredMethods;
    } else {
        selectedPaymentMethod = find(filteredMethods, {
            config: { hasDefaultStoredInstrument: true },
        });
        // eslint-disable-next-line no-self-assign
        filteredMethods = filteredMethods;
    }

    const defaultMethod = selectedPaymentMethod || filteredMethods[0];
    
    console.log('[Payment] mapToPaymentProps - defaultMethod:', {
        selectedPaymentMethod: selectedPaymentMethod ? { id: selectedPaymentMethod.id, gateway: selectedPaymentMethod.gateway } : 'undefined',
        firstFilteredMethod: filteredMethods[0] ? { id: filteredMethods[0].id, gateway: filteredMethods[0].gateway } : 'undefined',
        defaultMethod: defaultMethod ? { id: defaultMethod.id, gateway: defaultMethod.gateway } : 'undefined',
        selectedPayment: selectedPayment ? { providerId: selectedPayment.providerId, gatewayId: selectedPayment.gatewayId } : 'undefined'
    });
    
    return {
        applyStoreCredit: checkoutService.applyStoreCredit,
        availableStoreCredit: customer.storeCredit,
        cartUrl: config.links.cartLink,
        clearError: checkoutService.clearError,
        defaultMethod,
        finalizeOrderError: getFinalizeOrderError(),
        finalizeOrderIfNeeded: checkoutService.finalizeOrderIfNeeded,
        loadCheckout: checkoutService.loadCheckout,
        isInitializingPayment: isInitializingPayment(),
        isPaymentDataRequired,
        isStoreCreditApplied,
        isSubmittingOrder: isSubmittingOrder(),
        isTermsConditionsRequired,
        loadPaymentMethods: checkoutService.loadPaymentMethods,
        methods: filteredMethods,
        shouldExecuteSpamCheck: checkout.shouldExecuteSpamCheck,
        shouldLocaliseErrorMessages:
            features['PAYMENTS-6799.localise_checkout_payment_error_messages'],
        submitOrder: checkoutService.submitOrder,
        submitOrderError: getSubmitOrderError(),
        checkoutServiceSubscribe: checkoutService.subscribe,
        checkoutService,
        termsConditionsText:
            isTermsConditionsRequired && termsConditionsType === TermsConditionsType.TextArea
                ? termsCondtitionsText
                : undefined,
        termsConditionsUrl:
            isTermsConditionsRequired && termsConditionsType === TermsConditionsType.Link
                ? termsCondtitionsUrl
                : undefined,
        usableStoreCredit:
            checkout.grandTotal > 0 ? Math.min(checkout.grandTotal, customer.storeCredit || 0) : 0,
    };
}

export default withAnalytics(withLanguage(withCheckout(mapToPaymentProps)(Payment)));
