import isAppleDevice from './isAppleDevice';

describe('isAppleDevice()', () => {
    it('returns true on iPhones', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1';

        expect(isAppleDevice()).toBeTruthy();
    });

    it('returns true on iPads', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (iPad; CPU OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1';

        expect(isAppleDevice()).toBeTruthy();
    });

    it('returns true on iPods', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (iPod; CPU iPhone OS 10_3_1 like Mac OS X) AppleWebKit/603.1.30 (KHTML, like Gecko) Version/10.0 Mobile/14E304 Safari/602.1';

        expect(isAppleDevice()).toBeTruthy();
    });

    it('returns true on Mac computers', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';

        expect(isAppleDevice()).toBeTruthy();
    });

    it('returns false on Android devices', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Linux; Android 7.0; SM-G930V Build/NRD90M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.125 Mobile Safari/537.36';

        expect(isAppleDevice()).toBeFalsy();
    });

    it('returns false on Windows computers', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

        expect(isAppleDevice()).toBeFalsy();
    });
}); 