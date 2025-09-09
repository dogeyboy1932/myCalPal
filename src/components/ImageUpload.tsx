'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';

interface ImageUploadProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}

export default function ImageUpload({ onUpload, isUploading = false }: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Call upload handler
      onUpload(file);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    disabled: isUploading
  });

  const clearPreview = () => {
    setPreview(null);
  };

  return (
    <div className="w-full">
      {!preview ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all cursor-pointer ${
            isDragActive || dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="text-6xl">
              {isUploading ? '⏳' : isDragActive ? '📤' : '📷'}
            </div>
            <div>
              {isUploading ? (
                <>
                  <p className="text-lg text-gray-600">Processing image...</p>
                  <p className="text-sm text-gray-500">Extracting event information with AI</p>
                </>
              ) : (
                <>
                  <p className="text-lg text-gray-600">
                    {isDragActive ? 'Drop your image here' : 'Drop your event image here'}
                  </p>
                  <p className="text-sm text-gray-500">or click to browse files</p>
                </>
              )}
            </div>
            {!isUploading && (
              <button
                type="button"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Choose File
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={preview}
              alt="Preview"
              width={800}
              height={600}
              className="w-full h-auto max-h-96 object-contain"
            />
            {!isUploading && (
              <button
                onClick={clearPreview}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          
          {isUploading && (
            <div className="flex items-center justify-center space-x-2 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span>Analyzing image with AI...</span>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Supported formats: JPEG, PNG, WebP, GIF (max 10MB)</p>
        <p className="mt-1">AI will extract event details like title, date, time, and location</p>
      </div>
    </div>
  );
}