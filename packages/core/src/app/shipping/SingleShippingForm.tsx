import {
    Address,
    CheckoutParams,
    CheckoutSelectors,
    Consignment,
    Country,
    CustomerAddress,
    CustomerRequestOptions,
    FormField,
    RequestOptions,
    ShippingInitializeOptions,
    ShippingRequestOptions,
} from '@bigcommerce/checkout-sdk';
import { FormikProps, withFormik } from 'formik';
import { debounce, isEqual, noop } from 'lodash';
import React, { PureComponent, ReactNode } from 'react';
import { lazy, object } from 'yup';

import { withLanguage, WithLanguageProps } from '@bigcommerce/checkout/locale';
import { FormContext } from '@bigcommerce/checkout/ui';

import {
    AddressFormValues,
    getAddressFormFieldsValidationSchema,
    getTranslateAddressError,
    isEqualAddress,
    mapAddressFromFormValues,
    mapAddressToFormValues,
} from '../address';
import { getCustomFormFieldsValidationSchema } from '../formFields';
import { PaymentMethodId } from '../payment/paymentMethod';
import { Fieldset, Form } from '../ui/form';

import BillingSameAsShippingField from './BillingSameAsShippingField';
import hasSelectedShippingOptions from './hasSelectedShippingOptions';
import ShippingAddress from './ShippingAddress';
import { SHIPPING_ADDRESS_FIELDS } from './ShippingAddressFields';
import ShippingFormFooter from './ShippingFormFooter';

export interface SingleShippingFormProps {
    addresses: CustomerAddress[];
    isBillingSameAsShipping: boolean;
    cartHasChanged: boolean;
    consignments: Consignment[];
    countries: Country[];
    countriesWithAutocomplete: string[];
    customerMessage: string;
    googleMapsApiKey?: string;
    isLoading: boolean;
    isShippingStepPending: boolean;
    isMultiShippingMode: boolean;
    methodId?: string;
    shippingAddress?: Address;
    shippingAutosaveDelay?: number;
    shouldShowSaveAddress?: boolean;
    shouldShowOrderComments: boolean;
    isFloatingLabelEnabled?: boolean;
    // Add selected payment method for PayPal detection
    selectedPaymentMethod?: any;
    deinitialize(options: ShippingRequestOptions): Promise<CheckoutSelectors>;
    deleteConsignments(): Promise<Address | undefined>;
    getFields(countryCode?: string): FormField[];
    initialize(options: ShippingInitializeOptions): Promise<CheckoutSelectors>;
    onSubmit(values: SingleShippingFormValues): void;
    onUnhandledError?(error: Error): void;
    signOut(options?: CustomerRequestOptions): void;
    onCheckBillingSameAsShipping(isBillingSameAsShipping: boolean): void;
    updateAddress(
        address: Partial<Address>,
        options?: RequestOptions<CheckoutParams>,
    ): Promise<CheckoutSelectors>;
    // Add billing address update functionality
    updateBillingAddress?(address: Partial<Address>): Promise<CheckoutSelectors>;
}

export interface SingleShippingFormValues {
    billingSameAsShipping: boolean;
    shippingAddress?: AddressFormValues;
    orderComment: string;
}

interface SingleShippingFormState {
    isResettingAddress: boolean;
    isUpdatingShippingData: boolean;
    hasRequestedShippingOptions: boolean;
}

function shouldHaveCustomValidation(methodId?: string): boolean {
    const methodIdsWithoutCustomValidation: string[] = [
        PaymentMethodId.BraintreeAcceleratedCheckout,
        PaymentMethodId.PayPalCommerceAcceleratedCheckout
    ];

    return Boolean(methodId && !methodIdsWithoutCustomValidation.includes(methodId));
}

export const SHIPPING_AUTOSAVE_DELAY = 1700;

// Helper function to check if a method is PayPal
function isPayPalMethod(method?: any): boolean {
    if (!method) {
        return false;
    }

    const paypalMethodIds = [
        'paypal',
        'paypalcommerce',
        'paypalcommercecredit',
        'paypalcommercecreditcards',
        'paypalcommercealternativemethods',
        'paypalcommercevenmo',
        'paypalexpress',
        'paypalpaymentspro'
    ];
    
    const paypalMethodTypes = [
        'paypal',
        'paypal-credit',
        'paypal-venmo'
    ];
    
    return paypalMethodIds.includes(method.id) || 
           paypalMethodTypes.includes(method.method) ||
           method.gateway === 'paypal' ||
           method.gateway === 'paypalcommerce';
}

class SingleShippingForm extends PureComponent<
    SingleShippingFormProps & WithLanguageProps & FormikProps<SingleShippingFormValues>
> {
    static contextType = FormContext;

    state: SingleShippingFormState = {
        isResettingAddress: false,
        isUpdatingShippingData: false,
        hasRequestedShippingOptions: false,
    };

    private debouncedUpdateAddress: any;

    constructor(
        props: SingleShippingFormProps & WithLanguageProps & FormikProps<SingleShippingFormValues>,
    ) {
        super(props);

        const { updateAddress } = this.props;

        this.debouncedUpdateAddress = debounce(
            async (address: Address, includeShippingOptions: boolean) => {
                try {
                    console.log('SingleShippingForm: Debounced update triggered for address:', address.address1);
                    await updateAddress(address, {
                        params: {
                            include: {
                                'consignments.availableShippingOptions': includeShippingOptions,
                            },
                        },
                    });

                    if (includeShippingOptions) {
                        this.setState({ hasRequestedShippingOptions: true });
                    }

                    // Sync billing address for PayPal methods
                    // Check if we have a selected payment method or if PayPal is available
                    const shouldSyncForPayPal = this.props.selectedPaymentMethod && isPayPalMethod(this.props.selectedPaymentMethod);
                    
                    // Alternative: Check if any PayPal method is available (as a fallback)
                    const hasPayPalAvailable = this.props.methodId && (
                        this.props.methodId === 'paypal' || 
                        this.props.methodId === 'paypalcommerce' || 
                        this.props.methodId === 'paypalcommercecredit'
                    );
                    
                    if ((shouldSyncForPayPal || hasPayPalAvailable) && this.props.updateBillingAddress) {
                        try {
                            console.log('SingleShippingForm: Syncing billing address for PayPal method');
                            await this.props.updateBillingAddress(address);
                            console.log('SingleShippingForm: Billing address synced successfully');
                        } catch (billingError) {
                            console.error('SingleShippingForm: Error syncing billing address:', billingError);
                            // Don't throw the error - shipping address update was successful
                        }
                    } else {
                        console.log('SingleShippingForm: PayPal method not detected or updateBillingAddress not available', {
                            hasSelectedPaymentMethod: !!this.props.selectedPaymentMethod,
                            isPayPalMethod: this.props.selectedPaymentMethod ? isPayPalMethod(this.props.selectedPaymentMethod) : false,
                            hasPayPalAvailable,
                            methodId: this.props.methodId,
                            hasUpdateBillingAddress: !!this.props.updateBillingAddress
                        });
                    }
                } catch (error) {
                    console.error('SingleShippingForm: Error updating address:', error);
                } finally {
                    this.setState({ isUpdatingShippingData: false });
                }
            },
            props.shippingAutosaveDelay ?? SHIPPING_AUTOSAVE_DELAY,
        );
    }

    componentDidMount(): void {
        const { isBillingSameAsShipping, setFieldValue } = this.props;
        
        // Debug: Log the selected payment method
        if (isBillingSameAsShipping) {
            setFieldValue('billingSameAsShipping', true);
        }
    }

    componentDidUpdate(prevProps: SingleShippingFormProps & WithLanguageProps & FormikProps<SingleShippingFormValues>): void {
        const { isBillingSameAsShipping, setFieldValue } = this.props;
        
        // Update the form value when the prop changes (e.g., when buttons are clicked)
        if (prevProps.isBillingSameAsShipping !== isBillingSameAsShipping) {
            setFieldValue('billingSameAsShipping', isBillingSameAsShipping);
        }
    }

    componentWillUnmount(): void {
        // Cancel any pending debounced calls
        if (this.debouncedUpdateAddress && this.debouncedUpdateAddress.cancel) {
            this.debouncedUpdateAddress.cancel();
        }
    }

    render(): ReactNode {
        const {
            addresses,
            cartHasChanged,
            isLoading,
            onUnhandledError,
            methodId,
            shouldShowSaveAddress,
            countries,
            countriesWithAutocomplete,
            googleMapsApiKey,
            shippingAddress,
            consignments,
            shouldShowOrderComments,
            initialize,
            isValid,
            deinitialize,
            values: { shippingAddress: addressForm },
            isShippingStepPending,
            isFloatingLabelEnabled,
            isBillingSameAsShipping,
            onCheckBillingSameAsShipping,
        } = this.props;

        const { isResettingAddress, isUpdatingShippingData, hasRequestedShippingOptions } =
            this.state;

        const PAYMENT_METHOD_VALID = ['amazonpay'];
        const shouldShowBillingSameAsShipping = !PAYMENT_METHOD_VALID.some(
            (method) => method === methodId,
        );

        return (
            <Form autoComplete="on">
                <Fieldset>
                    <ShippingAddress
                        addresses={addresses}
                        consignments={consignments}
                        countries={countries}
                        countriesWithAutocomplete={countriesWithAutocomplete}
                        deinitialize={deinitialize}
                        formFields={this.getFields(addressForm && addressForm.countryCode)}
                        googleMapsApiKey={googleMapsApiKey}
                        hasRequestedShippingOptions={hasRequestedShippingOptions}
                        initialize={initialize}
                        isFloatingLabelEnabled={isFloatingLabelEnabled}
                        isLoading={isResettingAddress}
                        isShippingStepPending={isShippingStepPending}
                        methodId={methodId}
                        onAddressSelect={this.handleAddressSelect}
                        onFieldChange={this.handleFieldChange}
                        onUnhandledError={onUnhandledError}
                        onUseNewAddress={this.onUseNewAddress}
                        shippingAddress={shippingAddress}
                        shouldShowSaveAddress={shouldShowSaveAddress}
                    />
                    {shouldShowBillingSameAsShipping && (
                        <div className="form-body">

                            <BillingSameAsShippingField 
                                isBillingSameAsShipping={isBillingSameAsShipping}
                                onCheckBillingSameAsShipping={(value) => {
                                    // Call the original callback
                                    onCheckBillingSameAsShipping(value);
                                    
                                    // Auto-save the billing same as shipping preference
                                    // This will be handled by the parent component's handleBillingSameAsShipping
                                }}
                            />
                        </div>
                    )}
                </Fieldset>

                <ShippingFormFooter
                    cartHasChanged={cartHasChanged}
                    isLoading={isLoading || isUpdatingShippingData}
                    isMultiShippingMode={false}
                    shouldDisableSubmit={this.shouldDisableSubmit()}
                    shouldShowOrderComments={shouldShowOrderComments}
                    shouldShowShippingOptions={isValid}
                />
            </Form>
        );
    }

    private shouldDisableSubmit: () => boolean = () => {
        const { isLoading, consignments, isValid } = this.props;

        const { isUpdatingShippingData } = this.state;

        if (!isValid) {
            return false;
        }

        return isLoading || isUpdatingShippingData || !hasSelectedShippingOptions(consignments);
    };

    private handleFieldChange: (name: string) => void = async (name) => {
        const { setFieldValue } = this.props;

        if (name === 'countryCode') {
            setFieldValue('shippingAddress.stateOrProvince', '');
            setFieldValue('shippingAddress.stateOrProvinceCode', '');
        }

        // Enqueue the following code to run after Formik has run validation
        await new Promise((resolve) => setTimeout(resolve, 0));

        const isShippingField = SHIPPING_ADDRESS_FIELDS.includes(name);

        const { hasRequestedShippingOptions } = this.state;

        const { isValid } = this.props;

        if (!isValid) {
            return;
        }

        this.updateAddressWithFormData(isShippingField || !hasRequestedShippingOptions);
    };

    private updateAddressWithFormData(includeShippingOptions: boolean) {
        const {
            shippingAddress,
            values: { shippingAddress: addressForm },
        } = this.props;

        const updatedShippingAddress = addressForm && mapAddressFromFormValues(addressForm);

        if (Array.isArray(shippingAddress?.customFields)) {
            includeShippingOptions = !isEqual(
                shippingAddress?.customFields,
                updatedShippingAddress?.customFields
            ) || includeShippingOptions;
        }

        if (!updatedShippingAddress || isEqualAddress(updatedShippingAddress, shippingAddress)) {
            console.log('SingleShippingForm: Skipping update - address unchanged or invalid');
            return;
        }

        console.log('SingleShippingForm: Triggering debounced address update for:', updatedShippingAddress.address1);
        this.setState({ isUpdatingShippingData: true });
        this.debouncedUpdateAddress(updatedShippingAddress, includeShippingOptions);
    }

    private handleAddressSelect: (address: Address) => void = async (address) => {
        const { updateAddress, onUnhandledError = noop, values, setValues } = this.props;

        this.setState({ isResettingAddress: true });

        try {
            await updateAddress(address);

            setValues({
                ...values,
                shippingAddress: mapAddressToFormValues(
                    this.getFields(address.countryCode),
                    address,
                ),
            });
        } catch (error) {
            onUnhandledError(error);
        } finally {
            this.setState({ isResettingAddress: false });
        }
    };

    private onUseNewAddress: () => void = async () => {
        const { deleteConsignments, onUnhandledError = noop, setValues, values } = this.props;

        this.setState({ isResettingAddress: true });

        try {
            const address = await deleteConsignments();

            setValues({
                ...values,
                shippingAddress: mapAddressToFormValues(
                    this.getFields(address && address.countryCode),
                    address,
                ),
            });
        } catch (e) {
            onUnhandledError(e);
        } finally {
            this.setState({ isResettingAddress: false });
        }
    };

    private getFields(countryCode: string | undefined): FormField[] {
        const { getFields } = this.props;

        return getFields(countryCode);
    }
}

export default withLanguage(
    withFormik<SingleShippingFormProps & WithLanguageProps, SingleShippingFormValues>({
        handleSubmit: (values, { props: { onSubmit } }) => {
            // Check if we're just validating forms, not actually submitting
            if ((window as any).__isValidatingForms) {
                return; // Don't actually submit, just let validation run
            }
            onSubmit(values);
        },
        mapPropsToValues: ({
            getFields,
            shippingAddress,
            isBillingSameAsShipping,
            customerMessage,
        }) => ({
            billingSameAsShipping: isBillingSameAsShipping,
            orderComment: customerMessage,
            shippingAddress: mapAddressToFormValues(
                getFields(shippingAddress && shippingAddress.countryCode),
                shippingAddress,
            ),
        }),
        isInitialValid: ({ shippingAddress, getFields, language }) =>
            !!shippingAddress &&
            getAddressFormFieldsValidationSchema({
                language,
                formFields: getFields(shippingAddress.countryCode),
            }).isValidSync(shippingAddress),
        validationSchema: ({
            language,
            getFields,
            methodId,
        }: SingleShippingFormProps & WithLanguageProps) =>
            shouldHaveCustomValidation(methodId)
                ? object({
                      shippingAddress: lazy<Partial<AddressFormValues>>((formValues) =>
                          getCustomFormFieldsValidationSchema({
                              translate: getTranslateAddressError(language),
                              formFields: getFields(formValues && formValues.countryCode),
                          }),
                      ),
                  })
                : object({
                      shippingAddress: lazy<Partial<AddressFormValues>>((formValues) =>
                          getAddressFormFieldsValidationSchema({
                              language,
                              formFields: getFields(formValues && formValues.countryCode),
                          }),
                      ),
                  }),
        enableReinitialize: false,
    })(SingleShippingForm),
);
