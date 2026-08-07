import { v2 as cloudinary } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

import { verifyAdminSessionCookieValue } from '@/lib/adminServerAuth';
import { hasAdminPermission } from '@/lib/adminPermissions';
import { ADMIN_SESSION_COOKIE } from '@/lib/adminSession';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_DATA_LENGTH = 12_000_000;

function configureCloudinary() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured.');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function POST(request: NextRequest) {
  let authenticated = false;
  try {
    const session = await verifyAdminSessionCookieValue(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
      true,
    );
    authenticated =
      hasAdminPermission(session.user, 'products') ||
      hasAdminPermission(session.user, 'content');
  } catch {
    authenticated = false;
  }

  if (!authenticated) {
    return NextResponse.json(
      { message: 'Admin authentication required.' },
      { status: 401 },
    );
  }

  let body: { image?: unknown };
  try {
    body = (await request.json()) as { image?: unknown };
  } catch {
    return NextResponse.json({ message: 'Invalid upload request.' }, { status: 400 });
  }

  const image = typeof body.image === 'string' ? body.image.trim() : '';
  const isSupportedImage =
    image.startsWith('data:image/jpeg;base64,') ||
    image.startsWith('data:image/png;base64,') ||
    image.startsWith('data:image/webp;base64,');

  if (!isSupportedImage || image.length > MAX_IMAGE_DATA_LENGTH) {
    return NextResponse.json(
      { message: 'Upload a JPG, PNG, or WebP image smaller than 8 MB.' },
      { status: 400 },
    );
  }

  try {
    configureCloudinary();
    const result = await cloudinary.uploader.upload(image, {
      folder: 'jayluxe',
      resource_type: 'image',
      overwrite: false,
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error('CLOUDINARY UPLOAD ERROR:', error);
    return NextResponse.json(
      { message: 'The image could not be uploaded.' },
      { status: 502 },
    );
  }
}
