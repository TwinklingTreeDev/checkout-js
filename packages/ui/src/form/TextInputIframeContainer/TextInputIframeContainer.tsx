import classNames from 'classnames';
import React, { FunctionComponent, HTMLAttributes } from 'react';

export interface TextInputIframeContainerProps extends HTMLAttributes<HTMLDivElement> {
    additionalClassName?: string;
    appearFocused?: boolean;
    testId?: string;
    placeholder?: string;
}

const TextInputIframeContainer: FunctionComponent<TextInputIframeContainerProps> = ({
    additionalClassName,
    appearFocused,
    testId,
    placeholder,
    ...props
}) => (
    <div
        {...props}
        className={classNames(
            'form-input',
            'optimizedCheckout-form-input',
            { 'form-input--focus': appearFocused },
            { 'optimizedCheckout-form-input--focus': appearFocused },
            additionalClassName,
        )}
        data-test={testId}
        data-placeholder={placeholder}
    />
);

export default TextInputIframeContainer;
