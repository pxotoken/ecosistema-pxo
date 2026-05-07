import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Eye, FileImage, Edit2 } from 'lucide-react';

interface FileUploadProps {
  label: string;
  required?: boolean;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  className?: string;
  disabled?: boolean;
  existingImageUrl?: string | null;
  hideRemoveButton?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  required = false,
  accept = "image/*",
  maxSize = 5, // 5MB default
  multiple = false,
  value,
  onChange,
  error,
  className = "",
  disabled = false,
  existingImageUrl = null,
  hideRemoveButton = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingImageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when existing URL changes
  useEffect(() => {
    if (existingImageUrl && !value) {
      setPreview(existingImageUrl);
    }
  }, [existingImageUrl, value]);

  const validateFile = (file: File): string | null => {
    // Validate file type with specific MIME types
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      return 'Only JPG, PNG or WEBP files are allowed';
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      return `File cannot be larger than ${maxSize}MB`;
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      // Instead of alert, you could pass an onError callback if needed
      console.error('File validation error:', validationError);
      return;
    }

    onChange(file);

    // Create preview with error handling
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.onerror = () => {
      console.error('Error reading file');
      setPreview(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openPreview = (imageUrl: string) => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Preview</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
              img { max-width: 90%; max-height: 90vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Preview" />
          </body>
        </html>
      `);
    }
  };

  // Reusable action buttons
  const PreviewButton = ({ imageUrl, variant = 'default' }: { imageUrl: string; variant?: 'default' | 'overlay' }) => (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => openPreview(imageUrl)}
      className={
        variant === 'overlay'
          ? "p-2 bg-white/90 dark:bg-dark-surface/90 text-light-text-secondary dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded shadow-md transition-colors"
          : "p-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-pxo-primary transition-colors"
      }
      title="Ver preview"
      aria-label="Ver vista previa del archivo"
    >
      <Eye className="w-4 h-4" />
    </motion.button>
  );

  const RemoveButton = ({ variant = 'default' }: { variant?: 'default' | 'overlay' }) => (
    <motion.button
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      onClick={disabled ? undefined : handleRemove}
      disabled={disabled}
      className={
        variant === 'overlay'
          ? `p-2 bg-white/90 dark:bg-dark-surface/90 rounded shadow-md transition-colors ${
              disabled 
                ? 'text-gray-400 cursor-not-allowed opacity-50' 
                : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
            }`
          : "p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
      }
      title={disabled ? "Not available during validation" : "Remove file"}
      aria-label={disabled ? "Not available during validation" : "Remove file"}
    >
      <X className="w-4 h-4" />
    </motion.button>
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-light-text dark:text-dark-text">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          if (file) handleFileSelect(file);
        }}
        className="hidden"
      />

      {!value && !preview ? (
        <motion.div
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          className={`
            border-2 border-dashed rounded-lg text-center transition-colors h-[200px] flex flex-col items-center justify-center
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${isDragOver 
              ? 'border-pxo-primary bg-pxo-primary/5' 
              : 'border-light-border dark:border-dark-border hover:border-pxo-primary/50'
            }
            ${error ? 'border-red-500' : ''}
          `}
          onClick={disabled ? undefined : handleClick}
          onDrop={disabled ? undefined : handleDrop}
          onDragOver={disabled ? undefined : handleDragOver}
          onDragLeave={disabled ? undefined : handleDragLeave}
        >
          <Upload className="w-8 h-8 mx-auto mb-3 text-light-text-secondary dark:text-dark-text-secondary" />
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-1">
            Click to upload or drag the file here
          </p>
          <p className="text-xs text-light-text-secondary/70 dark:text-dark-text-secondary/70">
            Max {maxSize}MB • Images only
          </p>
        </motion.div>
      ) : (
        <div className="relative h-[200px]">
          <div className="border border-light-border dark:border-dark-border rounded-lg p-4 h-full flex flex-col">
            {value ? (
              // Show details when there's a new file
              <>
                <div className="flex items-center space-x-3">
                  <FileImage className="w-8 h-8 text-pxo-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-light-text dark:text-dark-text truncate">
                      {value.name}
                    </p>
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {(value.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {preview && <PreviewButton imageUrl={preview} />}
                    {!disabled && !hideRemoveButton && <RemoveButton />}
                  </div>
                </div>
                
                {preview && (
                  <div className="mt-3">
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded border border-light-border dark:border-dark-border"
                    />
                  </div>
                )}
              </>
            ) : (
              // Only show the image when it's an existing URL
              <div className="relative h-full">
                <img
                  src={existingImageUrl || ''}
                  alt="Uploaded document"
                  className="w-full h-full object-cover rounded"
                />
                <div className="absolute top-2 right-2 flex space-x-2">
                  {existingImageUrl && <PreviewButton imageUrl={existingImageUrl} variant="overlay" />}
                  <motion.button
                    type="button"
                    whileHover={{ scale: disabled ? 1 : 1.05 }}
                    whileTap={{ scale: disabled ? 1 : 0.95 }}
                    onClick={disabled ? undefined : handleClick}
                    disabled={disabled}
                    className={`p-2 bg-white/90 dark:bg-dark-surface/90 rounded shadow-md transition-colors ${
                      disabled 
                        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-50' 
                        : 'text-blue-600 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                    title={disabled ? "Not available during validation" : "Change image"}
                    aria-label={disabled ? "Not available during validation" : "Change image"}
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  {!hideRemoveButton && <RemoveButton variant="overlay" />}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
