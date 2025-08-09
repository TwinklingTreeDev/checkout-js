import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranslatedString } from '@bigcommerce/checkout/locale';

import CreditCardFieldset from './CreditCardFieldset';

// Mock the CreditCardBillingAddress component
jest.mock('./CreditCardBillingAddress', () => ({
    __esModule: true,
    default: ({ shouldShowBillingAddress }: { shouldShowBillingAddress?: boolean }) => (
        <div data-testid="credit-card-billing-address">
            {shouldShowBillingAddress ? 'Billing Address Component' : 'No Billing Address'}
        </div>
    ),
}));

// Mock the credit card field components
jest.mock('./CreditCardNumberField', () => ({
    __esModule: true,
    default: () => <div data-testid="credit-card-number">Card Number</div>,
}));

jest.mock('./CreditCardExpiryField', () => ({
    __esModule: true,
    default: () => <div data-testid="credit-card-expiry">Expiry</div>,
}));

jest.mock('./CreditCardNameField', () => ({
    __esModule: true,
    default: () => <div data-testid="credit-card-name">Name</div>,
}));

jest.mock('./CreditCardCodeField', () => ({
    __esModule: true,
    default: () => <div data-testid="credit-card-code">CVV</div>,
}));

jest.mock('./CreditCardCustomerCodeField', () => ({
    __esModule: true,
    default: () => <div data-testid="credit-card-customer-code">Customer Code</div>,
}));

// Mock the TranslatedString component
jest.mock('@bigcommerce/checkout/locale', () => ({
    TranslatedString: ({ id }: { id: string }) => <span>{id}</span>,
}));

describe('CreditCardFieldset', () => {
    const defaultProps = {
        shouldShowCardCodeField: false,
        shouldShowCustomerCodeField: false,
    };

    it('renders basic credit card fields', () => {
        render(<CreditCardFieldset {...defaultProps} />);
        
        expect(screen.getByTestId('credit-card-number')).toBeInTheDocument();
        expect(screen.getByTestId('credit-card-expiry')).toBeInTheDocument();
        expect(screen.getByTestId('credit-card-name')).toBeInTheDocument();
    });

    it('shows card code field when shouldShowCardCodeField is true', () => {
        render(<CreditCardFieldset {...defaultProps} shouldShowCardCodeField={true} />);
        
        expect(screen.getByTestId('credit-card-code')).toBeInTheDocument();
    });

    it('shows customer code field when shouldShowCustomerCodeField is true', () => {
        render(<CreditCardFieldset {...defaultProps} shouldShowCustomerCodeField={true} />);
        
        expect(screen.getByTestId('credit-card-customer-code')).toBeInTheDocument();
    });

    it('does not show billing address by default', () => {
        render(<CreditCardFieldset {...defaultProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('shows billing address when shouldShowBillingAddress is true and required props are provided', () => {
        const billingProps = {
            countries: [{ code: 'US', name: 'United States' }],
            getFields: jest.fn(),
            shouldShowBillingAddress: true,
        };
        
        render(<CreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('Billing Address Component');
    });

    it('does not show billing address when shouldShowBillingAddress is false', () => {
        const billingProps = {
            countries: [{ code: 'US', name: 'United States' }],
            getFields: jest.fn(),
            shouldShowBillingAddress: false,
        };
        
        render(<CreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('does not show billing address when countries is not provided', () => {
        const billingProps = {
            getFields: jest.fn(),
            shouldShowBillingAddress: true,
        };
        
        render(<CreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('does not show billing address when getFields is not provided', () => {
        const billingProps = {
            countries: [{ code: 'US', name: 'United States' }],
            shouldShowBillingAddress: true,
        };
        
        render(<CreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });
}); 