import { getSupportedMethodIds } from './getSupportedMethods';

// Mock the isAppleDevice function
jest.mock('../common/utility', () => ({
    ...jest.requireActual('../common/utility'),
    isAppleDevice: jest.fn(),
}));

import { isAppleDevice } from '../common/utility';

describe('getSupportedMethods', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('filters out unsupported methods', () => {
        const methods = ['amazonpay', 'test'];

        const filteredMethods = getSupportedMethodIds(methods);

        expect(filteredMethods).toEqual(['amazonpay']);
    });

    it('filters out applepay if not supported methods', () => {
        const methods = ['amazonpay', 'applepay'];

        const filteredMethods = getSupportedMethodIds(methods);

        expect(filteredMethods).toEqual(['amazonpay']);
    });

    it('filters out Google Pay methods on Apple devices', () => {
        (isAppleDevice as jest.Mock).mockReturnValue(true);
        
        const methods = ['amazonpay', 'googlepayadyenv2', 'googlepaystripe', 'paypalcommerce'];

        const filteredMethods = getSupportedMethodIds(methods);

        expect(filteredMethods).toEqual(['amazonpay', 'paypalcommerce']);
    });

    it('shows Google Pay methods on non-Apple devices', () => {
        (isAppleDevice as jest.Mock).mockReturnValue(false);
        
        const methods = ['amazonpay', 'googlepayadyenv2', 'googlepaystripe', 'paypalcommerce'];

        const filteredMethods = getSupportedMethodIds(methods);

        expect(filteredMethods).toEqual(['amazonpay', 'googlepayadyenv2', 'googlepaystripe', 'paypalcommerce']);
    });
});
