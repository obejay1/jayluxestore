'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

import {
  cloudinaryImageLoader,
  getSafeImageSource,
  isCloudinaryImageSource,
  isLegacyDataImageSource,
} from '@/lib/images';

type ResponsiveImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export default function ResponsiveImage({
  src,
  fallbackSrc = '/product-placeholder.png',
  alt,
  onError,
  ...props
}: ResponsiveImageProps) {
  const [imageSource, setImageSource] = useState(getSafeImageSource(src, fallbackSrc));

  useEffect(() => {
    setImageSource(getSafeImageSource(src, fallbackSrc));
  }, [src, fallbackSrc]);

  return (
    <Image
      {...props}
      src={imageSource}
      alt={alt}
      loader={isCloudinaryImageSource(imageSource) ? cloudinaryImageLoader : props.loader}
      unoptimized={isLegacyDataImageSource(imageSource) || props.unoptimized}
      onError={(event) => {
        const safeFallback = getSafeImageSource(null, fallbackSrc);
        if (imageSource !== safeFallback) {
          setImageSource(safeFallback);
        }
        onError?.(event);
      }}
    />
  );
}
