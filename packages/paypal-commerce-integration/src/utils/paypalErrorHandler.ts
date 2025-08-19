import { LanguageService } from '@bigcommerce/checkout-sdk';

export interface PayPalErrorInfo {
    isRecoverable: boolean;
    shouldRetry: boolean;
    userMessage: string;
    technicalMessage: string;
}

export function handlePayPalError(error: Error, language: LanguageService): PayPalErrorInfo {
    const errorMessage = error.message.toLowerCase();
    
    // Payment method invalid errors
    if (errorMessage.includes('payment_method_invalid') || 
        errorMessage.includes('method_invalid') ||
        errorMessage.includes('invalid_payment_method')) {
        return {
            isRecoverable: true,
            shouldRetry: false,
            userMessage: language.translate('payment.payment_method_unavailable_error'),
            technicalMessage: 'PayPal payment method validation failed'
        };
    }
    
    // Network and timeout errors
    if (errorMessage.includes('network_error') || 
        errorMessage.includes('timeout') ||
        errorMessage.includes('connection_failed')) {
        return {
            isRecoverable: true,
            shouldRetry: true,
            userMessage: language.translate('payment.payment_method_unavailable_error'),
            technicalMessage: 'PayPal network connection failed'
        };
    }
    
    // Authentication errors
    if (errorMessage.includes('authentication_failed') || 
        errorMessage.includes('unauthorized') ||
        errorMessage.includes('invalid_credentials')) {
        return {
            isRecoverable: false,
            shouldRetry: false,
            userMessage: language.translate('payment.payment_method_error', { 
                message: 'Authentication failed. Please contact support.' 
            }),
            technicalMessage: 'PayPal authentication failed'
        };
    }
    
    // Configuration errors
    if (errorMessage.includes('configuration_error') || 
        errorMessage.includes('invalid_config') ||
        errorMessage.includes('setup_required')) {
        return {
            isRecoverable: false,
            shouldRetry: false,
            userMessage: language.translate('payment.payment_method_error', { 
                message: 'Payment method configuration error. Please contact support.' 
            }),
            technicalMessage: 'PayPal configuration error'
        };
    }
    
    // Instrument declined (specific PayPal error)
    if (errorMessage.includes('instrument_declined')) {
        return {
            isRecoverable: true,
            shouldRetry: false,
            userMessage: language.translate('payment.errors.instrument_declined'),
            technicalMessage: 'PayPal instrument was declined'
        };
    }
    
    // Default error handling
    return {
        isRecoverable: true,
        shouldRetry: false,
        userMessage: language.translate('payment.payment_method_error', { 
            message: error.message 
        }),
        technicalMessage: `PayPal error: ${error.message}`
    };
}

export function shouldRetryPayPalOperation(error: Error, attemptCount: number): boolean {
    const maxRetries = 3;
    const errorInfo = handlePayPalError(error, {} as LanguageService);
    
    return errorInfo.shouldRetry && attemptCount < maxRetries;
}

export function getPayPalRetryDelay(attemptCount: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, attemptCount - 1), 4000);
} 