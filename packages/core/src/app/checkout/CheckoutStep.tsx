import classNames from 'classnames';
import { noop } from 'lodash';
import React, { Component, createRef, ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';

import { Consignment, ShippingOption } from '@bigcommerce/checkout-sdk';
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
}



export default class CheckoutStep extends Component<CheckoutStepProps, CheckoutStepState> {
    state = {
        isClosed: true,
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
    }

    componentDidUpdate(prevProps: Readonly<CheckoutStepProps>): void {
        const { isActive } = this.props;

        if (isActive && isActive !== prevProps.isActive) {
            this.focusStep();
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
                            <div className='billing-content'>
                                {this.renderContent()}  
                            </div>
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
            </li>
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
        const { isActive } = this.props;

        if (!isActive) {
            this.setState({ isClosed: true });
        }
    }
}
