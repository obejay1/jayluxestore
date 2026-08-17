'use client';

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const MAX_SOURCE_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 2400;
export const DEFAULT_UPLOAD_TIMEOUT_MS = 120_000;
export const SIGNATURE_TIMEOUT_MS = 30_000;
export const IMAGE_DECODE_TIMEOUT_MS = 30_000;

export type AdminImageFolder =
  | 'jayluxe/products'
  | 'jayluxe/categories'
  | 'jayluxe/bridal-packages'
  | 'jayluxe/bridal-gallery'
  | 'jayluxe/transformations/before'
  | 'jayluxe/transformations/after'
  | 'jayluxe/testimonials'
  | 'jayluxe/services'
  | 'jayluxe/gallery';

export type ImageUploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
};

export type ImageUploadOptions = {
  folder: AdminImageFolder;
  onProgress?: (percent: number) => void;
  timeoutMs?: number;
};

type SignatureResponse = {
  ok?: boolean;
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  folder?: string;
  signature?: string;
  message?: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  error?: { message?: string };
};

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

function extensionForMime(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpg';
}

function safeBaseName(name: string) {
  return name
    .replace(/\.[^.]+$/, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'jayluxe-image';
}

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new ImageUploadError('Image must be JPG, PNG, WebP or GIF.');
  }

  if (file.size <= 0) {
    throw new ImageUploadError('The selected image is empty. Please choose another file.');
  }

  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new ImageUploadError('The selected image is larger than 20 MB. Please choose a smaller image.');
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let settled = false;

    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      image.src = '';
      URL.revokeObjectURL(url);
      reject(new ImageUploadError('The image took too long to prepare. Please choose another image or retry.'));
    }, IMAGE_DECODE_TIMEOUT_MS);

    const cleanup = () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(url);
    };

    image.onload = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new ImageUploadError('This image could not be read. Please choose another file.'));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new ImageUploadError('The image could not be compressed in this browser.'));
      },
      type,
      quality,
    );
  });
}

export async function prepareImageForUpload(file: File): Promise<File> {
  validateImageFile(file);

  if (file.type === 'image/gif') {
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new ImageUploadError('GIF images must be 8 MB or smaller.');
    }
    return file;
  }

  // Small images do not need a canvas round trip. This is faster and preserves
  // the original encoding/metadata when no resize is needed.
  if (file.size <= 1.5 * 1024 * 1024) return file;

  try {
    const image = await loadImage(file);
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = largestSide > MAX_IMAGE_DIMENSION
      ? MAX_IMAGE_DIMENSION / largestSide
      : 1;

    if (scale === 1 && file.size <= MAX_UPLOAD_IMAGE_BYTES) return file;

    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: file.type === 'image/png' });
    if (!context) throw new ImageUploadError('This browser could not prepare the image for upload.');

    context.drawImage(image, 0, 0, width, height);
    const outputType = file.type === 'image/png' ? 'image/png' : file.type;
    const quality = outputType === 'image/png' ? undefined : 0.88;
    const blob = await canvasToBlob(canvas, outputType, quality);
    let candidate = new File(
      [blob],
      `${safeBaseName(file.name)}.${extensionForMime(outputType)}`,
      { type: outputType, lastModified: Date.now() },
    );

    // Large transparent PNG screenshots/product cut-outs can remain above the
    // upload ceiling even after resizing. Modern Safari/Chrome support WebP
    // with alpha, so use it only as a size-reduction fallback when necessary.
    if (candidate.size > MAX_UPLOAD_IMAGE_BYTES && outputType === 'image/png') {
      try {
        const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.9);
        const webpCandidate = new File(
          [webpBlob],
          `${safeBaseName(file.name)}.webp`,
          { type: 'image/webp', lastModified: Date.now() },
        );
        if (webpCandidate.size < candidate.size) candidate = webpCandidate;
      } catch {
        // Keep the PNG candidate and surface the standard 8 MB validation error
        // below if this browser cannot encode WebP.
      }
    }

    // Never replace a valid original with a larger re-encoded copy.
    const prepared = candidate.size < file.size || file.size > MAX_UPLOAD_IMAGE_BYTES
      ? candidate
      : file;

    if (prepared.size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new ImageUploadError('This image is still larger than 8 MB after optimization. Please choose a smaller image.');
    }

    return prepared;
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    if (file.size <= MAX_UPLOAD_IMAGE_BYTES) return file;
    throw new ImageUploadError('This large image could not be optimized. Please choose a smaller JPG, PNG or WebP image.');
  }
}

async function requestCloudinarySignature(
  folder: AdminImageFolder,
  timeoutMs = SIGNATURE_TIMEOUT_MS,
): Promise<Required<Omit<SignatureResponse, 'message'>>> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    Math.max(5_000, Math.min(timeoutMs, SIGNATURE_TIMEOUT_MS)),
  );

  let response: Response;
  try {
    response = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ folder }),
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ImageUploadError('The upload service took too long to respond. Please retry.');
    }
    throw new ImageUploadError('The upload service could not be reached. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }

  const text = await response.text();
  let data: SignatureResponse = {};
  try {
    data = text ? JSON.parse(text) as SignatureResponse : {};
  } catch {
    throw new ImageUploadError('The upload service returned an invalid response. Please try again.');
  }

  if (!response.ok || data.ok !== true) {
    throw new ImageUploadError(data.message || 'The upload service could not authorize this image. Please sign in again and retry.');
  }

  if (!data.cloudName || !data.apiKey || !data.timestamp || !data.folder || !data.signature) {
    throw new ImageUploadError('The upload service returned incomplete Cloudinary settings.');
  }

  return {
    ok: true,
    cloudName: data.cloudName,
    apiKey: data.apiKey,
    timestamp: data.timestamp,
    folder: data.folder,
    signature: data.signature,
  };
}

function uploadToCloudinary(
  file: File,
  signature: Awaited<ReturnType<typeof requestCloudinarySignature>>,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', file, file.name);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('folder', signature.folder);
    formData.append('signature', signature.signature);

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${encodeURIComponent(signature.cloudName)}/image/upload`,
      true,
    );
    xhr.timeout = Math.max(30_000, options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS);
    xhr.responseType = 'text';

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const percent = Math.min(99, Math.max(1, Math.round((event.loaded / event.total) * 100)));
      options.onProgress?.(percent);
    };

    xhr.onerror = () => reject(new ImageUploadError('Image upload failed because of a network error. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new ImageUploadError('Image upload took too long and was stopped. Please retry on a stable connection.'));
    xhr.onabort = () => reject(new ImageUploadError('Image upload was cancelled.'));

    xhr.onload = () => {
      let data: CloudinaryUploadResponse = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) as CloudinaryUploadResponse : {};
      } catch {
        reject(new ImageUploadError('Cloudinary returned an invalid upload response. Please try again.'));
        return;
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new ImageUploadError(data.error?.message || `Cloudinary rejected the image upload (${xhr.status}).`));
        return;
      }

      if (!data.secure_url || !data.public_id) {
        reject(new ImageUploadError('Cloudinary completed the request but did not return an image URL.'));
        return;
      }

      options.onProgress?.(100);
      resolve({
        url: data.secure_url,
        publicId: data.public_id,
        width: Number(data.width || 0),
        height: Number(data.height || 0),
        bytes: Number(data.bytes || file.size),
        format: data.format || file.type.replace('image/', ''),
      });
    };

    xhr.send(formData);
  });
}

export async function uploadAdminImage(
  file: File,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  const prepared = await prepareImageForUpload(file);
  if (prepared.size > MAX_UPLOAD_IMAGE_BYTES) {
    throw new ImageUploadError('Image must be 8 MB or smaller after optimization.');
  }

  const signature = await requestCloudinarySignature(options.folder, options.timeoutMs);
  return uploadToCloudinary(prepared, signature, options);
}


export async function deleteAdminImage(publicId: string): Promise<void> {
  const normalizedPublicId = publicId.trim();
  if (!normalizedPublicId) return;

  const response = await fetch('/api/upload', {
    method: 'DELETE',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ publicId: normalizedPublicId }),
    cache: 'no-store',
  });

  const text = await response.text();
  let data: { ok?: boolean; message?: string } = {};
  try {
    data = text ? JSON.parse(text) as { ok?: boolean; message?: string } : {};
  } catch {
    throw new ImageUploadError('The image cleanup service returned an invalid response.');
  }

  if (!response.ok || data.ok !== true) {
    throw new ImageUploadError(data.message || 'The uploaded image could not be removed from Cloudinary.');
  }
}
