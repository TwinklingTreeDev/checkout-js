import React from 'react';
import { render, screen } from '@testing-library/react';
import { TranslatedString } from '@bigcommerce/checkout/locale';

import HostedCreditCardFieldset from './HostedCreditCardFieldset';

// Mock the CreditCardBillingAddress component
jest.mock('../creditCard/CreditCardBillingAddress', () => ({
    __esModule: true,
    default: ({ shouldShowBillingAddress }: { shouldShowBillingAddress?: boolean }) => (
        <div data-testid="credit-card-billing-address">
            {shouldShowBillingAddress ? 'Billing Address Component' : 'No Billing Address'}
        </div>
    ),
}));

// Mock the hosted credit card field components
jest.mock('./HostedCreditCardNumberField', () => ({
    __esModule: true,
    default: () => <div data-testid="hosted-credit-card-number">Card Number</div>,
}));

jest.mock('./HostedCreditCardExpiryField', () => ({
    __esModule: true,
    default: () => <div data-testid="hosted-credit-card-expiry">Expiry</div>,
}));

jest.mock('./HostedCreditCardNameField', () => ({
    __esModule: true,
    default: () => <div data-testid="hosted-credit-card-name">Name</div>,
}));

jest.mock('./HostedCreditCardCodeField', () => ({
    __esModule: true,
    default: () => <div data-testid="hosted-credit-card-code">CVV</div>,
}));

// Mock the TranslatedString component
jest.mock('@bigcommerce/checkout/locale', () => ({
    TranslatedString: ({ id }: { id: string }) => <span>{id}</span>,
}));

describe('HostedCreditCardFieldset', () => {
    const defaultProps = {
        cardExpiryId: 'ccExpiry',
        cardNumberId: 'ccNumber',
    };

    it('renders basic hosted credit card fields', () => {
        render(<HostedCreditCardFieldset {...defaultProps} />);
        
        expect(screen.getByTestId('hosted-credit-card-number')).toBeInTheDocument();
        expect(screen.getByTestId('hosted-credit-card-expiry')).toBeInTheDocument();
    });

    it('shows card name field when cardNameId is provided', () => {
        render(<HostedCreditCardFieldset {...defaultProps} cardNameId="ccName" />);
        
        expect(screen.getByTestId('hosted-credit-card-name')).toBeInTheDocument();
    });

    it('shows card code field when cardCodeId is provided', () => {
        render(<HostedCreditCardFieldset {...defaultProps} cardCodeId="ccCvv" />);
        
        expect(screen.getByTestId('hosted-credit-card-code')).toBeInTheDocument();
    });

    it('does not show billing address by default', () => {
        render(<HostedCreditCardFieldset {...defaultProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('shows billing address when shouldShowBillingAddress is true and required props are provided', () => {
        const billingProps = {
            countries: [{ code: 'US', name: 'United States' }],
            getFields: jest.fn(),
            shouldShowBillingAddress: true,
        };
        
        render(<HostedCreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('Billing Address Component');
    });

    it('does not show billing address when shouldShowBillingAddress is false', () => {
        const billingProps = {
            countries: [{ code: 'US', name: 'United States' }],
            getFields: jest.fn(),
            shouldShowBillingAddress: false,
        };
        
        render(<HostedCreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('does not show billing address when countries is not provided', () => {
        const billingProps = {
            getFields: jest.fn(),
            shouldShowBillingAddress: true,
        };
        
        render(<HostedCreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('does not show billing address when getFields is not provided', () => {
        const billingProps = {
            countries: [{ code: 'US', name: 'United States' }],
            shouldShowBillingAddress: true,
        };
        
        render(<HostedCreditCardFieldset {...defaultProps} {...billingProps} />);
        
        expect(screen.getByTestId('credit-card-billing-address')).toHaveTextContent('No Billing Address');
    });

    it('renders additional fields when provided', () => {
        const additionalFields = <div data-testid="additional-fields">Additional Fields</div>;
        
        render(<HostedCreditCardFieldset {...defaultProps} additionalFields={additionalFields} />);
        
        expect(screen.getByTestId('additional-fields')).toBeInTheDocument();
    });
}); 