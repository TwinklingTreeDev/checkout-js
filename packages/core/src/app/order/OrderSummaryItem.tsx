import classNames from 'classnames';
import { isNumber } from 'lodash';
import React, { FunctionComponent, memo, ReactNode, useEffect, useRef, useState } from 'react';

import { ShopperCurrency } from '../currency';

export interface OrderSummaryItemProps {
    id: string | number;
    amount: number;
    quantity: number;
    name: string;
    amountAfterDiscount?: number;
    image?: ReactNode;
    description?: ReactNode;
    productOptions?: OrderSummaryItemOption[];
    // Optional remove handler (used for special insurance item)
    onRemove?: () => Promise<void> | void;
}

export interface OrderSummaryItemOption {
    testId: string;
    content: ReactNode;
}

const OrderSummaryItem: FunctionComponent<OrderSummaryItemProps> = ({
    amount,
    amountAfterDiscount,
    image,
    name,
    productOptions,
    quantity,
    description,
    onRemove,
    id,
}) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const removingResetTimeoutRef = useRef<number | undefined>(undefined);
    const lineItemIdRef = useRef<string | number | null>(null);

    const handleRemoveClick = async (): Promise<void> => {
        if (!onRemove || isRemoving) {
            return;
        }
        try {
            setIsRemoving(true);
            lineItemIdRef.current = id;
            await Promise.resolve(onRemove());
        } finally {
            // Delay resetting the label to account for cart refresh lag
            if (removingResetTimeoutRef.current) {
                window.clearTimeout(removingResetTimeoutRef.current);
            }
            removingResetTimeoutRef.current = window.setTimeout(() => {
                setIsRemoving(false);
                removingResetTimeoutRef.current = undefined;
            }, 3000);
        }
    };

    useEffect(() => {
        // Listen for external removing status changes (e.g., checkbox initiated removal)
        const handler = (e: Event) => {
            const evt = e as CustomEvent<{ lineItemId: string | number; removing: boolean }>;
            if (!evt?.detail) return;
            const { lineItemId, removing } = evt.detail;
            if (lineItemId === id) {
                if (removing) {
                    // Set immediately, cancel any pending reset
                    if (removingResetTimeoutRef.current) {
                        window.clearTimeout(removingResetTimeoutRef.current);
                        removingResetTimeoutRef.current = undefined;
                    }
                    setIsRemoving(true);
                } else {
                    // Delay resetting the label to allow UI/cart refresh to catch up
                    if (removingResetTimeoutRef.current) {
                        window.clearTimeout(removingResetTimeoutRef.current);
                    }
                    removingResetTimeoutRef.current = window.setTimeout(() => {
                        setIsRemoving(false);
                        removingResetTimeoutRef.current = undefined;
                    }, 3000);
                }
            }
        };
        window.addEventListener('cart-line-item-removing', handler as EventListener);
        return () => {
            if (removingResetTimeoutRef.current) {
                window.clearTimeout(removingResetTimeoutRef.current);
            }
            window.removeEventListener('cart-line-item-removing', handler as EventListener);
        };
    }, []);

    return (
    <div className="product" data-test="cart-item">
        <figure className="product-column product-figure">{image}
            <div className="product-qty">{quantity}</div>
        </figure>

        <div className="product-column product-body">
            <h4
                className="product-title optimizedCheckout-contentPrimary"
                data-test="cart-item-product-title"
            >
                {`${name}`}
            </h4>
            {productOptions && productOptions.length > 0 && (
                <ul
                    className="product-options optimizedCheckout-contentSecondary"
                    data-test="cart-item-product-options"
                >
                    {productOptions.map((option, index) => (
                        <li className="product-option" data-test={option.testId} key={index}>
                            {option.content}
                        </li>
                    ))}
                </ul>
            )}
            {description && (
                <div
                    className="product-description optimizedCheckout-contentSecondary"
                    data-test="cart-item-product-description"
                >
                    {description}
                </div>
            )}
            

            {onRemove && (
                <button
                    type="button"
                    className="product-actions-remove"
                    onClick={handleRemoveClick}
                    disabled={isRemoving}
                >
                    {isRemoving ? 'Removing...' : 'Remove'}
                </button>
            )}
        </div>

        <div className="product-column product-actions">
            <div
                className={classNames('product-price', 'optimizedCheckout-contentPrimary', {
                    'product-price--beforeDiscount':
                        isNumber(amountAfterDiscount) && amountAfterDiscount !== amount,
                })}
                data-test="cart-item-product-price"
            >
                <ShopperCurrency amount={amount} />
            </div>

            {isNumber(amountAfterDiscount) && amountAfterDiscount !== amount && (
                <div className="product-price" data-test="cart-item-product-price--afterDiscount">
                    <ShopperCurrency amount={amountAfterDiscount} />
                </div>
            )}
        </div>
    </div>
    );
};

export default memo(OrderSummaryItem);
