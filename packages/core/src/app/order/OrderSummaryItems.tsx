import { LineItemMap } from '@bigcommerce/checkout-sdk';
import React, { ReactNode } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { IconChevronDown, IconChevronUp } from '../ui/icon';
import { isSmallScreen } from '../ui/responsive';
import { getInsuranceConfig } from './getInsuranceConfig';

import getItemsCount from './getItemsCount';
import mapFromCustom from './mapFromCustom';
import mapFromDigital from './mapFromDigital';
import mapFromGiftCertificate from './mapFromGiftCertificate';
import mapFromPhysical from './mapFromPhysical';
import OrderSummaryItem from './OrderSummaryItem';

const COLLAPSED_ITEMS_LIMIT = 4;
const COLLAPSED_ITEMS_LIMIT_SMALL_SCREEN = 3;

export interface OrderSummaryItemsProps {
    displayLineItemsCount: boolean;
    items: LineItemMap;
}

interface OrderSummaryItemsState {
    isExpanded: boolean;
    collapsedLimit: number;
    // Insurance caching for instant UI updates
    cachedInsuranceItem: any | null;
    isInsuranceVisible: boolean;
    isInsuranceTransitioning: boolean;
}

class OrderSummaryItems extends React.Component<OrderSummaryItemsProps, OrderSummaryItemsState> {
    constructor(props: OrderSummaryItemsProps) {
        super(props);

        this.state = {
            isExpanded: false,
            collapsedLimit: this.getCollapsedLimit(),
            // Insurance caching state
            cachedInsuranceItem: null,
            isInsuranceVisible: false,
            isInsuranceTransitioning: false,
        };
    }

    componentDidMount(): void {
        this.setupInsuranceEventListeners();
        this.initializeInsuranceCache();
    }

    componentWillUnmount(): void {
        this.cleanupInsuranceEventListeners();
    }

    componentDidUpdate(prevProps: OrderSummaryItemsProps): void {
        // Update cache when items change
        if (prevProps.items !== this.props.items) {
            this.updateInsuranceCache();
        }
    }

    private setupInsuranceEventListeners = (): void => {
        // Listen for insurance toggle changes from checkout
        window.addEventListener('insurance-toggle-changed', this.handleInsuranceToggleChanged);
    };

    private cleanupInsuranceEventListeners = (): void => {
        window.removeEventListener('insurance-toggle-changed', this.handleInsuranceToggleChanged);
    };

    private handleInsuranceToggleChanged = (event: Event): void => {
        const evt = event as CustomEvent<{
            isSelected: boolean;
            cachedItem: any;
            operation: 'add' | 'remove' | 'rollback';
        }>;
        
        if (!evt?.detail) return;
        
        const { isSelected, cachedItem, operation } = evt.detail;
        
        if (operation === 'rollback') {
            // Rollback to previous state
            this.setState({
                isInsuranceVisible: !isSelected,
                isInsuranceTransitioning: false
            });
        } else {
            // Update visibility immediately
            this.setState({
                isInsuranceVisible: isSelected,
                isInsuranceTransitioning: true,
                cachedInsuranceItem: cachedItem
            });
            
            console.log('Updated insurance state:', { isSelected, hasCachedItem: !!cachedItem });
            
            // Clear transition state after a longer delay to match the context
            setTimeout(() => {
                this.setState({ isInsuranceTransitioning: false });
            }, 3000); // Match the 3-second delay from CheckoutStep
        }
    };

    private initializeInsuranceCache = (): void => {
        const { items } = this.props;
        const insuranceItem = items.digitalItems?.find(item => isInsuranceItem(item.name));
        
        if (insuranceItem) {
            const cachedItem = mapFromDigital(insuranceItem);
            this.setState({
                cachedInsuranceItem: cachedItem,
                isInsuranceVisible: true
            });
        } else {
            // Create a default cached item if insurance is not in cart but might be added
            const insuranceAmount = this.getInsuranceAmount();
            const defaultCachedItem = {
                id: 'insurance-cached',
                quantity: 1,
                amount: insuranceAmount,
                amountAfterDiscount: insuranceAmount,
                name: 'Delivery Guarantee',
                image: this.getInsuranceItemImage(),
                productOptions: [
                    {
                        testId: 'cart-item-product-option',
                        content: '',
                    }
                ],
            };
            this.setState({
                cachedInsuranceItem: defaultCachedItem,
                isInsuranceVisible: false
            });
        }
    };

    private getInsuranceItemImage = (): React.ReactNode => {
        return (
            <img 
                alt="Shipping Insurance" 
                data-test="cart-item-image" 
                src="https://cdn11.bigcommerce.com/s-dgqj8t7y1p/products/114/images/382/11052983__04773.1754742857.220.290.png?c=1"
            />
        );
    };

    private getInsuranceAmount = (): number => {
        const { items } = this.props;
        const insuranceItem = items.digitalItems?.find(item => isInsuranceItem(item.name));
        
        if (insuranceItem) {
            // Use the actual amount from the insurance item
            return insuranceItem.extendedSalePrice || insuranceItem.extendedListPrice || 0;
        }
        
        // If no insurance item in cart, use environment variable or fallback
        const { productPrice } = getInsuranceConfig();
        if (productPrice) {
            const parsed = Number(productPrice);
            return isNaN(parsed) ? 10.74 : parsed;
        }
        
        // Fallback to $10.74 if not set
        return 10.74;
    };

    private updateInsuranceCache = (): void => {
        const { items } = this.props;
        const insuranceItem = items.digitalItems?.find(item => isInsuranceItem(item.name));
        
        if (insuranceItem) {
            const cachedItem = mapFromDigital(insuranceItem);
            this.setState({
                cachedInsuranceItem: cachedItem,
                isInsuranceVisible: true
            });
        } else {
            // Insurance item not in cart, but keep cache for potential re-add
            // Only update visibility if we're not in a transition state
            if (!this.state.isInsuranceTransitioning) {
                this.setState({ isInsuranceVisible: false });
            }
        }
    };

    render(): ReactNode {
        const { displayLineItemsCount = true, items } = this.props;
        const { collapsedLimit, isExpanded, cachedInsuranceItem, isInsuranceVisible, isInsuranceTransitioning } = this.state;

        // Build the list of items to display
        let displayItems = [
            ...items.physicalItems
                .slice()
                .sort((item) => item.variantId)
                .map(mapFromPhysical),
            ...items.giftCertificates.slice().map(mapFromGiftCertificate),
            ...items.digitalItems
                .slice()
                .sort((item) => item.variantId)
                .filter(item => !isInsuranceItem(item.name)) // Filter out insurance items from cart
                .map(mapFromDigital),
            ...(items.customItems || []).map(mapFromCustom),
        ];

        // Add cached insurance item if it should be visible (regardless of caching mode)
        if (isInsuranceVisible && cachedInsuranceItem) {
            displayItems.push({
                ...cachedInsuranceItem,
                // Add remove handler for cached insurance item
                onRemove: () => this.handleCachedInsuranceRemove(),
            });
        }

        return (
            <>
                {displayLineItemsCount && <h3
                    className="cart-section-heading optimizedCheckout-contentPrimary"
                    data-test="cart-count-total"
                >
                    <TranslatedString
                        data={{ count: getItemsCount(items) }}
                        id="cart.item_count_text"
                    />
                </h3>}

                <ul aria-live="polite" className="productList">
                    {displayItems
                        .slice(0, isExpanded ? undefined : collapsedLimit)
                        .map((summaryItemProps) => (
                            <li 
                                className={`productList-item is-visible ${isInsuranceTransitioning && isInsuranceItem(summaryItemProps.name) ? 'insurance-transitioning' : ''}`} 
                                key={summaryItemProps.id}
                                style={isInsuranceTransitioning && isInsuranceItem(summaryItemProps.name) ? { opacity: 1, transition: 'opacity 0.3s ease' } : {}}
                            >
                                <OrderSummaryItem
                                    {...summaryItemProps}
                                    {...(isInsuranceItem(summaryItemProps.name) && {
                                        onRemove: () => this.handleInsuranceRemove(summaryItemProps.id),
                                    })}
                                />
                            </li>
                        ))}
                </ul>

                {this.renderActions()}
            </>
        );
    }

    private getCollapsedLimit(): number {
        return isSmallScreen() ? COLLAPSED_ITEMS_LIMIT_SMALL_SCREEN : COLLAPSED_ITEMS_LIMIT;
    }

    private renderActions(): ReactNode {
        const { isExpanded } = this.state;

        if (this.getLineItemCount() <= this.getCollapsedLimit()) {
            return;
        }

        return (
            <div className="cart-actions">
                <button
                    className="button button--tertiary button--tiny optimizedCheckout-buttonSecondary"
                    onClick={this.handleToggle}
                    type="button"
                >
                    {isExpanded ? (
                        <>
                            <TranslatedString id="cart.see_less_action" />
                            <IconChevronUp />
                        </>
                    ) : (
                        <>
                            <TranslatedString id="cart.see_all_action" />
                            <IconChevronDown />
                        </>
                    )}
                </button>
            </div>
        );
    }

    private getLineItemCount(): number {
        const { items } = this.props;

        return (
            (items.customItems || []).length +
            items.physicalItems.length +
            items.digitalItems.length +
            items.giftCertificates.length
        );
    }

    private handleInsuranceRemove = async (lineItemId: string | number): Promise<void> => {
        // Immediately hide the insurance item
        this.setState({ 
            isInsuranceVisible: false,
            isInsuranceTransitioning: true
        });
        
        // Emit event to update checkout toggle
        window.dispatchEvent(new CustomEvent('insurance-removed'));
        
        try {
            // Remove from cart in background
            await removeInsuranceItem(lineItemId);
        } catch (e) {
            console.warn('Failed to remove insurance item:', e);
            // Rollback on error
            this.setState({ 
                isInsuranceVisible: true,
                isInsuranceTransitioning: false
            });
            // Emit rollback event
            window.dispatchEvent(new CustomEvent('insurance-toggle-changed', {
                detail: { 
                    isSelected: true, 
                    cachedItem: this.state.cachedInsuranceItem,
                    operation: 'rollback'
                }
            }));
        } finally {
            this.setState({ isInsuranceTransitioning: false });
        }
    };

    private handleCachedInsuranceRemove = async (): Promise<void> => {
        // For cached insurance items, we need to find the actual line item ID
        const { items } = this.props;
        const insuranceItem = items.digitalItems?.find(item => isInsuranceItem(item.name));
        
        if (insuranceItem) {
            await this.handleInsuranceRemove(insuranceItem.id);
        } else {
            // If no actual item found, just hide the cached item
            this.setState({ 
                isInsuranceVisible: false,
                isInsuranceTransitioning: false
            });
            window.dispatchEvent(new CustomEvent('insurance-removed'));
        }
    };

    private handleToggle: () => void = () => {
        const { isExpanded } = this.state;

        this.setState({ isExpanded: !isExpanded });
    };
}

export default OrderSummaryItems;

function isInsuranceItem(name: string): boolean {
    // Basic identification by name; adjust if there is a more reliable flag
    return /insurance/i.test(name) || /delivery guarantee/i.test(name);
}

async function removeInsuranceItem(lineItemId: string | number): Promise<void> {
    try {
        const cartId = (window as any).__bc_cart_id;
        if (!cartId) {
            console.warn('Cart id not available for delete line item');
            return;
        }
        
        // Dispatch cart-line-item-removing event to prevent payment reload
        window.dispatchEvent(new CustomEvent('cart-line-item-removing', { 
            detail: { lineItemId: lineItemId, removing: true } 
        }));
        
        await fetch(`/api/storefront/carts/${cartId}/items/${lineItemId}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        
        // Reset the removing state
        window.dispatchEvent(new CustomEvent('cart-line-item-removing', { 
            detail: { lineItemId: lineItemId, removing: false } 
        }));
        
        // Best-effort soft refresh - emit event so checkout can reload state without full page reload
        window.dispatchEvent(new CustomEvent('soft-cart-refresh'));
    } catch (e) {
        console.warn('Failed to remove insurance item:', e);
    }
}
