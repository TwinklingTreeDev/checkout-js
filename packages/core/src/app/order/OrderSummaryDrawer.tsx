import {
    LineItemMap,
    ShopperCurrency as ShopperCurrencyType,
    StoreCurrency,
} from '@bigcommerce/checkout-sdk';
import classNames from 'classnames';
import React, { FunctionComponent, memo, ReactNode, useCallback, useState } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { ShopperCurrency } from '../currency';
// import { IconGiftCertificate } from '../ui/icon';
// import { ModalTrigger } from '../ui/modal';

import getItemsCount from './getItemsCount';
import getLineItemsCount from './getLineItemsCount';
import OrderSummaryModal from './OrderSummaryModal';
import { OrderSummarySubtotalsProps } from './OrderSummarySubtotals';

export interface OrderSummaryDrawerProps {
    lineItems: LineItemMap;
    total: number;
    headerLink: ReactNode;
    isUpdatedCartSummayModal?: boolean,
    storeCurrency: StoreCurrency;
    shopperCurrency: ShopperCurrencyType;
    additionalLineItems?: ReactNode;
}

const OrderSummaryDrawer: FunctionComponent<
    OrderSummaryDrawerProps & OrderSummarySubtotalsProps
> = ({
    additionalLineItems,
    coupons,
    discountAmount,
    giftCertificates,
    handlingAmount,
    headerLink,
    isTaxIncluded,
    isUpdatedCartSummayModal,
    lineItems,
    onRemovedCoupon,
    onRemovedGiftCertificate,
    shippingAmount,
    shopperCurrency,
    storeCreditAmount,
    giftWrappingAmount,
    storeCurrency,
    subtotalAmount,
    taxes,
    total,
    fees,
}) => {
    // const renderModal = useCallback(
    useCallback(
        (props) => (
            <OrderSummaryModal
                {...props}
                additionalLineItems={additionalLineItems}
                coupons={coupons}
                discountAmount={discountAmount}
                fees={fees}
                giftCertificates={giftCertificates}
                giftWrappingAmount={giftWrappingAmount}
                handlingAmount={handlingAmount}
                headerLink={headerLink}
                isTaxIncluded={isTaxIncluded}
                isUpdatedCartSummayModal={isUpdatedCartSummayModal}
                lineItems={lineItems}
                onRemovedCoupon={onRemovedCoupon}
                onRemovedGiftCertificate={onRemovedGiftCertificate}
                shippingAmount={shippingAmount}
                shopperCurrency={shopperCurrency}
                storeCreditAmount={storeCreditAmount}
                storeCurrency={storeCurrency}
                subtotalAmount={subtotalAmount}
                taxes={taxes}
                total={total}
            />
        ),
        [
            additionalLineItems,
            coupons,
            discountAmount,
            giftCertificates,
            handlingAmount,
            headerLink,
            isTaxIncluded,
            lineItems,
            onRemovedCoupon,
            onRemovedGiftCertificate,
            giftWrappingAmount,
            shippingAmount,
            shopperCurrency,
            storeCreditAmount,
            storeCurrency,
            subtotalAmount,
            taxes,
            total,
            fees,
        ],
    );

    const [isMobileOrderSummaryOpen, setIsMobileOrderSummaryOpen] = useState(false);
    function handleClick() {
        setIsMobileOrderSummaryOpen(!isMobileOrderSummaryOpen);
    }

    return (
        // <ModalTrigger modal={renderModal}>
        //     {() => (
                <div
                    className={`cartDrawer optimizedCheckout-orderSummary${isMobileOrderSummaryOpen ? ' is-open' : ''}`}
                    // onClick={onClick}
                    // onKeyPress={onKeyPress}
                    onClick={handleClick}
                    tabIndex={0}
                >
                    <figure
                        className={classNames('cartDrawer-figure', {
                            'cartDrawer-figure--stack': getLineItemsCount(lineItems) > 1,
                        })}
                    >
                        {/* <div className="cartDrawer-imageWrapper">{getImage(lineItems)}</div> */}
                        <div className="cartDrawer-imageWrapper">
                            <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem"
                                height="1.5rem" viewBox="0 0 21 21" data-testid="IconWrapper">
                                <title>Shopping Cart icon</title>
                                <path
                                    d="M20.1247 3.23755H5.26021L4.94207 1.53861C4.86172 1.10961 4.5018 0.800049 4.08333 0.800049H0.4375C0.195891 0.800049 0 1.00468 0 1.25708V2.17114C0 2.42354 0.195891 2.62817 0.4375 2.62817H3.36292L5.9002 16.1754C5.49777 16.6134 5.25 17.2075 5.25 17.8625C5.25 19.2087 6.29468 20.3 7.58333 20.3C8.87199 20.3 9.91666 19.2087 9.91666 17.8625C9.91712 17.4346 9.80916 17.0141 9.60374 16.6438H14.8963C14.6909 17.0141 14.5829 17.4346 14.5834 17.8625C14.5834 19.2087 15.628 20.3 16.9167 20.3C18.2054 20.3 19.25 19.2087 19.25 17.8625C19.25 17.1718 18.9746 16.5487 18.5327 16.1052L18.5704 15.924C18.689 15.3542 18.2736 14.8157 17.7154 14.8157H7.42875L7.0864 12.9875H18.4762C18.8878 12.9875 19.2438 12.6879 19.3312 12.2676L20.9797 4.34577C21.0982 3.77605 20.6828 3.23755 20.1247 3.23755ZM7.58333 18.7766C7.10084 18.7766 6.70833 18.3666 6.70833 17.8625C6.70833 17.3585 7.10084 16.9485 7.58333 16.9485C8.06582 16.9485 8.45833 17.3585 8.45833 17.8625C8.45833 18.3666 8.06582 18.7766 7.58333 18.7766ZM16.9167 18.7766C16.4342 18.7766 16.0417 18.3666 16.0417 17.8625C16.0417 17.3585 16.4342 16.9485 16.9167 16.9485C17.3992 16.9485 17.7917 17.3585 17.7917 17.8625C17.7917 18.3666 17.3992 18.7766 16.9167 18.7766ZM17.7712 11.1594H6.74406L5.60255 5.06567H19.0392L17.7712 11.1594Z"
                                    fill="#0a609b" />
                            </svg>
                        </div>
                    </figure>
                    <div className="cartDrawer-body">
                        <h3 className="cartDrawer-items optimizedCheckout-headingPrimary">
                            <TranslatedString
                                data={{ count: getItemsCount(lineItems) }}
                                id="cart.item_count_text"
                            />
                        </h3>
                        <a>
                            {/* <TranslatedString id="cart.show_details_action" /> */}
                            Order Summary
                            <svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 36 20" data-testid="IconWrapper">
                                <title>chevron down icon</title>
                                <path
                                    d="M35.7134 1.84205L34.1039 0.278381C33.7218 -0.0927937 33.104 -0.0927937 32.7219 0.278381L18 14.5489L3.27809 0.278381C2.89601 -0.0927937 2.2782 -0.0927937 1.89613 0.278381L0.286553 1.84205C-0.0955177 2.21323 -0.0955177 2.81343 0.286553 3.1846L17.309 19.7216C17.6911 20.0928 18.3089 20.0928 18.691 19.7216L35.7134 3.1846C36.0955 2.81343 36.0955 2.21323 35.7134 1.84205Z"
                                    fill="#0a609b" />
                            </svg>
                        </a>
                    </div>
                    <div className="cartDrawer-actions">
                        <h3 className="cartDrawer-total optimizedCheckout-headingPrimary">
                            <ShopperCurrency amount={total} />
                        </h3>
                    </div>
                </div>
        //     )}
        // </ModalTrigger>
    );
};

// function getImage(lineItems: LineItemMap): ReactNode {
//     const productWithImage = lineItems.physicalItems[0] || lineItems.digitalItems[0];

//     if (productWithImage && productWithImage.imageUrl) {
//         return (
//             <img
//                 alt={productWithImage.name}
//                 data-test="cart-item-image"
//                 src={productWithImage.imageUrl}
//             />
//         );
//     }

//     if (lineItems.giftCertificates.length) {
//         return <IconGiftCertificate />;
//     }
// }

export default memo(OrderSummaryDrawer);
