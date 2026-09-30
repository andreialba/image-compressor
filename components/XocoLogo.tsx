import React from 'react';

const XocoLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 64.6 17.88" className={className} fill="currentColor" role="img" aria-label="xoco">
    <path d="m16.12,8.94l8.84,8.84,8.84-8.84L24.95.1l-8.84,8.84Zm8.84,5.3l-5.3-5.3,5.3-5.3,5.3,5.3-5.3,5.3Z" />
    <polygon points="45.05 0 34.82 8.81 34.82 9.08 45.05 17.88 46.68 15.84 38.79 8.94 46.68 2.04 45.05 0" />
    <polygon points="15.73 2.04 14.1 0 7.86 5.36 1.63 0 0 2.04 5.81 7.13 7.86 8.92 9.91 7.13 15.73 2.04" />
    <polygon points="0 15.84 1.63 17.88 7.86 12.52 14.1 17.88 15.73 15.84 9.91 10.76 7.86 8.96 5.81 10.76 0 15.84" />
    <path d="m55.76.1l-8.84,8.84,8.84,8.84,8.84-8.84L55.76.1Zm-5.3,8.84l5.3-5.3,5.3,5.3-5.3,5.3-5.3-5.3Z" />
  </svg>
);

export default XocoLogo;
