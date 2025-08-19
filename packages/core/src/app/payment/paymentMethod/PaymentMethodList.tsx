import { PaymentMethod } from '@bigcommerce/checkout-sdk';
import { find, get, noop } from 'lodash';
import React, { FunctionComponent, memo, useCallback, useMemo } from 'react';

import { connectFormik, ConnectFormikProps } from '../../common/form';
import { isMobile } from '../../common/utility';
import { Checklist, ChecklistItem } from '../../ui/form';

import getUniquePaymentMethodId, { parseUniquePaymentMethodId } from './getUniquePaymentMethodId';
import PaymentMethodTitle from './PaymentMethodTitle';
import PaymentMethodV2 from './PaymentMethodV2';

export interface PaymentMethodListProps {
    isEmbedded?: boolean;
    isUsingMultiShipping?: boolean;
    methods: PaymentMethod[];
    onSelect?(method: PaymentMethod): void;
    onUnhandledError?(error: Error): void;
    // Billing address callback
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
}

function getPaymentMethodFromListValue(methods: PaymentMethod[], value: string): PaymentMethod {
    const { gatewayId: gateway, methodId: id } = parseUniquePaymentMethodId(value);
    let method = gateway ? find(methods, { gateway, id }) : find(methods, { id });

    if (!method) {
        throw new Error(`Unable to find payment method with id: ${id}`);
    }

    // Fix: Ensure method has proper gateway value
    if (method && !method.gateway && gateway) {
        method = { ...method, gateway };
        console.log('[PaymentMethodList] Fixed method gateway:', { 
            methodId: method.id, 
            originalGateway: method.gateway, 
            fixedGateway: gateway 
        });
    }
    
    // Additional fix for PayPal methods
    if (method && method.id === 'paypalcommerce' && (!method.gateway || method.gateway === 'null')) {
        method = { ...method, gateway: 'paypalcommerce' };
        console.log('[PaymentMethodList] Fixed PayPal method gateway:', { 
            methodId: method.id, 
            originalGateway: method.gateway, 
            fixedGateway: 'paypalcommerce' 
        });
    }

    return method;
}

const PaymentMethodList: FunctionComponent<
    PaymentMethodListProps & ConnectFormikProps<{ paymentProviderRadio?: string }>
> = ({
    formik: { values },
    isEmbedded,
    isUsingMultiShipping,
    methods,
    onSelect = noop,
    onUnhandledError,
    onBillingSameAsShippingChange,
}) => {
    // Debug: Log available methods and their gateway values
    React.useEffect(() => {
        console.log('[PaymentMethodList] Available methods:', methods.map(m => ({
            id: m.id,
            gateway: m.gateway,
            uniqueId: getUniquePaymentMethodId(m.id, m.gateway)
        })));
    }, [methods]);
    const handleSelect = useCallback(
        (value: string) => {
            onSelect(getPaymentMethodFromListValue(methods, value));
        },
        [methods, onSelect],
    );

    return (
        <Checklist
            defaultSelectedItemId={values.paymentProviderRadio}
            name="paymentProviderRadio"
            onSelect={handleSelect}
        >
            {methods.map((method) => {
                const value = getUniquePaymentMethodId(method.id, method.gateway);
                const showOnlyOnMobileDevices = get(
                    method,
                    'initializationData.showOnlyOnMobileDevices',
                    false,
                );

                // Prevent Google Pay methods from rendering
                if (method.id.startsWith('googlepay')) {
                    return;
                }

                if (showOnlyOnMobileDevices && !isMobile()) {
                    return;
                }

                return (
                    <PaymentMethodListItem
                        isEmbedded={isEmbedded}
                        isUsingMultiShipping={isUsingMultiShipping}
                        key={value}
                        method={method}
                        onUnhandledError={onUnhandledError}
                        onBillingSameAsShippingChange={onBillingSameAsShippingChange}
                        value={value}
                    />
                );
            })}
        </Checklist>
    );
};

interface PaymentMethodListItemProps {
    isEmbedded?: boolean;
    isUsingMultiShipping?: boolean;
    method: PaymentMethod;
    value: string;
    onUnhandledError?(error: Error): void;
    // Billing address callback
    onBillingSameAsShippingChange?(isBillingSameAsShipping: boolean): void;
}

const PaymentMethodListItem: FunctionComponent<PaymentMethodListItemProps> = ({
    isEmbedded,
    isUsingMultiShipping,
    method,
    onUnhandledError,
    onBillingSameAsShippingChange,
    value,
}) => {
    const renderPaymentMethod = useMemo(() => {
        return (
            <PaymentMethodV2
                isEmbedded={isEmbedded}
                isUsingMultiShipping={isUsingMultiShipping}
                method={method}
                onUnhandledError={onUnhandledError || noop}
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
            />
        );
    }, [isEmbedded, isUsingMultiShipping, method, onUnhandledError, onBillingSameAsShippingChange]);

    const renderPaymentMethodTitle = useCallback(
        (isSelected: boolean) => <PaymentMethodTitle isSelected={isSelected} method={method} onUnhandledError={onUnhandledError} />,
        [method],
    );

    return (
        <ChecklistItem
            content={renderPaymentMethod}
            htmlId={`radio-${value}`}
            label={renderPaymentMethodTitle}
            value={value}
        />
    );
};

export default connectFormik(memo(PaymentMethodList));
