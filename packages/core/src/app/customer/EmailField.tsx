import { FieldProps } from 'formik';
import React, { FunctionComponent, memo, useCallback, useMemo } from 'react';

import { TranslatedString } from '@bigcommerce/checkout/locale';

import { FormField, TextInput } from '../ui/form';

export interface EmailFieldProps {
    isFloatingLabelEnabled?: boolean;
    onChange?(value: string): void;
    onBlur?(value: string): void;
}

const EmailField: FunctionComponent<EmailFieldProps> = ({ onChange, onBlur, isFloatingLabelEnabled }) => {
    const renderInput = useCallback(
        (props: FieldProps) => (
            <TextInput
                {...props.field}
                autoComplete={props.field.name}
                id={props.field.name}
                isFloatingLabelEnabled={isFloatingLabelEnabled}
                type="email"
                onBlur={(e) => {
                    // Call Formik's onBlur
                    props.field.onBlur(e);
                    // Call our custom onBlur handler
                    if (onBlur) {
                        onBlur(e.target.value);
                    }
                }}
            />
        ),
        [isFloatingLabelEnabled, onBlur],
    );

    const labelContent = useMemo(() => <TranslatedString id="customer.email_label" />, []);

    return (
        <FormField
            input={renderInput}
            isFloatingLabelEnabled={isFloatingLabelEnabled}
            labelContent={labelContent}
            name="email"
            onChange={onChange}
        />
    );
};

export default memo(EmailField);
