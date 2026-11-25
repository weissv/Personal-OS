import type { MetadataRoute } from 'next';

/** PWA-манифест: ученик добавляет Sprint OS на главный экран телефона. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mezon Sprint OS',
    short_name: 'Sprint OS',
    description: 'Ежедневник субъектности ученика Mezon Inspiring School: утро, вечер, суббота и ретро.',
    lang: 'ru',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#121212',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
