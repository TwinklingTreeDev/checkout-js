import { CheckoutSelectors, RequestError } from '@bigcommerce/checkout-sdk';
import { memoizeOne } from '@bigcommerce/memoize';
import { FieldProps, FormikProps, withFormik } from 'formik';
import { noop } from 'lodash';
import React, { FunctionComponent, KeyboardEvent, memo, useCallback } from 'react';
import { object, string } from 'yup';

import { preventDefault } from '@bigcommerce/checkout/dom-utils';
import { TranslatedString, withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { useCheckout } from '@bigcommerce/checkout/payment-integration-api';
import { FormContextType, FormProvider } from '@bigcommerce/checkout/ui';

import { Alert, AlertType } from '../ui/alert';
import { Button, ButtonVariant } from '../ui/button';
import { FormField, Label, TextInput } from '../ui/form';
import { Toggle } from '../ui/toggle';

import AppliedRedeemables, { AppliedRedeemablesProps } from './AppliedRedeemables';

export interface RedeemableFormValues {
    redeemableCode: string;
}

export type ReedemableChildrenProps = Pick<
    RedeemableProps,
    | 'onRemovedCoupon'
    | 'onRemovedGiftCertificate'
    | 'isRemovingGiftCertificate'
    | 'isRemovingCoupon'
    | 'coupons'
    | 'giftCertificates'
>;

export type RedeemableProps = {
    appliedRedeemableError?: RequestError;
    isApplyingRedeemable?: boolean;
    isRemovingRedeemable?: boolean;
    removedRedeemableError?: RequestError;
    showAppliedRedeemables?: boolean;
    shouldCollapseCouponCode?: boolean;
    applyCoupon(code: string): Promise<CheckoutSelectors>;
    applyGiftCertificate(code: string): Promise<CheckoutSelectors>;
    clearError(error: Error): void;
} & AppliedRedeemablesProps;

const Redeemable: FunctionComponent<
    RedeemableProps & WithLanguageProps & FormikProps<RedeemableFormValues>
> = ({ shouldCollapseCouponCode, showAppliedRedeemables, ...formProps }) => (
    <Toggle openByDefault={!shouldCollapseCouponCode}>
        {({ toggle, isOpen }) => (
            <>
                {shouldCollapseCouponCode = false}
                {shouldCollapseCouponCode && (
                    <a
                        aria-controls="redeemable-collapsable"
                        aria-expanded={isOpen}
                        className="redeemable-label"
                        data-test="redeemable-label"
                        href="#"
                        onClick={preventDefault(toggle)}
                    >
                        <TranslatedString id="redeemable.toggle_action" />
                    </a>
                )}
                {!shouldCollapseCouponCode && (
                    <div className="redeemable-label">
                        <TranslatedString id="redeemable.toggle_action" />
                    </div>
                )}
                {(isOpen || !shouldCollapseCouponCode) && (
                    <div data-test="redeemable-collapsable" id="redeemable-collapsable">
                        <RedeemableForm {...formProps} />
                        {showAppliedRedeemables && <AppliedRedeemables {...formProps} />}
                    </div>
                )}
            </>
        )}
    </Toggle>
);

const RedeemableForm: FunctionComponent<
    Partial<RedeemableProps> & FormikProps<RedeemableFormValues> & WithLanguageProps
> = ({ appliedRedeemableError, isApplyingRedeemable, clearError = noop, submitForm, language }) => {
    const {
        checkoutState: {
            statuses: { isSubmittingOrder }
        }
    } = useCheckout();

    const handleSubmitForm = (setSubmitted: FormContextType['setSubmitted']) => {
        if (isSubmittingOrder()) {
            return;
        }

        setSubmitted(true);
        submitForm();
    }

    const handleKeyDown = useCallback(
        memoizeOne((setSubmitted: FormContextType['setSubmitted']) => (event: KeyboardEvent) => {
            if (appliedRedeemableError) {
                clearError(appliedRedeemableError);
            }

            // note: to prevent submitting main form, we manually intercept
            // the enter key event and submit the "subform".
            if (event.keyCode === 13) {
                handleSubmitForm(setSubmitted);
                event.preventDefault();
            }
        }),
        [appliedRedeemableError, clearError, submitForm],
    );

    const handleSubmit = useCallback(
        memoizeOne((setSubmitted: FormContextType['setSubmitted']) => () => {
            handleSubmitForm(setSubmitted);
        }),
        [],
    );

    const renderLabel = useCallback(
        (name: string) => (
            <Label hidden htmlFor={name}>
                <TranslatedString id="redeemable.code_label" />
            </Label>
        ),
        [],
    );

    const renderErrorMessage = useCallback((errorCode: string) => {
        switch (errorCode) {
            case 'min_purchase':
                return <TranslatedString id="redeemable.coupon_min_order_total" />;

            case 'not_applicable':
                return <TranslatedString id="redeemable.coupon_location_error" />;

            default:
                return <TranslatedString id="redeemable.code_invalid_error" />;
        }
    }, []);

    const renderInput = useCallback(
        (setSubmitted: FormContextType['setSubmitted']) =>
            ({ field }: FieldProps) =>
                (
                    <>
                        {appliedRedeemableError &&
                            appliedRedeemableError.errors &&
                            appliedRedeemableError.errors[0] && (
                                <Alert type={AlertType.Error}>
                                    {renderErrorMessage(appliedRedeemableError.errors[0].code)}
                                </Alert>
                            )}

                        <div className="form-prefixPostfix">
                            <TextInput
                                {...field}
                                aria-label="Discount Code"
                                className="form-input optimizedCheckout-form-input"
                                onKeyDown={handleKeyDown(setSubmitted)}
                                testId="redeemableEntry-input"
                                placeholder=" "                            
                            />
                            <Label
                                htmlFor="redeemableCode"
                                isFloatingLabelEnabled={true}
                            >
                                Discount Code
                            </Label>

                            <Button
                                className="form-prefixPostfix-button--postfix"
                                disabled={isSubmittingOrder()}
                                id="applyRedeemableButton"
                                isLoading={isApplyingRedeemable}
                                onClick={handleSubmit(setSubmitted)}
                                testId="redeemableEntry-submit"
                                variant={ButtonVariant.Secondary}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path d="M3.75 12H20.25" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M13.5 5.25L20.25 12L13.5 18.75" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </Button>
                        </div>

                        <div className="jsx-e2877bf7fac87b3a twinkling-tree-reviews">
                            <div className="jsx-e2877bf7fac87b3a">
                                <div className="jsx-e2877bf7fac87b3a twinkling-tree-reviews-summary"><span
                                        className="jsx-e2877bf7fac87b3a reviewTrustpilotBox"><img alt="trustpilot-review" src="https://checkout.twinklingtree.com/trustpilot.svg"
                                            className="jsx-e2877bf7fac87b3a trustpilotImg"/></span>
                                    <p className="jsx-e2877bf7fac87b3a inStoreReviews">And more than 3,000 in store reviews</p>
                                </div>
                                <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-box">
                                    <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-header">
                                        <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-buyer">
                                            <h2 className="jsx-e2877bf7fac87b3a buyerName">Christina Z.,</h2>
                                            <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-place">Dallas, TX</div>
                                            <span className="jsx-e2877bf7fac87b3a twinkling-tree-review-verified">Verified Buyer</span>
                                        </div>
                                    </div>
                                    <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-rating"><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/></div>
                                    <p className="jsx-e2877bf7fac87b3a twinkling-tree-review">After my Fairy Light Spirit tree arrived I absolutely
                                        fell in LOVE with it! I couldn’t help myself and ordered 3 more!</p>
                                </div>
                                <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-box">
                                    <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-header">
                                        <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-buyer">
                                            <h2 className="jsx-e2877bf7fac87b3a buyerName">Brittany M,</h2>
                                            <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-place">Miami, FL</div>
                                            <span className="jsx-e2877bf7fac87b3a twinkling-tree-review-verified">Verified Buyer</span>
                                        </div>
                                    </div>
                                    <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-rating"><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/></div>
                                    <p className="jsx-e2877bf7fac87b3a twinkling-tree-review">TwinklingTree is my go to store for home decor! All
                                        their pieces are so stunning and unique! I don’t miss shopping in stores at all. This is as easy as it
                                        comes. Check out online and receive a beautiful statement piece at your doorstep!</p>
                                </div>
                                <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-box">
                                    <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-header">
                                        <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-buyer">
                                            <h2 className="jsx-e2877bf7fac87b3a buyerName">Katy B.,</h2>
                                            <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-place">London, UK</div>
                                            <span className="jsx-e2877bf7fac87b3a twinkling-tree-review-verified">Verified Buyer</span>
                                        </div>
                                    </div>
                                    <div className="jsx-e2877bf7fac87b3a twinkling-tree-review-rating"><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/><img alt="star-icon"
                                            src="https://checkout.twinklingtree.com/star.png" className="jsx-e2877bf7fac87b3a twinkling-tree-star-icon"/>
                                    </div>
                                    <p className="jsx-e2877bf7fac87b3a twinkling-tree-review">This was my first time buying home decor from
                                        Facebook, and customer service came to the rescue. 10/10 service!</p>
                                </div>
                            </div>
                        </div>
                    </>
                ),
        [
            appliedRedeemableError,
            handleKeyDown,
            handleSubmit,
            isApplyingRedeemable,
            language,
            isSubmittingOrder,
            renderErrorMessage,
        ],
    );

    const renderContent = useCallback(
        memoizeOne(({ setSubmitted }: FormContextType) => (
            <FormField
                input={renderInput(setSubmitted)}
                label={renderLabel}
                name="redeemableCode"
            />
        )),
        [renderLabel, renderInput],
    );

    return (
        <fieldset className="form-fieldset redeemable-entry">
            <FormProvider>{renderContent}</FormProvider>
        </fieldset>
    );
};

export default withLanguage(
    withFormik<RedeemableProps & WithLanguageProps, RedeemableFormValues>({
        mapPropsToValues() {
            return {
                redeemableCode: '',
            };
        },

        async handleSubmit(
            { redeemableCode },
            { props: { applyCoupon, applyGiftCertificate, clearError } },
        ) {
            const code = redeemableCode.trim();

            try {
                await applyGiftCertificate(code);
            } catch (error) {
                if (error instanceof Error) {
                    clearError(error);
                }

                applyCoupon(code);
            }
        },

        validationSchema({ language }: RedeemableProps & WithLanguageProps) {
            return object({
                redeemableCode: string().required(
                    language.translate('redeemable.code_required_error'),
                ),
            });
        },
    })(memo(Redeemable)),
);
