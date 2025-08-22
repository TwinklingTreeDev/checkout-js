import React, { FunctionComponent, useCallback } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';
import { FormField, IconLock, TextInputIframeContainer } from '@bigcommerce/checkout/ui';

export interface HostedCreditCardNumberFieldProps {
    appearFocused: boolean;
    id: string;
    name: string;
    placeholder?: string;
}

const HostedCreditCardNumberField: FunctionComponent<HostedCreditCardNumberFieldProps> = ({
    appearFocused,
    id,
    name,
    placeholder,
}) => {
    const renderInput = useCallback(
        () => (
            <>
                <TextInputIframeContainer
                    additionalClassName="has-icon"
                    appearFocused={appearFocused}
                    id={id}
                    placeholder={placeholder}
                />

                <IconLock />
            </>
        ),
        [id, appearFocused, placeholder],
    );

    return (
        <FormField
            additionalClassName="form-field--ccNumber"
            input={renderInput}
            labelContent={<TranslatedString id="payment.credit_card_number_label" />}
            name={name}
        />
    );
};

export default HostedCreditCardNumberField;
