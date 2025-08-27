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
    // Add billing address update functionality
    updateBillingAddress(address: any): Promise<CheckoutSelectors>;
    billingAddress: any;
    shippingAddress: any;
    customer: any;
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
        } = this.props;

        // Restore Google Pay state if needed
        this.restoreGooglePayState();

        if (usableStoreCredit) {
            this.handleStoreCreditChange(true);
        }

        await this.loadPaymentMethodsOrThrow();

        try {
            const state = await finalizeOrderIfNeeded();
            const order = state.data.getOrder();

            onFinalize(order?.orderId);
        } catch (error) {
            if (isErrorWithType(error) && error.type !== 'order_finalization_not_required') {
                onFinalizeError(error);
            }
        }

        this.grandTotalChangeUnsubscribe = checkoutServiceSubscribe(
            () => this.handleCartTotalChange(),
            ({ data }) => data.getCheckout()?.grandTotal,
            ({ data }) => data.getCheckout()?.outstandingBalance,
        );

        window.addEventListener('beforeunload', this.handleBeforeUnload);
        window.addEventListener('insurance-toggle-changed', this.handleInsuranceEvent as EventListener);
        window.addEventListener('cart-line-item-removing', this.handleCartLineItemRemoving as EventListener);
        window.addEventListener('coupon-apply', this.handleCouponApply as EventListener);
        window.addEventListener('coupon-remove', this.handleCouponRemove as EventListener);
        window.addEventListener('gift-certificate-apply', this.handleGiftCertificateApply as EventListener);
        window.addEventListener('gift-certificate-remove', this.handleGiftCertificateRemove as EventListener);
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
        window.removeEventListener('insurance-toggle-changed', this.handleInsuranceEvent as EventListener);
        window.removeEventListener('cart-line-item-removing', this.handleCartLineItemRemoving as EventListener);
        window.removeEventListener('coupon-apply', this.handleCouponApply as EventListener);
        window.removeEventListener('coupon-remove', this.handleCouponRemove as EventListener);
        window.removeEventListener('gift-certificate-apply', this.handleGiftCertificateApply as EventListener);
        window.removeEventListener('gift-certificate-remove', this.handleGiftCertificateRemove as EventListener);
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
                            // Add billing address update functionality
                            updateBillingAddress={rest.updateBillingAddress}
                            billingAddress={rest.billingAddress}
                            shippingAddress={rest.shippingAddress}
                            customer={rest.customer}

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

            // Enhanced handling for Google Pay specific errors
            if (defaultMethod?.id?.startsWith('googlepay')) {
                // For Google Pay, avoid page reloads that could clear email
                if (errorType === 'payment_method_invalid' || errorType === 'order_could_not_be_finalized_error') {
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
                window.location.replace(cartUrl || '/');
            }

            if (errorType === 'tax_provider_unavailable') {
                window.location.reload();
            }

            if (errorType === 'cart_consistency') {
                await loadCheckout();
            }

            if (isErrorWithType(error) && error.body) {
                const { body, headers, status } = error;

                if (body.type === 'provider_error' && headers.location) {
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

        // Persist Google Pay state before submission
        if (selectedMethod?.id?.startsWith('googlepay')) {
            this.persistGooglePayState();
        }

        analyticsTracker.clickPayButton({shouldCreateAccount: values.shouldCreateAccount});

        const customSubmit =
            selectedMethod &&
            submitFunctions[getUniquePaymentMethodId(selectedMethod.id, selectedMethod.gateway)];

        if (customSubmit) {
            return customSubmit(values);
        }

        // Trigger validation for all forms by clicking their submit buttons
        try {
            console.log('🚀 Payment: Starting form validation process');
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

            // Trigger credit card billing address form validation
            const creditCardBillingContainer = document.querySelector('.credit-card-billing-address') as HTMLElement;
            console.log('🚀 Payment: Looking for credit card billing container:', creditCardBillingContainer);
            if (creditCardBillingContainer) {
                // Trigger validation by dispatching a custom event that the component can listen to
                const validationEvent = new CustomEvent('triggerValidation', { bubbles: true });
                creditCardBillingContainer.dispatchEvent(validationEvent);
                console.log('🚀 Payment: Dispatched triggerValidation event to credit card billing container');
            } else {
                console.log('🚀 Payment: Credit card billing container not found');
            }

            // Wait a bit for validation to complete and errors to show
            await new Promise(resolve => setTimeout(resolve, 300));

            // Clear the validation flag
            (window as any).__isValidatingForms = false;

            // Check if there are any validation errors
            const errorElements = document.querySelectorAll('.form-field--error');
            if (errorElements.length > 0) {
                // Scroll to the first error
                const firstError = errorElements[0] as HTMLElement;
                if (firstError) {
                    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // Focus on the first error input
                    const errorInput = firstError.querySelector('input, select, textarea') as HTMLElement;
                    if (errorInput) {
                        errorInput.focus();
                    }
                }
                
                console.warn('Form validation failed - please complete all required fields');
                return; // Don't proceed with order submission
            }
        } catch (validationError) {
            console.error('Error during form validation:', validationError);
            // Clear the validation flag in case of error
            (window as any).__isValidatingForms = false;
            // Continue with submission if validation fails
        }

        try {
            const state = await submitOrder(mapToOrderRequestBody(values, isPaymentDataRequired()));
            const order = state.data.getOrder();

            analyticsTracker.paymentComplete();

            // Clear any persisted Google Pay state on successful submission
            if (selectedMethod?.id?.startsWith('googlepay')) {
                sessionStorage.removeItem('googlepay_payment_state');
            }

            onSubmit(order?.orderId);
        } catch (error) {
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
                return onCartChangedError(error);
            }

            // For all other errors, show the error modal
            onSubmitError(error);
        }
    };

    private setSelectedMethod: (method?: PaymentMethod) => void = (method) => {
        const { selectedMethod } = this.state;

        if (selectedMethod === method) {
            return;
        }

        if (method) {
            this.trackSelectedPaymentMethod(method);
        }

        // Clear any payment method change message when user selects a new method
        this.setState({ 
            selectedMethod: method,
            paymentMethodChangeMessage: undefined 
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

    private async loadPaymentMethodsOrThrow(): Promise<void> {
        const {
            loadPaymentMethods,
            onUnhandledError = noop,
        } = this.props;

        try {
            await loadPaymentMethods();

            const selectedMethod = this.state.selectedMethod || this.props.defaultMethod;

            if (selectedMethod) {
                this.trackSelectedPaymentMethod(selectedMethod);
            }
        } catch (error) {
            onUnhandledError(error);
        }
    }

    private async handleCartTotalChange(): Promise<void> {
        const { isReady } = this.state;

        if (!isReady) {
            return;
        }

        // Check if this is an insurance-only change that doesn't require payment method reload
        if (this.isInsuranceOnlyChange()) {
            console.log('[Payment] Skipping payment reload - insurance-only change detected');
            return;
        }

        // Check if this is a coupon/discount-only change that doesn't require payment method reload
        if (this.isCouponDiscountOnlyChange()) {
            console.log('[Payment] Skipping payment reload - coupon/discount-only change detected');
            return;
        }

        console.log('[Payment] Proceeding with payment method reload');
        this.setState({ isReady: false });

        await this.loadPaymentMethodsOrThrow();

        this.setState({ isReady: true });
    }

    /**
     * Check if the cart change is insurance-only and doesn't require payment method reload
     */
    private isInsuranceOnlyChange(): boolean {
        try {
            // Check if insurance-related events were recently triggered
            const now = Date.now();
            const lastInsuranceToggle = (window as any).__last_insurance_toggle || 0;
            const lastCartLineItemRemoving = (window as any).__last_cart_line_item_removing || 0;
            
            // If either event was triggered within the last 3 seconds, skip payment reload
            const timeSinceInsuranceToggle = now - lastInsuranceToggle;
            const timeSinceCartLineItemRemoving = now - lastCartLineItemRemoving;
            
            if (timeSinceInsuranceToggle < 3000 || timeSinceCartLineItemRemoving < 3000) {
                return true;
            }
            
            return false;
        } catch (error) {
            return false; // Default to reloading payment methods if we can't determine
        }
    }

    /**
     * Handle insurance toggle events to track when insurance changes occur
     */
    private handleInsuranceEvent = (): void => {
        (window as any).__last_insurance_toggle = Date.now();
    };

    /**
     * Handle cart line item removing events to track when insurance is being removed
     */
    private handleCartLineItemRemoving = (): void => {
        (window as any).__last_cart_line_item_removing = Date.now();
    };

    /**
     * Check if the cart change is coupon/discount-only and doesn't require payment method reload
     */
    private isCouponDiscountOnlyChange(): boolean {
        try {
            // Check if coupon/discount operations are in progress
            const isCouponOperationInProgress = (window as any).__coupon_operation_in_progress || false;
            const isGiftCertificateOperationInProgress = (window as any).__gift_certificate_operation_in_progress || false;
            
            console.log('[Payment] Coupon/Discount operation flags:', {
                isCouponOperationInProgress,
                isGiftCertificateOperationInProgress
            });
            
            // If any coupon/discount operation is in progress, skip payment reload
            if (isCouponOperationInProgress || isGiftCertificateOperationInProgress) {
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('[Payment] Error in isCouponDiscountOnlyChange:', error);
            return false; // Default to reloading payment methods if we can't determine
        }
    }

    /**
     * Handle coupon apply events to track when coupons are added
     */
    private handleCouponApply = (): void => {
        console.log('[Payment] Coupon apply event received');
        (window as any).__coupon_operation_in_progress = true;
    };

    /**
     * Handle coupon remove events to track when coupons are removed
     */
    private handleCouponRemove = (): void => {
        console.log('[Payment] Coupon remove event received');
        (window as any).__coupon_operation_in_progress = true;
    };

    /**
     * Handle gift certificate apply events to track when gift certificates are added
     */
    private handleGiftCertificateApply = (): void => {
        console.log('[Payment] Gift certificate apply event received');
        (window as any).__gift_certificate_operation_in_progress = true;
    };

    /**
     * Handle gift certificate remove events to track when gift certificates are removed
     */
    private handleGiftCertificateRemove = (): void => {
        console.log('[Payment] Gift certificate remove event received');
        (window as any).__gift_certificate_operation_in_progress = true;
    };

    /**
     * Persist Google Pay state to prevent email clearing during payment processing
     */
    private persistGooglePayState(): void {
        const { defaultMethod } = this.props;
        
        if (defaultMethod?.id?.startsWith('googlepay')) {
            try {
                const currentState = {
                    timestamp: Date.now(),
                    method: defaultMethod.id,
                    gateway: defaultMethod.gateway
                };
                
                sessionStorage.setItem('googlepay_payment_state', JSON.stringify(currentState));
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
            getBillingAddress,
            getShippingAddress,
        },
        errors: { getFinalizeOrderError, getSubmitOrderError },
        statuses: { isInitializingPayment, isSubmittingOrder },
    } = checkoutState;

    const checkout = getCheckout();
    const config = getConfig();
    const customer = getCustomer();
    const consignments = getConsignments();
    const paymentProviderCustomer = getPaymentProviderCustomer();
    const billingAddress = getBillingAddress();
    const shippingAddress = getShippingAddress();

    const { isComplete = false } = getOrder() || {};
    let methods = getPaymentMethods() || EMPTY_ARRAY;

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

    return {
        applyStoreCredit: checkoutService.applyStoreCredit,
        availableStoreCredit: customer.storeCredit,
        cartUrl: config.links.cartLink,
        clearError: checkoutService.clearError,
        defaultMethod: selectedPaymentMethod || filteredMethods[0],
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
        // Add billing address update functionality
        updateBillingAddress: checkoutService.updateBillingAddress,
        billingAddress,
        shippingAddress,
        customer,
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
