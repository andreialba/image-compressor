import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Download, Play, Trash2, Moon, Sun, Square } from 'lucide-react';
import saveAs from 'file-saver';
import JSZip from 'jszip'; 

import Dropzone from './components/Dropzone';
import ImageItem from './components/ImageItem';
import SettingsPanel from './components/SettingsPanel';
import { OptimizedFile, OptimizationSettings, ProcessingStatus } from './types';
import { generateId, formatBytes, areSettingsEqual, getOutputFileName } from './services/utils';
import { processImage, createZipArchive } from './services/optimizer';

const SETTINGS_STORAGE_KEY = 'image-compressor-settings';

const DEFAULT_SETTINGS: OptimizationSettings = {
  quality: 80,
  useSmartCompression: true,
  format: 'original',
  lossless: false,
  stripExif: true,
  convertToRgb: true,
};

const loadStoredSettings = (): OptimizationSettings => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const settings = { ...DEFAULT_SETTINGS, ...parsed } as OptimizationSettings;
        if (settings.format === 'avif') settings.format = 'webp';
        return settings;
      }
    }
  } catch (e) {
    console.warn('Failed to load stored settings:', e);
  }
  return DEFAULT_SETTINGS;
};

const DARK_MODE_STORAGE_KEY = 'image-compressor-dark-mode';

const loadDarkMode = (): boolean => {
  try {
    const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY);
    return stored === 'true';
  } catch (e) {
    console.warn('Failed to load dark mode preference:', e);
    return false;
  }
};

const App: React.FC = () => {
  const [files, setFiles] = useState<OptimizedFile[]>([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ completed: 0, total: 0 });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(loadDarkMode);
  const [rememberSettings, setRememberSettings] = useState(() => {
    try {
      return localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
    } catch (e) {
      console.warn('Failed to check remembered settings:', e);
      return false;
    }
  });

  const [settings, setSettings] = useState<OptimizationSettings>(loadStoredSettings);

  const handleSettingsChange = useCallback((newSettings: OptimizationSettings) => {
    setSettings(newSettings);
    if (rememberSettings) {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      } catch (e) {
        console.warn('Failed to save settings to localStorage:', e);
      }
    }
  }, [rememberSettings]);

  const handleRememberSettingsChange = useCallback((checked: boolean) => {
    setRememberSettings(checked);
    if (checked) {
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      } catch (e) {
        console.warn('Failed to save settings to localStorage:', e);
      }
    } else {
      try {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch (e) {
        console.warn('Failed to remove settings from localStorage:', e);
      }
    }
  }, [settings]);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const newOptimizedFiles: OptimizedFile[] = newFiles.map(file => ({
      id: generateId(),
      originalFile: file,
      previewUrl: URL.createObjectURL(file),
      status: ProcessingStatus.PENDING,
      progress: 0,
      originalSize: file.size,
    }));

    setFiles(prev => [...prev, ...newOptimizedFiles]);
  }, []);

  // Handle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, String(isDarkMode));
    } catch (e) {
      console.warn('Failed to save dark mode preference:', e);
    }
  }, [isDarkMode]);

  // Paste images from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData?.items) return;
      const files: File[] = [];
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        handleFilesAdded(files);
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFilesAdded]);

  const stats = useMemo(() => {
    const completed = files.filter(f => f.status === ProcessingStatus.COMPLETED);
    const validOptimizations = completed.filter(f => (f.compressedSize || 0) < f.originalSize);
    
    const originalTotal = validOptimizations.reduce((acc, curr) => acc + curr.originalSize, 0);
    const compressedTotal = validOptimizations.reduce((acc, curr) => acc + (curr.compressedSize || 0), 0);
    const saved = originalTotal - compressedTotal;
    
    return {
      completedCount: validOptimizations.length,
      totalSaved: saved,
      totalPercent: originalTotal > 0 ? (saved / originalTotal) * 100 : 0
    };
  }, [files]);

  // Determine if there are files that need processing (Pending, Error, or Settings Mismatch)
  const filesToProcess = useMemo(() => {
    return files.filter(f => {
      // Never process files that are currently processing
      if (f.status === ProcessingStatus.PROCESSING) return false;
      
      // Always process Pending or Error
      if (f.status !== ProcessingStatus.COMPLETED) return true;
      
      // Process Completed files ONLY if settings have changed
      return !areSettingsEqual(f.processedSettings, settings);
    });
  }, [files, settings]);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      if (fileToRemove?.resultUrl) {
        URL.revokeObjectURL(fileToRemove.resultUrl);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const cancelProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const startProcessing = async () => {
    if (filesToProcess.length === 0) return;

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setIsGlobalProcessing(true);
    setProcessingProgress({ completed: 0, total: filesToProcess.length });

    const currentBatchSettings = { ...settings };

    const CONCURRENCY_LIMIT = 3;
    let nextIndex = 0;
    let completedCount = 0;

    const processNext = async (): Promise<void> => {
      if (signal.aborted || nextIndex >= filesToProcess.length) return;
      const file = filesToProcess[nextIndex++];
      setFiles(prev => prev.map(f => {
        if (f.id !== file.id) return f;
        if (f.resultUrl) {
          URL.revokeObjectURL(f.resultUrl);
        }
        return { ...f, status: ProcessingStatus.PROCESSING, progress: 0, error: undefined, resultUrl: undefined };
      }));

      try {
        let resultBlob = await processImage(
          file.originalFile,
          currentBatchSettings,
          (progress) => {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, progress } : f));
          },
          signal
        );

        if (signal.aborted) return;

        if (resultBlob.size >= file.originalSize) {
          resultBlob = file.originalFile;
        }

        setFiles(prev => prev.map(f => {
          if (f.id !== file.id) return f;
          if (f.resultUrl) {
            URL.revokeObjectURL(f.resultUrl);
          }
          return {
            ...f,
            status: ProcessingStatus.COMPLETED,
            progress: 100,
            resultBlob: resultBlob,
            compressedSize: resultBlob.size,
            resultUrl: URL.createObjectURL(resultBlob),
            processedSettings: currentBatchSettings
          };
        }));
      } catch (error) {
        if (signal.aborted) {
          setFiles(prev => prev.map(f => f.id === file.id
            ? { ...f, status: ProcessingStatus.PENDING, progress: 0, error: undefined }
            : f));
        } else {
          setFiles(prev => prev.map(f => f.id === file.id ? {
            ...f,
            status: ProcessingStatus.ERROR,
            error: 'Compression failed',
            progress: 0
          } : f));
        }
      } finally {
        completedCount += 1;
        setProcessingProgress(p => ({ ...p, completed: completedCount }));
      }
      await processNext();
    };

    const workers = Array(Math.min(CONCURRENCY_LIMIT, filesToProcess.length))
      .fill(null)
      .map(() => processNext());
    await Promise.all(workers);
    setIsGlobalProcessing(false);
    setProcessingProgress({ completed: 0, total: 0 });
    abortControllerRef.current = null;
  };

  const downloadSingle = (file: OptimizedFile) => {
    if (file.resultBlob) {
      const fileName = getOutputFileName(file.originalFile.name, file.resultBlob.type);
      saveAs(file.resultBlob, fileName);
    }
  };

  const downloadAll = async () => {
    if (stats.completedCount === 0) return;
    try {
      const blob = await createZipArchive(files);
      if (blob) {
        saveAs(blob, 'image_compressor_files.zip');
      }
    } catch (e) {
      console.error("Zip generation failed", e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300 relative overflow-hidden bg-gray-50 dark:bg-[#0a0a0a]">
      
      {/* Header */}
      <header className="sticky top-0 z-50 transition-all duration-300 bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-black dark:text-white tracking-tight">
              Image Compressor
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all rounded-full active:scale-95"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Upload & List */}
          <div className="lg:col-span-8 space-y-6">
            <Dropzone onFilesAdded={handleFilesAdded} />

            {/* Actions Bar */}
            {files.length > 0 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#141414] p-4 rounded-xl border border-gray-200 dark:border-gray-800 transition-colors duration-300 shadow-sm">
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span className="font-semibold">{files.length} images</span>
                      {stats.completedCount > 0 && (
                        <span className="hidden sm:inline text-gray-300 dark:text-gray-700">|</span>
                      )}
                      {stats.completedCount > 0 && (
                        <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                           Saved {formatBytes(stats.totalSaved)} ({stats.totalPercent.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                     <button
                      onClick={() => {
                        files.forEach(f => {
                          if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
                          if (f.resultUrl) URL.revokeObjectURL(f.resultUrl);
                        });
                        setFiles([]);
                      }}
                      disabled={isGlobalProcessing}
                      className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={18} /> Clear
                    </button>
                    
                    {stats.completedCount > 1 && (
                      <button
                        onClick={downloadAll}
                        className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Download size={18} /> Save All
                      </button>
                    )}

                    {isGlobalProcessing ? (
                      <button
                        onClick={cancelProcessing}
                        className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white dark:text-black bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700 rounded-lg transition-all shadow-sm active:scale-95"
                      >
                        <Square size={18} fill="currentColor" /> Cancel
                      </button>
                    ) : (
                      <button
                        onClick={startProcessing}
                        disabled={filesToProcess.length === 0}
                        className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 rounded-lg transition-all disabled:cursor-not-allowed shadow-sm active:scale-95 disabled:active:scale-100"
                      >
                        <Play size={18} fill="currentColor" /> {files.some(f => f.status === ProcessingStatus.COMPLETED) ? 'Process Changes' : 'Start Processing'}
                      </button>
                    )}
                    {isGlobalProcessing && processingProgress.total > 0 && (
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {processingProgress.completed}/{processingProgress.total} images
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            <div className="space-y-3">
              {files.map(file => (
                <ImageItem 
                  key={file.id} 
                  item={file} 
                  onRemove={handleRemoveFile} 
                  onDownload={downloadSingle} 
                />
              ))}
              
              {files.length === 0 && (
                 <div className="text-center py-16 opacity-60">
                   <p className="text-gray-500 dark:text-gray-400 font-medium">No images added yet.</p>
                 </div>
              )}
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="lg:col-span-4 sticky top-24">
            <SettingsPanel 
              settings={settings} 
              onChange={handleSettingsChange} 
              disabled={isGlobalProcessing}
              rememberSettings={rememberSettings}
              onRememberSettingsChange={handleRememberSettingsChange}
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-200 dark:border-gray-800 text-center transition-colors duration-300 relative z-10 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm font-medium text-gray-500 dark:text-gray-400">
          <p>
            Made by{' '}
            <a 
              href="https://www.linkedin.com/in/andreialba/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-900 dark:text-gray-100 hover:underline transition-all"
            >
              Andrei Alba
            </a>
          </p>
          <span className="hidden sm:inline text-gray-300 dark:text-gray-600">·</span>
          <Link 
            to="/privacy" 
            className="text-gray-900 dark:text-gray-100 hover:underline transition-all"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default App;