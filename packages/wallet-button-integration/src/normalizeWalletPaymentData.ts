import { number } from 'card-validator';

import { WalletButtonInitializationData } from './types';

interface WalletPaymentData {
    accountMask?: string;
    cardType?: string;
    expiryMonth?: string;
    expiryYear?: string;
    email?: string; // Add email field for Google Pay
}

const formatAccountMask = (accountMask = '', padding = '****'): string =>
    accountMask.indexOf('*') > -1 ? accountMask : `${padding} ${accountMask}`;

const isWalletButtonInitializationData = (
    object: unknown,
): object is WalletButtonInitializationData => {
    if (typeof object === 'object' && object !== null) {
        if (
            'card_information' in object &&
            typeof object.card_information === 'object' &&
            object.card_information !== null &&
            'number' in object.card_information &&
            'type' in object.card_information
        ) {
            return true;
        }

        if (
            'cardData' in object &&
            typeof object.cardData === 'object' &&
            object.cardData !== null &&
            'accountMask' in object.cardData &&
            'cardType' in object.cardData &&
            'expMonth' in object.cardData &&
            'expYear' in object.cardData
        ) {
            return true;
        }

        if ('accountNum' in object && 'accountMask' in object && 'expDate' in object) {
            return true;
        }

        // Add check for Google Pay email data
        if ('email' in object && typeof object.email === 'string') {
            return true;
        }
    }

    return false;
};

// For some odd reason, `initializationData` is a schema-less object. So in
// order to use it safely, we have to normalize it first.
const normalizeWalletPaymentData = (data: unknown): WalletPaymentData | undefined => {
    if (isWalletButtonInitializationData(data)) {
        const result: WalletPaymentData = {};

        // Extract email if available (Google Pay)
        if (data.email && typeof data.email === 'string') {
            result.email = data.email;
        }

        if (data.card_information) {
            return {
                ...result,
                accountMask: formatAccountMask(data.card_information.number),
                cardType: data.card_information.type,
            };
        }

        if (data.cardData) {
            return {
                ...result,
                accountMask: formatAccountMask(data.cardData.accountMask),
                cardType: data.cardData.cardType,
                expiryMonth: data.cardData.expMonth,
                expiryYear: data.cardData.expYear,
            };
        }

        if (data.accountNum) {
            const { card } = number(data.accountNum);

            return {
                ...result,
                accountMask: formatAccountMask(data.accountMask),
                expiryMonth: data.expDate && `${data.expDate}`.substr(0, 2),
                expiryYear: data.expDate && `${data.expDate}`.substr(2, 2),
                cardType: card ? card.niceType : '',
            };
        }

        // Return email-only data if no card data but email exists
        if (result.email) {
            return result;
        }
    }

    return undefined;
};

export default normalizeWalletPaymentData;
