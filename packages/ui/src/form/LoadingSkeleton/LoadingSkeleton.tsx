import React, { FunctionComponent, ReactNode } from 'react';

export interface LoadingSkeletonProps {
    isLoading?: boolean;
    renderWhileLoading?: boolean;
    skeleton?: ReactNode;
}

export const LoadingSkeleton: FunctionComponent<LoadingSkeletonProps> = ({
    children,
    isLoading = true,
    renderWhileLoading = false,
    skeleton,
}) => {
    const shouldShowChildren = renderWhileLoading || !isLoading;

    return (
        <>
            {isLoading && skeleton}
            {Boolean(children) && shouldShowChildren && (
                <div
                    className="loading-skeleton"
                    style={
                        isLoading ? { display: 'none' } : undefined
                    }
                >
                    {children}
                </div>
            )}
        </>
    );
};
