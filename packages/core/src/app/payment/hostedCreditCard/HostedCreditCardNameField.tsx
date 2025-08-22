import React, { FunctionComponent, useCallback } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { FormField, TextInputIframeContainer } from '../../ui/form';
import { useIframePlaceholder } from './useIframePlaceholder';

export interface HostedCreditCardNameFieldProps {
    appearFocused: boolean;
    id: string;
    name: string;
    placeholder?: string;
}

const HostedCreditCardNameField: FunctionComponent<HostedCreditCardNameFieldProps> = ({
    appearFocused,
    id,
    name,
    placeholder,
}) => {
    useIframePlaceholder(id);

    const renderInput = useCallback(
        () => <TextInputIframeContainer appearFocused={appearFocused} id={id} placeholder={placeholder} />,
        [id, appearFocused, placeholder],
    );

    return (
        <FormField
            additionalClassName="form-field--ccName"
            input={renderInput}
            labelContent={<TranslatedString id="payment.credit_card_name_label" />}
            name={name}
        />
    );
};

export default HostedCreditCardNameField;
