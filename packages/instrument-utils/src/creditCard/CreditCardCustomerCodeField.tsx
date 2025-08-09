import { FieldProps } from 'formik';
import React, { FunctionComponent, memo, useCallback, useMemo } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';
import { FormField, TextInput } from '@bigcommerce/checkout/ui';

export interface CreditCardCustomerCodeFieldProps {
    name: string;
}

const CreditCardCustomerCodeField: FunctionComponent<CreditCardCustomerCodeFieldProps> = ({
    name,
}) => {
    const renderInput = useCallback(
        ({ field }: FieldProps) => <TextInput {...field} id={field.name} />,
        [],
    );

    const labelContent = useMemo(
        () => <TranslatedString id="payment.credit_card_customer_code_label" />,
        [],
    );

    const optionalIndicator = useMemo(
        () => (
            <>
                <span className="optional-indicator" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM8.18973 9.95592H7.69642C7.49208 9.95592 7.32644 9.79023 7.32644 9.58594V9.57419C7.32644 8.36185 8.07246 7.89196 8.73048 7.47752C9.24968 7.15048 9.71406 6.85798 9.71406 6.26257C9.71406 5.64543 9.16648 5.02278 7.94307 5.02278C7.04451 5.02278 6.57832 5.32025 6.11747 5.90741C5.99697 6.06093 5.77667 6.09225 5.61651 5.98067L5.21158 5.69853C5.03815 5.57773 5.00004 5.33562 5.13002 5.16893C5.78446 4.32947 6.56093 3.78947 7.94307 3.78947C9.55621 3.78947 10.9474 4.70678 10.9474 6.26257C10.9474 7.41482 10.2136 7.89453 9.55958 8.32206C9.03385 8.66573 8.55971 8.97571 8.55971 9.57419V9.58594C8.55971 9.79023 8.39406 9.95592 8.18973 9.95592ZM7.95326 10.6959C7.47646 10.6959 7.08994 11.0824 7.08994 11.5592C7.08994 12.036 7.47646 12.4225 7.95326 12.4225C8.43006 12.4225 8.81655 12.036 8.81655 11.5592C8.81655 11.0824 8.43006 10.6959 7.95326 10.6959Z" fill="#9E9E9E"/>
                    </svg>
                </span>
                <span className="is-srOnly">
                    <TranslatedString id="common.optional_text" />
                </span>
            </>
        ),
        [],
    );

    return (
        <FormField
            input={renderInput}
            labelContent={labelContent}
            footer={optionalIndicator}
            name={name}
        />
    );
};

export default memo(CreditCardCustomerCodeField);
