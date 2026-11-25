import type { MetadataRoute } from 'next';

/** Личный дневник подростка не индексируется поисковиками. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] };
}
