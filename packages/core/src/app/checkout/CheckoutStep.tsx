import classNames from 'classnames';
import { noop } from 'lodash';
import React, { Component, createRef, ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';

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
}

export interface CheckoutStepState {
    isClosed: boolean;
    isBillingActive: boolean;
}

export default class CheckoutStep extends Component<CheckoutStepProps, CheckoutStepState> {
    state = {
        isClosed: true,
        isBillingActive: false,
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

    private handleClick: (active: boolean) => void = (active) => {
        this.setState({ isBillingActive: active });
    }

    componentWillUnmount(): void {
        if (this.timeoutRef) {
            window.clearTimeout(this.timeoutRef);

            this.timeoutRef = undefined;
        }
    }

    render(): ReactNode {
        const { heading, isActive, isComplete, isEditable, onEdit, suggestion, summary, type } =
            this.props;

        const { isClosed, isBillingActive } = this.state;

        return (
            <li
                className={classNames('checkout-step', 'optimizedCheckout-checkoutStep', {
                    [`checkout-step--${type}`]: !!type,
                })}
                ref={this.containerRef}
            >
                <div className="checkout-view-header">
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
                    <div className={`billing-container ${isBillingActive ? 'active' : ''}`}>
                        <div className='billing-inner'>
                            <button className={`billing-option same-address ${isBillingActive ? '' : 'active'}`} onClick={() => this.handleClick(false)}>
                                <div className="billing-option-radio"></div>
                                <div className="billing-option-info">
                                    <p className="billing-option-info-label">Same as shipping address</p>
                                </div>
                            </button>
                            <button className={`billing-option same-address ${isBillingActive ? 'active' : ''}`} onClick={() => this.handleClick(true)}>
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

                {(type == 'billing') && (
                    <div className="shipping-method-custom-container">
                        <div className="checkout-view-header shipping-method-custom">
                            <div className="stepHeader is-readonly">
                                <div className="stepHeader-figure stepHeader-column">
                                    <div className="stepHeader-title optimizedCheckout-headingPrimary">Shipping Method</div>
                                </div>
                            </div>
                        </div>
                        <div className="shipping-method-options">
                            <div className="icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="21" height="20" viewBox="0 0 21 20" fill="none">
                                    <g clipPath="url(#clip0_111365_15870)">
                                        <path
                                            d="M17.1663 6.66634H14.6663V3.33301H2.99967C2.08301 3.33301 1.33301 4.08301 1.33301 4.99967V14.1663H2.99967C2.99967 15.5497 4.11634 16.6663 5.49967 16.6663C6.88301 16.6663 7.99967 15.5497 7.99967 14.1663H12.9997C12.9997 15.5497 14.1163 16.6663 15.4997 16.6663C16.883 16.6663 17.9997 15.5497 17.9997 14.1663H19.6663V9.99967L17.1663 6.66634ZM5.49967 15.4163C4.80801 15.4163 4.24967 14.858 4.24967 14.1663C4.24967 13.4747 4.80801 12.9163 5.49967 12.9163C6.19134 12.9163 6.74967 13.4747 6.74967 14.1663C6.74967 14.858 6.19134 15.4163 5.49967 15.4163ZM16.7497 7.91634L18.383 9.99967H14.6663V7.91634H16.7497ZM15.4997 15.4163C14.808 15.4163 14.2497 14.858 14.2497 14.1663C14.2497 13.4747 14.808 12.9163 15.4997 12.9163C16.1913 12.9163 16.7497 13.4747 16.7497 14.1663C16.7497 14.858 16.1913 15.4163 15.4997 15.4163Z"
                                            fill="#908F8F" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_111365_15870">
                                            <rect width="20" height="20" fill="white" transform="translate(0.5)" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </div>
                            <div>Free and Insured Shipping</div>
                        </div>
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
