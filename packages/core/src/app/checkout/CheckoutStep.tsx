import classNames from 'classnames';
import { noop } from 'lodash';
import React, { Component, createRef, ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';

import { Cart, Consignment, ShippingOption } from '@bigcommerce/checkout-sdk';
import { ShopperCurrency } from '../currency';

import { isMobileView, MobileView } from '../ui/responsive';

import CheckoutStepHeader from './CheckoutStepHeader';
import CheckoutStepType from './CheckoutStepType';

export interface CheckoutStepProps {
    heading?: ReactNode;
    isActive?: boolean;
    isBusy: boolean;
    isComplete?: boolean;
    isEditable?: boolean;
    suggestion?: ReactNode;
    summary?: ReactNode;
    type: CheckoutStepType;
    onExpanded?(step: CheckoutStepType): void;
    onEdit?(step: CheckoutStepType): void;
    isBillingSameAsShipping?: boolean;
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
    consignments?: Consignment[];
    selectShippingOption?(consignmentId: string, optionId: string): Promise<any>;
    isSelectingShippingOption?(consignmentId?: string): boolean;
    // Discount-related props
    applyCoupon?(code: string): Promise<any>;
    applyGiftCertificate?(code: string): Promise<any>;
    clearError?(error: Error): void;
    isApplyingRedeemable?: boolean;
    appliedRedeemableError?: Error;
    // Applied redeemables props
    appliedRedeemables?: Array<{ 
        code: string; 
        type: string; 
        remaining: number;
        displayName?: string;
        discountedAmount?: number;
        used?: number;
    }>;
    onRemoveRedeemable?(code: string): Promise<any>;
    // Cart context to manage shipping protection
    cart?: Cart;
    reloadCheckout?: () => Promise<any>;
}

// Simple shipping option component that doesn't require Formik
const SimpleShippingOption: React.FC<{
    shippingOption: ShippingOption;
    isSelected: boolean;
    onSelect: () => void;
    isLoading?: boolean;
}> = ({ shippingOption, isSelected, onSelect, isLoading }) => (
    <div 
        className={`shipping-method-options ${isSelected ? 'selected' : ''} ${isLoading ? 'loading' : ''}`}
        onClick={() => !isLoading && onSelect()}
        style={{
            cursor: isLoading ? 'progress' : 'pointer',
            opacity: isLoading ? 0.5 : 1,
        }}
    >
        <div className="icon">
            {isSelected ? (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3.5" y="3.5" width="15" height="15" rx="7.5" fill="white" stroke="#292929" strokeWidth="7"/>
                </svg>
            ) : (
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="11" r="9" stroke="#D9D9D9" strokeWidth="1" fill="white"/>
                </svg>
            )}
        </div>
        <div className='shipping-method-title'>
            {shippingOption.description === "Free Shipping" ? "Tracked & Insured" : shippingOption.description}
        </div>
        <span className='shipping-method-price'>
            {shippingOption.cost === 0 ? "Free" : <ShopperCurrency amount={shippingOption.cost} />}
        </span>
    </div>
);

export interface CheckoutStepState {
    isClosed: boolean;
    discountCode: string;
    isApplyingDiscount: boolean;
    discountError?: string;
    removingRedeemable?: string; // Track which redeemable is being removed
    // Shipping protection/insurance upsell state
    isShippingProtectionSelected: boolean;
}



export default class CheckoutStep extends Component<CheckoutStepProps, CheckoutStepState> {
    state = {
        isClosed: true,
        discountCode: '',
        isApplyingDiscount: false,
        discountError: undefined,
        removingRedeemable: undefined,
        // Preselect the checkbox on page load
        isShippingProtectionSelected: true,
    };

    private containerRef = createRef<HTMLLIElement>();
    private contentRef = createRef<HTMLDivElement>();
    private timeoutRef?: number;
    private timeoutDelay?: number;

    componentDidMount(): void {
        const { isActive } = this.props;

        if (isActive) {
            this.focusStep();
        }
        // Do NOT sync from cart on mount to keep default checked UI; we'll sync when cart updates
    }

    componentDidUpdate(prevProps: Readonly<CheckoutStepProps>): void {
        const { isActive } = this.props;

        if (isActive && isActive !== prevProps.isActive) {
            this.focusStep();
        }

        if (this.props.cart !== prevProps.cart) {
            this.syncInsuranceSelectionFromCart();
        }
    }

    // private handleClick: (active: boolean) => void = (active) => {
    //     this.setState({ isBillingActive: active });
    // }

    componentWillUnmount(): void {
        if (this.timeoutRef) {
            window.clearTimeout(this.timeoutRef);

            this.timeoutRef = undefined;
        }
    }

    render(): ReactNode {
        const { 
            heading, 
            isActive, 
            isComplete, 
            isEditable, 
            onEdit, 
            suggestion, 
            summary, 
            type, 
            isBillingSameAsShipping, 
            onBillingSameAsShippingChange, 
            consignments,
            selectShippingOption,
            isSelectingShippingOption
        } = this.props;

        const { isClosed } = this.state;

        return (
            <>
                <li
                    className={classNames('checkout-step', 'optimizedCheckout-checkoutStep', `${isBillingSameAsShipping ? '' : 'is-active'}`, {
                        [`checkout-step--${type}`]: !!type,
                    })}
                    ref={this.containerRef}
                >
                    <div className="billing-wrapper">
                        <div className={`checkout-view-header`}>
                            <CheckoutStepHeader
                                heading={heading}
                                isActive={isActive}
                                isComplete={isComplete}
                                isEditable={isEditable}
                                onEdit={onEdit}
                                summary={summary}
                                type={type}
                            />
                        </div>

                        {(type == 'payment') && (
                            <div className="payment-subheader">All transactions are secure and encrypted.</div>
                        )}

                        {suggestion && isClosed && !isActive && (
                            <div className="checkout-suggestion" data-test="step-suggestion">
                                {suggestion}
                            </div>
                        )}

                        {(type == 'billing') && 
                            <div className={`billing-container ${!isBillingSameAsShipping ? 'active' : ''}`}>
                                <div className='billing-inner'>
                                    <button 
                                        className={`billing-option same-address ${isBillingSameAsShipping ? 'active' : ''}`}
                                        onClick={() => onBillingSameAsShippingChange?.(true)}
                                        type="button"
                                    >
                                        <div className="billing-option-radio"></div>
                                        <div className="billing-option-info">
                                            <p className="billing-option-info-label">Same as shipping address</p>
                                        </div>
                                    </button>
                                    <button 
                                        className={`billing-option same-address ${isBillingSameAsShipping ? '' : 'active'}`}
                                        onClick={() => onBillingSameAsShippingChange?.(false)}
                                        type="button"
                                    >
                                        <div className="billing-option-radio"></div>
                                        <div className="billing-option-info">
                                            <p className="billing-option-info-label">Use a different billing address</p>
                                        </div>
                                    </button>
                                </div>
                                {/* <div className='billing-content'>
                                    {this.renderContent()}  
                                </div> */}
                            </div>
                        }
                        {(type != 'billing') && this.renderContent()}
                    </div>
                    {(type == 'billing') && consignments && consignments.length > 0 && (
                        <div className="shipping-method-custom-container">
                            <div className="checkout-view-header shipping-method-custom">
                                <div className="stepHeader is-readonly">
                                    <div className="stepHeader-figure stepHeader-column">
                                        <div className="stepHeader-title optimizedCheckout-headingPrimary">Shipping Method</div>
                                    </div>
                                </div>
                            </div>
                            {(() => {
                                if (!consignments || consignments.length === 0) {
                                    return (
                                        <div className="shipping-method-options">
                                            <div className="icon">
                                                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <rect x="3.5" y="3.5" width="15" height="15" rx="7.5" fill="white" stroke="#292929" strokeWidth="7"/>
                                                </svg>
                                            </div>
                                            <div className='shipping-method-title'>No shipping method selected</div>
                                            <span className='shipping-method-price'>-</span>
                                        </div>
                                    );
                                }

                                // Render shipping options for each consignment using simple component
                                return consignments.map((consignment) => {
                                    const availableOptions = consignment.availableShippingOptions || [];
                                    const selectedOption = consignment.selectedShippingOption;
                                    
                                    if (availableOptions.length === 0) {
                                        return null;
                                    }

                                    return (
                                        <div key={consignment.id} className="shippingOptions-container form-fieldset">
                                            {availableOptions.map((shippingOption) => {
                                                const isSelected = selectedOption?.id === shippingOption.id;
                                                const isLoading = isSelectingShippingOption?.(consignment.id) || false;
                                                
                                                return (
                                                    <SimpleShippingOption
                                                        key={`${consignment.id}-${shippingOption.id}`}
                                                        shippingOption={shippingOption}
                                                        isSelected={isSelected}
                                                        onSelect={() => selectShippingOption?.(consignment.id, shippingOption.id)}
                                                        isLoading={isLoading}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                }).filter(Boolean);
                            })()}
                        </div>
                    )}

                    {/* Shipping Protection / Insurance Upsell */}
                    {(type == 'billing') && (
                        <div className="shipping-protection-container">
                            <button
                                type="button"
                                className={`shipping-protection-card ${this.state.isShippingProtectionSelected ? 'selected' : ''}`}
                                onClick={() => this.handleShippingProtectionToggle(!this.state.isShippingProtectionSelected)}
                                aria-pressed={this.state.isShippingProtectionSelected}
                            >
                                <div className="shipping-protection-content">
                                    <div className="shipping-protection-icon" aria-hidden="true">
                                        {/* simple box icon */}
                                        <img alt="Shipping Insurance against damage, lost and theft!" 
                                            data-test="cart-item-image" 
                                            src="https://cdn11.bigcommerce.com/s-dgqj8t7y1p/products/114/images/382/11052983__04773.1754742857.220.290.png?c=1" 
                                            style={{ width: '69px' }}
                                        />
                                    </div>
                                    <div className="shipping-protection-text">
                                        <div className="shipping-protection-title">Extra Priority when packing & 100% insurance</div>
                                        <div className="shipping-protection-subtitle">from damage, theft or loss for just <span className="shipping-protection-price">$10.74</span></div>
                                        <div className="shipping-protection-description">Enjoy peace of mind with our Delivery Guarantee, covering any damage, theft, or loss that may occur during transit.</div>
                                    </div>
                                </div>
                                <div className="shipping-protection-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={this.state.isShippingProtectionSelected}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => this.handleShippingProtectionToggle(!this.state.isShippingProtectionSelected)}
                                        aria-label="Add shipping protection"
                                    />
                                </div>
                            </button>
                        </div>
                    )}
                    
                    {/* Discount Code Section */}
                    {(type == 'billing') && (
                        <div className="discount-code-container-mobile">
                        <div className="checkout-view-header discount-code-custom">
                            <div className="stepHeader is-readonly">
                                <div className="stepHeader-figure stepHeader-column">
                                    <div className="stepHeader-title optimizedCheckout-headingPrimary">Discount Code</div>
                                </div>
                            </div>
                        </div>
                        <div className="discount-code-form">
                            <fieldset className="form-fieldset redeemable-entry">
                                {(this.state.discountError || this.props.appliedRedeemableError) && (
                                    <div className="error-message">
                                        {this.state.discountError || 
                                         (this.props.appliedRedeemableError instanceof Error ? 
                                          this.props.appliedRedeemableError.message : 
                                          'Failed to apply discount code')}
                                    </div>
                                )}
                                <div className="form-prefixPostfix redeemable-entry-container">
                                    <input
                                        type="text"
                                        placeholder="Gift card or discount code"
                                        className="form-input optimizedCheckout-form-input"
                                        value={this.state.discountCode}
                                        onChange={this.handleDiscountCodeChange}
                                        onKeyDown={this.handleDiscountKeyDown}
                                        disabled={this.state.isApplyingDiscount}
                                    />
                                    <button
                                        type="button"
                                        className="form-prefixPostfix-button--postfix"
                                        disabled={this.state.isApplyingDiscount}
                                        onClick={this.handleApplyDiscount}
                                    >
                                        {this.state.isApplyingDiscount ? (
                                            <div className="loading-spinner" />
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                <path d="M3.75 12H20.25" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M13.5 5.25L20.25 12L13.5 18.75" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </fieldset>
                        </div>

                                        {/* Show applied discount codes/gift certificates with remove button */}
                    {this.props.appliedRedeemables && this.props.appliedRedeemables.length > 0 && (
                        <div className="applied-discount-list">
                            {this.props.appliedRedeemables.map((redeemable: any) => (
                                <div key={redeemable.code} className="applied-discount-item">
                                    <div className="applied-discount-info">
                                        <div className="applied-discount-amount">
                                            {redeemable.displayName || 
                                             (redeemable.discountedAmount ? 
                                              `$${(redeemable.discountedAmount / 100).toFixed(2)} off the order total` : 
                                              'Discount applied')}
                                        </div>
                                        <div className="applied-discount-code">
                                            {redeemable.code}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="remove-discount-btn"
                                        onClick={() => this.handleRemoveRedeemable(redeemable.code)}
                                        disabled={this.state.removingRedeemable === redeemable.code}
                                        aria-label={`Remove ${redeemable.code}`}
                                    >
                                        {this.state.removingRedeemable === redeemable.code ? 'removing...' : 'remove'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                    </div>
                    )}
                    
                </li>

            </>
        );
    }

    private renderContent(): ReactNode {
        const { children, isActive, isBusy } = this.props;

        return (
            <MobileView>
                {(matched) => (
                    <CSSTransition
                        addEndListener={this.handleTransitionEnd}
                        classNames="checkout-view-content"
                        enter={!matched}
                        exit={!matched}
                        in={isActive}
                        mountOnEnter
                        onExited={ this.onAnimationEnd }
                        timeout={ {} }
                        unmountOnExit
                    >
                        <div
                            aria-busy={isBusy}
                            className="checkout-view-content"
                            ref={this.contentRef}
                        >
                            {isActive ? children : null}
                        </div>
                    </CSSTransition>
                )}
            </MobileView>
        );
    }

    private focusStep(): void {
        return; // disable focus on step containers (window.scrollTo)
        const delay = isMobileView() ? 0 : this.getTransitionDelay();

        this.setState({ isClosed: false });

        this.timeoutRef = window.setTimeout(() => {
            const input = this.getChildInput();
            const position = this.getScrollPosition();
            const { type, onExpanded = noop } = this.props;

            if (input) {
                input.focus();
            }

            if (position !== undefined && !isNaN(position)) {
                window.scrollTo(0, position);
            }

            onExpanded(type);

            this.timeoutRef = undefined;
        }, delay);
    }

    private getChildInput(): HTMLElement | undefined {
        const container = this.containerRef.current;

        if (!container) {
            return;
        }

        const input = container.querySelector<HTMLElement>('input, select, textarea');

        return input || undefined;
    }

    private getScrollPosition(): number | undefined {
        const container = this.getParentContainer();
        const { isComplete } = this.props;

        if (!container || window !== window.top) {
            return;
        }

        const topOffset = isComplete ? 0 : window.innerHeight / 5;
        const containerOffset =
            container.getBoundingClientRect().top + (window.scrollY || window.pageYOffset);

        return containerOffset - topOffset;
    }

    // For now, we need to find the parent container because `CheckoutStep`
    // isn't the outer container yet. Once both the header and body are
    // moved inside this component, we can remove the lookup.
    private getParentContainer(): HTMLElement | undefined {
        let container: HTMLElement | null = this.containerRef.current;

        while (container && container.parentElement) {
            if (container.parentElement.classList.contains('checkout-step')) {
                return container.parentElement;
            }

            container = container.parentElement;
        }

        return this.containerRef.current ? this.containerRef.current : undefined;
    }

    private getTransitionDelay(): number {
        if (this.timeoutDelay !== undefined) {
            return this.timeoutDelay;
        }

        // Cache the result to avoid unnecessary reflow
        this.timeoutDelay =
            parseFloat(
                this.contentRef.current
                    ? getComputedStyle(this.contentRef.current).transitionDuration
                    : '0s',
            ) * 1000;

        return this.timeoutDelay;
    }

    private handleTransitionEnd: (node: HTMLElement, done: () => void) => void = (node, done) => {
        node.addEventListener('transitionend', ({ target }) => {
            if (target === node) {
                done();
            }
        });
    };

    private onAnimationEnd = (): void => {
        this.setState({ isClosed: true });
    };

    private handleDiscountCodeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ 
            discountCode: event.target.value,
            discountError: undefined 
        });
    };

    private handleApplyDiscount = async (): Promise<void> => {
        const { discountCode } = this.state;
        const { applyCoupon, applyGiftCertificate, clearError } = this.props;
        
        if (!discountCode.trim()) {
            this.setState({ discountError: 'Please enter a discount code' });
            return;
        }

        if (!applyCoupon || !applyGiftCertificate || !clearError) {
            this.setState({ discountError: 'Discount functionality not available' });
            return;
        }

        // Additional safety check
        if (typeof applyCoupon !== 'function' || typeof applyGiftCertificate !== 'function' || typeof clearError !== 'function') {
            this.setState({ discountError: 'Discount functionality not available' });
            return;
        }

        this.setState({ isApplyingDiscount: true, discountError: undefined });

        try {
            const code = discountCode.trim();
            
            // Try to apply as gift certificate first, then as coupon
            try {
                await applyGiftCertificate(code);
            } catch (error) {
                try {
                    if (error instanceof Error) {
                        clearError(error);
                    }
                } catch (clearErrorError) {
                    // Ignore clearError errors, continue with coupon attempt
                    console.warn('Failed to clear error:', clearErrorError);
                }
                
                // Try as coupon if gift certificate fails
                try {
                    await applyCoupon(code);
                } catch (couponError) {
                    // If both fail, throw the original error
                    throw error;
                }
            }
            
            this.setState({ 
                discountCode: '',
                isApplyingDiscount: false 
            });
        } catch (error) {
            this.setState({ 
                isApplyingDiscount: false,
                discountError: error instanceof Error ? error.message : 'Failed to apply discount code'
            });
        }
    };

    private handleDiscountKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleApplyDiscount();
        }
    };

    private handleRemoveRedeemable = async (code: string): Promise<void> => {
        const { onRemoveRedeemable } = this.props;
        
        if (!onRemoveRedeemable) {
            console.warn('Remove redeemable function not available');
            return;
        }

        // Set loading state for this specific redeemable
        this.setState({ removingRedeemable: code });

        try {
            await onRemoveRedeemable(code);
        } catch (error) {
            console.error('Failed to remove redeemable:', error);
            // Could add error state here if needed
        } finally {
            // Clear loading state
            this.setState({ removingRedeemable: undefined });
        }
    };

    // old local toggle kept for reference; superseded by handleShippingProtectionToggle

    private syncInsuranceSelectionFromCart(): void {
        try {
            const { cart } = this.props;
            const productId = (process.env.INSURANCE_PRODUCT_ID || '').trim();
            if (!cart || !productId) return;
            const present = cart.lineItems?.digitalItems?.some(
                (item) => String(item.productId) === productId,
            );
            if (present !== undefined) {
                this.setState({ isShippingProtectionSelected: !!present });
            }
        } catch (e) {
            console.warn('Failed to sync insurance selection from cart:', e);
        }
    }

    private handleShippingProtectionToggle = async (shouldSelect: boolean): Promise<void> => {
        const productId = (process.env.INSURANCE_PRODUCT_ID || '').trim();
        if (!productId) return;
        // Validate against current cart first to avoid duplicates or no-op removals
        const exists = Boolean(this.props.cart?.lineItems?.digitalItems?.some(i => String(i.productId) === productId));
        // Update UI immediately for responsiveness
        this.setState({ isShippingProtectionSelected: shouldSelect });
        try {
            if (shouldSelect && this.props.cart?.id) {
                if (exists) {
                    // Already present; nothing to do
                    window.dispatchEvent(new CustomEvent('soft-cart-refresh'));
                    return;
                }
                // Add via Storefront Cart Items API (same as page-load path)
                await fetch(`/api/storefront/carts/${this.props.cart.id}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/vnd.api+json',
                    },
                    body: JSON.stringify({
                        lineItems: [{ productId: Number(productId), quantity: 1 }],
                    }),
                    credentials: 'include',
                });
            } else if (!shouldSelect && this.props.cart?.id) {
                // Remove via Storefront Cart Items API (same as remove button)
                const insurance = this.props.cart?.lineItems?.digitalItems?.find(
                    (i) => String(i.productId) === productId,
                );
                if (insurance) {
                    // Tell the summary to switch label to "Removing..."
                    window.dispatchEvent(new CustomEvent('cart-line-item-removing', { detail: { lineItemId: insurance.id, removing: true } }));
                    await fetch(`/api/storefront/carts/${this.props.cart.id}/items/${insurance.id}`, {
                        method: 'DELETE',
                        credentials: 'include',
                    });
                    // Reset the label back after deletion completes (summary will also get refreshed)
                    window.dispatchEvent(new CustomEvent('cart-line-item-removing', { detail: { lineItemId: insurance.id, removing: false } }));
                } else {
                    // Nothing to remove
                    window.dispatchEvent(new CustomEvent('soft-cart-refresh'));
                    return;
                }
            }
        } catch (e) {
            console.warn('Failed to update insurance item:', e);
        } finally {
            // Soft refresh to re-sync UI with cart
            window.dispatchEvent(new CustomEvent('soft-cart-refresh'));
        }
    };
}


