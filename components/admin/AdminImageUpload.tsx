'use client';

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react';

import {
  startAdminImageUpload,
  type AdminImageKind,
  type AdminImageUploadController,
} from '@/lib/adminImageUpload';

type AdminImageUploadProps = {
  kind: AdminImageKind;
  label: string;
  value?: string;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  helpText?: string;
  emptyText?: string;
  previewAlt?: string;
  previewClassName?: string;
};

export default function AdminImageUpload({
  kind,
  label,
  value = '',
  onUploaded,
  onRemove,
  onUploadingChange,
  disabled = false,
  helpText = 'JPG, PNG, WebP or GIF, up to 8 MB. Large images are optimized automatically.',
  emptyText = 'Choose an image to upload.',
  previewAlt = 'Image preview',
  previewClassName = '',
}: AdminImageUploadProps) {
  const reactId = useId();
  const inputId = `admin-image-${reactId.replace(/:/g, '')}`;
  const controllerRef = useRef<AdminImageUploadController | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const uploadIdRef = useRef(0);
  const mountedRef = useRef(true);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const revokePreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const clearLocalPreview = useCallback(() => {
    revokePreview();
    setLocalPreview(null);
  }, [revokePreview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      uploadIdRef.current += 1;
      controllerRef.current?.cancel();
      controllerRef.current = null;
      revokePreview();
      onUploadingChange?.(false);
    };
  }, [onUploadingChange, revokePreview]);

  useEffect(() => {
    if (!value && !localPreview && status === 'success') {
      setStatus('idle');
      setProgress(0);
    }
  }, [localPreview, status, value]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled) return;

    const uploadId = uploadIdRef.current + 1;
    uploadIdRef.current = uploadId;
    controllerRef.current?.cancel();
    controllerRef.current = null;

    clearLocalPreview();
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setLocalPreview(objectUrl);
    setProgress(0);
    setError('');
    setStatus('uploading');
    onUploadingChange?.(true);

    const controller = startAdminImageUpload(file, kind, {
      onProgress: (nextProgress) => {
        if (mountedRef.current && uploadIdRef.current === uploadId) {
          setProgress(nextProgress);
        }
      },
    });
    controllerRef.current = controller;

    try {
      const url = await controller.promise;
      if (!mountedRef.current || uploadIdRef.current !== uploadId) return;
      onUploaded(url);
      setProgress(100);
      setStatus('success');
      setError('');
      clearLocalPreview();
    } catch (uploadError) {
      if (!mountedRef.current || uploadIdRef.current !== uploadId) return;
      const message = uploadError instanceof Error
        ? uploadError.message
        : 'Image upload failed. Please check your connection and try again.';
      setError(message);
      setStatus('error');
      setProgress(0);
      clearLocalPreview();
    } finally {
      if (mountedRef.current && uploadIdRef.current === uploadId) {
        controllerRef.current = null;
        onUploadingChange?.(false);
      }
    }
  }

  function handleRemove() {
    uploadIdRef.current += 1;
    controllerRef.current?.cancel();
    controllerRef.current = null;
    onUploadingChange?.(false);
    clearLocalPreview();
    setProgress(0);
    setError('');
    setStatus('idle');
    onRemove?.();
  }

  const preview = localPreview || value;
  const uploading = status === 'uploading';
  const inputDisabled = disabled || uploading;

  return (
    <div className="admin-image-upload">
      <div className="admin-image-upload-heading">
        <div>
          <label htmlFor={inputId}>{label}</label>
          <p className="admin-upload-note">{helpText}</p>
        </div>
        {preview ? (
          <div className="admin-image-preview-actions">
            <label
              className="btn light admin-image-replace"
              htmlFor={inputId}
              aria-disabled={inputDisabled}
            >
              Replace image
            </label>
            {onRemove ? (
              <button
                className="btn light"
                type="button"
                disabled={inputDisabled}
                onClick={handleRemove}
              >
                Remove image
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <input
        id={inputId}
        className="admin-image-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={inputDisabled}
        onChange={handleFileChange}
      />

      {uploading ? (
        <div className="admin-upload-progress" role="status" aria-live="polite">
          <span>Uploading image… {progress}%</span>
          <progress max="100" value={progress}>{progress}%</progress>
        </div>
      ) : null}

      {status === 'success' ? (
        <p className="admin-upload-status admin-upload-success" role="status">Upload complete.</p>
      ) : null}

      {status === 'error' && error ? (
        <p className="admin-upload-status admin-upload-error" role="alert">{error}</p>
      ) : null}

      {preview ? (
        <img
          src={preview}
          alt={previewAlt}
          className={`admin-image-preview ${previewClassName}`.trim()}
        />
      ) : (
        <p className="admin-image-empty">{emptyText}</p>
      )}
    </div>
  );
}
