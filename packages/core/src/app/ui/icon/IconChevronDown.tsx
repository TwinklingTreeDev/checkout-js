import React, { FunctionComponent } from 'react';

import withIconContainer from './withIconContainer';

const IconChevronDown: FunctionComponent = () => (
    // <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
    //     <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
    // </svg>
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 11 11" fill="none">
        <g clipPath="url(#clip0_104_591)">
            <g clipPath="url(#clip1_104_591)">
                <g clipPath="url(#clip2_104_591)">
                    <path d="M0.359985 3.28003H10.36L5.35999 8.28003" fill="#919191" />
                </g>
            </g>
        </g>
        <defs>
            <clipPath id="clip0_104_591">
                <rect width="10" height="10" fill="white" transform="translate(0.359985 0.280029)" />
            </clipPath>
            <clipPath id="clip1_104_591">
                <rect width="10" height="10" fill="white" transform="translate(0.359985 0.280029)" />
            </clipPath>
            <clipPath id="clip2_104_591">
                <rect width="10" height="10" fill="white" transform="translate(0.359985 0.280029)" />
            </clipPath>
        </defs>
    </svg>
);

export default withIconContainer(IconChevronDown);
