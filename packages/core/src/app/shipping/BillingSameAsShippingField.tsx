import React, { FunctionComponent, memo, useMemo } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { CheckboxFormField } from '../ui/form';

export interface BillingSameAsShippingFieldProps {
    onChange?(isChecked: boolean): void;
    isBillingSameAsShipping?: boolean;
    onCheckBillingSameAsShipping?(isBillingSameAsShipping: boolean): void;
}

const BillingSameAsShippingField: FunctionComponent<BillingSameAsShippingFieldProps> = ({
    onChange,
    onCheckBillingSameAsShipping,
    isBillingSameAsShipping,
}) => {
    const labelContent = useMemo(
        () => <TranslatedString id="billing.use_shipping_address_label" />,
        [],
    );

    return (
        <CheckboxFormField
            id="sameAsBilling"
            labelContent={labelContent}
            name="billingSameAsShipping"
            onChange={onChange}
            onCheckBillingSameAsShipping={onCheckBillingSameAsShipping}
            isBillingSameAsShipping={isBillingSameAsShipping}
            testId="billingSameAsShipping"
        />
    );
};

export default memo(BillingSameAsShippingField);
