import React, { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { CheckoutFormStateManager, CheckoutFormStateManagerProps } from './CheckoutFormStateManager';

interface CheckoutFormContextValue {
    formStateManager: CheckoutFormStateManager;
    getCurrentEmail: () => string;
    updateEmail: (email: string, shouldSubscribe?: boolean) => Promise<void>;
    updateShippingAddress: (address: Partial<any>) => Promise<void>;
    updateBillingAddress: (address: Partial<any>) => Promise<void>;
}

const CheckoutFormContext = createContext<CheckoutFormContextValue | null>(null);

export interface CheckoutFormProviderProps {
    children: React.ReactNode;
    props: CheckoutFormStateManagerProps;
}

export const CheckoutFormProvider: React.FC<CheckoutFormProviderProps> = ({ children, props }) => {
    const formStateManagerRef = useRef<CheckoutFormStateManager | null>(null);
    
    // Create the manager only once
    if (!formStateManagerRef.current) {
        formStateManagerRef.current = new CheckoutFormStateManager(props);
    }

    // Initialize state when component mounts (only once)
    useEffect(() => {
        if (formStateManagerRef.current) {
            void formStateManagerRef.current.initializeState();
        }
    }, []); // Only run once on mount

    // Update props when they change (without reinitializing)
    useEffect(() => {
        if (formStateManagerRef.current) {
            formStateManagerRef.current.updateProps(props);
        }
    }, [props]);

    const contextValue: CheckoutFormContextValue = useMemo(() => ({
        formStateManager: formStateManagerRef.current!,
        getCurrentEmail: () => formStateManagerRef.current!.getCurrentEmail(),
        updateEmail: (email: string, shouldSubscribe?: boolean) => 
            formStateManagerRef.current!.updateEmail(email, shouldSubscribe || false),
        updateShippingAddress: (address: Partial<any>) => 
            formStateManagerRef.current!.updateShippingAddress(address),
        updateBillingAddress: (address: Partial<any>) => 
            formStateManagerRef.current!.updateBillingAddress(address),
    }), []);

    return (
        <CheckoutFormContext.Provider value={contextValue}>
            {children}
        </CheckoutFormContext.Provider>
    );
};

export const useCheckoutForm = (): CheckoutFormContextValue => {
    const context = useContext(CheckoutFormContext);
    if (!context) {
        throw new Error('useCheckoutForm must be used within a CheckoutFormProvider');
    }
    return context;
}; 