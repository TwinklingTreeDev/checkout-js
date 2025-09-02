/* istanbul ignore file */
import { memoizeOne } from '@bigcommerce/memoize';
import { Form as FormikForm, FormikFormProps } from 'formik';
import { values } from 'lodash';
import React, { createRef, FunctionComponent, memo, useCallback, useRef } from 'react';
import Lenis from 'lenis';

import { FormContextType, FormProvider } from '../contexts';

export interface FormProps extends FormikFormProps {
    testId?: string;
}

const Form: FunctionComponent<FormProps> = ({ className, testId, ...rest }) => {
    const ref = useRef({ containerRef: createRef<HTMLDivElement>() });

    const focusOnError = () => {
        const { current } = ref.current.containerRef;

        if (!current) {
            return;
        }
        // Find the GLOBALLY first .form-field--error element (not just in this container)
        const allErrorFields = document.querySelectorAll<HTMLElement>('.form-field--error');
        if (allErrorFields.length === 0) {
            return;
        }

        // Get the first error field globally (DOM order)
        const firstErrorField = allErrorFields[0];
        
        // Find the first input, textarea, or select within the error field
        const errorInputSelectors = [
            'input',
            'textarea',
            'select',
        ];

        const erroredFormField = firstErrorField.querySelector<HTMLElement>(errorInputSelectors.join(', '));

        if (erroredFormField) {
            // Use Lenis for smooth scrolling instead of native scrollIntoView
            // Focus removed to prevent unwanted scroll behavior
            // erroredFormField.focus({ preventScroll: true });

            // Create a temporary Lenis instance for smooth scrolling
            const lenis = new Lenis({
                duration: 1.5,
                easing: (t: number) => t,
                orientation: 'vertical',
                gestureOrientation: 'vertical',
                smoothWheel: false,
                wheelMultiplier: 1,
                infinite: false,
            });

            // Set up RAF loop for this temporary instance
            const raf = (time: number) => {
                lenis.raf(time);
                requestAnimationFrame(raf);
            };
            requestAnimationFrame(raf);

            // Function to destroy Lenis and clean up event listeners
            const destroyLenis = () => {
                lenis.destroy();
                document.removeEventListener('wheel', destroyLenis);
                document.removeEventListener('touchstart', destroyLenis);
                document.removeEventListener('keydown', destroyLenis);
                document.removeEventListener('mousedown', destroyLenis);
            };

            // Add event listeners to detect user interaction and destroy Lenis
            document.addEventListener('wheel', destroyLenis);
            document.addEventListener('touchstart', destroyLenis);
            document.addEventListener('keydown', destroyLenis);
            document.addEventListener('mousedown', destroyLenis);

            // Calculate target position
            const elementRect = erroredFormField.getBoundingClientRect();
            const currentScroll = window.pageYOffset;
            const elementAbsoluteTop = elementRect.top + currentScroll;
            const targetPosition = elementAbsoluteTop - 150; // 150px offset from top
            // Perform smooth scroll with Lenis
            const scrollDistance = Math.abs(targetPosition - currentScroll);
            if (scrollDistance > 20 && targetPosition >= 0) {
                // Calculate dynamic duration based on scroll distance
                // Base duration: 1 second for 500px distance
                // Minimum: 0.5 seconds, Maximum: 2.5 seconds
                const baseDuration = 1; // seconds for 500px
                const baseDistance = 500; // pixels
                let dynamicDuration = (scrollDistance / baseDistance) * baseDuration;
                
                // Clamp duration between 0.5 and 2.5 seconds
                dynamicDuration = Math.max(0.5, Math.min(2.5, dynamicDuration));
                lenis.scrollTo(targetPosition, {
                    duration: dynamicDuration,
                    easing: (t: number) => t,
                    offset: 0,
                    lock: true,
                    onComplete: () => {
                       destroyLenis();
                    },
                });
            } else {
                destroyLenis();
            }
        }
    };

    // Listen for triggerValidation events to enable smooth scrolling
    React.useEffect(() => {
        const handleTriggerValidation = () => {
            // Enable smooth scrolling for this validation trigger
            setTimeout(() => {
                focusOnError();
            }, 300);
        };

        document.addEventListener('triggerValidation', handleTriggerValidation);
        
        return () => {
            document.removeEventListener('triggerValidation', handleTriggerValidation);
        };
    }, [focusOnError]);

    // TODO: Remove inline lint ignore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const handleSubmitCapture = useCallback(
        memoizeOne((setSubmitted: FormContextType['setSubmitted']) => {
            return () => {
                // Only call setSubmitted(false) for non-payment forms
                // Payment form needs to maintain its submitted state for validation
                if (testId !== 'payment-form') {
                    setSubmitted(false);
                }else{
                    setSubmitted(true);
                }

                // Disabled automatic smooth scrolling on form submission
                // Smooth scrolling now only triggers on triggerValidation events
                // setTimeout(() => focusOnError(), 300);
            };
        }),
        [testId],
    );

    // TODO: Remove inline lint ignore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const renderContent = useCallback(
        memoizeOne(({ setSubmitted }: FormContextType) => {
            return (
                <div ref={ref.current.containerRef}>
                    <FormikForm
                        {...rest}
                        className={className}
                        data-test={testId}
                        noValidate
                        onSubmitCapture={handleSubmitCapture(setSubmitted)}
                    />
                </div>
            );
        }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        [className, handleSubmitCapture, testId, ...values(rest)],
    );

    return <FormProvider>{renderContent}</FormProvider>;
};

export default memo(Form);
