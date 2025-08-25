import {
    CheckoutSelectors,
    CustomerRequestOptions,
    LanguageService,
    PaymentInitializeOptions,
    PaymentMethod,
    PaymentRequestOptions,
} from '@bigcommerce/checkout-sdk';
import { noop, some } from 'lodash';
import React, { Component, ReactNode } from 'react';

import { preventDefault } from '@bigcommerce/checkout/dom-utils';
import { SignOutLink } from '@bigcommerce/checkout/instrument-utils';
import { TranslatedString } from '@bigcommerce/checkout/locale';
import {
    getPaymentMethodName,
    PaymentFormService,
} from '@bigcommerce/checkout/payment-integration-api';
import { LoadingOverlay } from '@bigcommerce/checkout/ui';

import normalizeWalletPaymentData from './normalizeWalletPaymentData';

export interface WalletButtonPaymentMethodProps {
    checkoutState: CheckoutSelectors;
    language: LanguageService;
    paymentForm: PaymentFormService;
    buttonId: string;
    editButtonClassName?: string;
    editButtonLabel?: ReactNode;
    isInitializing?: boolean;
    method: PaymentMethod;
    shouldShowEditButton?: boolean;
    signInButtonClassName?: string;
    signInButtonLabel?: ReactNode;
    signOutCustomer(options: CustomerRequestOptions): Promise<CheckoutSelectors>;
    deinitializePayment(options: PaymentRequestOptions): Promise<CheckoutSelectors>;
    initializePayment(options: PaymentInitializeOptions): Promise<CheckoutSelectors>;
    onSignOut?(): void;
    onSignOutError?(error: Error): void;
    onUnhandledError?(error: Error): void;
}

interface WalletButtonPaymentMethodDerivedProps {
    accountMask?: string;
    cardName?: string;
    cardType?: string;
    expiryMonth?: string;
    expiryYear?: string;
    email?: string; // Add email field
    isPaymentDataRequired: boolean;
    isPaymentSelected: boolean;
}

class WalletButtonPaymentMethodComponent extends Component<WalletButtonPaymentMethodProps> {
    async componentDidMount(): Promise<void> {
        const { initializePayment, method, onUnhandledError = noop } = this.props;

        this.toggleSubmit();

        try {
            await initializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
            });

            // Handle Google Pay email auto-population
            this.handleGooglePayEmailPopulation();
            
            // Restore email from session storage if available
            this.restoreEmailFromSessionStorage();
        } catch (error) {
            onUnhandledError(error);
        }
    }

    async componentWillUnmount(): Promise<void> {
        const {
            deinitializePayment,
            paymentForm: { disableSubmit },
            method,
            onUnhandledError = noop,
        } = this.props;

        disableSubmit(method, false);

        try {
            await deinitializePayment({
                gatewayId: method.gateway,
                methodId: method.id,
            });
        } catch (error) {
            onUnhandledError(error);
        }
    }

    componentDidUpdate(
        prevProps: Readonly<WalletButtonPaymentMethodProps & WalletButtonPaymentMethodDerivedProps>,
    ): void {
        const { method } = this.props;
        const { isPaymentDataRequired } = this.getWalletButtonPaymentMethodDerivedProps();
        const { method: prevMethod, isPaymentDataRequired: prevIsPaymentDataRequired } = prevProps;

        if (
            method.initializationData !== prevMethod.initializationData ||
            isPaymentDataRequired !== prevIsPaymentDataRequired
        ) {
            this.toggleSubmit();
            
            // Handle Google Pay email auto-population when initialization data changes
            this.handleGooglePayEmailPopulation();
        }
    }

    render(): ReactNode {
        const { isInitializing = false } = this.props;
        const { isPaymentSelected } = this.getWalletButtonPaymentMethodDerivedProps();

        return (
            <LoadingOverlay hideContentWhenLoading isLoading={isInitializing}>
                <div className="paymentMethod paymentMethod--walletButton">
                    {isPaymentSelected ? this.renderPaymentView() : this.renderSignInView()}
                </div>
            </LoadingOverlay>
        );
    }

    private renderSignInView(): ReactNode {
        const { buttonId, signInButtonClassName, signInButtonLabel, method, language } = this.props;

        return (
            // eslint-disable-next-line jsx-a11y/anchor-is-valid
            <a className={signInButtonClassName} href="#" id={buttonId} onClick={preventDefault()}>
                {signInButtonLabel || (
                    <TranslatedString
                        data={{ providerName: getPaymentMethodName(language)(method) }}
                        id="remote.sign_in_action"
                    />
                )}
            </a>
        );
    }

    private renderPaymentView(): ReactNode {
        const { buttonId, editButtonClassName, editButtonLabel, shouldShowEditButton, method } =
            this.props;
        const { accountMask, cardName, cardType, expiryMonth, expiryYear } =
            this.getWalletButtonPaymentMethodDerivedProps();

        return (
            <>
                {!!cardName && (
                    <p data-test="payment-method-wallet-card-name">
                        <strong>
                            <TranslatedString id="payment.credit_card_name_label" />:
                        </strong>{' '}
                        {cardName}
                    </p>
                )}

                {!!accountMask && !!cardType && (
                    <p data-test="payment-method-wallet-card-type">
                        <strong>{`${cardType}:`}</strong> {accountMask}
                    </p>
                )}

                {!!expiryMonth && !!expiryYear && (
                    <p data-test="payment-method-wallet-card-expiry">
                        <strong>
                            <TranslatedString id="payment.credit_card_expiration_date_label" />:
                        </strong>{' '}
                        {`${expiryMonth}/${expiryYear}`}
                    </p>
                )}

                {!!shouldShowEditButton && (
                    <p>
                        {
                            // eslint-disable-next-line jsx-a11y/anchor-is-valid
                            <a
                                className={editButtonClassName}
                                href="#"
                                id={buttonId}
                                onClick={preventDefault()}
                            >
                                {editButtonLabel || (
                                    <TranslatedString id="remote.select_different_card_action" />
                                )}
                            </a>
                        }
                    </p>
                )}

                <SignOutLink method={method} onSignOut={this.handleSignOut} />
            </>
        );
    }

    private toggleSubmit(): void {
        const {
            paymentForm: { disableSubmit },
            method,
        } = this.props;
        const { isPaymentDataRequired } = this.getWalletButtonPaymentMethodDerivedProps();

        if (normalizeWalletPaymentData(method.initializationData) || !isPaymentDataRequired) {
            disableSubmit(method, false);
        } else {
            disableSubmit(method, true);
        }
    }

    private handleSignOut: () => void = async () => {
        const { signOutCustomer, method, onSignOut = noop, onSignOutError = noop } = this.props;

        try {
            await signOutCustomer({ methodId: method.id });
            onSignOut();
            window.location.reload();
        } catch (error) {
            onSignOutError(error);
        }
    };

    /**
     * Handle Google Pay email auto-population
     */
    private handleGooglePayEmailPopulation(): void {
        const { method, onUnhandledError = noop } = this.props;
        
        // Check if this is a Google Pay method
        if (!method.id.startsWith('googlepay')) {
            return;
        }

        try {
            const walletPaymentData = normalizeWalletPaymentData(method.initializationData);
            
            if (walletPaymentData?.email) {
                console.log('[WalletButton] Google Pay email detected:', walletPaymentData.email);
                
                // Populate email to customer form
                this.populateEmailToCustomerForm(walletPaymentData.email);
                
                // Trigger subscription API if needed
                this.triggerSubscriptionAPI(walletPaymentData.email);
            }
        } catch (error) {
            console.error('[WalletButton] Error handling Google Pay email population:', error);
            onUnhandledError(error as Error);
        }
    }

    /**
     * Populate email to customer form
     */
    private populateEmailToCustomerForm(email: string): void {
        try {
            // Email validation regex
            const EMAIL_REGEXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
            
            if (!EMAIL_REGEXP.test(email)) {
                console.warn('[WalletButton] Invalid email format:', email);
                return;
            }

            // Method 1: Try to find and populate email field in customer form
            const emailInput = document.querySelector('input[name="email"], input[type="email"], #email') as HTMLInputElement;
            if (emailInput) {
                emailInput.value = email;
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[WalletButton] Email populated to customer form:', email);
            }

            // Method 2: Try to populate billing address email
            const billingEmailInput = document.querySelector('input[name="billingAddress.email"], #billingAddress\\.email') as HTMLInputElement;
            if (billingEmailInput) {
                billingEmailInput.value = email;
                billingEmailInput.dispatchEvent(new Event('input', { bubbles: true }));
                billingEmailInput.dispatchEvent(new Event('change', { bubbles: true }));
                console.log('[WalletButton] Email populated to billing form:', email);
            }

            // Method 3: Try to trigger Formik field updates if available
            this.triggerFormikFieldUpdate('email', email);
            this.triggerFormikFieldUpdate('customerEmail', email);

            // Method 4: Store email in session storage for persistence across page reloads
            try {
                sessionStorage.setItem('googlepay_email', email);
                console.log('[WalletButton] Email stored in session storage:', email);
            } catch (error) {
                console.warn('[WalletButton] Failed to store email in session storage:', error);
            }

        } catch (error) {
            console.error('[WalletButton] Error populating email to customer form:', error);
        }
    }

    /**
     * Trigger Formik field update if Formik is available
     */
    private triggerFormikFieldUpdate(fieldName: string, value: string): void {
        try {
            // Try to find Formik context and update field
            const formikContext = (window as any).__FORMIK_CONTEXT__;
            if (formikContext && formikContext.setFieldValue) {
                formikContext.setFieldValue(fieldName, value);
                console.log('[WalletButton] Formik field updated:', fieldName, value);
            }
        } catch (error) {
            // Silently fail if Formik is not available
        }
    }

    /**
     * Trigger subscription API for the email
     */
    private async triggerSubscriptionAPI(email: string): Promise<void> {
        try {
            // Check if there's a subscription checkbox
            const subscribeCheckbox = document.querySelector('input[name="shouldSubscribe"], input[type="checkbox"][name*="subscribe"]') as HTMLInputElement;
            const shouldSubscribe = subscribeCheckbox?.checked || false;

            if (shouldSubscribe) {
                console.log('[WalletButton] Triggering subscription API for email:', email);
                
                // This would typically call the continueAsGuest API with subscription data
                // For now, we'll just log it - the actual API call should be handled by the customer form
                console.log('[WalletButton] Subscription API should be triggered for:', email);
            }
        } catch (error) {
            console.error('[WalletButton] Error triggering subscription API:', error);
        }
    }

    /**
     * Restore email from session storage if available
     */
    private restoreEmailFromSessionStorage(): void {
        try {
            const storedEmail = sessionStorage.getItem('googlepay_email');
            if (storedEmail) {
                console.log('[WalletButton] Restoring email from session storage:', storedEmail);
                this.populateEmailToCustomerForm(storedEmail);
                // Clear session storage after restoration
                sessionStorage.removeItem('googlepay_email');
                console.log('[WalletButton] Email restored and session storage cleared.');
            }
        } catch (error) {
            console.warn('[WalletButton] Failed to restore email from session storage:', error);
        }
    }

    private getWalletButtonPaymentMethodDerivedProps(): WalletButtonPaymentMethodDerivedProps {
        const { checkoutState, method } = this.props;
        const {
            data: { getBillingAddress, getCheckout, isPaymentDataRequired },
        } = checkoutState;
        const billingAddress = getBillingAddress();
        const checkout = getCheckout();

        if (!billingAddress || !checkout) {
            throw new Error('Unable to get checkout');
        }

        const walletPaymentData = normalizeWalletPaymentData(method.initializationData);

        return {
            ...walletPaymentData,
            // FIXME: I'm not sure how this would work for non-English names.
            cardName:
                walletPaymentData && [billingAddress.firstName, billingAddress.lastName].join(' '),
            isPaymentDataRequired: isPaymentDataRequired(),
            isPaymentSelected: some(checkout.payments, { providerId: method.id }),
        };
    }
}

export default WalletButtonPaymentMethodComponent;
