import React from 'react';
import { ArrowLeft } from 'lucide-react';
import SiteFooter from './SiteFooter';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 bg-gray-50 dark:bg-[#0a0a0a]">
      <header className="sticky top-0 z-50 transition-all duration-300 bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <a
            href="/"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Back to Xoco Image Compressor</span>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Privacy Policy</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: September 30, 2026</p>

        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Local Processing Only</h2>
            <p>
              All image processing happens locally in your browser. Your images are never uploaded, transmitted, or sent to any server. The compression, format conversion, and optimization all occur on your device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">No Data Collection or Storage</h2>
            <p>
              This app does not collect, store, or retain any personal data or image content. We do not use analytics, advertising, or tracking of any kind.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">EXIF and Metadata Stripping</h2>
            <p>
              When the &quot;Strip EXIF&quot; option is enabled (default), embedded metadata such as GPS location, camera make and model, timestamps, and other EXIF data is removed from images before you download them. This helps protect your privacy by ensuring no sensitive location or device information is included in the compressed files.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Cookies and Local Storage</h2>
            <p>
              This app does not set cookies itself (see Hosting below). We do not use local storage or session storage for tracking or data collection. We only use local storage for your optional preferences when you choose to remember them.
            </p>
            <p className="mt-2">
              <strong>Remember settings:</strong> If you enable the &quot;Remember settings&quot; option in the compression settings, your preferences (quality, format, EXIF stripping, etc.) are stored in your browser&apos;s local storage so they persist between visits. Your dark/light mode preference is also saved locally. This data stays on your device and is never transmitted. You can disable the remember settings option at any time to clear the stored compression settings.
            </p>
            <p className="mt-2">
              Any temporary data (such as image previews) exists only in memory during your session and is cleared when you close or refresh the page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Hosting</h2>
            <p>
              This site is run by XOCO WEB SRL and hosted on Cloudflare. Like any web host, Cloudflare receives standard technical data when your browser loads the site, such as your IP address, browser type, and the pages requested. It uses this data to deliver the site and protect it from abuse, and may set strictly necessary security cookies for the same purpose. Your images are never part of this: they are processed in your browser and are not sent to Cloudflare or anyone else.
            </p>
            <p className="mt-2">
              For details, see{' '}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 dark:text-white hover:underline font-medium"
              >
                Cloudflare&apos;s privacy policy
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Contact</h2>
            <p>
              If you have questions about this privacy policy or how this app handles your data, please contact us at{' '}
              <a
                href="mailto:hello@xocoweb.com"
                className="text-gray-900 dark:text-white hover:underline font-medium"
              >
                hello@xocoweb.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default PrivacyPolicy;
