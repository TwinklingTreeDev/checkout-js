export default function isSafari(): boolean {
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // Check if it's Safari but not Chrome (including CriOS for iPhone Chrome)
    return /safari/.test(userAgent) && 
           !/chrome/.test(userAgent) && 
           !/crios/.test(userAgent) && 
           !/edg/.test(userAgent) &&
           !/firefox/.test(userAgent);
}
