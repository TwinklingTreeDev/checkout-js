import { useEffect, useRef } from 'react';

export const useIframePlaceholder = (id: string) => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const observerRef = useRef<MutationObserver | null>(null);
    const iframeObserverRef = useRef<MutationObserver | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    useEffect(() => {
        // Find container
        const container = document.getElementById(id)?.closest('.form-input, .optimizedCheckout-form-input') as HTMLElement;
        if (!container) {
            //console.log(`Container not found for ${id}`);
            return;
        }

        // Show placeholder immediately
        container.classList.remove('form-input--loaded');
        // console.log(`Showing placeholder for ${id}`);
        
        // Hide iframe initially and show it after 4 seconds
        const hideIframe = () => {
            const iframe = container.querySelector('iframe') as HTMLIFrameElement;
            if (iframe) {
                iframeRef.current = iframe;
                iframe.style.display = 'none';
                //console.log(`Hidden iframe for ${id}`);
            }
        };
        
        const showIframe = () => {
            if (iframeRef.current) {
                iframeRef.current.style.display = 'block';
                //console.log(`Showed iframe for ${id}`);
            }
        };
        
        // Hide iframe immediately
        hideIframe();
        
        // Monitor for iframe creation and hide it immediately
        const iframeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as Element;
                        if (element.tagName === 'IFRAME') {
                            const iframe = element as HTMLIFrameElement;
                            iframeRef.current = iframe;
                            iframe.style.display = 'none';
                            //console.log(`Hidden newly created iframe for ${id}`);
                        }
                    }
                });
            });
        });
        
        iframeObserver.observe(container, {
            childList: true,
            subtree: true
        });
        iframeObserverRef.current = iframeObserver;
        
        // Monitor for class removal and restore it
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target as HTMLElement;
                    if (target.classList.contains('form-input--loaded') === false) {
                        //console.log(`form-input--loaded class was removed from ${id}, restoring it`);
                        target.classList.add('form-input--loaded');
                    }
                }
            });
        });
        
        observer.observe(container, {
            attributes: true,
            attributeFilter: ['class']
        });
        observerRef.current = observer;
        
        // 4-second timeout to hide placeholder and show iframe
        timeoutRef.current = setTimeout(() => {
            // Show iframe first, then hide placeholder to avoid flicker
            showIframe();
            
            // Small delay to ensure iframe is visible before hiding placeholder
            showTimeoutRef.current = setTimeout(() => {
                container.classList.add('form-input--loaded');
            }, 50);
        }, 4000);
        
        return () => {
            // Cleanup timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }
            
            // Cleanup observers
            if (observerRef.current) {
                observerRef.current.disconnect();
                observerRef.current = null;
            }
            if (iframeObserverRef.current) {
                iframeObserverRef.current.disconnect();
                iframeObserverRef.current = null;
            }
            
            // Ensure iframe is visible on cleanup
            if (iframeRef.current) {
                iframeRef.current.style.display = 'block';
            }
        };
    }, [id]);
};
