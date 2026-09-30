import React from 'react';
import { ArrowLeft } from 'lucide-react';
import SiteFooter from './SiteFooter';

const QUESTIONS: { q: string; a: string }[] = [
  {
    q: 'Do my images leave my device?',
    a: 'No. Compression runs in your browser using WebAssembly versions of MozJPEG, OxiPNG and libwebp. Your images are processed on your device and never sent to a server.',
  },
  {
    q: 'Which formats are supported?',
    a: 'You can compress JPEG, PNG and WebP images, and convert between the three. PNG output is always lossless.',
  },
  {
    q: 'What does Smart Optimization do?',
    a: 'It tries several quality levels and keeps the smallest file that still looks the same as the original, measured with SSIM, a standard image similarity score. You get a small file without picking a quality number yourself.',
  },
  {
    q: 'What is the difference between Balanced and Max Quality?',
    a: 'Balanced trades a little invisible detail for much smaller files. Max Quality saves PNG and WebP losslessly, and keeps JPEG visually identical to the original.',
  },
  {
    q: 'Does it remove location and camera data?',
    a: 'Yes. With Strip EXIF Data turned on (the default), GPS location, camera details, timestamps and other embedded metadata are removed before you download.',
  },
  {
    q: 'Is it really free?',
    a: 'Yes. There is no sign-up, no watermark and no limit on how many images you compress. The source code is open under the MIT License.',
  },
];

const Faq: React.FC = () => (
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Frequently Asked Questions</h1>
      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        {QUESTIONS.map(({ q, a }) => (
          <section key={q}>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{q}</h2>
            <p>{a}</p>
          </section>
        ))}
      </div>
    </main>

    <SiteFooter />
  </div>
);

export default Faq;
