import { CheckoutSelectors } from '@bigcommerce/checkout-sdk';

export interface FormState {
    email: string;
    shouldSubscribe: boolean;
    shippingAddress: Partial<any>;
    billingAddress: Partial<any>;
}

export interface CheckoutFormStateManagerProps {
    updateCheckout: (payload: any) => Promise<CheckoutSelectors>;
    updateShippingAddress: (address: Partial<any>) => Promise<CheckoutSelectors>;
    updateBillingAddress: (address: Partial<any>) => Promise<CheckoutSelectors>;
    getShippingAddress: () => any;
    getBillingAddress: () => any;
    onUnhandledError?: (error: Error) => void;
}

export class CheckoutFormStateManager {
    private props: CheckoutFormStateManagerProps;
    private currentState: FormState;
    private isUpdating = false;
    private pendingUpdates: Array<() => Promise<void>> = [];
    private isInitialized = false;

    constructor(props: CheckoutFormStateManagerProps) {
        this.props = props;
        this.currentState = {
            email: '',
            shouldSubscribe: false,
            shippingAddress: {},
            billingAddress: {},
        };
    }

    /**
     * Update the props without reinitializing
     */
    updateProps(props: CheckoutFormStateManagerProps): void {
        this.props = props;
    }

    /**
     * Initialize the form state with current checkout data
     */
    async initializeState(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        try {
            const shippingAddress = this.props.getShippingAddress();
            const billingAddress = this.props.getBillingAddress();
            
            this.currentState = {
                email: billingAddress?.email || shippingAddress?.email || '',
                shouldSubscribe: false, // Will be updated from checkout
                shippingAddress: shippingAddress || {},
                billingAddress: billingAddress || {},
            };

            this.isInitialized = true;
        } catch (error) {
            console.error('CheckoutFormStateManager: Error initializing state:', error);
        }
    }

    /**
     * Update email across all forms and consignments
     */
    async updateEmail(email: string, shouldSubscribe: boolean = false): Promise<void> {
        if (this.isUpdating) {
            this.pendingUpdates.push(() => this.updateEmail(email, shouldSubscribe));
            return;
        }

        // Email validation regex
        const EMAIL_REGEXP = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
        
        // Helper function to check if email is valid
        const isEmailValid = (email: string): boolean => {
            return Boolean(email && email.trim() !== '' && EMAIL_REGEXP.test(email));
        };

        // Only proceed if email is valid
        if (!isEmailValid(email)) {
            return;
        }

        this.isUpdating = true;

        try {

            // Update local state
            this.currentState.email = email;
            this.currentState.shouldSubscribe = shouldSubscribe;

            // Update checkout
            await this.props.updateCheckout({
                customerMessage: '',
                email,
                shouldSubscribe,
            });

            // Update shipping address with email
            if (this.currentState.shippingAddress && Object.keys(this.currentState.shippingAddress).length > 0) {
                const shippingAddressWithEmail = {
                    ...this.currentState.shippingAddress,
                    email,
                };
                await this.props.updateShippingAddress(shippingAddressWithEmail);
                this.currentState.shippingAddress = shippingAddressWithEmail;
            }

            // Update billing address with email
            if (this.currentState.billingAddress && Object.keys(this.currentState.billingAddress).length > 0) {
                const billingAddressWithEmail = {
                    ...this.currentState.billingAddress,
                    email,
                };
                await this.props.updateBillingAddress(billingAddressWithEmail);
                this.currentState.billingAddress = billingAddressWithEmail;
            }
        } catch (error) {
            console.error('CheckoutFormStateManager: Error updating email:', error);
            if (error instanceof Error && this.props.onUnhandledError) {
                this.props.onUnhandledError(error);
            }
        } finally {
            this.isUpdating = false;
            this.processPendingUpdates();
        }
    }

    /**
     * Update shipping address while preserving email
     */
    async updateShippingAddress(shippingAddress: Partial<any>): Promise<void> {
        if (this.isUpdating) {
            this.pendingUpdates.push(() => this.updateShippingAddress(shippingAddress));
            return;
        }

        this.isUpdating = true;

        try {

            // Preserve email from current state
            const shippingAddressWithEmail = {
                ...shippingAddress,
                email: this.currentState.email,
            };

            // Check if the data has actually changed to prevent infinite loops
            const currentShipping = this.currentState.shippingAddress;
            const hasChanged = JSON.stringify(currentShipping) !== JSON.stringify(shippingAddressWithEmail);
            
            if (!hasChanged) {
                this.isUpdating = false;
                this.processPendingUpdates();
                return;
            }

            // Update shipping address
            await this.props.updateShippingAddress(shippingAddressWithEmail);
            
            // Update local state
            this.currentState.shippingAddress = shippingAddressWithEmail;

            // If billing same as shipping, update billing too
            if (this.shouldSyncBillingToShipping()) {
                await this.updateBillingAddress(shippingAddressWithEmail);
            }
        } catch (error) {
            if (error instanceof Error && this.props.onUnhandledError) {
                this.props.onUnhandledError(error);
            }
        } finally {
            this.isUpdating = false;
            this.processPendingUpdates();
        }
    }

    /**
     * Update billing address while preserving email
     */
    async updateBillingAddress(billingAddress: Partial<any>): Promise<void> {
        if (this.isUpdating) {
            this.pendingUpdates.push(() => this.updateBillingAddress(billingAddress));
            return;
        }

        this.isUpdating = true;

        try {

            // Preserve email from current state
            const billingAddressWithEmail = {
                ...billingAddress,
                email: this.currentState.email,
            };

            // Check if the data has actually changed to prevent infinite loops
            const currentBilling = this.currentState.billingAddress;
            const hasChanged = JSON.stringify(currentBilling) !== JSON.stringify(billingAddressWithEmail);
            
            if (!hasChanged) {
                this.isUpdating = false;
                this.processPendingUpdates();
                return;
            }

            // Update billing address
            await this.props.updateBillingAddress(billingAddressWithEmail);
            
            // Update local state
            this.currentState.billingAddress = billingAddressWithEmail;

        } catch (error) {
            if (error instanceof Error && this.props.onUnhandledError) {
                this.props.onUnhandledError(error);
            }
        } finally {
            this.isUpdating = false;
            this.processPendingUpdates();
        }
    }

    /**
     * Get current form state
     */
    getCurrentState(): FormState {
        return { ...this.currentState };
    }

    /**
     * Get current email
     */
    getCurrentEmail(): string {
        return this.currentState.email;
    }

    /**
     * Check if billing should be synced to shipping
     */
    private shouldSyncBillingToShipping(): boolean {
        // This could be made configurable based on a checkbox state
        return true; // For now, always sync
    }

    /**
     * Process any pending updates
     */
    private async processPendingUpdates(): Promise<void> {
        if (this.pendingUpdates.length > 0 && !this.isUpdating) {
            const update = this.pendingUpdates.shift();
            if (update) {
                await update();
            }
        }
    }

    /**
     * Sync all current state to consignments
     */
    async syncAllStateToConsignments(): Promise<void> {
        if (this.currentState.email) {
            await this.updateEmail(this.currentState.email, this.currentState.shouldSubscribe);
        }
    }
} 