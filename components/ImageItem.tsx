import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Loader2, Download, Trash2, ArrowRight, Columns2, X } from 'lucide-react';
import { OptimizedFile, ProcessingStatus } from '../types';
import { formatBytes, calculateSavings } from '../services/utils';

interface ImageItemProps {
  item: OptimizedFile;
  onRemove: (id: string) => void;
  onDownload: (item: OptimizedFile) => void;
}

const ImageItem: React.FC<ImageItemProps> = ({ item, onRemove, onDownload }) => {
  const [compareMode, setCompareMode] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const compareButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isCompleted = item.status === ProcessingStatus.COMPLETED;
  const isProcessing = item.status === ProcessingStatus.PROCESSING;
  const isError = item.status === ProcessingStatus.ERROR;

  // Check if optimization yielded no improvement (which triggers revert to original in App.tsx)
  const isOptimal = isCompleted && item.compressedSize === item.originalSize;
  const hasCompressedResult = isCompleted && item.resultUrl && !isOptimal;

  // Calculate savings only if completed and not optimal
  const savings = isCompleted && item.compressedSize && !isOptimal
    ? calculateSavings(item.originalSize, item.compressedSize) 
    : 0;

  useEffect(() => {
    if (compareMode) {
      document.body.style.overflow = 'hidden';
      const prevActive = document.activeElement as HTMLElement | null;

      closeButtonRef.current?.focus();

      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setCompareMode(false);
          prevActive?.focus();
          return;
        }
        if (e.key !== 'Tab' || !dialogRef.current) return;

        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      };

      document.addEventListener('keydown', onKeyDown);

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onKeyDown);
        prevActive?.focus();
      };
    }
  }, [compareMode]);

  const startCompareDrag = useCallback(() => {
    const compareEl = document.getElementById(`compare-${item.id}`);
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!compareEl) return;
      const rect = compareEl.getBoundingClientRect();
      const clientX = 'touches' in e ? (e as TouchEvent).touches[0]?.clientX : (e as MouseEvent).clientX;
      if (clientX == null) return;
      const x = ((clientX - rect.left) / rect.width) * 100;
      setComparePosition(Math.max(0, Math.min(100, x)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [item.id]);

  return (
    <>
      {/* Expanded Compare Modal */}
      {compareMode && hasCompressedResult && item.resultUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setCompareMode(false)}
          role="presentation"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`compare-dialog-title-${item.id}`}
            aria-describedby={`compare-dialog-desc-${item.id}`}
            className="relative w-full max-w-6xl h-[85vh] max-h-[800px] min-h-[400px] bg-black rounded-xl overflow-hidden shadow-2xl flex flex-col border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black">
              <h3 id={`compare-dialog-title-${item.id}`} className="text-sm font-medium text-gray-100 truncate">
                {item.originalFile.name}
              </h3>
              <button
                ref={closeButtonRef}
                onClick={() => setCompareMode(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Close compare view"
              >
                <X size={22} />
              </button>
            </div>
            <p id={`compare-dialog-desc-${item.id}`} className="sr-only">
              Drag the divider left or right to compare the original image with the compressed version.
            </p>
            <div
              id={`compare-${item.id}`}
              className="relative flex-1 min-h-0 select-none touch-none bg-black"
            >
              {/* Original (left) */}
              <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}>
                <img src={item.previewUrl} alt="Original" className="absolute inset-0 w-full h-full object-contain" />
              </div>
              {/* Compressed (right) */}
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${comparePosition}%)` }}>
                <img src={item.resultUrl} alt="Compressed" className="absolute inset-0 w-full h-full object-contain" />
              </div>
              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-black shadow-lg cursor-col-resize z-10 flex items-center justify-center"
                style={{ left: `${comparePosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={startCompareDrag}
                onTouchStart={startCompareDrag}
              >
                <div className="absolute w-12 h-12 rounded-full bg-black shadow-xl flex items-center justify-center -translate-x-1/2 left-1/2 border-2 border-gray-600 ring-2 ring-gray-800">
                  <div className="flex gap-1">
                    <span className="w-1 h-4 bg-gray-400 rounded-full" />
                    <span className="w-1 h-4 bg-gray-400 rounded-full" />
                  </div>
                </div>
              </div>
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg text-sm font-medium bg-black/80 text-gray-100 border border-gray-700">Original</div>
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-medium bg-black/80 text-gray-100 border border-gray-700">Compressed</div>
            </div>
          </div>
        </div>
      )}

    <div className="group bg-white dark:bg-[#141414] rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 shadow-sm">
      
      {/* Thumbnail */}
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-gray-100 dark:bg-[#222222] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
        {item.previewUrl && (
          <img src={item.previewUrl} alt={item.originalFile.name} className="w-full h-full object-cover" />
        )}
        {isCompleted && (
          <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 drop-shadow-sm" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate pr-4 text-sm sm:text-base">
            {item.originalFile.name}
          </h4>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">{formatBytes(item.originalSize)}</span>
          
          {isCompleted && item.compressedSize && (
            <div className="flex items-center gap-2 text-gray-400">
              <ArrowRight size={14} />
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatBytes(item.compressedSize)}</span>
              
              {isOptimal ? (
                 <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    Optimal
                 </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                  -{Math.abs(savings)}%
                </span>
              )}
            </div>
          )}

          {isProcessing && (
             <span className="text-black dark:text-white text-xs font-medium animate-pulse">
                Optimizing...
             </span>
          )}
          
          {isError && (
             <span className="text-red-500 text-xs font-medium">
                {item.error || 'Failed'}
             </span>
          )}
        </div>
        
        {/* Progress Bar */}
        {isProcessing && (
          <div className="mt-3 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black dark:bg-white rounded-full transition-all duration-300 ease-out"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {isProcessing && (
          <div className="mr-2">
            <Loader2 className="w-5 h-5 animate-spin text-black dark:text-white" />
          </div>
        )}

        {isCompleted && (
          <>
            {hasCompressedResult && (
              <button
                ref={compareButtonRef}
                onClick={() => setCompareMode(!compareMode)}
                className={`p-2 rounded-lg transition-all ${compareMode ? 'text-black dark:text-white bg-gray-100 dark:bg-gray-800' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-800'}`}
                title="Compare before/after"
                aria-expanded={compareMode}
                aria-haspopup="dialog"
              >
                <Columns2 size={20} strokeWidth={2} />
              </button>
            )}
            <button
              onClick={() => onDownload(item)}
              className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-gray-800 rounded-lg transition-all"
              title="Download"
            >
              <Download size={20} strokeWidth={2} />
            </button>
          </>
        )}

        {isError && (
          <span className="text-red-500 mr-2">
            <XCircle size={22} />
          </span>
        )}

        <button
          onClick={() => onRemove(item.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          title="Remove"
        >
          <Trash2 size={20} strokeWidth={2} />
        </button>
      </div>
    </div>
    </>
  );
};

export default ImageItem;