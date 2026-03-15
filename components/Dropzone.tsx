import React, { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface DropzoneProps {
  onFilesAdded: (files: File[]) => void;
}

const Dropzone: React.FC<DropzoneProps> = ({ onFilesAdded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles = Array.from(e.dataTransfer.files).filter((file: File) => 
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
    }
  }, [onFilesAdded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const validFiles = Array.from(e.target.files).filter((file: File) =>
        file.type.startsWith('image/')
      );
      if (validFiles.length > 0) {
        onFilesAdded(validFiles);
      }
      e.target.value = '';
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative overflow-hidden group
        border-2 border-dashed p-10 sm:p-14 text-center cursor-pointer transition-all duration-300
        flex flex-col items-center justify-center gap-5 rounded-2xl
        ${isDragging 
          ? 'border-black dark:border-white bg-gray-50 dark:bg-[#141414] scale-[0.99]' 
          : 'border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white bg-white dark:bg-[#141414] hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />
      
      <div className={`
        relative z-10 p-5 rounded-full transition-all duration-300
        ${isDragging ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-100 dark:bg-[#222222] text-gray-900 dark:text-white group-hover:bg-black group-hover:dark:bg-white group-hover:text-white group-hover:dark:text-black'}
      `}>
        <Upload size={32} strokeWidth={2} />
      </div>
      
      <div className="relative z-10 space-y-1">
        <p className="text-xl font-semibold text-black dark:text-white">
          {isDragging ? 'Drop files now' : 'Drag & Drop files here'}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          or click to browse · paste with Ctrl+V (⌘V)
        </p>
      </div>
    </div>
  );
};

export default Dropzone;