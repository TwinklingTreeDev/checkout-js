import isSafari from './isSafari';

describe('isSafari()', () => {
    it('returns true on Safari desktop', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Safari/605.1.15';

        expect(isSafari()).toBeTruthy();
    });

    it('returns true on Safari mobile', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1';

        expect(isSafari()).toBeTruthy();
    });

    it('returns false on Chrome desktop', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36';

        expect(isSafari()).toBeFalsy();
    });

    it('returns false on Chrome mobile', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1';

        expect(isSafari()).toBeFalsy();
    });

    it('returns false on Chrome mobile (alternative user agent)', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Chrome/91.0.4472.80 Mobile/15E148 Safari/604.1';

        expect(isSafari()).toBeFalsy();
    });

    it('returns false on Firefox', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0';

        expect(isSafari()).toBeFalsy();
    });

    it('returns false on Edge', () => {
        // @ts-ignore: setter for userAgent is defined in jest-setup.ts
        window.navigator.userAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59';

        expect(isSafari()).toBeFalsy();
    });
});
