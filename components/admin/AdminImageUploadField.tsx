'use client';

import { useId, useRef, useState } from 'react';
import { ImagePlus, RefreshCw, Trash2, UploadCloud } from 'lucide-react';

import ResponsiveImage from '@/components/ResponsiveImage';

import {
  uploadAdminImage,
  type AdminImageFolder,
  type ImageUploadResult,
} from '@/lib/imageUpload';

type AdminImageUploadFieldProps = {
  id?: string;
  label: string;
  value?: string | null;
  folder: AdminImageFolder;
  onChange: (url: string, result?: ImageUploadResult) => void;
  onUploadingChange?: (uploading: boolean) => void;
  description?: string;
  emptyText?: string;
  alt?: string;
  disabled?: boolean;
  shape?: 'wide' | 'landscape' | 'square' | 'portrait' | 'circle';
  className?: string;
};

export default function AdminImageUploadField({
  id,
  label,
  value,
  folder,
  onChange,
  onUploadingChange,
  description = 'JPG, PNG, WebP or GIF. Large still images are optimized automatically; final upload must be 8 MB or smaller.',
  emptyText = 'Drag and drop or choose an image.',
  alt,
  disabled = false,
  shape = 'landscape',
  className = '',
}: AdminImageUploadFieldProps) {
  const generatedId = useId();
  const inputId = id || `admin-image-${generatedId.replace(/:/g, '')}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const locked = disabled || uploading;

  async function uploadSelectedFile(file: File) {
    if (locked) return;

    setError('');
    setFileName(file.name);
    setProgress(0);
    setUploading(true);
    setDragActive(false);
    onUploadingChange?.(true);

    try {
      const result = await uploadAdminImage(file, {
        folder,
        onProgress: setProgress,
      });
      onChange(result.url, result);
      setProgress(100);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Image upload failed. Please try again.',
      );
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadSelectedFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    if (locked) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadSelectedFile(file);
  }

  function handleDragOver(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!locked) setDragActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  function handleRemove() {
    if (locked) return;
    setError('');
    setProgress(0);
    setFileName('');
    onChange('');
  }

  return (
    <div className={`admin-image-upload-field ${className}`.trim()} data-shape={shape}>
      <div className="admin-image-upload-field__header">
        <div>
          <label htmlFor={inputId}>{label}</label>
          <p>{description}</p>
        </div>

        {value ? (
          <div className="admin-image-upload-field__actions">
            <label
              className="btn light admin-image-upload-field__replace"
              htmlFor={inputId}
              aria-disabled={locked}
            >
              <RefreshCw size={14} aria-hidden="true" />
              Replace image
            </label>
            <button
              className="btn light"
              type="button"
              disabled={locked}
              onClick={handleRemove}
            >
              <Trash2 size={14} aria-hidden="true" />
              Remove image
            </button>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="admin-image-upload-field__input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={locked}
        onChange={handleFileChange}
      />

      {!value ? (
        <label
          className={`admin-image-upload-field__dropzone${locked ? ' is-disabled' : ''}${dragActive ? ' is-drag-active' : ''}`}
          htmlFor={inputId}
          aria-disabled={locked}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploading ? (
            <RefreshCw size={22} className="admin-image-upload-field__spinner" aria-hidden="true" />
          ) : (
            <UploadCloud size={22} aria-hidden="true" />
          )}
          <strong>{uploading ? `Uploading image… ${progress}%` : 'Upload image'}</strong>
          <span>{uploading ? fileName : emptyText}</span>
        </label>
      ) : (
        <div className="admin-image-upload-field__preview-wrap">
          <ResponsiveImage
            src={value}
            alt={alt || `${label} preview`}
            width={720}
            height={480}
            sizes="(max-width: 768px) 100vw, 520px"
            className="admin-image-upload-field__preview"
          />
          <div className="admin-image-upload-field__meta">
            <ImagePlus size={14} aria-hidden="true" />
            <span title={value}>{fileName || value}</span>
          </div>
        </div>
      )}

      {uploading ? (
        <div className="admin-image-upload-field__progress" role="status" aria-live="polite">
          <span>Uploading image… {progress}%</span>
          <progress max="100" value={progress}>{progress}%</progress>
        </div>
      ) : null}

      {error ? (
        <p className="admin-image-upload-field__error" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
