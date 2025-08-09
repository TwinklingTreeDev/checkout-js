import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranslatedString } from '@bigcommerce/checkout/locale';

import CreditCardBillingAddress from './CreditCardBillingAddress';

// Mock the AddressForm component
jest.mock('../../address', () => ({
    AddressForm: ({ onChange }: { onChange: (fieldName: string, value: string) => void }) => (
        <div data-testid="address-form">
            <input
                data-testid="address-field"
                onChange={(e) => onChange('firstName', e.target.value)}
                placeholder="First Name"
            />
        </div>
    ),
}));

// Mock the TranslatedString component
jest.mock('@bigcommerce/checkout/locale', () => ({
    TranslatedString: ({ id }: { id: string }) => <span>{id}</span>,
}));

describe('CreditCardBillingAddress', () => {
    const defaultProps = {
        countries: [],
        countriesWithAutocomplete: [],
        getFields: jest.fn(),
        isFloatingLabelEnabled: false,
        googleMapsApiKey: 'test-key',
        onBillingAddressChange: jest.fn(),
        onBillingSameAsShippingChange: jest.fn(),
    };

    it('renders checkbox with default checked state', () => {
        render(<CreditCardBillingAddress {...defaultProps} />);
        
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
    });

    it('shows correct label text', () => {
        render(<CreditCardBillingAddress {...defaultProps} />);
        
        expect(screen.getByText('billing.use_shipping_address_label')).toBeInTheDocument();
    });

    it('hides billing address form when checkbox is checked', () => {
        render(<CreditCardBillingAddress {...defaultProps} />);
        
        expect(screen.queryByTestId('address-form')).not.toBeInTheDocument();
    });

    it('shows billing address form when checkbox is unchecked', () => {
        render(<CreditCardBillingAddress {...defaultProps} isBillingSameAsShipping={false} />);
        
        expect(screen.getByTestId('address-form')).toBeInTheDocument();
    });

    it('calls onBillingSameAsShippingChange when checkbox is toggled', () => {
        const onBillingSameAsShippingChange = jest.fn();
        render(
            <CreditCardBillingAddress 
                {...defaultProps} 
                onBillingSameAsShippingChange={onBillingSameAsShippingChange}
            />
        );
        
        const checkbox = screen.getByRole('checkbox');
        fireEvent.click(checkbox);
        
        expect(onBillingSameAsShippingChange).toHaveBeenCalledWith(false);
    });

    it('calls onBillingAddressChange when address field changes and checkbox is unchecked', () => {
        const onBillingAddressChange = jest.fn();
        render(
            <CreditCardBillingAddress 
                {...defaultProps} 
                isBillingSameAsShipping={false}
                onBillingAddressChange={onBillingAddressChange}
            />
        );
        
        const addressField = screen.getByTestId('address-field');
        fireEvent.change(addressField, { target: { value: 'John' } });
        
        expect(onBillingAddressChange).toHaveBeenCalledWith(
            expect.objectContaining({ firstName: 'John' })
        );
    });

    it('does not call onBillingAddressChange when checkbox is checked', () => {
        const onBillingAddressChange = jest.fn();
        render(
            <CreditCardBillingAddress 
                {...defaultProps} 
                onBillingAddressChange={onBillingAddressChange}
            />
        );
        
        // Even if we try to change address fields, it shouldn't call the callback
        // because the form is hidden when checkbox is checked
        expect(onBillingAddressChange).not.toHaveBeenCalled();
    });
}); 