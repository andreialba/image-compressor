import React from 'react';
import { HelpCircle } from 'lucide-react';
import { OptimizationSettings } from '../types';

interface SettingsPanelProps {
  settings: OptimizationSettings;
  onChange: (settings: OptimizationSettings) => void;
  disabled: boolean;
  rememberSettings: boolean;
  onRememberSettingsChange: (checked: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange, disabled, rememberSettings, onRememberSettingsChange }) => {
  const updateSetting = <K extends keyof OptimizationSettings>(key: K, value: OptimizationSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-[#141414] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-visible shadow-sm">
      <div className="p-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configuration</h2>
      </div>

      <div className="p-6 space-y-7">

        {/* Compression Strategy (Balanced vs Lossless) */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-black dark:text-white">Compression Type</label>
          <div className="grid grid-cols-2 gap-1 bg-gray-100 dark:bg-[#222222] p-1 rounded-xl">
            <button
              onClick={() => updateSetting('lossless', false)}
              disabled={disabled}
              className={`py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                !settings.lossless
                  ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#333333]'
              }`}
            >
              Balanced
            </button>
            <button
              onClick={() => updateSetting('lossless', true)}
              disabled={disabled}
              className={`py-2.5 px-4 text-sm font-medium rounded-lg transition-all duration-200 ${
                settings.lossless
                  ? 'bg-white dark:bg-[#333333] text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#333333]'
              }`}
            >
              Lossless
            </button>
          </div>
        </div>

        {/* Balanced Specific Options */}
        {!settings.lossless && (
          <div className="space-y-5 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Smart Compression Toggle */}
            <div className="relative group">
              <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-all duration-200">
                <input
                  type="checkbox"
                  checked={settings.useSmartCompression}
                  onChange={(e) => updateSetting('useSmartCompression', e.target.checked)}
                  disabled={disabled}
                  className="mt-1 w-5 h-5 rounded focus:ring-black border-gray-300 dark:border-gray-600 dark:bg-[#222222] transition-colors accent-black"
                />
                <div className="flex-1">
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors">
                    Smart Optimization
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                    Automatically determines the best balance between visual quality and file size.
                  </span>
                </div>
              </label>
            </div>

            {/* Manual Quality Slider (Hidden if Smart is ON) */}
            {!settings.useSmartCompression && (
              <div className="space-y-4 px-1">
                <label className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Quality Level</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-[#222222] px-2 py-1 rounded-md">{settings.quality}%</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={settings.quality}
                  onChange={(e) => updateSetting('quality', Number(e.target.value))}
                  disabled={disabled}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none cursor-pointer accent-black dark:accent-white"
                />
              </div>
            )}
          </div>
        )}

        {/* General Options */}
        <div className="space-y-5 pt-6 border-t border-gray-200 dark:border-gray-800">
            {/* Resize */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Max Width/Height</label>
                <span className="text-xs text-gray-500">Optional</span>
              </div>
              <div className="relative">
                 <input
                    type="number"
                    placeholder="Auto"
                    min="1"
                    value={settings.resizeWidth || ''}
                    onChange={(e) => updateSetting('resizeWidth', e.target.value ? Number(e.target.value) : undefined)}
                    disabled={disabled}
                    className="w-full p-3 pl-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all placeholder:text-gray-400"
                 />
                 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs font-medium">
                    px
                 </div>
              </div>
            </div>

            {/* Output Format */}
            <div className="space-y-2.5">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Output Format</label>
              <div className="relative">
                <select
                    value={settings.format}
                    onChange={(e) => updateSetting('format', e.target.value as OptimizationSettings['format'])}
                    disabled={disabled}
                    className="w-full p-3 pl-4 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-900 dark:text-gray-100 outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black dark:focus:ring-white transition-all appearance-none"
                >
                    <option value="original">Keep Original Format</option>
                    <option value="jpeg">Convert to JPEG</option>
                    <option value="webp">Convert to WebP</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 1L5 5L9 1" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer group py-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">Strip EXIF Data</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                          type="checkbox"
                          checked={settings.stripExif}
                          onChange={(e) => updateSetting('stripExif', e.target.checked)}
                          disabled={disabled}
                          className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black dark:peer-focus:ring-white rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                    </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer group py-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">Convert to RGB</span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                          type="checkbox"
                          checked={settings.convertToRgb}
                          onChange={(e) => updateSetting('convertToRgb', e.target.checked)}
                          disabled={disabled}
                          className="sr-only peer"
                      />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black dark:peer-focus:ring-white rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                    </div>
                </label>
                <label
                    className="flex items-center justify-between cursor-pointer group py-1"
                >
                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                      Remember settings
                      <span className="relative inline-flex group/tooltip">
                        <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs font-normal text-white bg-gray-900 dark:bg-gray-700 rounded-lg whitespace-normal w-64 max-w-[min(18rem,90vw)] text-left leading-relaxed opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-[100] shadow-lg">
                          Your compression settings (quality, format, etc.) will be saved and restored on your next visit.
                        </span>
                      </span>
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input 
                          type="checkbox"
                          checked={rememberSettings}
                          onChange={(e) => onRememberSettingsChange(e.target.checked)}
                          className="sr-only peer"
                      />
                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black dark:peer-focus:ring-white rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
                    </div>
                </label>
            </div>
        </div>

      </div>
    </div>
  );
};

export default SettingsPanel;