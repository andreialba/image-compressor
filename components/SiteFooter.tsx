import React from 'react';

const linkClass = 'text-gray-900 dark:text-gray-100 hover:underline transition-all';

const SiteFooter: React.FC = () => (
  <footer className="py-8 border-t border-gray-200 dark:border-gray-800 text-center transition-colors duration-300 relative z-10 bg-gray-50 dark:bg-[#0a0a0a]">
    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
      <p>
        Made by{' '}
        <a href="https://www.linkedin.com/in/andreialba/" target="_blank" rel="noopener noreferrer" className={linkClass}>
          Andrei Alba
        </a>{' '}
        at{' '}
        <a href="https://xocoweb.com" target="_blank" rel="noopener" className={linkClass}>
          Xoco
        </a>
      </p>
      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
      <a href="/faq/" className={linkClass}>
        FAQ
      </a>
      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
      <a href="/privacy/" className={linkClass}>
        Privacy Policy
      </a>
      <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
      <a href="https://github.com/andreialba/image-compressor" target="_blank" rel="noopener noreferrer" className={linkClass}>
        GitHub
      </a>
    </div>
    <p className="mt-4 px-4 text-xs text-gray-400 dark:text-gray-500">
      © {new Date().getFullYear()} Andrei Alba. Open source under the{' '}
      <a href="/licenses.txt" className="underline hover:text-gray-900 dark:hover:text-gray-100">
        MIT License
      </a>
      . Provided as is, without warranty of any kind.
    </p>
  </footer>
);

export default SiteFooter;
