import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

import { hasAdminPermission } from '@/lib/adminPermissions';
import { verifyAdminSessionCookieValue } from '@/lib/adminServerAuth';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_UPLOAD_FOLDERS = new Set([
  'jayluxe/products',
  'jayluxe/categories',
  'jayluxe/bridal-packages',
  'jayluxe/bridal-gallery',
  'jayluxe/transformations/before',
  'jayluxe/transformations/after',
  'jayluxe/testimonials',
  'jayluxe/services',
  'jayluxe/gallery',
]);

function getCloudinaryConfig() {
  const cloudName = (
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    ''
  ).trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return { cloudName, apiKey, apiSecret };
}

const FOLDER_PERMISSIONS = {
  'jayluxe/products': 'products',
  'jayluxe/categories': 'categories',
  'jayluxe/bridal-packages': 'products',
  'jayluxe/bridal-gallery': 'content',
  'jayluxe/transformations/before': 'content',
  'jayluxe/transformations/after': 'content',
  'jayluxe/testimonials': 'testimonials',
  'jayluxe/services': 'products',
  'jayluxe/gallery': 'content',
} as const;

async function getAdminSession(request: NextRequest) {
  try {
    return await verifyAdminSessionCookieValue(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
      true,
    );
  } catch {
    return null;
  }
}

function canManageFolder(
  session: Awaited<ReturnType<typeof getAdminSession>>,
  folder: string,
) {
  if (!session) return false;
  const permission = FOLDER_PERMISSIONS[folder as keyof typeof FOLDER_PERMISSIONS];
  return Boolean(permission && hasAdminPermission(session.user, permission));
}

function folderFromPublicId(publicId: string) {
  return Array.from(ALLOWED_UPLOAD_FOLDERS)
    .sort((left, right) => right.length - left.length)
    .find((folder) => publicId === folder || publicId.startsWith(`${folder}/`)) || '';
}

function normalizeFolder(value: unknown) {
  const folder = typeof value === 'string' ? value.trim().replace(/^\/+|\/+$/g, '') : '';
  return ALLOWED_UPLOAD_FOLDERS.has(folder) ? folder : '';
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json(
      { message: 'Admin authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let body: { folder?: unknown };
  try {
    body = (await request.json()) as { folder?: unknown };
  } catch {
    return NextResponse.json(
      { message: 'Invalid upload-signature request.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const folder = normalizeFolder(body.folder);
  if (!folder) {
    return NextResponse.json(
      { message: 'This upload destination is not allowed.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!canManageFolder(session, folder)) {
    return NextResponse.json(
      { message: 'You do not have permission to upload images to this section.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      apiSecret,
    );

    return NextResponse.json(
      {
        ok: true,
        cloudName,
        apiKey,
        timestamp,
        folder,
        signature,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('CLOUDINARY SIGNATURE ERROR:', error);
    return NextResponse.json(
      { message: 'Image uploads are temporarily unavailable because Cloudinary is not configured correctly.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}


export async function DELETE(request: NextRequest) {
  const session = await getAdminSession(request);
  if (!session) {
    return NextResponse.json(
      { message: 'Admin authentication required.' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  let body: { publicId?: unknown };
  try {
    body = (await request.json()) as { publicId?: unknown };
  } catch {
    return NextResponse.json(
      { message: 'Invalid image-delete request.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const publicId = typeof body.publicId === 'string' ? body.publicId.trim() : '';
  const folder = folderFromPublicId(publicId);
  if (!publicId || !folder) {
    return NextResponse.json(
      { message: 'This image cannot be deleted by the JayLuxe media service.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  if (!canManageFolder(session, folder)) {
    return NextResponse.json(
      { message: 'You do not have permission to remove images from this section.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    getCloudinaryConfig();
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary delete returned: ${result.result}`);
    }

    return NextResponse.json(
      { ok: true, result: result.result },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('CLOUDINARY DELETE ERROR:', error);
    return NextResponse.json(
      { message: 'The image record was removed, but Cloudinary cleanup could not be completed.' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
