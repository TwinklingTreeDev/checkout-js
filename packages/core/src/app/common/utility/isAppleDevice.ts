export default function isAppleDevice(): boolean {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod|macintosh|mac os x/.test(userAgent);
} 