import React, { FunctionComponent, useCallback } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { FormField, TextInputIframeContainer } from '../../ui/form';
import { useIframePlaceholder } from './useIframePlaceholder';

export interface HostedCreditCardExpiryFieldProps {
    appearFocused: boolean;
    id: string;
    name: string;
    placeholder?: string;
}

const HostedCreditCardExpiryField: FunctionComponent<HostedCreditCardExpiryFieldProps> = ({
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
            additionalClassName="form-field--ccExpiry"
            input={renderInput}
            labelContent={<TranslatedString id="payment.credit_card_expiration_label" />}
            name={name}
        />
    );
};

export default HostedCreditCardExpiryField;
